import { describe, it, expect } from 'vitest';
import {
  observedRecovery,
  computePriors,
  priorConfidenceBoost,
  recoveryM0,
  type ExperimentOutcome,
  type Prior,
} from '../src/lib/triangulation/priors';

describe('recoveryM0 (supuesto base por familia)', () => {
  it('formularios arranca más alto (0.30) por la evidencia CRO', () => {
    expect(recoveryM0('formularios')).toBe(0.3);
  });
  it('el resto cae al supuesto global declarado (0.25)', () => {
    expect(recoveryM0('comercial')).toBe(0.25);
    expect(recoveryM0('canal')).toBe(0.25);
    expect(recoveryM0('otro')).toBe(0.25);
  });
});

describe('observedRecovery — (p2−p1)/(1−p1), clampeado a [0,1]', () => {
  it('mapea el lift a fracción de la fuga recuperada', () => {
    expect(observedRecovery(0.2, 0.4)).toBeCloseTo(0.25, 10); // 0.2/0.8
  });
  it('un lift nulo o negativo no recupera nada', () => {
    expect(observedRecovery(0.3, 0.3)).toBe(0);
    expect(observedRecovery(0.3, 0.1)).toBe(0);
  });
  it('descarta bordes inválidos (before ≤0 o ≥1)', () => {
    expect(observedRecovery(0, 0.5)).toBeNull();
    expect(observedRecovery(1, 0.5)).toBeNull();
  });
});

describe('computePriors — empirical-Bayes con shrinkage al M0 de la familia', () => {
  const sig = (beforeConv: number, afterConv: number, absLift: number): ExperimentOutcome => ({
    estado: 'cerrado',
    veredicto: 'validado',
    fromOpportunity: 'imp-cot-design', // → familia formularios
    measurement: { target: { beforeConv, afterConv, significant: true, absLift } },
  });

  it('un experimento significativo mueve la media hacia la observación', () => {
    const p = computePriors([sig(0.2, 0.4, 0.2)]).formularios!;
    expect(p.n).toBe(1);
    expect(p.observations[0]).toBeCloseTo(0.25, 10);
    // (K0·M0 + Σobs) / (K0 + n) = (4·0.30 + 0.25) / 5 = 0.29
    expect(p.recoveryMean).toBeCloseTo(0.29, 10);
    expect(p.validated).toBe(1);
  });

  it('sin observaciones significativas, la media queda EXACTO en el M0 de la familia', () => {
    const p = computePriors([
      { estado: 'cerrado', veredicto: 'refutado', fromOpportunity: 'imp-cot-design', measurement: { target: { beforeConv: 0.2, afterConv: 0.21, significant: false, absLift: 0.01 } } },
    ]).formularios!;
    expect(p.n).toBe(0);
    expect(p.recoveryMean).toBeCloseTo(recoveryM0('formularios'), 10); // 0.30
    expect(p.refuted).toBe(1);
  });

  it('solo cuentan los experimentos CERRADOS; los abiertos se ignoran', () => {
    const p = computePriors([
      sig(0.2, 0.4, 0.2),
      { estado: 'abierto', veredicto: 'validado', fromOpportunity: 'imp-cot-design', measurement: null },
    ]).formularios!;
    expect(p.validated).toBe(1); // el abierto no suma
    expect(p.n).toBe(1);
  });

  it('un resultado significativo PERO negativo no aporta recovery', () => {
    const p = computePriors([
      { estado: 'cerrado', veredicto: 'refutado', fromOpportunity: 'imp-cot-design', measurement: { target: { beforeConv: 0.3, afterConv: 0.2, significant: true, absLift: -0.1 } } },
    ]).formularios!;
    expect(p.n).toBe(0); // absLift > 0 es requisito
  });
});

describe('priorConfidenceBoost — 0..0.2 según volumen × acuerdo', () => {
  const prior = (over: Partial<Prior>): Prior => ({
    family: 'formularios', recoveryMean: 0.3, n: 0, validated: 0, refuted: 0, inconclusive: 0, observations: [], updatedAt: '', ...over,
  });
  it('sin prior, no aporta nada', () => {
    expect(priorConfidenceBoost(undefined)).toBe(0);
    expect(priorConfidenceBoost(prior({}))).toBe(0); // total 0
  });
  it('1 validado de 1: 0.2 · (1/5) · 1 = 0.04', () => {
    expect(priorConfidenceBoost(prior({ validated: 1 }))).toBeCloseTo(0.04, 10);
  });
  it('satura: 5 validados de 5 → 0.2', () => {
    expect(priorConfidenceBoost(prior({ validated: 5 }))).toBeCloseTo(0.2, 10);
  });
  it('mucho volumen pero mitad refutados → baja por el acuerdo', () => {
    // volume=1, agreement=0.5 → 0.2·1·0.5 = 0.1
    expect(priorConfidenceBoost(prior({ validated: 5, refuted: 5 }))).toBeCloseTo(0.1, 10);
  });
});
