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

// DESESTACIONALIZAR por día de semana (multiplicativo y robusto). Muchas métricas tienen un ciclo
// semanal normal (lunes alto, fin de semana bajo): sin corregirlo, un lunes "normal" parece un salto.
// Para cada día se calcula un factor = mediana(ese día de semana) / mediana(global) y se divide el
// valor por su factor → la serie queda nivelada y el quiebre se mide contra el ritmo "des-semanalizado".
// Necesita ≥2 semanas para estimar el patrón; si no, devuelve la serie cruda. Determinista.
export function deseasonalizeByWeekday(points: { day: string; value: number }[]): number[] {
  const raw = points.map((p) => p.value);
  if (points.length < 14) return raw; // sin 2 semanas no hay patrón confiable
  const finite = raw.filter((v) => Number.isFinite(v));
  const globalMed = median(finite);
  if (globalMed <= 0) return raw;
  const dowOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay(); // 0=domingo
  const byDow: number[][] = Array.from({ length: 7 }, () => []);
  for (const p of points) if (Number.isFinite(p.value)) byDow[dowOf(p.day)].push(p.value);
  // Factor por día de semana: solo si hay ≥2 observaciones de ese día (si no, 1 = no se toca).
  const factor = byDow.map((arr) => (arr.length >= 2 ? median(arr) / globalMed : 1));
  return points.map((p) => {
    const f = factor[dowOf(p.day)];
    return f > 0 && Number.isFinite(p.value) ? p.value / f : p.value;
  });
}

// QUIEBRE: el último valor cae fuera de 3σ robustos de su propia historia → no es ruido.
// `points` es la serie sobre la que se mide la SIGNIFICANCIA (idealmente desestacionalizada);
// `raw` (opcional) es la serie CRUDA que se MUESTRA (lo que el equipo ve en sus tableros). Si el
// movimiento crudo y el desestacionalizado no coinciden en signo, el "salto" era artefacto del día
// de semana → no es señal.
function detectBreak(points: number[], metric: string, fmt: (n: number) => string, raw?: number[]): Signal | null {
  const vals = points.filter((v) => Number.isFinite(v));
  if (vals.length < 8) return null;
  const z = robustZ(vals.slice(0, -1), vals[vals.length - 1]);
  if (Math.abs(z) < 3) return null;
  const direction: Signal['direction'] = z > 0 ? 'up' : 'down';
  // Mostrar sobre la serie cruda si vino (números reales); si no, sobre la misma `points`.
  const disp = (raw && raw.length === points.length ? raw : points).filter((v) => Number.isFinite(v));
  const last = disp[disp.length - 1];
  const med = median(disp.slice(0, -1));
  const change = med !== 0 ? (last - med) / Math.abs(med) : 0;
  if (raw && change !== 0 && Math.sign(change) !== Math.sign(z)) return null; // el movimiento era estacional
  const adj = raw ? ' (ajustado por estacionalidad semanal)' : '';
  return {
    kind: 'quiebre',
    metric,
    severity: Math.min(1, Math.abs(z) / 6),
    direction,
    headline: `${metric}: ${direction === 'up' ? 'salto' : 'caída'} fuera de rango (z=${z.toFixed(1)})`,
    detail: `Último ${fmt(last)} vs su mediana ${fmt(med)} (${change >= 0 ? '+' : ''}${(change * 100).toFixed(0)}%). Supera 3σ robustos${adj}: es un quiebre, no ruido del día a día.`,
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
  // Serie (día, valor) conservando la fecha → poder desestacionalizar por día de semana.
  const series = (pick: (r: SnapshotRow) => number | null | undefined): { day: string; value: number }[] =>
    rows.map((r) => ({ day: r.day, value: Number(pick(r)) })).filter((p) => Number.isFinite(p.value));
  const vals = (s: { value: number }[]) => s.map((p) => p.value);

  const cotConv = series((r) => r.payload?.funnels?.find((f) => f.id === 'cotizador')?.overallConversion);
  const winRate = series((r) => r.payload?.hubspot?.winRate);
  const entradas = series((r) => r.summary?.totalEntradas);
  const asociados = series((r) => r.summary?.asociados);

  // Quiebre: significancia sobre la serie DESESTACIONALIZADA (sin el efecto día-de-semana), mostrando
  // los valores crudos. Pace: sobre la serie cruda (el promedio de 7 días ya neutraliza la semana).
  const out: (Signal | null)[] = [
    detectBreak(deseasonalizeByWeekday(cotConv), 'Conversión cotizador', pctF, vals(cotConv)),
    forecastPace(vals(cotConv), FUNNEL_TARGETS.cotizador ?? null, 'Conversión cotizador', pctF),
    detectBreak(deseasonalizeByWeekday(winRate), 'Cierre de ventas', pctF, vals(winRate)),
    forecastPace(vals(winRate), WINRATE_TARGET, 'Cierre de ventas', pctF),
    detectBreak(deseasonalizeByWeekday(entradas), 'Entradas a embudos', numF, vals(entradas)),
    detectBreak(deseasonalizeByWeekday(asociados), 'Altas completadas', numF, vals(asociados)),
  ];
  return out.filter((s): s is Signal => s != null).sort((a, b) => b.severity - a.severity);
}
