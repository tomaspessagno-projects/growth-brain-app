import { NextResponse } from 'next/server';
import { getRetailPipeline } from '@/lib/hubspot/client';

// Pipeline de deals "Retail" de HubSpot en vivo (solo lectura).
export async function GET() {
  const data = await getRetailPipeline();
  return NextResponse.json(data);
}
