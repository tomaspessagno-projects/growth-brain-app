import { NextResponse } from 'next/server';
import { loadPriorsFromDb } from '@/lib/brain/priorsStore';
import { FAMILY_LABEL } from '@/lib/triangulation/priors';

// Priors numéricos aprendidos (Capa 4), para el Playbook. Gateado por el middleware (autenticado).
// Solo lectura del estado agregado del motor.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const priors = await loadPriorsFromDb();
    const list = Object.values(priors)
      .map((p) => ({ ...p, label: FAMILY_LABEL[p.family] }))
      .sort((a, b) => b.n - a.n);
    return NextResponse.json({ priors: list });
  } catch (e) {
    return NextResponse.json({ priors: [], error: String((e as Error)?.message || e) });
  }
}
