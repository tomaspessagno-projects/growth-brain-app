// Unit economics de marketing — del reporte "Medicus · Performance Mayo 2026" (PDF, leído vía MCP).
// Cifras en ARS. Snapshot; a futuro se leen de Metabase / Meta / Google Ads APIs.
// El gasto/leads vive en el reporte de ads; acá lo usamos como SEÑAL para priorizar por plata.

export interface ChannelEconomics {
  keys: string[]; // utm_source que matchean este canal en el funnel del cotizador
  label: string;
  spendArs: number; // inversión mensual REAL computada (lo gastado y medido). 0 si no se mide acá.
  kind: 'paid' | 'organic';
  excluded?: boolean; // el cliente lo excluyó del análisis (ej. programática)
  plannedArs?: number; // presupuesto PLANIFICADO (no necesariamente gastado ni recuperable)
  note?: string; // aclaración para no malinterpretar el número
}

// Cifras REALES del cierre de mayo 2026 (reporte Performance, mes cerrado al 1-jun).
// Inversión lead-gen $135,00M = Meta Ads $101,34M + Google Search $33,66M.
// All-in $149,66M = lead-gen + YouTube/Video $14,66M.
// IMPORTANTE — Programática: $44M son PLANIFICADOS y EXCLUIDOS del análisis por indicación del
// cliente. NO es gasto medido, NO es atribuible al tráfico "display" del cotizador, y "reasignar
// un presupuesto" NO es ganancia. Por eso su spend REAL acá = 0 (el $44M queda como plannedArs).
export const MARKETING = {
  period: 'Mayo 2026',
  source: 'Reporte Performance (PDF, mes cerrado)',
  totalSpendArs: 135_000_000, // lead-gen REAL (Meta + Google Search)
  totalSpendAllArs: 149_660_000, // + YouTube/Video ($14,66M)
  totalLeads: 13_144,
  blendedCacArs: 10_271, // CPL/CAC promedio por lead (135,00M / 13.144)
  channels: [
    { keys: ['meta', 'meta_ads'], label: 'Meta Ads', spendArs: 101_340_000, kind: 'paid' },
    { keys: ['google'], label: 'Google Search', spendArs: 33_660_000, kind: 'paid' },
    { keys: [], label: 'YouTube / Video', spendArs: 14_660_000, kind: 'paid' },
    {
      keys: ['display', 'Programatica369'],
      label: 'Programática (planificada, excluida)',
      spendArs: 0,
      plannedArs: 44_000_000,
      kind: 'paid',
      excluded: true,
      note: '$44M PLANIFICADOS y EXCLUIDOS del análisis por el cliente. No es gasto medido ni recuperable.',
    },
    { keys: ['medicus_home', '(sin utm)', 'chatgpt.com'], label: 'Orgánico / propio', spendArs: 0, kind: 'organic' },
  ] as ChannelEconomics[],
};

export function channelEconomics(source: string): ChannelEconomics | null {
  return MARKETING.channels.find((c) => c.keys.includes(source)) ?? null;
}
