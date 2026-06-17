// Lectura de los PRIORS persistidos (Capa 4). Liviano: solo el admin client + tipos.
// Lo consume el path de request (score) y el Playbook. La ESCRITURA/recompute vive en dailySweep.

import { getAdminClient } from '@/utils/supabase/admin';
import type { PriorMap, Prior } from '../triangulation/priors';

function rowToPrior(r: Record<string, unknown>): Prior {
  return {
    family: r.family as Prior['family'],
    recoveryMean: Number(r.recovery_mean),
    n: Number(r.recovery_n ?? 0),
    validated: Number(r.validated ?? 0),
    refuted: Number(r.refuted ?? 0),
    inconclusive: Number(r.inconclusive ?? 0),
    observations: (r.observations as number[]) ?? [],
    updatedAt: String(r.updated_at ?? ''),
  };
}

// Lee los priors persistidos. {} si no hay service-role key o tabla (cold start → fallback a supuestos).
export async function loadPriorsFromDb(): Promise<PriorMap> {
  const db = getAdminClient();
  if (!db) return {};
  const { data, error } = await db.from('intervention_priors').select('*');
  if (error || !data) return {};
  const out: PriorMap = {};
  for (const r of data as Record<string, unknown>[]) {
    const p = rowToPrior(r);
    out[p.family] = p;
  }
  return out;
}

// Cache corto para el path de request: los priors cambian 1 vez por día (vía cron).
let priorsCache: { at: number; data: PriorMap } | null = null;
const PRIORS_TTL = 5 * 60 * 1000;

export async function getPriorsCached(): Promise<PriorMap> {
  if (priorsCache && Date.now() - priorsCache.at < PRIORS_TTL) return priorsCache.data;
  const data = await loadPriorsFromDb();
  priorsCache = { at: Date.now(), data };
  return data;
}

export function invalidatePriorsCache() {
  priorsCache = null;
}
