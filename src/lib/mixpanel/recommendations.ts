import type { Analytics } from './analytics';
import type { Voice } from '../voice/verbatims';
import { PLAYBOOK_RULES } from './playbook';
import { scoreRecommendation, type TriScore } from '../triangulation/score';
import { simulateMargin } from '../triangulation/montecarlo';
import type { PriorMap } from '../triangulation/priors';

export type RecPriority = 'alta' | 'media' | 'baja';
export type Discipline = 'diseno' | 'producto' | 'desarrollo' | 'datos';

export interface Recommendation {
  id: string;
  priority: RecPriority;
  discipline: Discipline;
  tag: string;
  title: string;
  detail: string;
  funnel?: string;
  owner: 'dev' | 'marketing' | 'producto';
  backedBy?: { id: string; statement: string }; // regla del Playbook que respalda esta reco (prior)
  tri?: TriScore; // score triangulado: margen en juego + base + honestidad
}

const ORDER: Record<RecPriority, number> = { alta: 0, media: 1, baja: 2 };

// Peso de la EXPLORACIÓN en el ranking (UCB): cuánto suma el techo P90 de la banda sobre la media.
// 0 = puro valor esperado (solo explotar); más alto = más peso al potencial poco probado.
const EXPLORE_K = 0.5;

// Peso del "valor heredado" de un cambio de PROCESO: como no tiene $ propio, su valor de ranking se
// estima como una fracción del proceso económico que alimenta — para que un cuello de proceso no quede
// sepultado por los $ directos. Solo afecta el ORDEN; no se muestra como un $ propio.
const PROCESS_GATE_WEIGHT = 0.5;

// El motor lee el Playbook como priors: estas recos están respaldadas por una regla ya aprendida
// (sube la confianza). Mapea rec.id → regla del playbook.
const REC_PLAYBOOK_MAP: Record<string, string> = {
  'channel-junk': 'r-display',
  'channel-best': 'r-meta',
  'loop-desconectado': 'r-loop',
  dead: 'r-dead',
  'quality-alta': 'r-alta',
  'imp-cot-design': 'r-form-fields',
  'imp-cot-product': 'r-aporte',
  'imp-con-design': 'r-form-fields',
  'imp-con-dev': 'r-utm',
  'imp-emp-product': 'r-b2b',
  'imp-emp-design': 'r-b2b',
  'imp-emp-dev': 'r-utm',
  'trend-up': 'r-trend',
  'hs-loop': 'r-loop',
  'hs-winrate': 'r-winrate',
  'hs-stock': 'r-hsstock',
  'voice-seguimiento': 'v-seguimiento',
};

// Recomendaciones que usan la data comercial de HubSpot (pipeline de deals).
function hubspotRecommendations(a: Analytics): Recommendation[] {
  const h = a.hubspot;
  if (!h || h.source === 'error') return []; // genera con datos live o snapshot (simulación)
  const out: Recommendation[] = [];

  out.push({
    id: 'hs-loop', priority: 'alta', discipline: 'desarrollo', owner: 'dev', tag: 'Instrumentación', funnel: 'CRM',
    title: 'Cerrá el loop visita→cápita (ya tenés ambos lados)',
    detail: 'Ahora tenés el cotizador (Mixpanel) y los negocios comerciales (HubSpot). Falta SOLO cruzarlos por prospecto_id para medir de punta a punta qué visita se vuelve socio y atribuir el impacto de cada experimento hasta la cápita.',
  });

  if (h.winRate != null) {
    out.push({
      id: 'hs-winrate', priority: 'alta', discipline: 'producto', owner: 'producto', tag: 'Ventas', funnel: 'CRM',
      title: `Recuperá los ${fmt(h.lost)} negocios perdidos (cierre de ventas ${pc(h.winRate)})`,
      detail: `El proceso de ventas cierra ${pc(h.winRate)} (${fmt(h.won)} ganados / ${fmt(h.lost)} perdidos). Analizá las razones de pérdida: subir la tasa de cierre es palanca directa de cápitas.`,
    });
  }

  if (h.biggestOpenStage && h.biggestOpenStage.count > 0) {
    out.push({
      id: 'hs-stock', priority: 'media', discipline: 'producto', owner: 'producto', tag: 'Ventas', funnel: 'CRM',
      title: `${fmt(h.biggestOpenStage.count)} negocios atascados en "${h.biggestOpenStage.label}"`,
      detail: 'Es el mayor stock abierto del proceso comercial. Revisá si hay seguimiento para moverlos: ahí hay cápitas dormidas.',
    });
  }

  if (h.cancelados > 0) {
    out.push({
      id: 'hs-cancel', priority: 'baja', discipline: 'producto', owner: 'producto', tag: 'Ventas', funnel: 'CRM',
      title: `${fmt(h.cancelados)} negocios cancelados`,
      detail: 'Entendé por qué se cancelan (post-cierre) para reducirlos: afecta directo la retención de cápitas.',
    });
  }

  return out;
}
const fmt = (n: number) => n.toLocaleString('es-AR');
const pc = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;

