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
  source: 'live' | 'error';
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

export async function getRetailPipeline(): Promise<PipelineFunnel> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;

  if (!token()) {
    return errorPayload('Falta HUBSPOT_TOKEN en el entorno.');
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
