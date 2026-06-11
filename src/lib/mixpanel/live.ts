// Lectura EN VIVO de Mixpanel (Query API + Service Account). Solo lectura.
// Trae los funnels guardados del equipo y devuelve los counts por evento, que se overlayean
// sobre la estructura de snapshot.ts (matcheando por nombre de evento).

const BASE = 'https://mixpanel.com/api/2.0';
const PID = 3807904;
const TTL = 10 * 60 * 1000; // cache por rango — 10 min para bajar la presión sobre la Query API de Mixpanel

// app funnel id → funnel_id guardado en Mixpanel (los reportes que mira el equipo)
const FUNNEL_MIXPANEL_IDS: Record<string, number> = {
  cotizador: 83516916, // Funnel Cotizados
  'wa-individual': 86954271, // Individual
  'wa-familiar': 86957267, // Familiar
  'portal-express': 84840948, // Portal Express
  contacto: 87362170, // Flow-Contacto
  empresa: 87362089, // Flow-Empresa
};

// El cotizador NO tiene un saved funnel funcional (el guardado "Funnel Cotizados" devuelve vacío
// por la API). Se arma desde sus eventos vía segmentation (unique), que sí responde a cualquier rango.
const COTIZADOR_EVENTS = [
  'cotizador__paso_1__view',
  'cotizador__envio_codigo_verificacion',
  'cotizador__paso_2__view',
  'cotizador__paso_3__view',
];

export interface LiveData {
  asOf: string; // fin del rango (to)
  from: string; // inicio del rango
  counts: Record<string, Record<string, number>>; // funnelId → { event: count }
}

const cacheByRange = new Map<string, { at: number; data: LiveData | null }>();

function creds() {
  const u = process.env.MIXPANEL_SERVICE_USER;
  const s = process.env.MIXPANEL_SERVICE_SECRET;
  return u && s ? { u, s } : null;
}