// Oportunidades nacidas de la VOZ DEL CLIENTE (verbatims NPS): los temas-problema más agudos.
function voiceRecommendations(voice?: Voice): Recommendation[] {
  if (!voice || voice.source === 'error') return []; // genera con datos live o snapshot (simulación)
  const problems = voice.themes.filter((t) => t.isProblem && t.n >= 10 && t.detractorPct >= 0.4);
  return problems.slice(0, 2).map((t) => {
    const tie = t.key === 'seguimiento' ? ' Coincide con los ~13.485 negocios atascados en "Propuesta Enviada": nadie hace el seguimiento.' : '';
    const sys = t.systemic ? ' Es SISTÉMICO (aparece en todos los canales por igual) → pide un SLA de respuesta para toda la compañía, no un parche por canal.' : '';
    return {
      id: `voice-${t.key}`, priority: 'alta' as RecPriority, discipline: 'producto' as Discipline, owner: 'producto' as const, tag: 'Voz del cliente', funnel: 'NPS',
      title: `Resolvé "${t.label}" — el NPS lo grita`,
      detail: `Explica el ${Math.round(t.detractorShare * 100)}% de TODOS los detractores: ${t.n} socios lo mencionan (NPS ${t.avgScore?.toFixed(1) ?? '—'}). En sus palabras: «${t.samples[0]}».${tie}${sys}`,
    };
  });
}

