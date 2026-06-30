import {
  FUNNELS,
  type FunnelSnap,
  type StepSnap,
  SNAPSHOT_META,
  COTIZADOR_CHANNELS,
  ARPU_MENSUAL_ARS,
  DEAD_EVENTS,
} from './snapshot';
import { getRetailPipeline } from '../hubspot/client';
import { MARKETING, channelEconomics } from '../marketing/unitEconomics';
import { getLiveCounts } from './live';
import { FUNNEL_TARGETS, health, type Health } from './benchmarks';

export interface ComputedStep extends StepSnap {
  stepConversion: number | null;
  dropCount: number | null;
  dropPct: number | null;
  isLeak: boolean;
  widthPct: number;
}

export interface WowMetric {
  key: string;
  label: string;
  current: number;
  previous: number;
  deltaPct: number;
}

export interface ChannelRow {
  source: string;
  visits: number;
  conv: number;
  sharePct: number;
  flag: 'junk' | 'best' | 'normal';
  spendArs?: number;
  excluded?: boolean;
}

export interface Opportunity {
  channel: string;
  visits: number;
  sharePct: number;
  avgConv: number;
  extraDatos: number;
}

export interface ComputedFunnel {
  id: string;
  name: string;
  description: string;
  category: string;
  dataQuality: 'ok' | 'inconsistente';
  steps: ComputedStep[];
  top: number | null;
  bottom: number | null;
  overallConversion: number | null;
  leakStepKey: string | null;
  leakDropCount: number | null;
  leakDropPct: number | null;
  leakTransition: string | null;
  wow: WowMetric[];
  channels?: ChannelRow[];
  opportunity?: Opportunity | null;
  valueEstimateArs?: number | null;
  target?: number | null;
  health?: Health;
}

export interface HubspotSummary {
  source: 'live' | 'error' | 'snapshot';
  totalDeals: number;
  won: number;
  lost: number;
  winRate: number | null;
  contacts: number | null;
  biggestOpenStage: { label: string; count: number } | null;
  cancelados: number;
  cotizaciones: number;
  altaSocio: number;
}

export interface Analytics {
  meta: typeof SNAPSHOT_META;
  source: 'live' | 'snapshot';
  funnels: ComputedFunnel[];
  summary: {
    totalEntradas: number;
    totalLeads: number;
    asociados: number;
    cotizadorConversion: number | null;
    biggestLeak: { funnel: string; transition: string; dropPct: number } | null;
  };
  hubspot: HubspotSummary | null;
  marketing: typeof MARKETING;
  deadEvents: string[];
  window: { from: string; to: string } | null; // rango efectivo de la data Mixpanel
}

function isCounted(s: StepSnap) {
  return s.status === 'live';
}

function computeFunnel(f: FunnelSnap, live: Record<string, number> | undefined, isLive: boolean): ComputedFunnel {
  const effVal = (s: StepSnap): number | null => {
    if (!isCounted(s)) return null;
    // Modo live (hay credenciales): el conteo del rango, o null si ese funnel falló — NUNCA el baked,
    // que es de 30 días y mentiría para rangos chicos. Modo snapshot (sin creds): el valor baked.
    if (isLive) return s.event && live && live[s.event] != null ? live[s.event] : null;
    return s.value ?? null;
  };
  const liveValues = f.steps.map(effVal).filter((v): v is number => v != null);
  const top = liveValues.length ? liveValues[0] : null;

  let prevLive: number | null = null;
  const steps: ComputedStep[] = f.steps.map((s) => {
    const value = effVal(s);
    let stepConversion: number | null = null;
    let dropCount: number | null = null;
    let dropPct: number | null = null;
    if (value != null && prevLive != null && prevLive > 0) {
      stepConversion = value / prevLive;
      dropCount = prevLive - value;
      dropPct = dropCount / prevLive;
    }
    const widthPct = value != null && top && top > 0 ? Math.max((value / top) * 100, 1) : 0;
    if (value != null) prevLive = value;
    return { ...s, value, stepConversion, dropCount, dropPct, isLeak: false, widthPct };
  });

  let leak: ComputedStep | null = null;
  for (const st of steps) {
    if (st.dropCount != null && st.dropCount > 0 && (leak == null || st.dropCount > (leak.dropCount ?? 0))) {
      leak = st;
    }
  }
  if (leak) leak.isLeak = true;

  let leakTransition: string | null = null;
  if (leak) {
    const idx = steps.findIndex((s) => s.key === leak!.key);
    let prevLabel = '';
    for (let j = idx - 1; j >= 0; j--) {
      if (steps[j].value != null) {
        prevLabel = steps[j].label;
        break;
      }
    }
    leakTransition = `${prevLabel} → ${leak.label}`;
  }

  const bottom = liveValues.length ? liveValues[liveValues.length - 1] : null;
  const overallConversion = top && bottom ? bottom / top : null;

  const wow: WowMetric[] = f.wow.map((m) => ({
    ...m,
    deltaPct: m.previous > 0 ? (m.current - m.previous) / m.previous : 0,
  }));

  return {
    id: f.id,
    name: f.name,
    description: f.description,
    category: f.category,
    dataQuality: f.dataQuality ?? 'ok',
    steps,
    top,
    bottom,
    overallConversion,
    leakStepKey: leak?.key ?? null,
    leakDropCount: leak?.dropCount ?? null,
    leakDropPct: leak?.dropPct ?? null,
    leakTransition,
    wow,
    target: FUNNEL_TARGETS[f.id] ?? null,
    health: FUNNEL_TARGETS[f.id] != null ? health(overallConversion, FUNNEL_TARGETS[f.id]) : undefined,
  };
}

