// PRIORS NUMÉRICOS — el Playbook que APRENDE (Capa 4).
// Hasta hoy la "fracción recuperable de una fuga" era un supuesto fijo (25%) y la confianza era
// binaria. Acá cada experimento concluido actualiza, POR FAMILIA de intervención, cuánto de la fuga
// se recupera DE VERDAD y con cuánta confianza. El motor se vuelve más inteligente con cada experimento.
//
// Método: Empirical-Bayes (shrinkage conjugado). Con poca evidencia, la estimación se queda cerca del
// prior declarado (el supuesto 25%); con muchos experimentos, manda la data del propio producto.
//     recovery_estimada = (K0·M0 + Σ recoveries_observadas) / (K0 + n)
// donde M0 = supuesto base, K0 = pseudo-observaciones (cuánta evidencia hace falta para moverlo).

import type { Recommendation } from '../mixpanel/recommendations';
import { ECON_ASSUMPTIONS } from '../economics/model';

export type Family =
  | 'formularios'
  | 'canal'
  | 'pricing'
  | 'comercial'
  | 'voz'
  | 'instrumentacion'
  | 'otro';

export interface Prior {
  family: Family;
  recoveryMean: number; // fracción de fuga recuperada (0..1), estimada
  n: number; // experimentos significativos que la informan
  validated: number;
  refuted: number;
  inconclusive: number;
  observations: number[]; // recoveries observadas (transparencia)
  updatedAt: string;
}

export type PriorMap = Partial<Record<Family, Prior>>;

// Forma mínima de un experimento que necesita el cálculo (desacopla del store de cliente).
export interface ExperimentOutcome {
  estado: string; // 'cerrado' cuenta como evidencia
  veredicto?: string | null; // validado | refutado | inconcluso
  funnelId?: string;
  fromOpportunity?: string | null; // rec.id de origen → familia
  measurement?: {
    target?: { beforeConv: number; afterConv: number; significant: boolean; absLift: number } | null;
  } | null;
}

const M0 = ECON_ASSUMPTIONS.recoveryFraction.value; // 0.25 — el prior (supuesto declarado)
const K0 = 4; // pseudo-observaciones del prior: ~4 experimentos para empezar a moverlo

export const FAMILY_LABEL: Record<Family, string> = {
  formularios: 'Formularios / UX',
  canal: 'Canales',
  pricing: 'Pricing / Oferta',
  comercial: 'Comercial / CRM',
  voz: 'Voz del cliente',
  instrumentacion: 'Instrumentación',
  otro: 'Otros',
};

// rec.id → familia de intervención. Es el pegamento entre una oportunidad y lo aprendido.
export function familyFromRecId(recId?: string | null): Family {
  const id = (recId || '').toLowerCase();
  if (id.startsWith('imp-') || id === 'trend-up') return 'formularios';
  if (id.startsWith('channel-')) return 'canal';
  if (id.startsWith('hs-')) return 'comercial';
  if (id.startsWith('voice-')) return 'voz';
  if (
    id.startsWith('loop-') ||
    id.startsWith('pending-') ||
    id.startsWith('quality-') ||
    id === 'dead' ||
    id === 'live'
  )
    return 'instrumentacion';
  return 'otro';
}

export function recFamily(rec: Pick<Recommendation, 'id' | 'discipline'>): Family {
  const f = familyFromRecId(rec.id);
  if (f !== 'otro') return f;
  if (rec.discipline === 'datos') return 'canal';
  if (rec.discipline === 'desarrollo') return 'instrumentacion';
  return 'otro';
}

function familyOfExperiment(e: ExperimentOutcome): Family {
  const f = familyFromRecId(e.fromOpportunity);
  if (f !== 'otro') return f;
  if (['cotizador', 'contacto', 'empresa', 'wa-individual', 'wa-familiar'].includes(e.funnelId || ''))
    return 'formularios';
  return 'otro';
}

// Recovery observada: de los que se caían en el paso, qué fracción ahora convierte.
//   recovery = (p2 − p1) / (1 − p1)
// Mapea el lift de un experimento a la MISMA magnitud que usa el score (fracción de la fuga).
export function observedRecovery(beforeConv: number, afterConv: number): number | null {
  if (beforeConv <= 0 || beforeConv >= 1) return null;
  const r = (afterConv - beforeConv) / (1 - beforeConv);
  return Math.max(0, Math.min(1, r));
}

// Recalcula los priors desde TODOS los experimentos cerrados. Idempotente: es lo que corre el cron.
export function computePriors(experiments: ExperimentOutcome[]): PriorMap {
  const byFam = new Map<Family, { obs: number[]; validated: number; refuted: number; inconclusive: number }>();
  for (const e of experiments) {
    if (e.estado !== 'cerrado') continue;
    const fam = familyOfExperiment(e);
    const slot = byFam.get(fam) ?? { obs: [], validated: 0, refuted: 0, inconclusive: 0 };
    if (e.veredicto === 'validado') slot.validated++;
    else if (e.veredicto === 'refutado') slot.refuted++;
    else slot.inconclusive++;
    // La recovery solo se aprende de experimentos con paso objetivo medido, SIGNIFICATIVO y positivo.
    // (Regla del Playbook: sin significancia no es resultado.)
    const t = e.measurement?.target;
    if (t && t.significant && t.absLift > 0) {
      const r = observedRecovery(t.beforeConv, t.afterConv);
      if (r != null) slot.obs.push(r);
    }
    byFam.set(fam, slot);
  }
  const out: PriorMap = {};
  const now = new Date().toISOString();
  for (const [family, s] of byFam) {
    const n = s.obs.length;
    const sum = s.obs.reduce((a, b) => a + b, 0);
    const recoveryMean = (K0 * M0 + sum) / (K0 + n); // shrinkage hacia el supuesto base
    out[family] = {
      family,
      recoveryMean,
      n,
      validated: s.validated,
      refuted: s.refuted,
      inconclusive: s.inconclusive,
      observations: s.obs,
      updatedAt: now,
    };
  }
  return out;
}

// Confianza extra (0..0.2) que aporta el prior aprendido: más experimentos + mayor tasa de validación
// → más confianza. Satura a ~5 experimentos. Sin evidencia, no mueve nada.
export function priorConfidenceBoost(prior?: Prior): number {
  if (!prior) return 0;
  const total = prior.validated + prior.refuted + prior.inconclusive;
  if (total === 0) return 0;
  const agreement = prior.validated / total;
  const volume = Math.min(1, total / 5);
  return Math.max(0, Math.min(0.2, 0.2 * volume * agreement));
}
