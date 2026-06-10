// Modelo económico — la tercera pata de la triangulación (PELG: CAC/LTV/margen).
// REGLA DE ORO: lo que NO está medido se declara como SUPUESTO. Nada se hace pasar por dato.
// Cuando tengamos churn real (Metabase) y el cruce prospecto_id, estos supuestos se reemplazan.

import { ARPU_MENSUAL_ARS } from '../mixpanel/snapshot';
import { MARKETING } from '../marketing/unitEconomics';

export interface Assumption {
  key: string;
  label: string;
  value: number;
  unit: string;
  note: string;
}

// Supuestos económicos EXPLÍCITOS. Cada uno se muestra en la UI con su nota.
export const ECON_ASSUMPTIONS: Record<string, Assumption> = {
  retentionMonths: {
    key: 'retentionMonths', label: 'Permanencia promedio', value: 24, unit: 'meses',
    note: 'SUPUESTO — falta churn real por plan (Metabase). Prepaga típicamente baja rotación.',
  },
  grossMarginPct: {
    key: 'grossMarginPct', label: 'Margen de contribución', value: 0.18, unit: '%',
    note: 'SUPUESTO — neto de siniestralidad. Varía mucho por plan; falta el dato real.',
  },
  recoveryFraction: {
    key: 'recoveryFraction', label: 'Recuperable de una fuga', value: 0.25, unit: '%',
    note: 'SUPUESTO — qué fracción del abandono es realista recuperar con una mejora (no el 100%).',
  },
  datoToCapitaPct: {
    key: 'datoToCapitaPct', label: 'Dato del cotizador → cápita', value: 0.06, unit: '%',
    note: 'SUPUESTO — sin el cruce prospecto_id no se mide qué dato termina en socio. Estimado conservador.',
  },
};

export const arpuMensualArs = ARPU_MENSUAL_ARS;
export const blendedCacArs = MARKETING.blendedCacArs;

// LTV de contribución por cápita (ARS), bajo los supuestos de arriba.
export function ltvArs(): number {
  return arpuMensualArs * ECON_ASSUMPTIONS.retentionMonths.value * ECON_ASSUMPTIONS.grossMarginPct.value;
}

// Margen de contribución por cápita a nivel compañía (LTV − CAC blended).
export function contributionMarginArs(): number {
  return ltvArs() - blendedCacArs;
}

export function ltvCacRatio(): number {
  return blendedCacArs > 0 ? ltvArs() / blendedCacArs : 0;
}

// Meses para recuperar el CAC con el margen mensual.
export function cacPaybackMonths(): number {
  const monthlyMargin = arpuMensualArs * ECON_ASSUMPTIONS.grossMarginPct.value;
  return monthlyMargin > 0 ? blendedCacArs / monthlyMargin : Infinity;
}

// Valor económico mensual de recuperar `events` conversiones de un paso del cotizador,
// que terminan en cápita a la tasa modelada. Devuelve el margen, no el ingreso bruto.
export function marginFromRecoveredEvents(events: number): number {
  return events * ECON_ASSUMPTIONS.datoToCapitaPct.value * ltvArs();
}

// Lo que NO podemos medir hoy (se muestra como límites del modelo, no se esconde).
export const ECON_GAPS: string[] = [
  'CAC por canal: el PELG reporta gasto por canal y leads totales, pero no leads por canal → usamos el CAC blended ($' +
    blendedCacArs.toLocaleString('es-AR') + ').',
  'LTV: estimado con permanencia y margen supuestos. Falta churn real (Metabase).',
  'Visita→cápita: sin el cruce prospecto_id (Mixpanel↔HubSpot) la conversión a socio es modelada, no medida.',
];
