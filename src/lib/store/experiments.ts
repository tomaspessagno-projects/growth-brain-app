// Store de experimentos — híbrido Supabase / localStorage. Tipos compartidos (movidos de la página).
import { supabase } from '@/utils/supabase/client';
import { hasSession } from './session';
import type { ExperimentMeasurement } from '../triangulation/measure';

export type Estado = 'planeado' | 'en_curso' | 'cerrado';
export type Veredicto = 'validado' | 'refutado' | 'inconcluso';
export interface BaseStep { key: string; label: string; value: number }

export interface Experimento {
  id: string;
  hipotesis: string;
  funnelId: string;
  funnelName: string;
  targetStepKey: string;
  targetStepLabel: string;
  estado: Estado;
  baseline: BaseStep[];
  resultado?: Record<string, number>;
  veredicto?: Veredicto;
  aprendizaje?: string;
  mixpanelFunnel?: string;
  fechaInicio?: string;
  targetStepEvent?: string;
  autoMeasured?: boolean;
  beforeRange?: string;
  afterRange?: string;
  measurement?: ExperimentMeasurement;
  fromOpportunity?: string;
  fromOpportunityTitle?: string;
  createdAt: string;
}

const LS = 'gb_experiments';
const TABLE = 'experimentos';

function lsAll(): Experimento[] {
  try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; }
}
function lsWrite(list: Experimento[]) {
  try { localStorage.setItem(LS, JSON.stringify(list)); } catch { /* noop */ }
}

type Row = Record<string, unknown>;
function toRow(e: Experimento): Row {
  return {
    id: e.id, hipotesis: e.hipotesis, funnel_id: e.funnelId, funnel_name: e.funnelName,
    target_step_key: e.targetStepKey, target_step_label: e.targetStepLabel, target_step_event: e.targetStepEvent ?? null,
    estado: e.estado, baseline: e.baseline, resultado: e.resultado ?? null, veredicto: e.veredicto ?? null,
    aprendizaje: e.aprendizaje ?? null, mixpanel_funnel: e.mixpanelFunnel ?? null, fecha_inicio: e.fechaInicio ?? null,
    before_range: e.beforeRange ?? null, after_range: e.afterRange ?? null, measurement: e.measurement ?? null,
    auto_measured: e.autoMeasured ?? false, from_opportunity: e.fromOpportunity ?? null,
    from_opportunity_title: e.fromOpportunityTitle ?? null, created_at: e.createdAt,
  };
}
function fromRow(r: Row): Experimento {
  const s = (k: string) => (r[k] == null ? undefined : String(r[k]));
  return {
    id: String(r.id), hipotesis: String(r.hipotesis ?? ''), funnelId: String(r.funnel_id ?? ''), funnelName: String(r.funnel_name ?? ''),
    targetStepKey: String(r.target_step_key ?? ''), targetStepLabel: String(r.target_step_label ?? ''), targetStepEvent: s('target_step_event'),
    estado: (r.estado as Estado) ?? 'planeado', baseline: (r.baseline as BaseStep[]) ?? [],
    resultado: (r.resultado as Record<string, number>) ?? undefined, veredicto: (r.veredicto as Veredicto) ?? undefined,
    aprendizaje: s('aprendizaje'), mixpanelFunnel: s('mixpanel_funnel'), fechaInicio: s('fecha_inicio'),
    beforeRange: s('before_range'), afterRange: s('after_range'), measurement: (r.measurement as ExperimentMeasurement) ?? undefined,
    autoMeasured: (r.auto_measured as boolean) ?? undefined, fromOpportunity: s('from_opportunity'), fromOpportunityTitle: s('from_opportunity_title'),
    createdAt: typeof r.created_at === 'string' ? (r.created_at as string).slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

export async function loadExperiments(): Promise<Experimento[]> {
  if (await hasSession()) {
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
    if (!error && data) return (data as Row[]).map(fromRow);
  }
  return lsAll();
}

export async function upsertExperiment(e: Experimento): Promise<void> {
  if (await hasSession()) {
    await supabase.from(TABLE).upsert(toRow(e));
    return;
  }
  const list = lsAll();
  const i = list.findIndex((x) => x.id === e.id);
  if (i >= 0) list[i] = e; else list.unshift(e);
  lsWrite(list);
}

export async function deleteExperiment(id: string): Promise<void> {
  if (await hasSession()) {
    await supabase.from(TABLE).delete().eq('id', id);
    return;
  }
  lsWrite(lsAll().filter((x) => x.id !== id));
}

export async function experimentExistsForOpp(recId: string): Promise<boolean> {
  if (await hasSession()) {
    const { count } = await supabase.from(TABLE).select('id', { count: 'exact', head: true }).eq('from_opportunity', recId);
    return (count ?? 0) > 0;
  }
  return lsAll().some((e) => e.fromOpportunity === recId);
}
