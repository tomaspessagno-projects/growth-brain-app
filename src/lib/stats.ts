// Significancia estadística para la medición de experimentos. Sin libs externas.
// Esto es lo que separa "probamos algo" de "aprendimos algo": un lift que no supera
// el ruido no es un resultado, es una casualidad.

export const Z_95 = 1.96;
export const Z_90 = 1.645;

// CDF normal estándar (aproximación Abramowitz-Stegun 26.2.17). P(Z ≤ x).
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) prob = 1 - prob;
  return prob;
}

export interface ProportionTest {
  p1: number; // conversión before
  p2: number; // conversión after
  n1: number; // muestra before (denominador = paso previo)
  n2: number; // muestra after
  absLift: number; // p2 - p1 (puntos porcentuales)
  relLift: number; // (p2 - p1) / p1
  z: number;
  pValue: number; // dos colas
  significant95: boolean;
  significant90: boolean;
  ciLow: number; // IC 95% del lift absoluto
  ciHigh: number;
}

// Test de dos proporciones (before vs after). x = éxitos del paso, n = total del paso previo.
export function twoProportionTest(x1: number, n1: number, x2: number, n2: number): ProportionTest {
  const p1 = n1 > 0 ? x1 / n1 : 0;
  const p2 = n2 > 0 ? x2 / n2 : 0;
  const pPool = n1 + n2 > 0 ? (x1 + x2) / (n1 + n2) : 0;
  const sePool = Math.sqrt(pPool * (1 - pPool) * (1 / (n1 || 1) + 1 / (n2 || 1)));
  const z = sePool > 0 ? (p2 - p1) / sePool : 0;
  const pValue = 2 * (1 - normCdf(Math.abs(z)));
  const seDiff = Math.sqrt((p1 * (1 - p1)) / (n1 || 1) + (p2 * (1 - p2)) / (n2 || 1));
  return {
    p1, p2, n1, n2,
    absLift: p2 - p1,
    relLift: p1 > 0 ? (p2 - p1) / p1 : 0,
    z,
    pValue,
    significant95: Math.abs(z) >= Z_95,
    significant90: Math.abs(z) >= Z_90,
    ciLow: p2 - p1 - Z_95 * seDiff,
    ciHigh: p2 - p1 + Z_95 * seDiff,
  };
}

// Muestra mínima por brazo para detectar un lift relativo dado (95% conf, 80% power).
export function minSampleForLift(baselineP: number, relLift: number): number {
  if (baselineP <= 0 || baselineP >= 1 || relLift <= 0) return Infinity;
  const p1 = baselineP;
  const p2 = Math.min(baselineP * (1 + relLift), 0.999);
  const pBar = (p1 + p2) / 2;
  const z = Z_95 + 0.84; // 0.84 ≈ z para 80% de power
  return Math.ceil((z * z * 2 * pBar * (1 - pBar)) / Math.pow(p2 - p1, 2));
}
