import { NextResponse, type NextRequest } from 'next/server';
import { runDailySweep } from '@/lib/brain/dailySweep';

// CRON DIARIO (Capa 1). Vercel Cron lo invoca por GET con `Authorization: Bearer ${CRON_SECRET}`.
// Exento del gate de auth de Supabase en el middleware → se autentica SOLO con CRON_SECRET.
// Si CRON_SECRET no está configurado, se niega (nunca queda como endpoint abierto).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const summary = await runDailySweep();
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
