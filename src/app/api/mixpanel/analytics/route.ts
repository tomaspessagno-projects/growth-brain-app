import { NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/mixpanel/analytics';
import { generateRecommendations } from '@/lib/mixpanel/recommendations';
import { getVoice } from '@/lib/voice/verbatims';
import { getPriorsCached } from '@/lib/brain/priorsStore';

// Payload completo de analítica: todos los funnels + resumen + canales + tendencia + recomendaciones.
// La voz del cliente (verbatims NPS) alimenta oportunidades. Todo solo lectura.
// `priors` (Capa 4): lo aprendido de experimentos afina recovery + confianza del ranking.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const [analytics, voice, priors] = await Promise.all([getAnalytics(from, to), getVoice(), getPriorsCached()]);
  const recommendations = generateRecommendations(analytics, voice, priors);
  return NextResponse.json({ ...analytics, recommendations });
}
