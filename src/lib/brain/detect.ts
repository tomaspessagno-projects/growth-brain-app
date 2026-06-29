// DETECCIÓN (Capa 2) — sobre la serie diaria que persiste Capa 1: distingue un QUIEBRE real del
// ruido, proyecta el ritmo vs la meta, y arma un inbox de señales rankeadas. Stats robustas
// (mediana + MAD), sin ML pesado: a la escala de armatuplan es lo correcto. Solo lectura.

import { WINRATE_TARGET, FUNNEL_TARGETS } from '../mixpanel/benchmarks';

export interface Signal {
  kind: 'quiebre' | 'pace';
  metric: string;
  severity: number; // 0..1 — para rankear el inbox
  direction: 'up' | 'down';
  headline: string;
  detail: string;
}

// Fila de analytics_snapshots (lo que persiste el cron).
export interface SnapshotRow {
  day: string;
  summary?: { totalEntradas?: number; asociados?: number; cotizadorConversion?: number | null } | null;
  payload?: {
    funnels?: { id: string; overallConversion?: number | null }[];
    hubspot?: { winRate?: number | null } | null;
  } | null;
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// z robusto: (x − mediana) / (1.4826·MAD). Resiste outliers (a diferencia de media/desvío estándar).
function robustZ(hist: number[], last: number): number {
  const med = median(hist);
  const mad = median(hist.map((v) => Math.abs(v - med)));
  const sigma = 1.4826 * mad;
  if (sigma <= 0) return 0;
  return (last - med) / sigma;
}

// QUIEBRE: el último valor cae fuera de 3σ robustos de su propia historia → no es ruido.
function detectBreak(points: number[], metric: string, fmt: (n: number) => string): Signal | null {
  const vals = points.filter((v) => Number.isFinite(v));
  if (vals.length < 8) return null;
  const hist = vals.slice(0, -1);
  const last = vals[vals.length - 1];
  const med = median(hist);
  const z = robustZ(hist, last);
  if (Math.abs(z) < 3) return null;
  const direction: Signal['direction'] = z > 0 ? 'up' : 'down';
  const change = med !== 0 ? (last - med) / Math.abs(med) : 0;
  return {
    kind: 'quiebre',
    metric,
    severity: Math.min(1, Math.abs(z) / 6),
    direction,
    headline: `${metric}: ${direction === 'up' ? 'salto' : 'caída'} fuera de rango (z=${z.toFixed(1)})`,
    detail: `Último ${fmt(last)} vs su mediana ${fmt(med)} (${change >= 0 ? '+' : ''}${(change * 100).toFixed(0)}%). Supera 3σ robustos: es un quiebre, no ruido del día a día.`,
  };
}

// PACE: el promedio reciente viene por debajo de la meta → a este ritmo no llega.
function forecastPace(points: number[], target: number | null, metric: string, fmt: (n: number) => string): Signal | null {
  if (target == null) return null;
  const vals = points.filter((v) => Number.isFinite(v));
  if (vals.length < 5) return null;
  const recent = vals.slice(-7);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const ratio = target > 0 ? avg / target : 1;
  if (ratio >= 0.95) return null; // en meta → no es señal
  const gap = 1 - ratio;
  return {
    kind: 'pace',
    metric,
    severity: Math.min(1, gap),
    direction: 'down',
    headline: `${metric}: ${(gap * 100).toFixed(0)}% por debajo de la meta`,
    detail: `Promedio reciente ${fmt(avg)} vs meta ${fmt(target)}. A este ritmo cierra el período bajo meta.`,
  };
}

// Arma el inbox de señales desde la serie de snapshots (ordenada por día asc.), rankeado por severidad.
export function buildSignals(rows: SnapshotRow[]): Signal[] {
  const pctF = (n: number) => `${(n * 100).toFixed(1)}%`;
  const numF = (n: number) => Math.round(n).toLocaleString('es-AR');
  const series = (pick: (r: SnapshotRow) => number | null | undefined): number[] =>
    rows.map((r) => Number(pick(r))).filter((v) => Number.isFinite(v));

  const cotConv = series((r) => r.payload?.funnels?.find((f) => f.id === 'cotizador')?.overallConversion);
  const winRate = series((r) => r.payload?.hubspot?.winRate);
  const entradas = series((r) => r.summary?.totalEntradas);
  const asociados = series((r) => r.summary?.asociados);

  const out: (Signal | null)[] = [
    detectBreak(cotConv, 'Conversión cotizador', pctF),
    forecastPace(cotConv, FUNNEL_TARGETS.cotizador ?? null, 'Conversión cotizador', pctF),
    detectBreak(winRate, 'Cierre de ventas', pctF),
    forecastPace(winRate, WINRATE_TARGET, 'Cierre de ventas', pctF),
    detectBreak(entradas, 'Entradas a embudos', numF),
    detectBreak(asociados, 'Altas completadas', numF),
  ];
  return out.filter((s): s is Signal => s != null).sort((a, b) => b.severity - a.severity);
}
