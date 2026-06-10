// VOZ DEL CLIENTE — los verbatims del NPS (el "por qué" en palabras del socio). SOLO LECTURA.
// Trae los comentarios abiertos de HubSpot (nps_mensaje), los agrupa por TEMA con reglas
// transparentes, y los cruza: % de detractores que explica cada tema, en qué CANAL aparece,
// y qué VALORAN los promotores. El asesor humano resulta el eje del NPS. NUNCA escribe.

const HS_BASE = 'https://api.hubapi.com';
const TTL = 60 * 60 * 1000;

export interface ChannelCount {
  canal: string;
  n: number;
}
export interface VoiceTheme {
  key: string;
  label: string;
  n: number;
  avgScore: number | null;
  detractorPct: number; // detractores DENTRO del tema
  detractorShare: number; // % de TODOS los detractores que explica este tema
  promoterPct: number;
  topChannels: ChannelCount[];
  systemic: boolean; // true = repartido entre canales (no es bug de un canal)
  samples: string[];
  isProblem: boolean;
}
export interface Driver {
  label: string;
  n: number;
}
export interface ChannelVoice {
  canal: string;
  n: number;
  avgScore: number | null;
  detractorPct: number;
  topProblem: string | null;
}
export interface Voice {
  asOf: string;
  source: 'live' | 'error';
  total: number;
  withScore: number;
  totalDetractors: number;
  promoters: number;
  themes: VoiceTheme[];
  drivers: Driver[]; // qué valoran los promotores
  byChannel: ChannelVoice[]; // satisfacción por canal de adquisición
  error?: string;
}

const THEMES: { key: string; label: string; re: RegExp; problem: boolean }[] = [
  { key: 'seguimiento', label: 'Seguimiento lento / sin respuesta', problem: true,
    re: /no (me |nos )?(contest|respond|escrib|llam|atend|volvi[oó]|hablé|hable)|clav[oó].*visto|sin respuesta|no contestan|no responden|sigo esperando|esperando|respuesta (muy )?lenta|lent[oa]|tard[oóa]|demor|nunca me|no hubo respuesta|dejaron de|no se comunic|mal[ií]sim|mala atenci|p[eé]sim|desubicad|insistente|d[ií]as/i },
  { key: 'precio', label: 'Precio / cuota', problem: true,
    re: /car[oa]|car[ií]sim|cuota|precio|aumento|costos?|econ[oó]mic|presupuesto|no me alcanza|impagable/i },
  { key: 'cartilla', label: 'Cartilla / prestadores / zona', problem: true,
    re: /cartilla|prestador|m[eé]dic|especialista|pediatr|sanatorio|cl[ií]nic|hospital|en mi (zona|ciudad|localidad|barrio)|cerca de/i },
  { key: 'tecnico', label: 'Técnico / app / web', problem: true,
    re: /\bapp\b|web|p[aá]gina|sistema|plataforma|portal|link|formulario|celular.*(complet|afilia)|no funciona|error/i },
  { key: 'nofit', label: 'No-fit (ya tiene / no necesita)', problem: false,
    re: /ya teng|ya soy (socio|afiliad)|no necesito|otra (obra|cobertura|prepaga)|ya cuento con|ya estoy|no me interesa/i },
  { key: 'positivo', label: 'Trato positivo', problem: false,
    re: /amable|excelente|muy buena atenci|profesional|paciencia|predisposici|buen trato|conforme|s[uú]per|10\/10|muy bien|buena predisp|atendi(o|ó)|guí?[oó]|gracias|todo (bien|ok|perfecto)/i },
];

// Qué valoran los promotores (sub-temas positivos).
const DRIVERS: { label: string; re: RegExp }[] = [
  { label: 'Claridad / buena info', re: /clar[oa]|explic|entend|inform|asesor|dudas|guí?[oó]/i },
  { label: 'Profesionalismo / atención', re: /profesional|predisposici|eficien|atenci[oó]n|atendi/i },
  { label: 'Amabilidad / trato', re: /amable|trato|cordial|calidez|buena onda|simp[aá]tic/i },
  { label: 'Rapidez', re: /r[aá]pid|enseguida|al toque|inmediat/i },
  { label: 'Paciencia / dedicación', re: /paciencia|dedicaci|atent/i },
];

let cache: { at: number; data: Voice } | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function classify(text: string): string {
  for (const t of THEMES) if (t.re.test(text)) return t.key;
  return 'otro';
}

interface Row {
  m: string;
  score: number | null;
  canal: string;
  theme: string;
}

