// Lectura EN VIVO de Mixpanel (Query API + Service Account). Solo lectura.
// Trae los funnels guardados del equipo y devuelve los counts por evento, que se overlayean
// sobre la estructura de snapshot.ts (matcheando por nombre de evento).

const BASE = 'https://mixpanel.com/api/2.0';
const PID = 3807904;
const TTL = 5 * 60 * 1000;

// app funnel id → funnel_id guardado en Mixpanel (los reportes que mira el equipo)
const FUNNEL_MIXPANEL_IDS: Record<string, number> = {
  cotizador: 83516916, // Funnel Cotizados
  'wa-individual': 86954271, // Individual
  'wa-familiar': 86957267, // Familiar
  'portal-express': 84840948, // Portal Express
  contacto: 87362170, // Flow-Contacto
  empresa: 87362089, // Flow-Empresa
};

export interface LiveData {
  asOf: string;
  counts: Record<string, Record<string, number>>; // funnelId → { event: count }
}

let cache: { at: number; data: LiveData | null } | null = null;

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
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(`funnel ${funnelId}: ${res.status}`);
  const j = await res.json();
  const counts: Record<string, number> = {};
  for (const date of Object.keys(j.data || {})) {
    for (const step of j.data[date].steps || []) {
      counts[step.event] = (counts[step.event] || 0) + (step.count || 0);
    }
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

export async function getLiveCounts(): Promise<LiveData | null> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const c = creds();
  if (!c) {
    cache = { at: Date.now(), data: null };
    return null;
  }
  try {
    const auth = Buffer.from(`${c.u}:${c.s}`).toString('base64');
    const { from, to } = range(30);
    const counts: Record<string, Record<string, number>> = {};
    // Secuencial para respetar el rate limit de la Query API.
    for (const [fid, mpId] of Object.entries(FUNNEL_MIXPANEL_IDS)) {
      try {
        counts[fid] = await fetchFunnel(auth, mpId, from, to);
      } catch (e) {
        console.warn('[mixpanel live] funnel', fid, 'falló:', e);
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    const data: LiveData = { asOf: to, counts };
    cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    console.warn('[mixpanel live] falló, uso snapshot:', e);
    cache = { at: Date.now(), data: null };
    return null;
  }
}
