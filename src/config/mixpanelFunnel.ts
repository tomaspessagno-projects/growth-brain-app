// Mapeo de los 7 pasos del funnel (config/funnel.ts) a eventos VIVOS de Mixpanel.
// Proyecto Medicus 3807904. Regla del producto: solo trackeamos eventos vivos.
// Los eventos muertos/legacy quedan documentados y explícitamente excluidos.

export type StepStatus = 'live' | 'pending';

export interface MixpanelStepMap {
  key: string;            // coincide con FUNNEL_STEPS.key de config/funnel.ts
  event: string | null;   // evento vivo de Mixpanel; null si el paso aún no está instrumentado
  status: StepStatus;
  note?: string;
}

export const MIXPANEL_FUNNEL_MAP: MixpanelStepMap[] = [
  { key: 'visitas',          event: 'cotizador__paso_1__view',               status: 'live' },
  { key: 'datos_personales', event: 'cotizador__formulario_datos__complete', status: 'live' },
  {
    key: 'cotizaron',
    event: 'cotizador__plan_opcion__select',
    status: 'live',
    note: 'Definición actual: eligió una opción de plan. Alternativa más amplia: cotizador__paso_2__view (vio precios).',
  },
  { key: 'intencion_alta',   event: 'cotizador__intencion_de_alta',          status: 'live' },
  {
    key: 'inicio_alta',
    event: null,
    status: 'pending',
    note: 'Sin evento vivo limpio. Candidato débil: alta_online_modal__click (~99/mes).',
  },
  { key: 'ingreso_portal',   event: 'cotizador__paso4_view__portal',         status: 'live' },
  {
    key: 'cliente',
    event: null,
    status: 'pending',
    note: 'A definir con dev/data. Flow_Asociado está vivo (1.847/sem) pero parece otro funnel. pago/firma_solicitud están MUERTOS.',
  },
];

// Eventos descartados por estar muertos / legacy (NO trackear). Documentados para que no
// vuelvan a colarse en ningún mapeo.
export const DEAD_EVENTS = ['pago', 'firma_solicitud', 'Flow_FollowUp_Alta'];
