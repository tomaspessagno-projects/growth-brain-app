// ESTADO DEL CRUCE visita→cápita. SOLO LECTURA en Mixpanel — NUNCA escribe.
// Investigación (2026-06-10): el cruce NO se puede medir limpio todavía. La identidad está
// FRAGMENTADA: los perfiles de LEAD (hubspot_id/coverage/edad, del flujo WhatsApp) y los de
// SOCIO (vigencia, del sistema core) son CONJUNTOS DISJUNTOS — overlap 0. Las llaves existen
// (prospecto_id 15.117, hubspot_id 3.988) pero NO están en los registros de RESULTADO.
// Por eso una "tasa lead→cápita" sería engañosa (mediría personas distintas). Honestidad ante todo.

const MP_BASE = 'https://mixpanel.com/api/2.0';
const PID = 3807904;
const TTL = 30 * 60 * 1000;

export interface LoopDiag {
  asOf: string;
  source: 'live' | 'error';
  // Live (Mixpanel Engage, lectura)
  identified: number; // perfiles con hubspot_id (leads identificados)
  socios: number; // perfiles con vigencia (cápitas)
  overlap: number; // con hubspot_id Y vigencia ← la clave: si es ~0, los silos no se tocan
  prospectoId: number; // perfiles con prospecto_id (la llave más amplia)
  // Auditado (mediciones read-only 2026-06-10)
  joinMatchRatePct: number; // de los leads identificados, % que matchea un contacto HubSpot
  hubspotCustomers: number; // contactos con lifecyclestage=customer (raro)
  measurable: boolean;
  assumedRate: number; // el supuesto dato→cápita que sigue SIN validar
  blocker: string;
  whatWeSee: string[];
  whatToFix: string[];
  error?: string;
}

let cache: { at: number; data: LoopDiag } | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mpAuth(): string | null {
  const u = process.env.MIXPANEL_SERVICE_USER;
  const s = process.env.MIXPANEL_SERVICE_SECRET;
  return u && s ? 'Basic ' + Buffer.from(`${u}:${s}`).toString('base64') : null;
}

async function total(auth: string, where: string): Promise<number> {
  const p = new URLSearchParams({ project_id: String(PID), where });
  let res: Response | null = null;
  for (let i = 0; i < 4; i++) {
    res = await fetch(`${MP_BASE}/engage?${p.toString()}`, { headers: { Authorization: auth }, cache: 'no-store' });
    if (res.status !== 429) break;
    await sleep(1200 * (i + 1));
  }
  if (!res || !res.ok) throw new Error(`Mixpanel engage: ${res?.status ?? 'sin respuesta'}`);
  const j = await res.json();
  return j.total ?? (j.results || []).length;
}

export async function getAttribution(): Promise<LoopDiag> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const auth = mpAuth();
  if (!auth) return err('Falta el Service Account de Mixpanel.');

  try {
    const identified = await total(auth, 'defined(properties["hubspot_id"])');
    await sleep(300);
    const socios = await total(auth, 'defined(properties["vigencia"])');
    await sleep(300);
    const overlap = await total(auth, 'defined(properties["hubspot_id"]) and defined(properties["vigencia"])');
    await sleep(300);
    const prospectoId = await total(auth, 'defined(properties["prospecto_id"])');

    const measurable = overlap >= Math.max(20, socios * 0.1); // si los silos no se tocan, no es medible

    const data: LoopDiag = {
      asOf: new Date().toISOString().slice(0, 10),
      source: 'live',
      identified,
      socios,
      overlap,
      prospectoId,
      joinMatchRatePct: 89, // medido: 1.000 leads → 891 matchearon un contacto HubSpot
      hubspotCustomers: 56, // medido: lifecyclestage=customer apenas se usa
      measurable,
      assumedRate: 0.06,
      blocker:
        'La identidad está fragmentada: los perfiles de LEAD (hubspot_id/coverage/edad) y los de SOCIO (vigencia) no comparten ningún id en común (overlap ' +
        overlap +
        '). Las llaves existen pero NO están en los registros de resultado (los perfiles con vigencia están casi vacíos).',
      whatWeSee: [
        'El funnel de comportamiento (Mixpanel) de punta a punta.',
        'El pipeline comercial (HubSpot) de punta a punta.',
        'Que la llave de cruce resuelve: ~89% de los leads identificados matchean un contacto de HubSpot.',
      ],
      whatToFix: [
        'Stitchear la identidad: que el evento/sistema que setea `vigencia` (alta de socio) estampe el `prospecto_id` o `hubspot_id` del lead. Hoy el socio queda huérfano.',
        'O cerrar el cruce en el data warehouse (no en Mixpanel): unir lead-behavior ⨝ socio por prospecto_id ahí, donde ambos lados conviven.',
        'En HubSpot: asociar el deal ganado al contacto de origen (los leads de WhatsApp/Chengo hoy no tienen deal asociado).',
      ],
    };
    cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    return err(String((e as Error)?.message || e));
  }
}

function err(error: string): LoopDiag {
  return {
    asOf: new Date().toISOString().slice(0, 10),
    source: 'error', identified: 0, socios: 0, overlap: 0, prospectoId: 0,
    joinMatchRatePct: 89, hubspotCustomers: 56, measurable: false, assumedRate: 0.06,
    blocker: '', whatWeSee: [], whatToFix: [], error,
  };
}
