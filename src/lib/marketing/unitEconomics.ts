// Unit economics de marketing — del reporte "Medicus · Performance Mayo 2026" (PDF, leído vía MCP).
// Cifras en ARS. Snapshot; a futuro se leen de Metabase / Meta / Google Ads APIs.
// El gasto/leads vive en el reporte de ads; acá lo usamos como SEÑAL para priorizar por plata.

export interface ChannelEconomics {
  keys: string[]; // utm_source que matchean este canal en el funnel del cotizador
  label: string;
  spendArs: number; // inversión mensual
  kind: 'paid' | 'organic';
  excluded?: boolean; // el cliente lo excluyó del análisis (ej. programática)
}

export const MARKETING = {
  period: 'Mayo 2026',
  source: 'Reporte Performance (PDF)',
  totalSpendArs: 135_000_000, // lead-gen (Meta + Google Search)
  totalSpendAllArs: 149_660_000, // + YouTube
  totalLeads: 13_144,
  blendedCacArs: 10_271, // CPL/CAC promedio por lead
  channels: [
    { keys: ['meta', 'meta_ads'], label: 'Meta Ads', spendArs: 101_340_000, kind: 'paid' },
    { keys: ['google'], label: 'Google Search', spendArs: 33_660_000, kind: 'paid' },
    { keys: ['display', 'Programatica369'], label: 'Programática', spendArs: 44_000_000, kind: 'paid', excluded: true },
    { keys: ['medicus_home', '(sin utm)', 'chatgpt.com'], label: 'Orgánico / propio', spendArs: 0, kind: 'organic' },
  ] as ChannelEconomics[],
};

export function channelEconomics(source: string): ChannelEconomics | null {
  return MARKETING.channels.find((c) => c.keys.includes(source)) ?? null;
}
