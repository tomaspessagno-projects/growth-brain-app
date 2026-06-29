import { describe, it, expect } from 'vitest';
import { pearson, leadLagCorrelation, buildCrossSignals } from '../src/lib/brain/correlate';
import type { SnapshotRow } from '../src/lib/brain/detect';
import { dayStr } from './fixtures';

describe('pearson', () => {
  it('correlación perfecta positiva = 1', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
  });
  it('perfecta negativa = −1', () => {
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 10);
  });
  it('serie constante (sin varianza) → 0', () => {
    expect(pearson([5, 5, 5, 5], [1, 2, 3, 4])).toBe(0);
  });
  it('menos de 3 pares → 0', () => {
    expect(pearson([1, 2], [1, 2])).toBe(0);
  });
});

describe('leadLagCorrelation', () => {
  it('encuentra el rezago con el que dos series se alinean', () => {
    // b[t] = a[t−2] ⇒ A se adelanta 2 días a B ⇒ mejor lag = +2
    const a = Array.from({ length: 20 }, (_, t) => 1000 + 137 * ((t * 7) % 11));
    const b = a.map((_, t) => (t >= 2 ? a[t - 2] : NaN));
    const ll = leadLagCorrelation(a, b, 7, 6);
    expect(ll.lag).toBe(2);
    expect(ll.corr).toBeGreaterThan(0.99);
    expect(ll.n).toBeGreaterThanOrEqual(6);
  });

  it('lag 0 cuando se mueven juntas el mismo día', () => {
    const a = Array.from({ length: 20 }, (_, t) => Math.sin(t) * 100 + 500);
    const ll = leadLagCorrelation(a, a, 7, 6);
    expect(ll.lag).toBe(0);
    expect(ll.corr).toBeCloseTo(1, 6);
  });
});

describe('buildCrossSignals — "cruzar datos con datos" (diagnóstico, no causal)', () => {
  it('detecta el cruce entradas → altas con su rezago', () => {
    const ent = Array.from({ length: 24 }, (_, t) => 1000 + 137 * ((t * 7) % 11));
    const rows: SnapshotRow[] = ent.map((v, t) => ({
      day: dayStr('2026-01-01', t),
      summary: { totalEntradas: v, asociados: t >= 2 ? ent[t - 2] : undefined }, // altas = entradas de hace 2 días
      payload: {},
    }));
    const cruces = buildCrossSignals(rows, 0.5, 10);
    const c = cruces.find((x) => x.a === 'entradas' && x.b === 'asociados');
    expect(c).toBeDefined();
    expect(Math.abs(c!.corr)).toBeGreaterThan(0.9);
    expect(c!.lag).toBe(2);
    expect(c!.detail).toContain('no una causa'); // honestidad: relación, no causa
  });

  it('sin relación fuerte, no inventa cruces', () => {
    // rampa vs señal que alterna cada día (período 2): correlación ~0 a cualquier rezago.
    const rows: SnapshotRow[] = Array.from({ length: 20 }, (_, t) => ({
      day: dayStr('2026-01-01', t),
      summary: { totalEntradas: t, asociados: (t % 2) * 100 },
      payload: {},
    }));
    expect(buildCrossSignals(rows, 0.95, 10).length).toBe(0);
  });
});
