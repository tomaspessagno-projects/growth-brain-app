// SCORE TRIANGULADO — el "dónde / cuándo / cómo atacar".
// Cada oportunidad se puntúa por MARGEN EN JUEGO (no por % de fuga), cruzando:
//   Mixpanel (volumen recuperable) × HubSpot (conversión comercial) × PELG (margen por cápita).
// Devuelve la BASE (qué dato de cada fuente lo sostiene), la FÓRMULA + DESGLOSE paso a paso
// (para que el usuario entienda POR QUÉ dice lo que dice), y la HONESTIDAD (qué es supuesto).

import type { Analytics } from '../mixpanel/analytics';
import type { Recommendation } from '../mixpanel/recommendations';
import { WINRATE_TARGET } from '../mixpanel/benchmarks';
import { ltvArs, ECON_ASSUMPTIONS } from '../economics/model';
import { recFamily, priorConfidenceBoost, recoveryM0, FAMILY_LABEL, type PriorMap } from './priors';
import type { MarginBand } from './montecarlo';
import { marginFromScenario, engineAssumptions, type MarginInputs, type ScenarioAssumptions } from '../economics/scenario';

export type SrcTag = 'Mixpanel' | 'HubSpot' | 'PELG' | 'Supuesto' | 'Playbook';

export interface BreakdownRow {
  label: string;
  value: string;
  src?: SrcTag;
}

export interface TriScore {
  marginAtStakeArs: number | null; // $ en juego
  cadence: 'mensual' | 'acumulado' | null;
  reach: number | null; // usuarios / deals afectados
  confidence: number; // 0..1
  effort: number; // 1..5 (t-shirt)
  urgency: number; // multiplicador (1 = base)
  score: number; // ranking compuesto (mensualizado)
  basis: { mixpanel?: string; hubspot?: string; pelg?: string };
  honesty: string[];
  // Transparencia (#2): la lógica interna explícita.
  formula: string;
  breakdown: BreakdownRow[];
  confidenceReason: string;
  urgencyReason: string;
  effortReason: string;
  band?: MarginBand; // Capa 3: rango probabilístico P10–P90 (Monte Carlo sobre los supuestos)
  exploreScore?: number; // ranking con EXPLORACIÓN (UCB): media + peso del techo P90 de la banda
  explore?: boolean; // "poco probada, alto techo" → la sube la exploración, no su promedio
  // POR QUÉ importa el cambio (segundo eje, además del $): directo económico, o un cambio de
  // proceso/performance que NO mueve plata directa pero alimenta aguas abajo un proceso que SÍ es económico.
  changeKind: 'economico' | 'proceso';
  feedsInto?: string; // si es 'proceso': el proceso económico aguas abajo al que afecta
  // Para recalcular la cifra con TUS supuestos (panel de escenarios): los inputs MEDIDOS y los
  // supuestos que usó el motor. Mismo input + tus supuestos ⇒ tu cifra, con la misma fórmula.
  marginInputs?: MarginInputs;
  assumptions?: ScenarioAssumptions;
}

const DATO_CAPITA = ECON_ASSUMPTIONS.datoToCapitaPct.value;
const fmtArs = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
const fmtArsShort = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(1)} mil M` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}k` : `$${Math.round(n)}`;
const pc = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;
const num = (n: number) => Math.round(n).toLocaleString('es-AR');

// Esfuerzo t-shirt por disciplina (proxy hasta que el equipo lo estime).
const EFFORT: Record<string, number> = { datos: 1, producto: 2, diseno: 2, desarrollo: 3 };
const EFFORT_REASON: Record<string, string> = {
  datos: 'Disciplina datos: cambio liviano (config / análisis).',
  producto: 'Disciplina producto: cambio de flujo o copy, esfuerzo medio.',
  diseno: 'Disciplina diseño: rediseño de UI, esfuerzo medio.',
  desarrollo: 'Disciplina desarrollo: requiere ingeniería, esfuerzo alto.',
};

