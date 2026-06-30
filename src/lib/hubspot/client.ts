// Cliente de HubSpot — SOLO LECTURA. Server-side (usa HUBSPOT_TOKEN, nunca expuesto al cliente).
// Trae el pipeline de deals "Retail" en vivo (distribución de deals por etapa + métricas).

const BASE = 'https://api.hubapi.com';
const RETAIL_PIPELINE = 'default';
const TTL = 5 * 60 * 1000; // cache 5 min para no golpear la API

export interface PipelineStage {
  id: string;
  label: string;
  order: number;
  count: number;
  isClosed: boolean;
  probability: number;
}

export interface PipelineFunnel {
  source: 'live' | 'error' | 'snapshot';
  pipelineId: string;
  pipelineLabel: string;
  stages: PipelineStage[];
  totals: {
    totalDeals: number;
    won: number;
    lost: number;
    winRate: number | null;
    contacts: number | null;
  };
  asOf: string;
  error?: string;
}

let cache: { at: number; data: PipelineFunnel } | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function token() {
  return process.env.HUBSPOT_TOKEN;
}

async function hs(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HubSpot ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return res.json();
}

async function countDeals(stageId: string): Promise<number> {
  try {
    const j = await hs('/crm/v3/objects/deals/search', {
      method: 'POST',
      body: JSON.stringify({
        // Filtramos solo por dealstage: los IDs de etapa son únicos del pipeline Retail,
        // y muchos deals históricos tienen el campo `pipeline` en un valor legacy.
        filterGroups: [{ filters: [{ propertyName: 'dealstage', operator: 'EQ', value: stageId }] }],
        limit: 1,
      }),
    });
    return j.total ?? 0;
  } catch {
    return 0;
  }
}

async function countContacts(): Promise<number | null> {
  try {
    const j = await hs('/crm/v3/objects/contacts/search', { method: 'POST', body: JSON.stringify({ limit: 1 }) });
    return j.total ?? null;
  } catch {
    return null;
  }
}

// SNAPSHOT del pipeline comercial (Retail) — para la SIMULACIÓN: cuando no hay HUBSPOT_TOKEN,
// el motor corre con estos números (los reales del relevamiento) en vez de quedar vacío. Así la
// parte Comercial (cierre, stock, oportunidades) se ve igual que el resto, 100% sobre snapshots.
const SNAPSHOT_PIPELINE: PipelineFunnel = {
  source: 'snapshot',
  pipelineId: RETAIL_PIPELINE,
  pipelineLabel: 'Retail (snapshot)',
  stages: [
    { id: 'snap-cotiz', label: 'Cotizacion inicial', order: 1, count: 6800, isClosed: false, probability: 0.2 },
    { id: 'snap-prop', label: 'Propuesta Enviada', order: 2, count: 13485, isClosed: false, probability: 0.4 },
    { id: 'snap-nego', label: 'Negociación', order: 3, count: 2900, isClosed: false, probability: 0.6 },
    { id: 'snap-alta', label: 'Alta de Socio', order: 4, count: 4979, isClosed: true, probability: 1 },
    { id: 'snap-perd', label: 'Cerrado Perdido', order: 5, count: 7492, isClosed: true, probability: 0 },
    { id: 'snap-canc', label: 'Cancelado', order: 6, count: 600, isClosed: true, probability: 0 },
  ],
  totals: { totalDeals: 36256, won: 4979, lost: 8092, winRate: 4979 / (4979 + 8092), contacts: 250571 },
  asOf: '2026-06-09',
};

export async function getRetailPipeline(): Promise<PipelineFunnel> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;

  if (!token()) {
    return SNAPSHOT_PIPELINE; // simulación: sin token, corre con el snapshot comercial
  }

  try {
    const pipe = await hs(`/crm/v3/pipelines/deals/${RETAIL_PIPELINE}`);
    const rawStages = (pipe.stages as any[])
      .map((s) => ({
        id: s.id as string,
        label: (s.label as string).trim(),
        order: s.displayOrder as number,
        isClosed: s.metadata?.isClosed === 'true',
        probability: parseFloat(s.metadata?.probability || '0'),
      }))
      .sort((a, b) => a.order - b.order);

    // Secuencial con delay para respetar el rate limit de la Search API de HubSpot (~4/seg).
    const stages: PipelineStage[] = [];
    for (const s of rawStages) {
      stages.push({ ...s, count: await countDeals(s.id) });
      await sleep(140);
    }

    const won = stages.filter((s) => s.isClosed && s.probability >= 1).reduce((a, s) => a + s.count, 0);
    const lost = stages.filter((s) => s.isClosed && s.probability <= 0).reduce((a, s) => a + s.count, 0);
    const totalDeals = stages.reduce((a, s) => a + s.count, 0);
    const contacts = await countContacts();
    const winRate = won + lost > 0 ? won / (won + lost) : null;

    const data: PipelineFunnel = {
      source: 'live',
      pipelineId: RETAIL_PIPELINE,
      pipelineLabel: pipe.label || 'Retail',
      stages,
      totals: { totalDeals, won, lost, winRate, contacts },
      asOf: new Date().toISOString(),
    };
    cache = { at: Date.now(), data };
    return data;
  } catch (e: any) {
    return errorPayload(String(e?.message || e));
  }
}

function errorPayload(error: string): PipelineFunnel {
  return {
    source: 'error',
    pipelineId: RETAIL_PIPELINE,
    pipelineLabel: 'Retail',
    stages: [],
    totals: { totalDeals: 0, won: 0, lost: 0, winRate: null, contacts: null },
    asOf: new Date().toISOString(),
    error,
  };
}
