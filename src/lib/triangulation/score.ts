// SCORE TRIANGULADO — el "dónde / cuándo / cómo atacar".
// Cada oportunidad se puntúa por MARGEN EN JUEGO (no por % de fuga), cruzando:
//   Mixpanel (volumen recuperable) × HubSpot (conversión comercial) × PELG (margen por cápita).
// Devuelve la BASE (qué dato de cada fuente lo sostiene), la FÓRMULA + DESGLOSE paso a paso
// (para que el usuario entienda POR QUÉ dice lo que dice), y la HONESTIDAD (qué es supuesto).

import type { Analytics } from '../mixpanel/analytics';
import type { Recommendation } from '../mixpanel/recommendations';
import { WINRATE_TARGET } from '../mixpanel/benchmarks';
import { ltvArs, marginFromRecoveredEvents, ECON_ASSUMPTIONS } from '../economics/model';

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
}

const RECOVERY = ECON_ASSUMPTIONS.recoveryFraction.value;
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

function confidenceFor(rec: Recommendation): { c: number; reason: string } {
  let c = 0.5;
  let reason = 'Base 50% (regla determinista sobre los datos).';
  if (rec.backedBy) {
    c += 0.2;
    reason = 'Base 50% + 20% por estar respaldada por una regla del Playbook (prior aprendido).';
  }
  return { c: Math.max(0.3, Math.min(0.9, c)), reason };
}

