import { NextResponse } from 'next/server';

// Estado en vivo de HubSpot y Mixpanel. SOLO LECTURA, llamadas livianas (1 c/u). Cache corto
// para no spamear el rate limit. Detecta rate limits (429) y errores.
const TTL = 10_000;
let cache: { at: number; data: unknown } | null = null;

interface Check { ok: boolean; status: number; detail: string }

async function timed(fn: () => Promise<Check>): Promise<Check & { ms: number }> {
  const t0 = Date.now();
  try {
    const r = await fn();
    return { ...r, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, detail: String((e as Error)?.message || e).slice(0, 120), ms: Date.now() - t0 };
  }
}

async function checkHubspot(): Promise<Check> {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return { ok: false, status: 0, detail: 'Falta HUBSPOT_TOKEN' };
  const r = await fetch('https://api.hubapi.com/account-info/v3/details', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (r.status === 429) return { ok: false, status: 429, detail: 'Rate limited — esperá unos segundos' };
  if (r.status === 401) return { ok: false, status: 401, detail: 'Token inválido o sin permisos' };
  if (!r.ok) return { ok: false, status: r.status, detail: `Error HTTP ${r.status}` };
  return { ok: true, status: 200, detail: 'Conectado · lectura OK' };
}

async function checkMixpanel(): Promise<Check> {
  const u = process.env.MIXPANEL_SERVICE_USER, s = process.env.MIXPANEL_SERVICE_SECRET;
  if (!u || !s) return { ok: false, status: 0, detail: 'Falta el Service Account' };
  const auth = Buffer.from(`${u}:${s}`).toString('base64');
  const r = await fetch('https://mixpanel.com/api/2.0/funnels/list?project_id=3807904', { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' });
  if (r.status === 429) return { ok: false, status: 429, detail: 'Rate limited — límite de la Query API (se recupera por hora)' };
  if (r.status === 401) return { ok: false, status: 401, detail: 'Service Account inválido' };
  if (!r.ok) return { ok: false, status: r.status, detail: `Error HTTP ${r.status}` };
  const j = await r.json();
  return { ok: true, status: 200, detail: `Conectado · ${Array.isArray(j) ? j.length : '?'} funnels guardados` };
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.data);
  const [hs, mp] = await Promise.all([timed(checkHubspot), timed(checkMixpanel)]);
  const data = {
    asOf: new Date().toISOString(),
    services: [
      { name: 'HubSpot', kind: 'CRM · negocios, contactos, NPS', ...hs },
      { name: 'Mixpanel', kind: 'Comportamiento · funnels, eventos', ...mp },
    ],
  };
  cache = { at: Date.now(), data };
  return NextResponse.json(data);
}
