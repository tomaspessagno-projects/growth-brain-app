// CRUCE DE SERIES (Capa 2) — "cruzar datos con datos". Mide si dos métricas se mueven juntas y con
// cuánto REZAGO (una se adelanta a la otra N días): correlación de Pearson sobre la serie alineada,
// barriendo lags −maxLag..+maxLag y quedándose con el de mayor |correlación|.
//
// DIAGNÓSTICO, NO prescriptivo y NO causal: dice "estas dos se mueven juntas con K días de desfase",
// nunca "una causa la otra" ni "hacé X". Es una pista de DÓNDE mirar. Determinista, sin ML, solo lectura.

import type { SnapshotRow } from './detect';

// Pearson r entre dos series ya alineadas del mismo largo. 0 si no hay varianza (serie constante) o
// si hay menos de 3 pares: sin dispersión la "correlación" no significa nada.
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n, my = sy / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den > 0 ? num / den : 0;
}

export interface LeadLag {
  lag: number; // >0 ⇒ A se adelanta a B en `lag` días; <0 ⇒ B se adelanta a A
  corr: number; // Pearson r en ese lag (−1..1)
  n: number; // pares efectivos que lo sostienen
}

// Mejor rezago entre A y B: para cada lag se compara A[t] con B[t+lag] (saltando huecos no-finitos)
// y se guarda el de mayor |correlación| que conserve al menos `minOverlap` pares.
export function leadLagCorrelation(a: number[], b: number[], maxLag = 7, minOverlap = 6): LeadLag {
  let best: LeadLag = { lag: 0, corr: 0, n: 0 };
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const xs: number[] = [], ys: number[] = [];
    for (let t = 0; t < a.length; t++) {
      const j = t + lag;
      if (j >= 0 && j < b.length && Number.isFinite(a[t]) && Number.isFinite(b[j])) {
        xs.push(a[t]);
        ys.push(b[j]);
      }
    }
    if (xs.length < minOverlap) continue;
    const corr = pearson(xs, ys);
    if (Math.abs(corr) > Math.abs(best.corr)) best = { lag, corr, n: xs.length };
  }
  return best;
}

export interface CrossSignal {
  a: string; // clave de la métrica A
  b: string; // clave de la métrica B
  lag: number;
  corr: number;
  headline: string;
  detail: string;
}

// Métricas de la serie diaria que cruzamos entre sí (las mismas que mira la detección).
const METRICS: { key: string; label: string; pick: (r: SnapshotRow) => number | null | undefined }[] = [
  { key: 'entradas', label: 'Entradas a embudos', pick: (r) => r.summary?.totalEntradas },
  { key: 'asociados', label: 'Altas completadas', pick: (r) => r.summary?.asociados },
  { key: 'cotConv', label: 'Conversión cotizador', pick: (r) => r.payload?.funnels?.find((f) => f.id === 'cotizador')?.overallConversion },
  { key: 'winRate', label: 'Cierre de ventas', pick: (r) => r.payload?.hubspot?.winRate },
];

// Cruces relevantes entre todas las métricas (pares no ordenados): |r| ≥ minAbsCorr y suficientes
// días en común. Ordenados por |correlación|. Solo descripción, nunca recomendación.
export function buildCrossSignals(rows: SnapshotRow[], minAbsCorr = 0.5, minOverlap = 10): CrossSignal[] {
  const cols = METRICS.map((m) => ({ ...m, vals: rows.map((r) => Number(m.pick(r))) }));
  const out: CrossSignal[] = [];
  for (let i = 0; i < cols.length; i++) {
    for (let k = i + 1; k < cols.length; k++) {
      const A = cols[i], B = cols[k];
      const ll = leadLagCorrelation(A.vals, B.vals, 7, minOverlap);
      if (ll.n < minOverlap || Math.abs(ll.corr) < minAbsCorr) continue;
      const sense = ll.corr >= 0 ? 'en el mismo sentido' : 'en sentido opuesto';
      const lagTxt =
        ll.lag === 0
          ? 'sin desfase (el mismo día)'
          : ll.lag > 0
          ? `${A.label} se adelanta ~${ll.lag} día(s) a ${B.label}`
          : `${B.label} se adelanta ~${-ll.lag} día(s) a ${A.label}`;
      out.push({
        a: A.key,
        b: B.key,
        lag: ll.lag,
        corr: ll.corr,
        headline: `${A.label} ↔ ${B.label}: se mueven juntas (r=${ll.corr.toFixed(2)})`,
        detail: `Correlación ${sense} (r=${ll.corr.toFixed(2)}) sobre ${ll.n} días — ${lagTxt}. Es una relación OBSERVADA en la serie, no una causa: sirve para mirar dónde, no como explicación.`,
      });
    }
  }
  return out.sort((x, y) => Math.abs(y.corr) - Math.abs(x.corr));
}
