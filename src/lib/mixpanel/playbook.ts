// El Playbook: la memoria de growth de armatuplan. El motor anota acá cada cosa que aprende
// (observaciones del funnel + resultados de experimentos). Hoy sembrado con los hallazgos reales
// de Mixpanel; a futuro, cada experimento que concluye appendea su regla (vía Supabase en prod).

export type RuleStatus = 'validado' | 'refutado' | 'observacion' | 'guardrail';
export type RuleSource = 'observacion' | 'experimento' | 'manual';

export interface PlaybookRule {
  id: string;
  category: string;
  status: RuleStatus;
  statement: string;
  evidence: string;
  date: string;
  source: RuleSource;
}

export const PLAYBOOK_UPDATED = '2026-06-10';

export const RULE_CATEGORIES = [
  'Metodología / Triangulación',
  'Canales',
  'Formularios / UX',
  'Conversión',
  'Segmentos / Audiencia',
  'Pricing / Oferta',
  'Comercial / CRM',
  'Instrumentación / Sistema',
];

export const STATUS_META: Record<RuleStatus, { label: string; emoji: string }> = {
  validado: { label: 'Validado', emoji: '✅' },
  refutado: { label: 'Refutado', emoji: '❌' },
  observacion: { label: 'Observación', emoji: '🔍' },
  guardrail: { label: 'Guardrail', emoji: '⚠️' },
};