function range(days: number) {
  // Ventana anclada a días COMPLETOS: termina AYER, no hoy. El día actual (y los últimos)
  // Mixpanel los sigue ingiriendo/deduplicando, así que incluirlos hace variar el número en
  // cada recarga. Terminando ayer, dentro del mismo día la consulta es idéntica y estable.
  const to = new Date(Date.now() - 86400000); // ayer
  const from = new Date(to.getTime() - (days - 1) * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

async function fetchFunnel(auth: string, funnelId: number, from: string, to: string): Promise<Record<string, number>> {
  const url = `${BASE}/funnels?project_id=${PID}&funnel_id=${funnelId}&from_date=${from}&to_date=${to}&unit=month`;
  // Retry con backoff ante 429 (rate limit de la Query API): evita caer al snapshot por un pico transitorio.
  let res: Response | null = null;
  for (let i = 0; i < 4; i++) {
    res = await fetch(url, { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' });
    if (res.status !== 429) break;
    await new Promise((r) => setTimeout(r, 900 * (i + 1)));
  }
  if (!res || !res.ok) throw new Error(`funnel ${funnelId}: ${res?.status ?? 'sin respuesta'}`);
  const j = await res.json();
  const counts: Record<string, number> = {};
  for (const date of Object.keys(j.data || {})) {
    for (const step of j.data[date].steps || []) {
      counts[step.event] = (counts[step.event] || 0) + (step.count || 0);
    }
  }
  return counts;
}

// Cuenta usuarios ÚNICOS por evento (segmentation), sumando los buckets del rango. Para el cotizador,
// que no tiene saved funnel funcional. Mismo type=unique + unit=month que los funnels → consistente.
async function fetchEventCounts(auth: string, events: string[], from: string, to: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const ev of events) {
    const url = `${BASE}/segmentation?project_id=${PID}&event=${encodeURIComponent(ev)}&from_date=${from}&to_date=${to}&unit=month&type=unique`;
    let res: Response | null = null;
    for (let i = 0; i < 4; i++) {
      res = await fetch(url, { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' });
      if (res.status !== 429) break;
      await new Promise((r) => setTimeout(r, 900 * (i + 1)));
    }
    if (!res || !res.ok) throw new Error(`segmentation ${ev}: ${res?.status ?? 'sin respuesta'}`);
    const j = await res.json();
    const series: Record<string, number> = j.data?.values?.[ev] || {};
    counts[ev] = Object.values(series).reduce((a, b) => a + (b || 0), 0);
    await new Promise((r) => setTimeout(r, 120));
  }
  return counts;
}

export interface FunnelStepLive {
  event: string;
  label: string;
  count: number;
}

// Lee un funnel guardado puntual (por funnel_id) para un rango — usado por la auto-medición de experimentos.
export async function fetchSavedFunnel(funnelId: number, from: string, to: string): Promise<FunnelStepLive[]> {
  const c = creds();
  if (!c) throw new Error('Falta el Service Account de Mixpanel.');
  const auth = Buffer.from(`${c.u}:${c.s}`).toString('base64');
  const url = `${BASE}/funnels?project_id=${PID}&funnel_id=${funnelId}&from_date=${from}&to_date=${to}&unit=month`;
  // Retry con backoff ante 429 (rate limit de la Query API): el motor de medición no puede fallar por esto.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(url, { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' });
    if (res.status !== 429) break;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  if (!res || !res.ok) throw new Error(`Mixpanel funnel ${funnelId}: ${res?.status ?? 'sin respuesta'}`);
  const j = await res.json();
  const order: string[] = [];
  const agg = new Map<string, FunnelStepLive>();
  for (const date of Object.keys(j.data || {})) {
    for (const s of j.data[date].steps || []) {
      const cur = agg.get(s.event);
      if (cur) cur.count += s.count || 0;
      else {
        agg.set(s.event, { event: s.event, label: s.step_label || s.event, count: s.count || 0 });
        order.push(s.event);
      }
    }
  }
  return order.map((e) => agg.get(e)!);
}

// Acepta un rango opcional (from/to en YYYY-MM-DD). Sin rango → últimos 30 días completos.
// Cache POR RANGO (clave from_to), TTL 5 min.
export async function getLiveCounts(from?: string, to?: string): Promise<LiveData | null> {
  const r = from && to ? { from, to } : range(30);
  const key = `${r.from}_${r.to}`;
  const cached = cacheByRange.get(key);
  if (cached && Date.now() - cached.at < TTL) return cached.data;
  const c = creds();
  if (!c) {
    cacheByRange.set(key, { at: Date.now(), data: null });
    return null;
  }
  try {
    const auth = Buffer.from(`${c.u}:${c.s}`).toString('base64');
    const counts: Record<string, Record<string, number>> = {};
    let failed = 0;
    // Secuencial para respetar el rate limit de la Query API.
    for (const [fid, mpId] of Object.entries(FUNNEL_MIXPANEL_IDS)) {
      try {
        counts[fid] = fid === 'cotizador'
          ? await fetchEventCounts(auth, COTIZADOR_EVENTS, r.from, r.to)
          : await fetchFunnel(auth, mpId, r.from, r.to);
      } catch (e) {
        failed++;
        console.warn('[mixpanel live] funnel', fid, 'falló:', e);
      }
      await new Promise((res) => setTimeout(res, 120));
    }
    const data: LiveData = { asOf: r.to, from: r.from, counts };
    // Solo cachear si TODOS los funnels respondieron. Si alguno falló (rate limit transitorio),
    // no se cachea → la próxima carga (o el auto-refresh de 60s) lo reintenta y se completa.
    if (failed === 0) cacheByRange.set(key, { at: Date.now(), data });
    return data;
  } catch (e) {
    console.warn('[mixpanel live] falló, uso snapshot:', e);
    cacheByRange.set(key, { at: Date.now(), data: null });
    return null;
  }
}
