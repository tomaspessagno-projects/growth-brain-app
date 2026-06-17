// BARRIDO DIARIO (Capa 1) — el motor corre 1 vez por día (cron) y:
//   1. Recomputa los PRIORS numéricos (Capa 4) desde TODOS los experimentos cerrados.
//   2. Trae la analítica del día (Mixpanel + HubSpot, solo lectura) + voz del cliente.
//   3. Genera las oportunidades rankeadas usando esos priors aprendidos.
//   4. PERSISTE la foto (analytics_snapshots) + las recos (recommendation_snapshots) en Supabase.
// Así se acumula la serie temporal propia y el ranking de cada día queda registrado.
//
// Todo degrada solo: sin service-role key corre "en seco" (calcula pero no persiste) y no rompe.

import { getAnalytics } from '../mixpanel/analytics';
import { getVoice } from '../voice/verbatims';
import { generateRecommendations } from '../mixpanel/recommendations';
import { computePriors, type PriorMap, type ExperimentOutcome } from '../triangulation/priors';
import { getAdminClient } from '@/utils/supabase/admin';
import { invalidatePriorsCache } from './priorsStore';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SweepSummary {
  day: string;
  ranAt: string;
  source: 'live' | 'snapshot';
  persisted: boolean;
  funnels: number;
  recommendations: number;
  topRecommendation: { id: string; title: string; score: number } | null;
  priorsUpdated: number;
  notes: string[];
}

const msg = (e: unknown) => String((e as Error)?.message || e);

async function recomputePriors(db: SupabaseClient): Promise<PriorMap> {
  const { data } = await db
    .from('experimentos')
    .select('estado, veredicto, funnel_id, from_opportunity, measurement');
  const outcomes: ExperimentOutcome[] = (data ?? []).map((r: Record<string, unknown>) => ({
    estado: String(r.estado ?? ''),
    veredicto: (r.veredicto as string) ?? null,
    funnelId: (r.funnel_id as string) ?? undefined,
    fromOpportunity: (r.from_opportunity as string) ?? null,
    measurement: (r.measurement as ExperimentOutcome['measurement']) ?? null,
  }));
  const priors = computePriors(outcomes);
  const rows = Object.values(priors).map((p) => ({
    family: p.family,
    recovery_mean: p.recoveryMean,
    recovery_n: p.n,
    validated: p.validated,
    refuted: p.refuted,
    inconclusive: p.inconclusive,
    observations: p.observations,
    updated_at: p.updatedAt,
  }));
  if (rows.length) await db.from('intervention_priors').upsert(rows);
  return priors;
}

export async function runDailySweep(): Promise<SweepSummary> {
  const notes: string[] = [];
  const db = getAdminClient();

  // 1. Capa 4: recomputar priors desde los experimentos cerrados (idempotente).
  let priors: PriorMap = {};
  if (db) {
    try {
      priors = await recomputePriors(db);
    } catch (e) {
      notes.push('priors: ' + msg(e));
    }
  } else {
    notes.push('Sin SUPABASE_SERVICE_ROLE_KEY: corro en seco (no persisto).');
  }

  // 2. Capa 1: barrido analítico + recos con los priors aprendidos.
  const [analytics, voice] = await Promise.all([getAnalytics(), getVoice()]);
  const recommendations = generateRecommendations(analytics, voice, priors);
  const day = analytics.window?.to ?? new Date().toISOString().slice(0, 10);

  // 3. Persistir la foto del día (snapshot + recos rankeadas).
  let persisted = false;
  if (db) {
    try {
      await db.from('analytics_snapshots').upsert({
        day,
        source: analytics.source,
        summary: analytics.summary,
        payload: { funnels: analytics.funnels, hubspot: analytics.hubspot, window: analytics.window },
        created_at: new Date().toISOString(),
      });
      // Recos del día: borrar y reinsertar (idempotente si el cron corre dos veces).
      await db.from('recommendation_snapshots').delete().eq('day', day);
      const recRows = recommendations.map((r) => ({
        day,
        rec_id: r.id,
        title: r.title,
        priority: r.priority,
        discipline: r.discipline,
        owner: r.owner,
        funnel: r.funnel ?? null,
        score: r.tri?.score ?? null,
        margin_ars: r.tri?.marginAtStakeArs ?? null,
        cadence: r.tri?.cadence ?? null,
        confidence: r.tri?.confidence ?? null,
        urgency: r.tri?.urgency ?? null,
        effort: r.tri?.effort ?? null,
      }));
      if (recRows.length) await db.from('recommendation_snapshots').insert(recRows);
      persisted = true;
      invalidatePriorsCache(); // el próximo request lee los priors frescos
    } catch (e) {
      notes.push('persist: ' + msg(e));
    }
  }

  const top = recommendations[0];
  return {
    day,
    ranAt: new Date().toISOString(),
    source: analytics.source,
    persisted,
    funnels: analytics.funnels.length,
    recommendations: recommendations.length,
    topRecommendation: top ? { id: top.id, title: top.title, score: Math.round(top.tri?.score ?? 0) } : null,
    priorsUpdated: Object.keys(priors).length,
    notes,
  };
}
