// Store de los SUPUESTOS que el usuario deja asentados por oportunidad ("mi escenario"): cuánto
// asume que recupera, permanencia, etc. Persiste en localStorage (por navegador) y, si hay sesión,
// intenta espejar en Supabase (best-effort: si la tabla no existe, no rompe — queda en local).
import { supabase } from '@/utils/supabase/client';
import { hasSession } from './session';
import type { ScenarioAssumptions } from '@/lib/economics/scenario';

const LS = 'gb_rec_assumptions';
const TABLE = 'oportunidad_assumptions';

function lsRead(): Record<string, ScenarioAssumptions> {
  try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; }
}
function lsWrite(m: Record<string, ScenarioAssumptions>) {
  try { localStorage.setItem(LS, JSON.stringify(m)); } catch { /* noop */ }
}

export async function loadAssumptions(): Promise<Record<string, ScenarioAssumptions>> {
  if (await hasSession()) {
    try {
      const { data, error } = await supabase.from(TABLE).select('rec_id, assumptions');
      if (!error && data) {
        const out: Record<string, ScenarioAssumptions> = { ...lsRead() }; // local como respaldo
        for (const r of data as { rec_id: string; assumptions: ScenarioAssumptions }[]) out[r.rec_id] = r.assumptions;
        return out;
      }
    } catch { /* cae a localStorage */ }
  }
  return lsRead();
}

export async function saveAssumptions(recId: string, a: ScenarioAssumptions): Promise<void> {
  const m = lsRead();
  m[recId] = a;
  lsWrite(m); // local SIEMPRE (es el camino garantizado)
  if (await hasSession()) {
    try { await supabase.from(TABLE).upsert({ rec_id: recId, assumptions: a, updated_at: new Date().toISOString() }); } catch { /* noop */ }
  }
}

export async function clearAssumptions(recId: string): Promise<void> {
  const m = lsRead();
  delete m[recId];
  lsWrite(m);
  if (await hasSession()) {
    try { await supabase.from(TABLE).delete().eq('rec_id', recId); } catch { /* noop */ }
  }
}
