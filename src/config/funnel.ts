// Los 7 pasos del funnel de conversión de armatuplan

export interface FunnelStep {
  key: string;
  label: string;
  shortLabel: string;
}

export const FUNNEL_STEPS: FunnelStep[] = [
  { key: 'visitas',          label: 'Visitas a armatuplan',       shortLabel: 'Visitas' },
  { key: 'datos_personales', label: 'Completó datos personales',  shortLabel: 'Datos Pers.' },
  { key: 'cotizaron',        label: 'Cotizaron',                  shortLabel: 'Cotizaron' },
  { key: 'intencion_alta',   label: 'Intención de Alta',          shortLabel: 'Int. Alta' },
  { key: 'inicio_alta',      label: 'Inicio de Alta',             shortLabel: 'Ini. Alta' },
  { key: 'ingreso_portal',   label: 'Ingreso al portal',          shortLabel: 'Portal' },
  { key: 'cliente',          label: 'Cliente',                    shortLabel: 'Cliente' },
];

// Para encontrar el paso del funnel por nombre de métrica (flexible, case-insensitive)
export function matchFunnelStep(metricName: string): FunnelStep | null {
  const lower = metricName.toLowerCase().trim();
  return FUNNEL_STEPS.find(step =>
    lower.includes(step.key.replace(/_/g, ' ')) ||
    lower.includes(step.shortLabel.toLowerCase()) ||
    lower.includes(step.label.toLowerCase().substring(0, 10))
  ) || null;
}
