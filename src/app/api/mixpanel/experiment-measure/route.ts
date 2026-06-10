import { NextResponse } from 'next/server';
import { measureExperiment } from '@/lib/triangulation/measure';

// Mide un experimento de forma TRIANGULADA: lee el funnel linkeado los 30d ANTES y DESPUÉS de
// la fecha de inicio (Mixpanel), corre significancia + guardrails, suma contexto comercial (HubSpot)
// y declara lo que NO puede medir (honestidad). Solo lectura.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const funnelId = Number(searchParams.get('funnelId'));
  const start = searchParams.get('start');
  const target = searchParams.get('target') || undefined;
  if (!funnelId || !start) {
    return NextResponse.json({ error: 'Falta funnelId o start (YYYY-MM-DD).' }, { status: 400 });
  }
  try {
    const measurement = await measureExperiment(funnelId, start, target);
    // before/after en el shape simple para la vista de pasos existente (impacto cruzado).
    const before = measurement.steps.map((s) => ({ event: s.event, label: s.label, count: s.beforeCount }));
    const after = measurement.steps.map((s) => ({ event: s.event, label: s.label, count: s.afterCount }));
    return NextResponse.json({
      measurement,
      before,
      after,
      beforeRange: measurement.beforeRange,
      afterRange: measurement.afterRange,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