function confidenceFor(rec: Recommendation, priors?: PriorMap): { c: number; reason: string } {
  let c = 0.5;
  let reason = 'Base 50% (regla determinista sobre los datos).';
  if (rec.backedBy) {
    c += 0.2;
    reason = 'Base 50% + 20% por estar respaldada por una regla del Playbook (prior aprendido).';
  }
  // Capa 4: confianza extra por experimentos de la misma familia que ya validaron esta clase de mejora.
  const prior = priors?.[recFamily(rec)];
  const boost = priorConfidenceBoost(prior);
  if (boost > 0 && prior) {
    c += boost;
    const total = prior.validated + prior.refuted + prior.inconclusive;
    reason += ` + ${Math.round(boost * 100)}% aprendido: ${prior.validated}/${total} experimentos de "${FAMILY_LABEL[prior.family]}" la respaldan.`;
  }
  return { c: Math.max(0.3, Math.min(0.95, c)), reason };
}

export function scoreRecommendation(rec: Recommendation, a: Analytics, priors?: PriorMap): TriScore {
  const cot = a.funnels.find((f) => f.id === 'cotizador');
  const h = a.hubspot;
  const effort = EFFORT[rec.discipline] ?? 2;
  const effortReason = EFFORT_REASON[rec.discipline] ?? 'Esfuerzo medio (estimado).';
  const { c: confidence, reason: confidenceReason } = confidenceFor(rec, priors);
  let marginAtStakeArs: number | null = null;
  let marginInputs: MarginInputs | undefined;
  let assumptions: ScenarioAssumptions | undefined;
  let cadence: TriScore['cadence'] = null;
  let reach: number | null = null;
  let urgency = 1;
  let urgencyReason = 'Urgencia base.';
  let formula = '';
  let breakdown: BreakdownRow[] = [];
  const basis: TriScore['basis'] = {};
  const honesty: string[] = [];

  // POR QUÉ importa (segundo eje). Default por familia: instrumentación y voz son cambios de PROCESO
  // (impacto económico INDIRECTO, aguas abajo); el resto es económico (mueve $ directo o un paso del
  // funnel que se traduce a $). Se afina por caso abajo (ej. el loop).
  const family = recFamily(rec);
  let changeKind: TriScore['changeKind'] =
    family === 'instrumentacion' || family === 'voz' ? 'proceso' : 'economico';
  let feedsInto: string | undefined =
    family === 'instrumentacion'
      ? 'la confiabilidad de la medición del funnel — sin medir bien no se puede priorizar ni experimentar (aguas abajo: TODO el ranking en $)'
      : family === 'voz'
      ? 'el proceso comercial y la experiencia del socio — aguas abajo mueve la conversión a cápita y la retención'
      : undefined;

  switch (rec.id) {
    case 'channel-junk': {
      const junk = cot?.channels?.find((c) => c.flag === 'junk');
      if (junk) {
        // NO es plata recuperable. Es tráfico no calificado (≈0% de conversión) que infla el
        // denominador del cotizador y hace ver peor la conversión real. La acción es HIGIENE DEL
        // DATO (sacarlo del cálculo), no recuperar pesos. La programática detrás es presupuesto
        // PLANIFICADO y EXCLUIDO por el cliente: no es gasto medido ni reasignable como ganancia.
        reach = junk.visits;
        changeKind = 'proceso';
        feedsInto =
          'la conversión REAL del cotizador — al excluir el tráfico no calificado, el denominador deja de estar inflado y la conversión se mide sobre tráfico con intención';
        urgency = 1.1;
        urgencyReason = 'Media: no mueve plata directa; es higiene del dato para no medir mal la conversión.';
        basis.mixpanel = `${num(junk.visits)} visitas (${pc(junk.sharePct)} del tráfico) a ${pc(junk.conv)} de conversión — no calificado`;
        if (junk.excluded) basis.pelg = 'Programática: presupuesto PLANIFICADO y EXCLUIDO por el cliente (no es gasto medido ni recuperable)';
        formula = 'Sin $ recuperable — higiene del dato: excluir el tráfico no calificado para medir bien la conversión';
        breakdown = [
          { label: 'Visitas del canal', value: `${num(junk.visits)} (${pc(junk.sharePct)} del tráfico)`, src: 'Mixpanel' },
          { label: 'Conversión a datos', value: `${pc(junk.conv)} — prácticamente no convierte`, src: 'Mixpanel' },
          { label: 'Presupuesto detrás', value: junk.excluded ? 'Programática PLANIFICADA y excluida por el cliente' : 'sin gasto medido en SysData', src: 'PELG' },
          { label: 'Acción', value: 'excluirlo del denominador de conversión (no “recuperar pesos”)' },
        ];
        honesty.push(
          'NO es plata recuperable: la programática es presupuesto PLANIFICADO y EXCLUIDO por el cliente, y reasignar gasto no es ganancia. El valor real acá es medir bien la conversión, no un retorno en pesos.',
        );
      }
      break;
    }
    case 'channel-best': {
      // Palanca de adquisición REAL (canales que convierten muy por encima del 16% promedio) pero
      // NO cuantificable en $ todavía: el margen depende de cuánto presupuesto incremental se les
      // pueda mover y a qué CPL por canal, dato que hoy no tenemos. No le ponemos número para no
      // inflar una falsa expectativa (antes se calculaba asumiendo que el tráfico basura rendiría
      // al promedio — un contrafáctico que no se sostiene).
      const best = (cot?.channels ?? []).filter((c) => c.flag === 'best');
      if (best.length) {
        reach = best.reduce((a, c) => a + c.visits, 0);
        urgency = 1.1;
        urgencyReason = 'Media-alta: convierten muy por encima del promedio, pero hoy traen poco volumen.';
        const detail = best.map((c) => `${c.source} ${pc(c.conv)}`).join(' · ');
        basis.mixpanel = `${detail} (vs ~16% promedio) · ${num(reach)} visitas/mes`;
        formula = 'Palanca de adquisición sin $ cuantificado — falta presupuesto incremental + CPL por canal';
        breakdown = [
          { label: 'Canales de alta conversión', value: detail, src: 'Mixpanel' },
          { label: 'Volumen actual', value: `${num(reach)} visitas/mes (bajo)`, src: 'Mixpanel' },
          { label: 'Qué falta para el $', value: 'cuánto presupuesto incremental se les puede mover y a qué CPL (no medido)' },
        ];
        honesty.push(
          'Sin $ cuantificado: escalar buenos canales rinde, pero el margen depende del presupuesto incremental y del CPL por canal, que hoy no tenemos. No lo inflamos con un número.',
        );
      }
      break;
    }
    case 'imp-cot-design':
    case 'imp-cot-product': {
      const leak = cot?.leakDropCount ?? 0;
      // Capa 4: la fracción recuperable la APRENDE el motor por familia (empirical-Bayes);
      // si todavía no hay experimentos, cae al supuesto declarado (25%).
      const fam = recFamily(rec);
      const learned = priors?.[fam];
      // Sin experimentos aún, cae al M0 de la familia (formularios arranca más alto por evidencia CRO).
      const baseRecovery = learned?.recoveryMean ?? recoveryM0(fam);
      const recMult = rec.id === 'imp-cot-design' ? 1 : 0.6; // producto ataca la misma fuga con menos recuperación
      if (leak > 0) {
        // La cifra sale de la fórmula compartida (marginFromScenario) con los supuestos del motor;
        // el usuario puede recalcularla con los suyos en el panel de escenarios (misma fórmula).
        const asum = engineAssumptions(baseRecovery);
        marginInputs = { kind: 'leak', leak, recMult };
        assumptions = asum;
        marginAtStakeArs = marginFromScenario(marginInputs, asum);
        const recFrac = baseRecovery * recMult; // recuperable efectivo, para mostrar el desglose
        const recovered = leak * recFrac;
        const capitas = recovered * DATO_CAPITA;
        cadence = 'mensual';
        reach = leak;
        urgency = rec.id === 'imp-cot-design' ? 1.3 : 1.1;
        urgencyReason = rec.id === 'imp-cot-design'
          ? 'Alta: es la mayor fuga del funnel, el lever más grande del producto.'
          : 'Media-alta: ataca la misma fuga con menos recuperación esperada.';
        basis.mixpanel = `${num(leak)} se caen en ${cot?.leakTransition} (recuperable ${pc(recFrac)})`;
        basis.pelg = `${num(recovered)} datos × ${pc(DATO_CAPITA)} × LTV ${fmtArs(ltvArs())}`;
        formula = 'Fuga del paso × recuperable × dato→cápita × LTV de contribución';
        breakdown = [
          { label: `Fuga en ${cot?.leakTransition}`, value: `${num(leak)} usuarios/mes`, src: 'Mixpanel' },
          { label: 'Recuperable con la mejora', value: `× ${pc(recFrac)} = ${num(recovered)} datos`, src: learned && learned.n > 0 ? 'Playbook' : 'Supuesto' },
          { label: 'Dato → cápita', value: `× ${pc(DATO_CAPITA)} = ${num(capitas)} cápitas`, src: 'Supuesto' },
          { label: 'LTV de contribución', value: `× ${fmtArs(ltvArs())}`, src: 'PELG' },
          { label: '= Margen en juego', value: `${fmtArsShort(marginAtStakeArs)}/mes` },
        ];
        honesty.push(
          learned && learned.n > 0
            ? `Recuperable ${pc(recFrac)} APRENDIDO de ${learned.n} experimento(s) de "${FAMILY_LABEL[fam]}" (antes era 25% supuesto). dato→cápita ${pc(DATO_CAPITA)} sigue supuesto (falta el cruce prospecto_id).`
            : `Recuperable ${pc(recFrac)} y dato→cápita ${pc(DATO_CAPITA)} son supuestos.`,
        );
        honesty.push(
          'Solo parte de la fuga es por el formulario: ~17% del abandono se atribuye a "checkout largo/complicado" (Baymard, auto-reportado) — el resto tiene otras causas (precio, intención). Es un techo de atribución, no garantía de recuperación.',
        );
      }
      break;
    }
    case 'hs-winrate': {
      if (h && h.winRate != null) {
        const decided = h.won + h.lost;
        const gap = Math.max(0, WINRATE_TARGET - h.winRate);
        const extraWon = decided * gap;
        if (extraWon > 0) {
          marginInputs = { kind: 'winrate', decided, gap };
          assumptions = engineAssumptions();
          marginAtStakeArs = marginFromScenario(marginInputs, assumptions);
          cadence = 'acumulado';
          reach = h.lost;
          urgency = 1.2;
          urgencyReason = 'Alta: la tasa de cierre de ventas es palanca directa de cápitas sobre el stock comercial.';
          basis.hubspot = `cierre ${pc(h.winRate)} vs meta ${pc(WINRATE_TARGET)} sobre ${num(decided)} negocios`;
          basis.pelg = `${num(extraWon)} cápitas × LTV ${fmtArs(ltvArs())}`;
          formula = 'Negocios decididos × brecha a la meta de cierre × LTV';
          breakdown = [
            { label: 'Negocios decididos (ganados + perdidos)', value: num(decided), src: 'HubSpot' },
            { label: 'Brecha a la meta de cierre', value: `${pc(WINRATE_TARGET)} − ${pc(h.winRate)} = ${pc(gap)}`, src: 'HubSpot' },
            { label: 'Cápitas extra recuperables', value: `= ${num(extraWon)}`, src: 'HubSpot' },
            { label: 'LTV de contribución', value: `× ${fmtArs(ltvArs())}`, src: 'PELG' },
            { label: '= Margen (acumulado)', value: `${fmtArsShort(marginAtStakeArs)}` },
          ];
          honesty.push('Figura ACUMULADA (stock histórico de negocios), no mensual. No comparar 1:1 con las /mes.');
        }
      }
      break;
    }
    case 'hs-stock': {
      if (h?.biggestOpenStage) {
        reach = h.biggestOpenStage.count;
        const wr = h.winRate ?? 0.38;
        marginInputs = { kind: 'stock', stock: h.biggestOpenStage.count, winRate: wr };
        assumptions = engineAssumptions();
        marginAtStakeArs = marginFromScenario(marginInputs, assumptions);
        cadence = 'acumulado';
        urgencyReason = 'Media: stock dormido; parte ya está en curso.';
        basis.hubspot = `${num(h.biggestOpenStage.count)} negocios en "${h.biggestOpenStage.label}"`;
        basis.pelg = `× tasa de cierre × LTV ${fmtArs(ltvArs())}`;
        formula = 'Negocios atascados × cierre esperado × LTV';
        breakdown = [
          { label: `Negocios en "${h.biggestOpenStage.label}"`, value: num(h.biggestOpenStage.count), src: 'HubSpot' },
          { label: 'Cierre esperado', value: `× ${pc(wr)}`, src: 'HubSpot' },
          { label: 'LTV de contribución', value: `× ${fmtArs(ltvArs())}`, src: 'PELG' },
          { label: '= Margen (acumulado)', value: `${fmtArsShort(marginAtStakeArs)}` },
        ];
        honesty.push('Stock acumulado; parte ya está en curso. No todo es recuperable.');
      }
      break;
    }
    case 'loop-desconectado':
    case 'hs-loop': {
      urgency = 1.4;
      urgencyReason = 'Máxima: es el habilitador estructural — desbloquea medir todo lo demás.';
      basis.mixpanel = 'cotizador (visitas)';
      basis.hubspot = 'negocios (cápitas)';
      formula = 'Sin $ propio — habilitador: une comportamiento (Mixpanel) con cápitas (HubSpot)';
      breakdown = [
        { label: 'Hoy', value: 'visita y cápita viven en sistemas separados', src: 'Mixpanel' },
        { label: 'Con prospecto_id', value: 'se atribuye qué visita termina en socio', src: 'HubSpot' },
        { label: 'Desbloquea', value: 'ripple-a-cápita MEDIDO (no modelado) en cada experimento' },
      ];
      honesty.push('No tiene $ propio: es el habilitador. Sin esto, la atribución visita→cápita es modelada, no medida.');
      changeKind = 'proceso';
      feedsInto = 'medir el ripple visita→cápita — habilita medir el impacto económico REAL de todo lo demás';
      break;
    }
    default:
      if (changeKind === 'proceso') {
        formula = 'Cambio de proceso/performance — sin $ directo, pero alimenta un proceso económico aguas abajo.';
        breakdown = [
          { label: 'Tipo de cambio', value: 'Proceso / performance (impacto económico INDIRECTO)' },
          { label: 'Dónde', value: `${rec.tag} · ${rec.discipline}` },
          { label: 'Por qué importa', value: feedsInto ?? 'alimenta un proceso económico aguas abajo' },
        ];
        honesty.push('No tiene $ directo: es proceso/performance. Se prioriza por urgencia y por el proceso económico que destraba, no por plata directa.');
      } else {
        formula = 'Económico, pero sin cuantificar aún — falta el dato que lo vuelve $.';
        breakdown = [
          { label: 'Tipo de cambio', value: 'Económico (impacto en $ todavía sin cuantificar)' },
          { label: 'Dónde', value: `${rec.tag} · ${rec.discipline}` },
          { label: 'Qué falta para el $', value: 'instrumentación o valor-por-lead que lo haga medible.' },
        ];
        honesty.push('Económico pero no cuantificable en $ todavía: rankea por prioridad hasta tener el dato.');
      }
      break;
  }

  // Score mensualizado: lo acumulado se prorratea (~24 meses) para no aplastar a lo mensual.
  const monthlyValue =
    marginAtStakeArs == null
      ? priorityBase(rec.priority)
      : cadence === 'acumulado'
      ? marginAtStakeArs / 24
      : marginAtStakeArs;
  const score = (monthlyValue * confidence * urgency) / effort;

  return { marginAtStakeArs, marginInputs, assumptions, cadence, reach, confidence, effort, urgency, score, basis, honesty, formula, breakdown, confidenceReason, urgencyReason, effortReason, changeKind, feedsInto };
}

function priorityBase(p: Recommendation['priority']): number {
  return p === 'alta' ? 4_000_000 : p === 'media' ? 800_000 : 150_000;
}
