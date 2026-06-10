// MOTOR DE MEDICIÓN TRIANGULADO — el "¿funcionó? ¿ripple? ¿guardrail?".
// Esta es la lógica que DEBE ser correcta antes de deploy: si miente una vez, el equipo
// deja de confiar. Por eso es honesta hasta el dolor sobre lo que NO puede medir.
//
//   Mixpanel  → ¿el paso objetivo se movió, con significancia? (no un % crudo)
//   Mixpanel  → ¿el lift se propagó aguas abajo (ripple) o rompió algo (guardrail)?
//   HubSpot   → ¿la cápita / win rate acompañó? (hoy: contexto, no atribución per-cohorte)
//   PELG      → ¿el margen aguantó? (hoy: no medible por experimento)
//
// Solo lectura de Mixpanel y HubSpot. Nunca escribe nada.

import { fetchSavedFunnel } from '../mixpanel/live';
import { getRetailPipeline } from '../hubspot/client';
import { twoProportionTest, minSampleForLift, type ProportionTest } from '../stats';

export interface StepMeasure {
  event: string;
  label: string;
  beforeCount: number;
  afterCount: number;
  beforeConv: number | null; // conversión vs paso previo (before)
  afterConv: number | null;
  deltaPP: number | null; // afterConv − beforeConv, en puntos porcentuales
  role: 'entry' | 'upstream' | 'target' | 'downstream';
  significant?: boolean;
  guardrailBreach?: boolean;
}

export interface ExperimentMeasurement {
  ok: boolean;
  beforeRange: string;
  afterRange: string;
  steps: StepMeasure[];
  target: {
    event: string;
    label: string;
    beforeConv: number;
    afterConv: number;
    absLift: number;
    relLift: number;
    significant: boolean;
    pValue: number;
    z: number;
    ci: [number, number];
    direction: 'mejoró' | 'empeoró' | 'sin cambio';
  } | null;
  ripple: {
    downstreamImproved: string[];
    capitaNote: string;
    hubspotWinRate: number | null;
  };
  guardrails: {
    behavioral: { label: string; deltaPP: number }[];
    commercial: string;
    economic: string;
  };
  confounds: string[];
  power: { targetN: number; minN: number; underpowered: boolean };
  verdict: 'validado' | 'validado_con_guardrail' | 'refutado' | 'inconcluso';
  verdictReason: string;
  honesty: string[];
}

