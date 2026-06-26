// MONTE CARLO (Capa 3) — el score deja de ser un número puntual y pasa a una APUESTA con banda.
// Cada supuesto del modelo económico es INCIERTO: en vez de fijarlo, lo muestreamos de un rango
// (distribución triangular low/mode/high) y simulamos miles de escenarios → P10/P50/P90 del margen.
// Suma: análisis de sensibilidad (qué supuesto mueve más el número) y un flag de robustez.
// Es honestidad hecha número: muestra cuánto de la cifra es apuesta y de qué depende.

import type { Analytics } from '../mixpanel/analytics';
import type { Recommendation } from '../mixpanel/recommendations';
import { ARPU_MENSUAL_ARS } from '../mixpanel/snapshot';
import { WINRATE_TARGET } from '../mixpanel/benchmarks';
import { recFamily, recoveryM0, type PriorMap } from './priors';

export interface MarginBand {
  p10: number;
  p50: number;
  p90: number;
  mean: number;
  dominantDriver: string; // el supuesto que más mueve el número (sensibilidad)
  robust: boolean; // banda angosta vs la mediana → ranking poco sensible a los supuestos
  n: number; // simulaciones
}

// RNG determinista (mulberry32): bandas reproducibles request a request (mismo input → misma banda).
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashSeed = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
// Muestreo triangular por inversa de la CDF (low a, mode c, high b).
function tri(u: number, a: number, c: number, b: number): number {
  if (b <= a) return a;
  const fc = (c - a) / (b - a);
  return u < fc ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
}
function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[i];
}

type Triple = [number, number, number]; // [low, mode, high]
interface Ranges {
  recovery: Triple; // fracción de fuga recuperada
  datoCapita: Triple; // dato del cotizador → cápita
  retention: Triple; // permanencia (meses)
  margin: Triple; // margen de contribución
}

// Rangos de incertidumbre centrados en el supuesto (o en el prior aprendido si existe).
function rangesFor(rec: Recommendation, priors?: PriorMap): Ranges {
  const fam = recFamily(rec);
  const recBase = priors?.[fam]?.recoveryMean ?? recoveryM0(fam);
  return {
    recovery: [Math.max(0.05, recBase * 0.6), recBase, Math.min(0.9, recBase * 1.5)],
    datoCapita: [0.04, 0.06, 0.08], // el supuesto 6% ± banda (rango del brief del cruce)
    retention: [18, 24, 30],
    margin: [0.14, 0.18, 0.22],
  };
}

type Kind = 'leak' | 'channel' | 'winrate' | 'stock';
function kindOf(rec: Recommendation): Kind | null {
  if (rec.id === 'imp-cot-design' || rec.id === 'imp-cot-product') return 'leak';
  if (rec.id === 'channel-best') return 'channel';
  if (rec.id === 'hs-winrate') return 'winrate';
  if (rec.id === 'hs-stock') return 'stock';
  return null;
}

interface Sample {
  rec: number;
  dc: number;
  ret: number;
  mg: number;
}

const DRIVER_LABEL: Record<keyof Sample, string> = {
  rec: 'recuperable de la fuga',
  dc: 'dato → cápita',
  ret: 'permanencia',
  mg: 'margen de contribución',
};

export function simulateMargin(rec: Recommendation, a: Analytics, priors?: PriorMap, N = 2000): MarginBand | null {
  const kind = kindOf(rec);
  if (!kind) return null;

  const cot = a.funnels.find((f) => f.id === 'cotizador');
  const h = a.hubspot;
  // Inputs base de cada fuente (Mixpanel/HubSpot) — NO inciertos: son data medida.
  const leak = cot?.leakDropCount ?? 0;
  const extra = cot?.opportunity?.extraDatos ?? 0;
  const decided = h ? h.won + h.lost : 0;
  const gap = h && h.winRate != null ? Math.max(0, WINRATE_TARGET - h.winRate) : 0;
  const stock = h?.biggestOpenStage?.count ?? 0;
  const wr = h?.winRate ?? 0.38;
  const recMult = rec.id === 'imp-cot-product' ? 0.6 : 1;

  const r = rangesFor(rec, priors);
  const ltv = (ret: number, mg: number) => ARPU_MENSUAL_ARS * ret * mg;
  const margin = (s: Sample): number => {
    switch (kind) {
      case 'leak':
        return leak * (s.rec * recMult) * s.dc * ltv(s.ret, s.mg);
      case 'channel':
        return extra * s.dc * ltv(s.ret, s.mg);
      case 'winrate':
        return decided * gap * ltv(s.ret, s.mg); // acumulado
      case 'stock':
        return stock * wr * ltv(s.ret, s.mg); // acumulado
    }
  };

  // Qué inputs varían según el tipo (recovery solo en fugas; dato→cápita solo del lado adquisición).
  const variesRec = kind === 'leak';
  const variesDc = kind === 'leak' || kind === 'channel';

  const draw = rng(hashSeed(rec.id));
  const margins: number[] = [];
  for (let i = 0; i < N; i++) {
    const s: Sample = {
      rec: variesRec ? tri(draw(), r.recovery[0], r.recovery[1], r.recovery[2]) : 1,
      dc: variesDc ? tri(draw(), r.datoCapita[0], r.datoCapita[1], r.datoCapita[2]) : 1,
      ret: tri(draw(), r.retention[0], r.retention[1], r.retention[2]),
      mg: tri(draw(), r.margin[0], r.margin[1], r.margin[2]),
    };
    margins.push(margin(s));
  }
  margins.sort((x, y) => x - y);
  const mean = margins.reduce((x, y) => x + y, 0) / N;
  const p10 = quantile(margins, 0.1);
  const p50 = quantile(margins, 0.5);
  const p90 = quantile(margins, 0.9);

  // Sensibilidad OAT (one-at-a-time): qué input, movido de low a high (el resto en su modo),
  // produce el mayor swing del margen. Ese es el supuesto del que más depende la cifra.
  const base: Sample = { rec: r.recovery[1], dc: r.datoCapita[1], ret: r.retention[1], mg: r.margin[1] };
  const keys: (keyof Sample)[] = [
    ...(variesRec ? (['rec'] as const) : []),
    ...(variesDc ? (['dc'] as const) : []),
    'ret',
    'mg',
  ];
  const lohi: Record<keyof Sample, Triple> = { rec: r.recovery, dc: r.datoCapita, ret: r.retention, mg: r.margin };
  let dominant = keys[0];
  let maxSwing = -1;
  for (const k of keys) {
    const lo = { ...base, [k]: lohi[k][0] };
    const hi = { ...base, [k]: lohi[k][2] };
    const swing = Math.abs(margin(hi) - margin(lo));
    if (swing > maxSwing) {
      maxSwing = swing;
      dominant = k;
    }
  }

  const robust = p50 > 0 ? (p90 - p10) / p50 < 0.6 : false;
  return { p10, p50, p90, mean, dominantDriver: DRIVER_LABEL[dominant], robust, n: N };
}