export function scoreRecommendation(rec: Recommendation, a: Analytics): TriScore {
  const cot = a.funnels.find((f) => f.id === 'cotizador');
  const h = a.hubspot;
  const effort = EFFORT[rec.discipline] ?? 2;
  const effortReason = EFFORT_REASON[rec.discipline] ?? 'Esfuerzo medio (estimado).';
  const { c: confidence, reason: confidenceReason } = confidenceFor(rec);
  let marginAtStakeArs: number | null = null;
  let cadence: TriScore['cadence'] = null;
  let reach: number | null = null;
  let urgency = 1;
  let urgencyReason = 'Urgencia base.';
  let formula = '';
  let breakdown: BreakdownRow[] = [];
  const basis: TriScore['basis'] = {};
  const honesty: string[] = [];

  switch (rec.id) {
    case 'channel-junk': {
      const junk = cot?.channels?.find((c) => c.flag === 'junk');
      if (junk?.spendArs) {
        marginAtStakeArs = junk.spendArs;
        cadence = 'mensual';
        reach = junk.visits;
        urgency = 1.3;
        urgencyReason = 'Alta: es gasto activo que se quema cada mes sin retorno.';
        basis.pelg = `${fmtArs(junk.spendArs)}/mes de gasto`;
        basis.mixpanel = `${pc(junk.conv)} de conversión a datos (${num(junk.visits)} visitas)`;
        formula = 'Gasto mensual del canal que no convierte = plata reasignable';
        breakdown = [
          { label: 'Gasto del canal', value: `${fmtArs(junk.spendArs)}/mes`, src: 'PELG' },
          { label: 'Conversión a datos', value: `${pc(junk.conv)} (${num(junk.visits)} visitas)`, src: 'Mixpanel' },
          { label: '= Gasto reasignable', value: `${fmtArsShort(junk.spendArs)}/mes` },
        ];
        honesty.push('El $ es gasto reasignable, no margen perdido. El canal ya está excluido por el cliente.');
      }
      break;
    }
    case 'channel-best': {
      const extra = cot?.opportunity?.extraDatos ?? 0;
      if (extra > 0) {
        marginAtStakeArs = marginFromRecoveredEvents(extra);
        cadence = 'mensual';
        reach = extra;
        urgency = 1.1;
        urgencyReason = 'Media-alta: los mejores canales hoy traen poco volumen; escalar rinde más que el tráfico masivo.';
        basis.mixpanel = `+${num(extra)} datos/mes si rindieran al promedio`;
        basis.pelg = `LTV ${fmtArs(ltvArs())} × ${pc(DATO_CAPITA)} a cápita`;
        formula = 'Datos extra potenciales × dato→cápita × LTV de contribución';
        breakdown = [
          { label: 'Datos extra si rindieran al promedio', value: `+${num(extra)}/mes`, src: 'Mixpanel' },
          { label: 'Dato → cápita', value: `× ${pc(DATO_CAPITA)} = ${num(extra * DATO_CAPITA)} cápitas`, src: 'Supuesto' },
          { label: 'LTV de contribución', value: `× ${fmtArs(ltvArs())}`, src: 'PELG' },
          { label: '= Margen', value: `${fmtArsShort(marginAtStakeArs)}/mes` },
        ];
        honesty.push(`Asume dato→cápita ${pc(DATO_CAPITA)} (supuesto, sin prospecto_id).`);
      }
      break;
    }
    case 'imp-cot-design':
    case 'imp-cot-product': {
      const leak = cot?.leakDropCount ?? 0;
      const recFrac = rec.id === 'imp-cot-design' ? RECOVERY : RECOVERY * 0.6;
      if (leak > 0) {
        const recovered = leak * recFrac;
        const capitas = recovered * DATO_CAPITA;
        marginAtStakeArs = marginFromRecoveredEvents(recovered);
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
          { label: 'Recuperable con la mejora', value: `× ${pc(recFrac)} = ${num(recovered)} datos`, src: 'Supuesto' },
          { label: 'Dato → cápita', value: `× ${pc(DATO_CAPITA)} = ${num(capitas)} cápitas`, src: 'Supuesto' },
          { label: 'LTV de contribución', value: `× ${fmtArs(ltvArs())}`, src: 'PELG' },
          { label: '= Margen en juego', value: `${fmtArsShort(marginAtStakeArs)}/mes` },
        ];
        honesty.push(`Recuperable ${pc(recFrac)} y dato→cápita ${pc(DATO_CAPITA)} son supuestos.`);
      }
      break;
    }
    case 'hs-winrate': {
      if (h && h.winRate != null) {
        const decided = h.won + h.lost;
        const gap = Math.max(0, WINRATE_TARGET - h.winRate);
        const extraWon = decided * gap;
        if (extraWon > 0) {
          marginAtStakeArs = extraWon * ltvArs();
          cadence = 'acumulado';
          reach = h.lost;
          urgency = 1.2;
          urgencyReason = 'Alta: el win rate es palanca directa de cápitas sobre el stock comercial.';
          basis.hubspot = `win rate ${pc(h.winRate)} vs meta ${pc(WINRATE_TARGET)} sobre ${num(decided)} deals`;
          basis.pelg = `${num(extraWon)} cápitas × LTV ${fmtArs(ltvArs())}`;
          formula = 'Deals decididos × gap a la meta de win rate × LTV';
          breakdown = [
            { label: 'Deals decididos (ganados + perdidos)', value: num(decided), src: 'HubSpot' },
            { label: 'Gap a la meta', value: `${pc(WINRATE_TARGET)} − ${pc(h.winRate)} = ${pc(gap)}`, src: 'HubSpot' },
            { label: 'Cápitas extra recuperables', value: `= ${num(extraWon)}`, src: 'HubSpot' },
            { label: 'LTV de contribución', value: `× ${fmtArs(ltvArs())}`, src: 'PELG' },
            { label: '= Margen (acumulado)', value: `${fmtArsShort(marginAtStakeArs)}` },
          ];
          honesty.push('Figura ACUMULADA (stock histórico de deals), no mensual. No comparar 1:1 con las /mes.');
        }
      }
      break;
    }
    case 'hs-stock': {
      if (h?.biggestOpenStage) {
        reach = h.biggestOpenStage.count;
        const wr = h.winRate ?? 0.38;
        marginAtStakeArs = h.biggestOpenStage.count * wr * ltvArs();
        cadence = 'acumulado';
        urgencyReason = 'Media: stock dormido; parte ya está en curso.';
        basis.hubspot = `${num(h.biggestOpenStage.count)} deals en "${h.biggestOpenStage.label}"`;
        basis.pelg = `× win rate × LTV ${fmtArs(ltvArs())}`;
        formula = 'Deals atascados × win rate esperado × LTV';
        breakdown = [
          { label: `Deals en "${h.biggestOpenStage.label}"`, value: num(h.biggestOpenStage.count), src: 'HubSpot' },
          { label: 'Win rate esperado', value: `× ${pc(wr)}`, src: 'HubSpot' },
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
      basis.hubspot = 'deals (cápitas)';
      formula = 'Sin $ propio — habilitador: une comportamiento (Mixpanel) con cápitas (HubSpot)';
      breakdown = [
        { label: 'Hoy', value: 'visita y cápita viven en sistemas separados', src: 'Mixpanel' },
        { label: 'Con prospecto_id', value: 'se atribuye qué visita termina en socio', src: 'HubSpot' },
        { label: 'Desbloquea', value: 'ripple-a-cápita MEDIDO (no modelado) en cada experimento' },
      ];
      honesty.push('No tiene $ propio: es el habilitador. Sin esto, la atribución visita→cápita es modelada, no medida.');
      break;
    }
    default:
      formula = 'Sin $ cuantificable aún — priorizada por su prioridad cualitativa.';
      breakdown = [
        { label: 'Tipo', value: `${rec.tag} · ${rec.discipline}` },
        { label: 'Por qué no tiene $', value: 'falta el dato que la haría cuantificable (instrumentación / valor por lead).' },
      ];
      honesty.push('No cuantificable en $ todavía: rankea por prioridad, no por plata.');
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

  return { marginAtStakeArs, cadence, reach, confidence, effort, urgency, score, basis, honesty, formula, breakdown, confidenceReason, urgencyReason, effortReason };
}

function priorityBase(p: Recommendation['priority']): number {
  return p === 'alta' ? 4_000_000 : p === 'media' ? 800_000 : 150_000;
}