function buildChannels(): ChannelRow[] {
  const cotizadorTop = 41820;
  return COTIZADOR_CHANNELS.map((c) => {
    const flag: ChannelRow['flag'] =
      c.conv < 0.03 && c.visits > 1000 ? 'junk' : c.conv >= 0.25 ? 'best' : 'normal';
    const eco = channelEconomics(c.source);
    return { ...c, sharePct: c.visits / cotizadorTop, flag, spendArs: eco?.spendArs, excluded: eco?.excluded };
  });
}

export async function getAnalytics(from?: string, to?: string): Promise<Analytics> {
  // Mixpanel y HubSpot EN PARALELO (antes era secuencial → sumaba tiempos).
  const [live, pipe] = await Promise.all([getLiveCounts(from, to), getRetailPipeline()]);
  const isLive = live != null;
  const funnels = FUNNELS.map((f) => computeFunnel(f, live?.counts[f.id], isLive));

  const cotizador = funnels.find((f) => f.id === 'cotizador')!;
  const waInd = funnels.find((f) => f.id === 'wa-individual');
  const waFam = funnels.find((f) => f.id === 'wa-familiar');
  const asociados = (waInd?.bottom ?? 0) + (waFam?.bottom ?? 0);

  // Extras del cotizador: canales + oportunidad.
  const channels = buildChannels();
  const junk = channels.filter((c) => c.flag === 'junk').sort((a, b) => b.visits - a.visits)[0];
  const avgGoodConv = 0.16;
  const opportunity: Opportunity | null = junk
    ? {
        channel: junk.source,
        visits: junk.visits,
        sharePct: junk.sharePct,
        avgConv: avgGoodConv,
        extraDatos: Math.round(junk.visits * avgGoodConv - junk.visits * junk.conv),
      }
    : null;
  cotizador.channels = channels;
  cotizador.opportunity = opportunity;

  // Resumen
  const totalEntradas = funnels.reduce((acc, f) => acc + (f.top ?? 0), 0);
  const totalLeads =
    (funnels.find((f) => f.id === 'contacto')?.bottom ?? 0) +
    (funnels.find((f) => f.id === 'empresa')?.bottom ?? 0);
  const biggestLeak = funnels
    .filter((f) => f.leakDropPct != null)
    .sort((a, b) => (b.leakDropCount ?? 0) - (a.leakDropCount ?? 0))[0];

  // HubSpot — `pipe` ya se trajo en paralelo arriba (cacheado 5 min, resiliente).
  const stageCount = (needle: string) =>
    pipe.stages.find((s) => s.label.toLowerCase().includes(needle))?.count ?? 0;
  const openStages = pipe.stages.filter((s) => !s.isClosed);
  const biggestOpen = openStages.length ? openStages.reduce((a, b) => (b.count > a.count ? b : a)) : null;
  const hubspot: HubspotSummary | null =
    pipe.source !== 'error'
      ? {
          source: pipe.source, // 'live' o 'snapshot' (simulación)
          totalDeals: pipe.totals.totalDeals,
          won: pipe.totals.won,
          lost: pipe.totals.lost,
          winRate: pipe.totals.winRate,
          contacts: pipe.totals.contacts,
          biggestOpenStage: biggestOpen ? { label: biggestOpen.label, count: biggestOpen.count } : null,
          cancelados: stageCount('cancelado'),
          cotizaciones: stageCount('cotizacion'),
          altaSocio: stageCount('alta de socio'),
        }
      : null;

  return {
    meta: live ? { ...SNAPSHOT_META, asOf: live.asOf } : SNAPSHOT_META,
    source: live ? 'live' : 'snapshot',
    funnels,
    summary: {
      totalEntradas,
      totalLeads,
      asociados,
      cotizadorConversion: cotizador.overallConversion,
      biggestLeak: biggestLeak
        ? { funnel: biggestLeak.name, transition: biggestLeak.leakTransition ?? '', dropPct: biggestLeak.leakDropPct ?? 0 }
        : null,
    },
    hubspot,
    marketing: MARKETING,
    deadEvents: DEAD_EVENTS,
    window: live ? { from: live.from, to: live.asOf } : null,
  };
}
