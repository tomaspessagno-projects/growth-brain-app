// Store del estado de oportunidades — híbrido Supabase / localStorage.
import { supabase } from '@/utils/supabase/client';
import { hasSession } from './session';

export type OppStatus = 'pendiente' | 'en_progreso' | 'hecha' | 'descartada';

const LS = 'gb_rec_status';
const TABLE = 'oportunidad_status';

export async function loadStatuses(): Promise<Record<string, OppStatus>> {
  if (await hasSession()) {
    const { data, error } = await supabase.from(TABLE).select('rec_id, status');
    if (!error && data) {
      const out: Record<string, OppStatus> = {};
      for (const r of data as { rec_id: string; status: OppStatus }[]) out[r.rec_id] = r.status;
      return out;
    }
  }
  try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; }
}

// 'pendiente' = sin registro (se borra la fila).
export async function setOppStatus(recId: string, status: OppStatus): Promise<void> {
  if (await hasSession()) {
    if (status === 'pendiente') await supabase.from(TABLE).delete().eq('rec_id', recId);
    else await supabase.from(TABLE).upsert({ rec_id: recId, status });
    return;
  }
  let m: Record<string, OppStatus> = {};
  try { m = JSON.parse(localStorage.getItem(LS) || '{}'); } catch { /* noop */ }
  if (status === 'pendiente') delete m[recId]; else m[recId] = status;
  try { localStorage.setItem(LS, JSON.stringify(m)); } catch { /* noop */ }
}