// Mejoras de diseño / producto / desarrollo, una tanda por funnel, ancladas a su data real.
function funnelImprovements(a: Analytics): Recommendation[] {
  const out: Recommendation[] = [];
  const byId = (id: string) => a.funnels.find((f) => f.id === id);

  const cot = byId('cotizador');
  if (cot) {
    const leakPct = cot.leakDropPct != null ? pc(cot.leakDropPct, 0) : '';
    out.push(
      {
        id: 'imp-cot-design', priority: 'alta', discipline: 'diseno', owner: 'producto', tag: 'Diseño', funnel: cot.name,
        title: 'Rediseñá el formulario de datos personales',
        detail: `Es donde se cae el ${leakPct} (${cot.leakTransition}). Reducí a los campos mínimos imprescindibles, agregá barra de progreso, autocompletado y validación inline. Es el cambio de UX de mayor impacto del producto.`,
      },
      {
        id: 'imp-cot-product', priority: 'alta', discipline: 'producto', owner: 'producto', tag: 'Producto', funnel: cot.name,
        title: 'Mostrá el precio antes de pedir datos',
        detail: 'Hoy pedís datos personales antes de mostrar la cotización. Un “cotizá sin registrarte” baja la fricción de entrada y deja la captura de datos para cuando ya hay intención real.',
      },
      {
        id: 'imp-cot-dev', priority: 'media', discipline: 'desarrollo', owner: 'dev', tag: 'Desarrollo', funnel: cot.name,
        title: 'Medí la fricción técnica del formulario',
        detail: 'Existen eventos Validation Error y API Error en el proyecto. Instrumentá errores de validación y tiempo de carga del paso de datos: parte de la caída puede ser técnica, no de diseño.',
      },
    );
  }

  const con = byId('contacto');
  if (con) {
    out.push(
      {
        id: 'imp-con-design', priority: 'media', discipline: 'diseno', owner: 'producto', tag: 'Diseño', funnel: con.name,
        title: 'Acortá el formulario de contacto',
        detail: `Solo ${pc(con.overallConversion ?? 0)} completa de los que lo abren — se cae más de la mitad. Reducí campos y aclará qué pasa después de enviar (expectativa de respuesta).`,
      },
      {
        id: 'imp-con-product', priority: 'media', discipline: 'producto', owner: 'producto', tag: 'Producto', funnel: con.name,
        title: 'Sumá contacto inmediato por WhatsApp',
        detail: 'El proyecto ya tiene eventos de WhatsApp (boton_whatsapp__click, mobile_se_fue_a_whatsapp): hay demanda de respuesta inmediata. Ofrecer WhatsApp en el form suele convertir mejor que esperar un callback.',
      },
      {
        id: 'imp-con-dev', priority: 'media', discipline: 'desarrollo', owner: 'dev', tag: 'Desarrollo', funnel: con.name,
        title: 'Instrumentá utm_source en Contacto',
        detail: 'Todo el tráfico de este flujo cae en “undefined”: no podés saber qué canal trae los mejores leads de contacto ni optimizar inversión.',
      },
    );
  }

  const emp = byId('empresa');
  if (emp) {
    out.push(
      {
        id: 'imp-emp-product', priority: 'media', discipline: 'producto', owner: 'producto', tag: 'Producto', funnel: emp.name,
        title: 'Ofrecé agendar llamada en vez de form largo (B2B)',
        detail: `Conversión ${pc(emp.overallConversion ?? 0)} (${fmt(emp.bottom ?? 0)} de ${fmt(emp.top ?? 0)}). El B2B suele preferir hablar: un “agendá una reunión” puede convertir mejor que un formulario extenso.`,
      },
      {
        id: 'imp-emp-design', priority: 'baja', discipline: 'diseno', owner: 'producto', tag: 'Diseño', funnel: emp.name,
        title: 'Simplificá el formulario de empresa',
        detail: 'Conversión muy baja: revisá longitud, campos obligatorios y claridad del form corporativo.',
      },
      {
        id: 'imp-emp-dev', priority: 'baja', discipline: 'desarrollo', owner: 'dev', tag: 'Desarrollo', funnel: emp.name,
        title: 'Sumá pasos intermedios + utm en Empresa',
        detail: 'Solo hay 2 eventos (envío/completó): no se ve dónde cae el B2B. Instrumentá pasos intermedios y utm_source.',
      },
    );
  }

  const alta = byId('alta');
  if (alta) {
    out.push(
      {
        id: 'imp-alta-product', priority: 'media', discipline: 'producto', owner: 'producto', tag: 'Producto', funnel: alta.name,
        title: 'Evaluá reducir los pasos del alta',
        detail: 'El flujo tiene ~14 pasos (flow_1..flow_14). Cada paso es una fuga potencial: mapeá cuáles son imprescindibles y sacá el resto.',
      },
      {
        id: 'imp-alta-design', priority: 'baja', discipline: 'diseno', owner: 'producto', tag: 'Diseño', funnel: alta.name,
        title: 'Mapeá el abandono por paso del alta',
        detail: 'Una vez unificada la instrumentación, identificá los 2-3 pasos donde más se cae para rediseñarlos.',
      },
    );
  }

  return out;
}