export const PLAYBOOK_RULES: PlaybookRule[] = [
  // Metodología / Triangulación — cómo decide y mide SysData (el método, no solo los hallazgos).
  { id: 'm-triangulacion', category: 'Metodología / Triangulación', status: 'validado', source: 'manual', date: '2026-06-10',
    statement: 'Toda decisión se triangula entre Mixpanel (comportamiento), HubSpot (comercial) y PELG (plata). Ninguna fuente sola alcanza: cada una, aislada, miente.',
    evidence: 'Definición del método, 2026-06-10' },
  { id: 'm-margen', category: 'Metodología / Triangulación', status: 'validado', source: 'manual', date: '2026-06-10',
    statement: 'Priorizar por MARGEN en juego (volumen recuperable × conversión a cápita × (LTV−CAC)), no por % de fuga. La fuga más grande no siempre es la más valiosa (ej: fuga sobre tráfico de display ≈ sin valor).',
    evidence: 'Score triangulado' },
  { id: 'm-significancia', category: 'Metodología / Triangulación', status: 'guardrail', source: 'manual', date: '2026-06-10',
    statement: 'Un experimento sin significancia estadística (p<0,05) NO es un resultado: es ruido. El veredicto exige test de dos proporciones, no un % crudo.',
    evidence: 'Motor de medición' },
  { id: 'm-ripple-capita', category: 'Metodología / Triangulación', status: 'validado', source: 'manual', date: '2026-06-10',
    statement: 'El ripple de un experimento se traza hasta la cápita. Un lift en un paso intermedio que no llega a socio cerrado es hueco.',
    evidence: 'Definición de medición' },
  { id: 'm-guardrail3', category: 'Metodología / Triangulación', status: 'guardrail', source: 'manual', date: '2026-06-10',
    statement: 'Cada experimento se chequea en 3 guardrails: comportamiento (paso aguas abajo cae), comercial (win rate / calidad del lead) y económico (CAC sube / margen baja).',
    evidence: 'Motor de medición' },
  { id: 'm-ab', category: 'Metodología / Triangulación', status: 'guardrail', source: 'manual', date: '2026-06-10',
    statement: 'Preferir A/B (variante vs control) sobre antes/después. El antes/después confunde el efecto con cualquier cosa que cambió en el tiempo (campañas, estacionalidad).',
    evidence: 'Control de confounds' },
  { id: 'm-honestidad', category: 'Metodología / Triangulación', status: 'guardrail', source: 'manual', date: '2026-06-10',
    statement: 'Lo que no está medido se declara SUPUESTO, nunca se hace pasar por dato. Hoy son supuestos: LTV (permanencia 24m, margen 18%), dato→cápita (6%), CAC por canal (se usa blended).',
    evidence: 'Capa de honestidad del modelo económico' },
  { id: 'm-prospecto', category: 'Metodología / Triangulación', status: 'guardrail', source: 'manual', date: '2026-06-10',
    statement: 'El cruce prospecto_id (Mixpanel↔HubSpot) es EL habilitador: desbloquea la atribución real visita→cápita y el ripple medido (no modelado). Es la prioridad estructural.',
    evidence: 'Decisión de arquitectura' },

  // Canales
  { id: 'r-display', category: 'Canales', status: 'guardrail', source: 'observacion', date: '2026-06-09',
    statement: 'El canal "display" no convierte (~0%) pese a traer el 23% del tráfico. No escalar.',
    evidence: '9.628 visitas/mes, 2 datos. Funnel visita→datos por utm_source' },
  { id: 'r-meta', category: 'Canales', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'meta_ads (45%) y meta (31%) convierten 2-3x el promedio (16%). Candidatos a escalar.',
    evidence: 'Funnel visita→datos por canal' },
  { id: 'r-base', category: 'Canales', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'google y medicus_home son la base de tráfico (~30k/mes) y convierten 16%: el piso sano.',
    evidence: 'utm_source' },

  // Formularios / UX
  { id: 'r-leak', category: 'Formularios / UX', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'El 88% abandona entre visitar el cotizador y completar datos personales. La mayor fuga del funnel.',
    evidence: '41.820 → 5.223, funnel secuencial 30d' },
  { id: 'r-trend', category: 'Formularios / UX', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Con tráfico plano, completó datos +40% e intención +66% vs período previo: algo en el medio del funnel mejoró. Identificar qué para sostenerlo.',
    evidence: 'WoW abr vs may' },

  // Conversión
  { id: 'r-b2b', category: 'Conversión', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Contacto convierte 47% pero Empresa B2B solo 15%. El form/flujo B2B necesita revisión.',
    evidence: 'Flow_Contacto vs Flow_Empresa' },

  // Segmentos / Audiencia (auditoría de datos reales 2026-06-10)
  { id: 's-edad', category: 'Segmentos / Audiencia', status: 'observacion', source: 'observacion', date: '2026-06-10',
    statement: 'El núcleo de la base es 31–45 (101k de 250.571 contactos con edad). 18–30 = 81k. La edad está poblada en el 37% de los contactos: usable para segmentar.',
    evidence: 'HubSpot contact properties · edad' },
  { id: 's-demanda', category: 'Segmentos / Audiencia', status: 'observacion', source: 'observacion', date: '2026-06-10',
    statement: 'La demanda del flujo WhatsApp es 40% individual / 30% familiar / 30% SIN TAGGEAR. Individual es el segmento más grande; el 30% sin coverage es un agujero de instrumentación.',
    evidence: 'Mixpanel flow_1_envio_formulario × coverage, 30d' },
  { id: 's-nps', category: 'Segmentos / Audiencia', status: 'observacion', source: 'observacion', date: '2026-06-10',
    statement: 'NPS direccional ~48 (muestra 400 de 1.377 con score, promedio 8.0) + 733 verbatims sin explotar. OJO: el NPS nativo de HubSpot está VACÍO; el dato vive en un campo custom y es ralo — termómetro, no corte fino.',
    evidence: 'HubSpot campo custom nps/nps_mensaje' },
  { id: 's-join', category: 'Segmentos / Audiencia', status: 'guardrail', source: 'observacion', date: '2026-06-10',
    statement: 'Para que los cortes (edad/canal/composición) sean PERSONAS reales con cápita atrás, falta cerrar el cruce — que HOY está bloqueado por identidad fragmentada (ver r-loop: lead y socio son perfiles disjuntos). Hasta arreglar eso, son cortes aislados, no cross-tabs medidos, y el dato→cápita 6% sigue SUPUESTO.',
    evidence: 'Investigación del cruce 2026-06-10' },

  // Pricing / Oferta
  { id: 'r-aporte', category: 'Pricing / Oferta', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Hipótesis a validar: cuando el aporte cubre la cuota, la intención de alta sube. El evento existe — armar experimento.',
    evidence: 'evento cotizador__aporte_cubre_cuota' },

  // Comercial / CRM (HubSpot)
  { id: 'r-winrate', category: 'Comercial / CRM', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Win rate del pipeline Retail: 38% (4.979 ganados / 8.092 perdidos). Subir el win rate es palanca directa de cápitas.',
    evidence: 'HubSpot deals por dealstage' },
  { id: 'r-hsstock', category: 'Comercial / CRM', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'El mayor stock abierto del pipeline está en "Propuesta Enviada" (~13.480 deals). Cuello comercial — revisar seguimiento.',
    evidence: 'HubSpot distribución por etapa' },
  { id: 'v-seguimiento', category: 'Comercial / CRM', status: 'observacion', source: 'observacion', date: '2026-06-10',
    statement: 'El #1 motivo de detractores en el NPS es el SEGUIMIENTO: el asesor no responde o responde tarde (93 menciones, score 2.6) — explica el 35% de TODA la detracción. Es SISTÉMICO (aparece en todos los canales por igual: REDES, WEB, CHENGO, WhatsApp), no un bug de un canal. Explica los ~13.485 deals atascados en "Propuesta Enviada": falla de PROCESO comercial (SLA de respuesta), no de producto.',
    evidence: 'Verbatims NPS × canal, 2026-06-10' },
  { id: 'v-promotores', category: 'Comercial / CRM', status: 'guardrail', source: 'observacion', date: '2026-06-10',
    statement: 'EL ASESOR HUMANO ES EL EJE DEL NPS: los 407 promotores valoran sobre todo claridad/buena info (186) y profesionalismo (135). El mismo eje en los dos extremos: presente y claro = promotor, ausente = detractor. GUARDRAIL: no automatizar/sacar el contacto humano — mejorar su SLA y consistencia.',
    evidence: 'Verbatims NPS de promotores (score≥9), 2026-06-10' },
  { id: 'r-hsloop', category: 'Comercial / CRM', status: 'guardrail', source: 'observacion', date: '2026-06-09',
    statement: 'Ya tenemos ambos lados del flujo (cotizador en Mixpanel + deals en HubSpot), pero sin cruzar por prospecto_id no se puede medir visita→cápita end-to-end.',
    evidence: 'Mixpanel + HubSpot' },

  // Instrumentación / Sistema
  { id: 'r-loop', category: 'Instrumentación / Sistema', status: 'guardrail', source: 'observacion', date: '2026-06-10',
    statement: 'El cruce visita→cápita está BLOQUEADO por IDENTIDAD FRAGMENTADA: en Mixpanel los perfiles de LEAD (hubspot_id 3.988 / coverage) y los de SOCIO (vigencia 404) son DISJUNTOS — overlap 0. Las llaves existen (prospecto_id 15.117) pero NO en el registro de resultado (el perfil con vigencia está casi vacío). En HubSpot la llave matchea 89%, pero los leads de WhatsApp no tienen deal asociado y lifecyclestage=customer casi no se usa (56). FIX: estampar prospecto_id en el alta de socio, o cruzar en el warehouse.',
    evidence: 'Investigación del cruce 2026-06-10 (Mixpanel Engage + HubSpot batch, solo lectura)' },
  { id: 'r-dead', category: 'Instrumentación / Sistema', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Eventos muertos, no usar: pago, firma_solicitud, Flow_FollowUp_Alta, flow_2_datos_titular.',
    evidence: '<5 usuarios/7d' },
  { id: 'r-utm', category: 'Instrumentación / Sistema', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Contacto/Empresa/Alta no taggean utm_source: no se puede analizar su origen.',
    evidence: 'breakdown = undefined' },
  { id: 'r-alta', category: 'Instrumentación / Sistema', status: 'guardrail', source: 'observacion', date: '2026-06-09',
    statement: 'El flujo Alta (flow_N) tiene instrumentación inconsistente (asociado 3.900 > completado 1.324). No confiar en su conversión hasta unificar.',
    evidence: 'multi-funnel counts' },
  { id: 'r-resolved', category: 'Instrumentación / Sistema', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Pasos resueltos: inicio_alta = cotizador__alta_online_modal__click; cliente = handoff al funnel Alta (Flow_Asociado).',
    evidence: 'validación secuencial' },
];

export function playbookToMarkdown(rules: PlaybookRule[]): string {
  let md = `# Growth Playbook — armatuplan\n_Reglas que el motor aprende y anota. Actualizado: ${PLAYBOOK_UPDATED}_\n`;
  for (const cat of RULE_CATEGORIES) {
    const inCat = rules.filter((r) => r.category === cat);
    if (!inCat.length) continue;
    md += `\n## ${cat}\n`;
    for (const r of inCat) {
      const s = STATUS_META[r.status];
      md += `- ${s.emoji} **[${s.label}]** ${r.statement} _(${r.evidence} · ${r.date})_\n`;
    }
  }
  return md;
}