function shift(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

export async function measureExperiment(
  funnelId: number,
  start: string,
  targetEvent?: string,
): Promise<ExperimentMeasurement> {
  const today = new Date().toISOString().slice(0, 10);
  const beforeFrom = shift(start, -30);
  const beforeTo = shift(start, -1);
  const beforeRange = `${beforeFrom} → ${beforeTo}`;
  const afterRange = `${start} → ${today}`;

  const before = await fetchSavedFunnel(funnelId, beforeFrom, beforeTo);
  const after = await fetchSavedFunnel(funnelId, start, today);

  // Alinear pasos por evento (orden del funnel before).
  const afterMap = new Map(after.map((s) => [s.event, s]));
  const targetIdx = targetEvent
    ? before.findIndex((s) => s.event === targetEvent)
    : before.length - 1;
  const tIdx = targetIdx >= 0 ? targetIdx : before.length - 1;

  const steps: StepMeasure[] = before.map((s, i) => {
    const aft = afterMap.get(s.event);
    const beforeCount = s.count;
    const afterCount = aft?.count ?? 0;
    const bPrev = i > 0 ? before[i - 1].count : null;
    const aPrev = i > 0 ? afterMap.get(before[i - 1].event)?.count ?? null : null;
    const beforeConv = bPrev && bPrev > 0 ? beforeCount / bPrev : null;
    const afterConv = aPrev && aPrev > 0 ? afterCount / aPrev : null;
    const deltaPP = beforeConv != null && afterConv != null ? afterConv - beforeConv : null;
    const role: StepMeasure['role'] = i === 0 ? 'entry' : i === tIdx ? 'target' : i < tIdx ? 'upstream' : 'downstream';
    return { event: s.event, label: s.label, beforeCount, afterCount, beforeConv, afterConv, deltaPP, role };
  });

  // Test del paso objetivo (conversión vs paso previo, before vs after).
  let target: ExperimentMeasurement['target'] = null;
  let targetTest: ProportionTest | null = null;
  if (tIdx > 0) {
    const x1 = before[tIdx].count;
    const n1 = before[tIdx - 1].count;
    const x2 = afterMap.get(before[tIdx].event)?.count ?? 0;
    const n2 = afterMap.get(before[tIdx - 1].event)?.count ?? 0;
    targetTest = twoProportionTest(x1, n1, x2, n2);
    target = {
      event: before[tIdx].event,
      label: before[tIdx].label,
      beforeConv: targetTest.p1,
      afterConv: targetTest.p2,
      absLift: targetTest.absLift,
      relLift: targetTest.relLift,
      significant: targetTest.significant95,
      pValue: targetTest.pValue,
      z: targetTest.z,
      ci: [targetTest.ciLow, targetTest.ciHigh],
      direction: targetTest.absLift > 0.001 ? 'mejoró' : targetTest.absLift < -0.001 ? 'empeoró' : 'sin cambio',
    };
    steps[tIdx].significant = targetTest.significant95;
  }

  // Guardrails de comportamiento: pasos aguas abajo que CAYERON con significancia.
  const behavioral: { label: string; deltaPP: number }[] = [];
  const downstreamImproved: string[] = [];
  for (let i = tIdx + 1; i < before.length; i++) {
    const x1 = before[i].count;
    const n1 = before[i - 1].count;
    const x2 = afterMap.get(before[i].event)?.count ?? 0;
    const n2 = afterMap.get(before[i - 1].event)?.count ?? 0;
    const t = twoProportionTest(x1, n1, x2, n2);
    if (t.significant95 && t.absLift < 0) {
      behavioral.push({ label: before[i].label, deltaPP: t.absLift });
      steps[i].guardrailBreach = true;
    } else if (t.absLift > 0.001) {
      downstreamImproved.push(before[i].label);
    }
    steps[i].significant = t.significant95;
  }

  // HubSpot: contexto comercial (no atribución per-cohorte — falta prospecto_id + ventana temporal).
  let hubspotWinRate: number | null = null;
  try {
    const pipe = await getRetailPipeline();
    if (pipe.source === 'live') hubspotWinRate = pipe.totals.winRate;
  } catch {
    /* resiliente */
  }

  // Potencia: ¿alcanzó la muestra para detectar un lift del 10% relativo?
  const targetN = targetTest ? targetTest.n2 : 0;
  const minN = targetTest && targetTest.p1 > 0 ? minSampleForLift(targetTest.p1, 0.1) : Infinity;
  const underpowered = targetN < minN;

  // Confounds — lo que ensucia un antes/después y hoy no controlamos.
  const afterDays = daysBetween(start, today);
  const confounds: string[] = [
    'Antes/después, no A/B: cualquier cambio en el tiempo (campañas, estacionalidad) se mezcla con el efecto.',
    'Confounds de pauta no verificables: falta conectar la bitácora de cambios de marketing.',
  ];
  if (afterDays < 14) confounds.push(`Ventana after corta (${afterDays}d): poca potencia, leé el resultado con pinzas.`);
  if (underpowered) confounds.push(`Muestra insuficiente (${targetN.toLocaleString('es-AR')} < ${isFinite(minN) ? minN.toLocaleString('es-AR') : '∞'} necesarios para un +10%).`);

  // Veredicto — riguroso: sin significancia NO hay resultado.
  let verdict: ExperimentMeasurement['verdict'];
  let verdictReason: string;
  if (!target) {
    verdict = 'inconcluso';
    verdictReason = 'No hay un paso objetivo con paso previo para medir conversión.';
  } else if (!target.significant) {
    verdict = 'inconcluso';
    verdictReason = `El movimiento (${(target.absLift * 100).toFixed(1)}pp) no es significativo (p=${target.pValue.toFixed(2)}). ${underpowered ? 'Faltó muestra.' : 'Puede ser ruido.'}`;
  } else if (target.absLift > 0) {
    if (behavioral.length) {
      verdict = 'validado_con_guardrail';
      verdictReason = `El objetivo subió ${(target.absLift * 100).toFixed(1)}pp (significativo), PERO rompió ${behavioral.length} paso(s) aguas abajo. Revisar antes de dar por ganado.`;
    } else {
      verdict = 'validado';
      verdictReason = `El objetivo subió ${(target.absLift * 100).toFixed(1)}pp y es significativo (p=${target.pValue.toFixed(2)}), sin romper pasos aguas abajo.`;
    }
  } else {
    verdict = 'refutado';
    verdictReason = `El objetivo BAJÓ ${(Math.abs(target.absLift) * 100).toFixed(1)}pp de forma significativa. La hipótesis no se sostiene.`;
  }

  const capitaNote =
    'Ripple a cápita: NO medido. Sin el cruce prospecto_id (Mixpanel↔HubSpot) no se puede atribuir este experimento a socios cerrados. Acá se ve hasta el fin del funnel de comportamiento.';

  const honesty: string[] = [
    capitaNote,
    'Guardrail comercial (win rate) y económico (CAC/margen) no son medibles por experimento todavía: HubSpot es stock acumulado y el PELG es mensual.',
    'El veredicto se basa en el comportamiento (Mixpanel) con significancia estadística — es lo que sí podemos afirmar con rigor hoy.',
  ];

  return {
    ok: true,
    beforeRange,
    afterRange,
    steps,
    target,
    ripple: {
      downstreamImproved,
      capitaNote,
      hubspotWinRate,
    },
    guardrails: {
      behavioral,
      commercial: hubspotWinRate != null
        ? `Win rate actual ${(hubspotWinRate * 100).toFixed(0)}% (contexto; no atribuible a este experimento aún).`
        : 'Sin datos comerciales en vivo.',
      economic: 'No medible por experimento: el PELG es un snapshot mensual, sin serie temporal por campaña.',
    },
    confounds,
    power: { targetN, minN: isFinite(minN) ? minN : -1, underpowered },
    verdict,
    verdictReason,
    honesty,
  };
}