// Motor de recomendaciones v1: reglas deterministas sobre TODA la analítica.
// `priors` (Capa 4): lo aprendido de experimentos, que afina recovery + confianza del score.
export function generateRecommendations(a: Analytics, voice?: Voice, priors?: PriorMap): Recommendation[] {
  const recs: Recommendation[] = [];
  const cotizador = a.funnels.find((f) => f.id === 'cotizador');

  // 1. Canal no calificado (ensucia la medición; NO es plata recuperable).
  const junk = cotizador?.channels?.find((c) => c.flag === 'junk');
  if (junk) {
    recs.push({
      id: 'channel-junk', priority: 'media', discipline: 'datos', tag: 'Canales', owner: 'marketing', funnel: 'Cotizador',
      title: `El canal "${junk.source}" ensucia la medición del cotizador`,
      detail: `Trae ${fmt(junk.visits)} visitas (${pc(junk.sharePct)} del tráfico) y convierte ~0% a datos: es tráfico no calificado que infla el denominador y hace ver peor la conversión real del cotizador.${junk.excluded ? ' Detrás hay programática, pero es presupuesto PLANIFICADO y EXCLUIDO del análisis por el cliente.' : ''} No es plata recuperable: la acción es excluirlo del cálculo de conversión para medir bien — no esperar un retorno en pesos.`,
    });
  }

  // 2. Mejores canales.
  const best = (cotizador?.channels ?? []).filter((c) => c.flag === 'best').sort((x, y) => y.conv - x.conv);
  if (best.length) {
    recs.push({
      id: 'channel-best', priority: 'alta', discipline: 'datos', tag: 'Canales', owner: 'marketing', funnel: 'Cotizador',
      title: `Escalá ${best.map((c) => c.source).join(' / ')}`,
      detail: `Convierten ${best.map((c) => pc(c.conv)).join(' y ')} a datos — muy por encima del 16% promedio. Hoy traen poco volumen; subir su inversión rinde más que el tráfico masivo de baja calidad.`,
    });
  }

  // 3. Loop desconectado.
  const clienteStep = cotizador?.steps.find((s) => s.key === 'cliente');
  if (clienteStep?.status === 'handoff') {
    recs.push({
      id: 'loop-desconectado', priority: 'alta', discipline: 'desarrollo', tag: 'Instrumentación', owner: 'dev', funnel: 'Cotizador',
      title: 'Cerrá el loop cotizador → socio (hoy desconectado)',
      detail: '0 usuarios del cotizador llegan a Flow_Asociado en 30d: el cotizador deriva al sistema de alta pero no hay traza que una ambos. Pasá prospecto_id de punta a punta para atribuir qué visita termina en socio.',
    });
  }

  // 4. Datos en vivo.
  if (a.source === 'snapshot') {
    recs.push({
      id: 'live', priority: 'alta', discipline: 'desarrollo', tag: 'Infraestructura', owner: 'dev',
      title: 'Conectá los datos en vivo',
      detail: `Hoy ves un snapshot del ${a.meta.asOf}. Con un Service Account de Mixpanel el embudo se actualiza solo cada pocos minutos.`,
    });
  }

  // 5. Pasos pendientes.
  for (const f of a.funnels) {
    for (const s of f.steps.filter((x) => x.status === 'pending')) {
      recs.push({
        id: `pending-${f.id}-${s.key}`, priority: 'media', discipline: 'desarrollo', tag: 'Instrumentación', owner: 'dev', funnel: f.name,
        title: `Instrumentá "${s.label}" (${f.name})`,
        detail: s.note || 'Sin un evento vivo no se puede medir ni experimentar en este paso.',
      });
    }
  }

  // 6. Funnels inconsistentes.
  for (const f of a.funnels.filter((x) => x.dataQuality === 'inconsistente')) {
    recs.push({
      id: `quality-${f.id}`, priority: 'media', discipline: 'desarrollo', tag: 'Higiene de datos', owner: 'dev', funnel: f.name,
      title: `Unificá la instrumentación de "${f.name}"`,
      detail: 'Los pasos no decrecen de forma consistente (conviven varios esquemas flow_N). No se puede confiar en su conversión hasta limpiarlo.',
    });
  }

  // 7. Tendencia positiva.
  const upTrend = (cotizador?.wow ?? []).filter((w) => w.deltaPct > 0.15).sort((x, y) => y.deltaPct - x.deltaPct);
  if (upTrend.length) {
    recs.push({
      id: 'trend-up', priority: 'baja', discipline: 'datos', tag: 'Tendencia', owner: 'producto', funnel: 'Cotizador',
      title: 'El medio del embudo viene mejorando',
      detail: `Vs. el período previo: ${upTrend.map((w) => `${w.label} +${pc(w.deltaPct)}`).join(', ')}. Con tráfico plano — identificá qué cambió para sostenerlo.`,
    });
  }

  // 8. Eventos muertos.
  recs.push({
    id: 'dead', priority: 'baja', discipline: 'desarrollo', tag: 'Higiene de datos', owner: 'dev',
    title: 'Limpiá los eventos muertos del tracking',
    detail: `${a.deadEvents.join(', ')} están prácticamente sin uso. Sacalos del esquema para no ensuciar el análisis.`,
  });

  // 9. Mejoras de diseño/producto/desarrollo por funnel.
  recs.push(...funnelImprovements(a));

  // 10. Comercial — HubSpot.
  recs.push(...hubspotRecommendations(a));

  // 11. Voz del cliente — verbatims NPS.
  recs.push(...voiceRecommendations(voice));

  // Priors: adjuntar la regla del Playbook que respalda cada reco.
  const withPriors = recs.map((r) => {
    const ruleId = REC_PLAYBOOK_MAP[r.id];
    const rule = ruleId ? PLAYBOOK_RULES.find((x) => x.id === ruleId) : undefined;
    return rule ? { ...r, backedBy: { id: rule.id, statement: rule.statement } } : r;
  });

  // Score triangulado (Mixpanel × HubSpot × PELG) y ranking por plata en juego, no por prioridad.
  // Capa 3: además del puntual, se adjunta la banda probabilística P10–P90 (Monte Carlo).
  const scored = withPriors.map((r) => {
    const tri = scoreRecommendation(r, a, priors);
    const band = simulateMargin(r, a, priors);
    if (band) tri.band = band;
    // EXPLORACIÓN (UCB): además de la media, el ranking premia el TECHO (P90) de la banda, para que una
    // oportunidad poco probada pero de alto potencial no quede enterrada por su promedio. Solo SUMA
    // (nunca baja a una reco) → el orden sigue anclado en el valor esperado.
    if (band && band.mean > 0 && tri.score > 0) {
      const upside = band.p90 / band.mean; // cuánto más alto es el techo vs el promedio
      tri.exploreScore = tri.score + EXPLORE_K * Math.max(0, tri.score * upside - tri.score);
      tri.explore = upside >= 1.5 && tri.confidence < 0.6; // alto techo + poca evidencia → "explorá esto"
    } else {
      tri.exploreScore = tri.score;
    }
    return { ...r, tri };
  });

  // URGENCIA DE LOS PROCESOS: un cambio de 'proceso' no tiene $ propio y, rankeado por la base de
  // prioridad, quedaba sepultado bajo los $ directos. Para que un cuello de proceso compita, su valor de
  // ranking se HEREDA del proceso económico que alimenta: una fracción del económico MEDIANO en juego
  // (robusto al outlier), escalado por su confianza/urgencia/esfuerzo igual que el resto. Sigue
  // mostrándose como ⚙️ Proceso (sin $ propio) — esto solo cambia el orden, no lo que se ve.
  const econMonthly = scored
    .filter((s) => s.tri.changeKind === 'economico' && s.tri.marginAtStakeArs != null)
    .map((s) => (s.tri.cadence === 'acumulado' ? s.tri.marginAtStakeArs! / 24 : s.tri.marginAtStakeArs!))
    .sort((a, b) => a - b);
  const refEcon = econMonthly.length ? econMonthly[Math.floor(econMonthly.length / 2)] : 0; // mediana
  // El gate promueve ENABLERS estructurales (cierran el loop, conectan datos en vivo, habilitan medir
  // y experimentar). NO promueve la higiene cosmética: sacar un canal no calificado del denominador
  // mejora la medición pero NO destraba el flujo económico, así que rankea por su prioridad propia
  // (modesta) y no hereda el valor del proceso económico. Evita inflar su importancia.
  const PROCESS_HYGIENE = new Set(['channel-junk']);
  if (refEcon > 0) {
    for (const s of scored) {
      if (s.tri.changeKind === 'proceso' && !PROCESS_HYGIENE.has(s.id)) {
        const inherited = (refEcon * PROCESS_GATE_WEIGHT * s.tri.confidence * s.tri.urgency) / s.tri.effort;
        s.tri.score = inherited;
        s.tri.exploreScore = inherited;
      }
    }
  }

  // Ordena por el score de exploración (UCB); para los 'proceso', score = valor heredado del proceso económico.
  return scored.sort((x, y) => (y.tri?.exploreScore ?? y.tri?.score ?? 0) - (x.tri?.exploreScore ?? x.tri?.score ?? 0));
}