export async function getVoice(): Promise<Voice> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return err('Falta HUBSPOT_TOKEN.');
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    const rows: Row[] = [];
    let after: string | undefined;
    for (let pg = 0; pg < 9; pg++) {
      const body = {
        filterGroups: [{ filters: [{ propertyName: 'nps_mensaje', operator: 'HAS_PROPERTY' }] }],
        properties: ['nps_mensaje', 'nps', 'canal'],
        limit: 100,
        ...(after ? { after } : {}),
      };
      const r = await fetch(`${HS_BASE}/crm/v3/objects/contacts/search`, { method: 'POST', headers: H, cache: 'no-store', body: JSON.stringify(body) });
      if (!r.ok) break;
      const j = await r.json();
      for (const c of j.results || []) {
        const m = (c.properties?.nps_mensaje || '').trim();
        if (m.length < 3) continue;
        const sc = parseInt(String(c.properties?.nps ?? ''), 10);
        rows.push({ m, score: isNaN(sc) ? null : sc, canal: c.properties?.canal || '(sin canal)', theme: classify(m) });
      }
      after = j.paging?.next?.after;
      if (!after) break;
      await sleep(160);
    }

    const scored = rows.filter((r) => r.score != null) as (Row & { score: number })[];
    const totalDetractors = scored.filter((r) => r.score <= 6).length;
    const promoterRows = scored.filter((r) => r.score >= 9);

    const buckets = new Map<string, Row[]>();
    for (const row of rows) {
      if (!buckets.has(row.theme)) buckets.set(row.theme, []);
      buckets.get(row.theme)!.push(row);
    }

    const meta = (k: string) => THEMES.find((t) => t.key === k) || { key: k, label: 'Otro', problem: false };
    const themes: VoiceTheme[] = [...buckets.entries()].map(([k, list]) => {
      const sc = list.filter((x) => x.score != null) as (Row & { score: number })[];
      const avg = sc.length ? sc.reduce((a, x) => a + x.score, 0) / sc.length : null;
      const det = sc.filter((x) => x.score <= 6).length;
      const prom = sc.filter((x) => x.score >= 9).length;
      const m = meta(k);
      // canales del tema
      const chMap = new Map<string, number>();
      for (const r of list) chMap.set(r.canal, (chMap.get(r.canal) || 0) + 1);
      const topChannels = [...chMap.entries()].map(([canal, n]) => ({ canal, n })).sort((a, b) => b.n - a.n).slice(0, 4);
      const systemic = topChannels.length >= 3 && (topChannels[0]?.n ?? 0) / list.length < 0.45;
      const sorted = m.problem ? [...list].sort((a, b) => (a.score ?? 99) - (b.score ?? 99)) : list;
      return {
        key: k, label: m.label, n: list.length, avgScore: avg,
        detractorPct: sc.length ? det / sc.length : 0,
        detractorShare: totalDetractors > 0 ? det / totalDetractors : 0,
        promoterPct: sc.length ? prom / sc.length : 0,
        topChannels, systemic,
        samples: sorted.slice(0, 3).map((x) => x.m.slice(0, 140)),
        isProblem: m.problem,
      };
    }).sort((a, b) => {
      const sc = (t: VoiceTheme) => (t.isProblem ? t.detractorShare : -1);
      return sc(b) - sc(a);
    });

    const drivers: Driver[] = DRIVERS
      .map((d) => ({ label: d.label, n: promoterRows.filter((p) => d.re.test(p.m)).length }))
      .sort((a, b) => b.n - a.n);

    // Voz por canal: satisfacción + queja dominante por canal de adquisición.
    const chGroups = new Map<string, (Row & { score: number })[]>();
    for (const r of scored) {
      if (!chGroups.has(r.canal)) chGroups.set(r.canal, []);
      chGroups.get(r.canal)!.push(r);
    }
    const byChannel: ChannelVoice[] = [...chGroups.entries()]
      .filter(([, list]) => list.length >= 15)
      .map(([canal, list]) => {
        const avg = list.reduce((a, x) => a + x.score, 0) / list.length;
        const det = list.filter((x) => x.score <= 6).length;
        const pm = new Map<string, number>();
        for (const r of list) {
          const m = THEMES.find((t) => t.key === r.theme);
          if (m?.problem) pm.set(m.label, (pm.get(m.label) || 0) + 1);
        }
        const topProblem = [...pm.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        return { canal, n: list.length, avgScore: avg, detractorPct: det / list.length, topProblem };
      })
      .sort((a, b) => (a.avgScore ?? 99) - (b.avgScore ?? 99)); // peor satisfacción primero

    const data: Voice = {
      asOf: new Date().toISOString().slice(0, 10),
      source: 'live',
      total: rows.length,
      withScore: scored.length,
      totalDetractors,
      promoters: promoterRows.length,
      themes,
      drivers,
      byChannel,
    };
    cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    return err(String((e as Error)?.message || e));
  }
}

function err(error: string): Voice {
  return { asOf: new Date().toISOString().slice(0, 10), source: 'error', total: 0, withScore: 0, totalDetractors: 0, promoters: 0, themes: [], drivers: [], byChannel: [], error };
}
