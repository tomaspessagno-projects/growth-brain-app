// Metas / benchmarks de conversión por funnel. Hoy en config; a futuro las setea el equipo (Supabase).
// Definen el "bien/mal" del Pulso: sin meta solo hay "subió/bajó".

export type Health = 'bien' | 'atencion' | 'mal';

export const FUNNEL_TARGETS: Record<string, number> = {
  cotizador: 0.12, // visita → fin del cotizador
  'wa-individual': 0.18,
  'wa-familiar': 0.15,
  'portal-express': 0.15,
  contacto: 0.55,
  empresa: 0.25,
};

export const WINRATE_TARGET = 0.45; // win rate comercial (HubSpot)

// Salud = valor actual vs meta. Conservador (sin trend todavía).
export function health(value: number | null, target: number): Health {
  if (value == null || target <= 0) return 'atencion';
  const ratio = value / target;
  if (ratio >= 0.95) return 'bien';
  if (ratio >= 0.6) return 'atencion';
  return 'mal';
}

// Roll-up de un área: el peor de sus funnels manda.
export function rollup(healths: Health[]): Health {
  if (healths.some((h) => h === 'mal')) return 'mal';
  if (healths.some((h) => h === 'atencion')) return 'atencion';
  return 'bien';
}

export const HEALTH_META: Record<Health, { label: string; emoji: string }> = {
  bien: { label: 'En meta', emoji: '🟢' },
  atencion: { label: 'Atención', emoji: '🟡' },
  mal: { label: 'Bajo meta', emoji: '🔴' },
};
