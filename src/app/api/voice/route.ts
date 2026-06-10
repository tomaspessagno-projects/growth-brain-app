import { NextResponse } from 'next/server';
import { getVoice } from '@/lib/voice/verbatims';

// Voz del cliente — verbatims del NPS agrupados por tema. SOLO LECTURA (HubSpot search).
export async function GET() {
  try {
    return NextResponse.json(await getVoice());
  } catch (e: unknown) {
    return NextResponse.json({ error: String((e as Error)?.message || e) }, { status: 500 });
  }
}
