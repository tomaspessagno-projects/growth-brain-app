import { NextResponse } from 'next/server';
import { getAdminClient } from '@/utils/supabase/admin';
import { buildSignals, type SnapshotRow } from '@/lib/brain/detect';
import { buildCrossSignals } from '@/lib/brain/correlate';
import { DAILY_SNAPSHOTS } from '@/lib/history/dailySnapshots';

// Señales del motor (Capa 2): detección de quiebres + pace vs meta + cruces, sobre la serie diaria.
// En prod la serie viene de analytics_snapshots (la persiste el cron). En la simulación / hasta que el
// cron acumule, cae a la serie diaria bakeada (DAILY_SNAPSHOTS, jun 1→30). Solo lectura.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getAdminClient();
  let rows: SnapshotRow[] = [];
  if (db) {
    try {
      const { data } = await db
        .from('analytics_snapshots')
        .select('day, summary, payload')
        .order('day', { ascending: true })
        .limit(120);
      rows = (data ?? []) as SnapshotRow[];
    } catch {
      /* cae a la serie bakeada */
    }
  }
  const simulated = rows.length === 0;
  if (simulated) rows = DAILY_SNAPSHOTS; // simulación / sin persistencia aún
  const signals = buildSignals(rows);
  const cruces = buildCrossSignals(rows);
  return NextResponse.json({ signals, cruces, days: rows.length, simulated });
}
