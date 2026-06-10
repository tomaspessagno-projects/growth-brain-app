import { NextResponse } from 'next/server';
import { getAttribution } from '@/lib/loop/attribution';

// Loop visita→cápita medido. SOLO LECTURA (Mixpanel Engage + HubSpot batch read).
export async function GET() {
  try {
    const data = await getAttribution();
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
