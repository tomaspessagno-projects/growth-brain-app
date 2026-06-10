// Puente Oportunidad → Experimento (#3): al tomar una oportunidad se crea un experimento
// 'en_curso' con la hipótesis pre-cargada, el funnel mapeado y el baseline capturado.
// El usuario completa el board de Mixpanel + fecha para poder trackearlo.

import type { ComputedFunnel } from '../mixpanel/analytics';
import type { Recommendation } from '../mixpanel/recommendations';

export interface OppExperiment {
  id: string;
  hipotesis: string;
  funnelId: string;
  funnelName: string;
  targetStepKey: string;
  targetStepLabel: string;
  targetStepEvent?: string;
  estado: 'en_curso';
  baseline: { key: string; label: string; value: number }[];
  mixpanelFunnel?: string;
  fechaInicio?: string;
  fromOpportunity?: string; // rec.id de la oportunidad de origen
  fromOpportunityTitle?: string;
  createdAt: string;
}

// Mapea la oportunidad a uno de nuestros funnels por nombre (los recs llevan el nombre del funnel).
export function mapOppToFunnel(rec: Recommendation, funnels: ComputedFunnel[]): ComputedFunnel | undefined {
  if (!rec.funnel) return undefined;
  return funnels.find((f) => f.name === rec.funnel);
}

export function buildExperimentFromOpp(
  rec: Recommendation,
  funnel: ComputedFunnel,
  input: { targetStepKey?: string; mixpanelFunnel?: string; fechaInicio?: string },
  today: string,
): OppExperiment {
  const liveSteps = funnel.steps.filter((s) => s.status === 'live' && s.value != null);
  const target = liveSteps.find((s) => s.key === input.targetStepKey) ?? liveSteps[liveSteps.length - 1];
  return {
    id: `e${today.replace(/-/g, '')}${Math.round(performance.now())}`,
    hipotesis: `Si implementamos «${rec.title}», mejora «${target?.label ?? 'la conversión'}». ${rec.detail}`,
    funnelId: funnel.id,
    funnelName: funnel.name,
    targetStepKey: target?.key ?? '',
    targetStepLabel: target?.label ?? '',
    targetStepEvent: target?.event ?? undefined,
    estado: 'en_curso',
    baseline: liveSteps.map((s) => ({ key: s.key, label: s.label, value: s.value as number })),
    mixpanelFunnel: input.mixpanelFunnel?.trim() || undefined,
    fechaInicio: input.fechaInicio || undefined,
    fromOpportunity: rec.id,
    fromOpportunityTitle: rec.title,
    createdAt: today,
  };
}

// Persiste el experimento en localStorage (prepend). Devuelve true si pudo.
export function pushExperimentLS(exp: OppExperiment): boolean {
  try {
    const raw = localStorage.getItem('gb_experiments');
    const list = raw ? JSON.parse(raw) : [];
    localStorage.setItem('gb_experiments', JSON.stringify([exp, ...list]));
    return true;
  } catch {
    return false;
  }
}

// ¿Ya existe un experimento creado desde esta oportunidad?
export function experimentExistsForOpp(recId: string): boolean {
  try {
    const raw = localStorage.getItem('gb_experiments');
    if (!raw) return false;
    const list = JSON.parse(raw) as OppExperiment[];
    return list.some((e) => e.fromOpportunity === recId);
  } catch {
    return false;
  }
}
