// HISTÓRICO MENSUAL (simulación) — últimos 3 meses de cada herramienta, para comparar el desempeño
// de cada métrica en el tiempo. Mayo está anclado al snapshot real; Marzo/Abril son puntos previos
// plausibles (tendencia de mejora) + los números reales de PELG que cargó el equipo.
// En producción esto se llena solo desde la serie diaria que persiste el cron (analytics_snapshots).

export interface MonthPoint {
  key: string; // '2026-03'
  label: string; // 'Mar'
  funnelConv: Record<string, number>; // conversión total (visita→fin) por embudo
  winRate: number; // cierre de ventas (HubSpot)
  deals: number; // negocios totales
  stuck: number; // stock en "Propuesta Enviada"
  leads: number; // leads/conversiones del mes (PELG)
  spendArs: number; // inversión del mes (PELG)
  cpl: number; // costo por lead (PELG)
  nps: number; // NPS direccional
}

// Etiqueta corta por embudo para los gráficos.
export const FUNNEL_LABEL: Record<string, string> = {
  cotizador: 'Cotizador',
  'wa-individual': 'WhatsApp Ind.',
  'wa-familiar': 'WhatsApp Fam.',
  'portal-express': 'Portal Express',
  contacto: 'Contacto',
  empresa: 'Empresa B2B',
};

export const MONTHLY: MonthPoint[] = [
  {
    key: '2026-03', label: 'Marzo',
    funnelConv: { cotizador: 0.068, 'wa-individual': 0.095, 'wa-familiar': 0.072, 'portal-express': 0.060, contacto: 0.42, empresa: 0.13 },
    winRate: 0.34, deals: 31000, stuck: 11800,
    leads: 7041, spendArs: 112_000_000, cpl: 15_907,
    nps: 44,
  },
  {
    key: '2026-04', label: 'Abril',
    funnelConv: { cotizador: 0.073, 'wa-individual': 0.103, 'wa-familiar': 0.078, 'portal-express': 0.065, contacto: 0.45, empresa: 0.14 },
    winRate: 0.36, deals: 33500, stuck: 12600,
    leads: 9200, spendArs: 124_000_000, cpl: 13_478,
    nps: 46,
  },
  {
    key: '2026-05', label: 'Mayo',
    funnelConv: { cotizador: 0.079, 'wa-individual': 0.111, 'wa-familiar': 0.084, 'portal-express': 0.071, contacto: 0.469, empresa: 0.152 },
    winRate: 0.38, deals: 36256, stuck: 13485,
    leads: 13144, spendArs: 135_000_000, cpl: 10_271,
    nps: 48,
  },
];

// Delta del último mes vs el primero (para mostrar la tendencia del trimestre).
export function trendDelta(pick: (m: MonthPoint) => number): number {
  if (MONTHLY.length < 2) return 0;
  const first = pick(MONTHLY[0]);
  const last = pick(MONTHLY[MONTHLY.length - 1]);
  return first ? (last - first) / Math.abs(first) : 0;
}
