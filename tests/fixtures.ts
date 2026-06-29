// Fixtures DETERMINISTAS para los tests del motor. No es un suite (no termina en .test.ts).
import type { Analytics, ComputedFunnel, HubspotSummary } from '../src/lib/mixpanel/analytics';
import type { SnapshotRow } from '../src/lib/brain/detect';
import { SNAPSHOT_META } from '../src/lib/mixpanel/snapshot';
import { MARKETING } from '../src/lib/marketing/unitEconomics';

// Cotizador con la fuga, los canales y la oportunidad que leen score.ts / montecarlo.ts.
export function cotizadorFunnel(over: Partial<ComputedFunnel> = {}): ComputedFunnel {
  return {
    id: 'cotizador',
    name: 'Cotizador armatuplan',
    description: '',
    category: 'Adquisición',
    dataQuality: 'ok',
    steps: [],
    top: 41545,
    bottom: 3296,
    overallConversion: 3296 / 41545,
    leakStepKey: 'verif_codigo',
    leakDropCount: 36304,
    leakDropPct: 0.874,
    leakTransition: 'Visitas al cotizador → Verificó código (SMS)',
    wow: [],
    channels: [
      { source: 'display', visits: 9628, conv: 0.0002, sharePct: 0.23, flag: 'junk', spendArs: 12_000_000, excluded: true },
      { source: 'meta_ads', visits: 95, conv: 0.45, sharePct: 0.002, flag: 'best' },
    ],
    opportunity: { channel: 'display', visits: 9628, sharePct: 0.23, avgConv: 0.16, extraDatos: 1540 },
    target: 0.12,
    ...over,
  };
}

export function liveHubspot(over: Partial<HubspotSummary> = {}): HubspotSummary {
  return {
    source: 'live',
    totalDeals: 20000,
    won: 3000,
    lost: 5000,
    winRate: 0.375, // < WINRATE_TARGET (0.45) → hay brecha
    contacts: 40000,
    biggestOpenStage: { label: 'Propuesta Enviada', count: 13485 },
    cancelados: 200,
    cotizaciones: 100,
    altaSocio: 50,
    ...over,
  };
}

export function makeAnalytics(over: Partial<Analytics> = {}): Analytics {
  return {
    meta: SNAPSHOT_META,
    source: 'snapshot',
    funnels: [cotizadorFunnel()],
    summary: { totalEntradas: 41545, totalLeads: 2182, asociados: 1312, cotizadorConversion: 0.08, biggestLeak: null },
    hubspot: null,
    marketing: MARKETING,
    deadEvents: ['dead_evt'],
    window: null,
    ...over,
  };
}

// ---- Helpers de SERIE temporal (para detect.ts / correlate.ts) ----

const DAY_MS = 86_400_000;

// Fecha YYYY-MM-DD a `i` días de `base` (UTC, sin Date.now).
export function dayStr(base: string, i: number): string {
  return new Date(new Date(`${base}T00:00:00Z`).getTime() + i * DAY_MS).toISOString().slice(0, 10);
}

export function weekday(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay(); // 0=domingo … 6=sábado
}

// Fila de snapshot mínima con la métrica `totalEntradas` (lo que mira la detección).
export function entradasRow(day: string, totalEntradas: number): SnapshotRow {
  return { day, summary: { totalEntradas }, payload: {} };
}
