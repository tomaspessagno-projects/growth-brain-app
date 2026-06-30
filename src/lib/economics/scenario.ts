// ESCENARIOS — la misma cuenta de plata, hecha PURA y reutilizable, para que el motor y el usuario
// usen EXACTAMENTE la misma fórmula. El usuario puede ajustar los supuestos (¿cuánto de la fuga
// recupero de verdad?, ¿permanencia?, ¿margen?) y ver cómo cambia la cifra, sin que el número salga
// de una caja negra. Los INPUTS son medidos (Mixpanel/HubSpot); los SUPUESTOS son lo editable.

import { ARPU_MENSUAL_ARS } from '../mixpanel/snapshot';
import { ECON_ASSUMPTIONS } from './model';

export type MarginKind = 'leak' | 'winrate' | 'stock';

// Inputs MEDIDOS (no supuestos) que sostienen la cifra de cada tipo de oportunidad.
export interface MarginInputs {
  kind: MarginKind;
  leak?: number; // fuga del paso (usuarios/mes) — leak
  recMult?: number; // multiplicador del tipo de mejora (diseño 1, producto 0.6) — leak
  decided?: number; // negocios decididos (ganados+perdidos) — winrate
  gap?: number; // brecha a la meta de cierre — winrate
  stock?: number; // negocios atascados — stock
  winRate?: number; // cierre esperado del stock — stock
}

// SUPUESTOS editables (lo que NO está medido). Son los que mueven la cifra.
export interface ScenarioAssumptions {
  recovery: number; // fracción de la fuga que se recupera (leak)
  datoCapita: number; // dato del cotizador → cápita (leak)
  retentionMonths: number; // permanencia promedio (LTV)
  marginPct: number; // margen de contribución (LTV)
}

export function ltvFromScenario(retentionMonths: number, marginPct: number): number {
  return ARPU_MENSUAL_ARS * retentionMonths * marginPct;
}

// La ÚNICA fórmula de margen. La usan el motor (score, con los supuestos por defecto) y el panel del
// usuario (con sus supuestos). Mismo input + mismos supuestos ⇒ misma cifra, sin caja negra.
export function marginFromScenario(inp: MarginInputs, a: ScenarioAssumptions): number {
  const ltv = ltvFromScenario(a.retentionMonths, a.marginPct);
  switch (inp.kind) {
    case 'leak':
      return (inp.leak ?? 0) * a.recovery * (inp.recMult ?? 1) * a.datoCapita * ltv;
    case 'winrate':
      return (inp.decided ?? 0) * (inp.gap ?? 0) * ltv;
    case 'stock':
      return (inp.stock ?? 0) * (inp.winRate ?? 0) * ltv;
  }
}

// Supuestos por defecto del motor (los declarados en ECON_ASSUMPTIONS). `recovery` puede venir del
// prior aprendido por familia; si no, cae al supuesto base.
export function engineAssumptions(recovery?: number): ScenarioAssumptions {
  return {
    recovery: recovery ?? ECON_ASSUMPTIONS.recoveryFraction.value,
    datoCapita: ECON_ASSUMPTIONS.datoToCapitaPct.value,
    retentionMonths: ECON_ASSUMPTIONS.retentionMonths.value,
    marginPct: ECON_ASSUMPTIONS.grossMarginPct.value,
  };
}

// Qué supuestos afectan la cifra de cada tipo (los demás no se muestran como editables).
export const EDITABLE_BY_KIND: Record<MarginKind, (keyof ScenarioAssumptions)[]> = {
  leak: ['recovery', 'datoCapita', 'retentionMonths', 'marginPct'],
  winrate: ['retentionMonths', 'marginPct'],
  stock: ['retentionMonths', 'marginPct'],
};

export interface AssumptionMeta {
  key: keyof ScenarioAssumptions;
  label: string;
  unit: 'pct' | 'months';
  min: number;
  max: number;
  step: number;
  note: string;
}

export const ASSUMPTION_META: Record<keyof ScenarioAssumptions, AssumptionMeta> = {
  recovery: {
    key: 'recovery', label: 'Recuperable de la fuga', unit: 'pct', min: 0, max: 0.6, step: 0.01,
    note: 'De los que hoy se caen, qué fracción REALMENTE recuperás con la mejora. El motor parte de 25–30% (techo CRO de Baymard, e-commerce, DIRECCIONAL): para una prepaga suele ser optimista. Bajalo a lo que creas real.',
  },
  datoCapita: {
    key: 'datoCapita', label: 'Dato del cotizador → cápita', unit: 'pct', min: 0, max: 0.2, step: 0.005,
    note: 'De cada dato capturado, qué fracción termina en socio. Hoy SUPUESTO 6% (falta el cruce prospecto_id para medirlo).',
  },
  retentionMonths: {
    key: 'retentionMonths', label: 'Permanencia (meses)', unit: 'months', min: 6, max: 48, step: 1,
    note: 'Meses promedio que permanece un socio. Supuesto 24m (falta el dato de bajas / Metabase).',
  },
  marginPct: {
    key: 'marginPct', label: 'Margen de contribución', unit: 'pct', min: 0.05, max: 0.4, step: 0.01,
    note: 'Margen neto de siniestralidad por cápita. Supuesto 18%.',
  },
};

export type PresetName = 'conservador' | 'base' | 'optimista';

// Presets relativos al escenario base del motor. 'base' = lo del motor; 'conservador' baja lo más
// incierto (recuperable, dato→cápita); 'optimista' lo sube. El usuario igual puede afinar a mano.
export function presetAssumptions(name: PresetName, base: ScenarioAssumptions): ScenarioAssumptions {
  if (name === 'base') return { ...base };
  const f =
    name === 'conservador'
      ? { recovery: 0.4, datoCapita: 0.7, retentionMonths: 0.85, marginPct: 0.9 }
      : { recovery: 1.4, datoCapita: 1.3, retentionMonths: 1.15, marginPct: 1.1 };
  const clampPct = (v: number) => Math.max(0, Math.min(0.95, v));
  return {
    recovery: clampPct(base.recovery * f.recovery),
    datoCapita: clampPct(base.datoCapita * f.datoCapita),
    retentionMonths: Math.max(1, Math.round(base.retentionMonths * f.retentionMonths)),
    marginPct: clampPct(base.marginPct * f.marginPct),
  };
}
