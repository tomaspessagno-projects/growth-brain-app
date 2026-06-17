import { NextResponse } from 'next/server';
import { getAdminClient } from '@/utils/supabase/admin';
import { buildSignals, type SnapshotRow } from '@/lib/brain/detect';

// Señales del motor (Capa 2): detección de quiebres + pace vs meta sobre la serie diaria que
// persiste el cron (Capa 1). Gateado por el middleware (autenticado). Solo lectura.
// Necesita historia: con pocos días devuelve vacío y avisa cuántos lleva.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getAdminClient();
  if (!db) return NextResponse.json({ signals: [], days: 0, note: 'Sin persistencia (falta SUPABASE_SERVICE_ROLE_KEY).' });
  try {
    const { data, error } = await db
      .from('analytics_snapshots')
      .select('day, summary, payload')
      .order('day', { ascending: true })
      .limit(120);
    if (error) return NextResponse.json({ signals: [], days: 0, note: error.message });
    const rows = (data ?? []) as SnapshotRow[];
    const signals = buildSignals(rows);
    return NextResponse.json({ signals, days: rows.length });
  } catch (e) {
    return NextResponse.json({ signals: [], days: 0, note: String((e as Error)?.message || e) });
  }
}
