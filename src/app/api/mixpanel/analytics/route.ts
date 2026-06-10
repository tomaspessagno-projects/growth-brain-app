import { NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/mixpanel/analytics';
import { generateRecommendations } from '@/lib/mixpanel/recommendations';
import { getVoice } from '@/lib/voice/verbatims';

// Payload completo de analítica: todos los funnels + resumen + canales + tendencia + recomendaciones.
// La voz del cliente (verbatims NPS) alimenta oportunidades. Todo solo lectura.
export async function GET() {
  const analytics = await getAnalytics();
  const voice = await getVoice();
  const recommendations = generateRecommendations(analytics, voice);
  return NextResponse.json({ ...analytics, recommendations });
}
