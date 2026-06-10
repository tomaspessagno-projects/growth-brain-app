// Snapshot REAL de Mixpanel (proyecto Medicus 3807904), tomado vía MCP el 2026-06-09.
// Los funnels replican los reportes que mira el equipo en Mixpanel:
//   - Armatuplan (Funnel Cotizados)
//   - WhatsApp Individual / Familiar (board "Whatsapp Flows")
//   - Portal Express (board "Portal Express" = onboarding alta online)
// Solo eventos vivos. Con un Service Account se reemplaza por la Query API en vivo.

export const SNAPSHOT_META = {
  asOf: '2026-06-09',
  rangeDays: 30,
  conversionWindowDays: 30,
  countType: 'unique',
  projectId: 3807904,
  prevRange: '2026-04-10 → 2026-05-09',
};

export const ARPU_MENSUAL_ARS = 90000;

export type StepStatus = 'live' | 'pending' | 'handoff';

export interface StepSnap {
  key: string;
  label: string;
  event: string | null;
  status: StepStatus;
  note?: string;
  value: number | null;
}

export interface WowSnap {
  key: string;
  label: string;
  current: number;
  previous: number;
}

export interface FunnelSnap {
  id: string;
  name: string;
  description: string;
  category: string;
  dataQuality?: 'ok' | 'inconsistente';
  steps: StepSnap[];
  wow: WowSnap[];
}

export const FUNNELS: FunnelSnap[] = [
  {
    id: 'cotizador',
    name: 'Cotizador armatuplan',
    description: 'Cotización online en la web. Tras cotizar, el flujo deriva al alta por WhatsApp.',
    category: 'Adquisición',
    steps: [
      { key: 'visitas', label: 'Visitas al cotizador', event: 'cotizador__paso_1__view', status: 'live', value: 41545 },
      { key: 'verif_codigo', label: 'Verificó código (SMS)', event: 'cotizador__envio_codigo_verificacion', status: 'live', value: 5241 },
      { key: 'paso2', label: 'Cotización · paso 2', event: 'cotizador__paso_2__view', status: 'live', value: 4310 },
      { key: 'paso3', label: 'Cotización · paso 3', event: 'cotizador__paso_3__view', status: 'live', value: 3296 },
      {
        key: 'whatsapp',
        label: 'Continúa por WhatsApp',
        event: 'flow_1_envio_formulario',
        status: 'handoff',
        note: 'El flujo del cotizador deriva al alta por WhatsApp (flow_1_envio_formulario, 6.732/mes). La continuación se mide en el funnel "WhatsApp · Individual/Familiar". El evento cotizador__paso_4__view ya no registra datos.',
        value: null,
      },
    ],
    wow: [
      { key: 'visitas', label: 'Visitas', current: 41819, previous: 41843 },
      { key: 'datos', label: 'Completó datos', current: 5225, previous: 3728 },
      { key: 'cotizaron', label: 'Cotizaron', current: 1183, previous: 913 },
      { key: 'intencion', label: 'Intención de alta', current: 448, previous: 270 },
      { key: 'portal', label: 'Ingreso al portal', current: 480, previous: 307 },
    ],
  },
  {
    id: 'wa-individual',
    name: 'WhatsApp · Individual',
    description: 'Alta online por WhatsApp — plan individual (board Whatsapp Flows).',
    category: 'Conversión',
    steps: [
      { key: 'envio', label: 'Envió formulario', event: 'flow_1_envio_formulario', status: 'live', value: 6732 },
      { key: 'datos', label: 'Datos del titular', event: 'flow_2_datos_titular_individual', status: 'live', value: 3443 },
      { key: 'cartilla', label: 'Tipo de cartilla', event: 'flow_5_tipo_cartilla_individual', status: 'live', value: 2639 },
      { key: 'opciones', label: 'Opciones', event: 'flow_6_opciones_individual', status: 'live', value: 2607 },
      { key: 'plan', label: 'Seleccionó plan', event: 'flow_10_seleccion_plan_individual', status: 'live', value: 2558 },
      { key: 'detalle', label: 'Detalle del plan', event: 'flow_12_detalle_plan_individual', status: 'live', value: 1829 },
      { key: 'solicitud', label: 'Solicitó contacto', event: 'flow_13_solicitud_contacto_individual', status: 'live', value: 749 },
      { key: 'completado', label: 'Flujo completado', event: 'flow_14_flujo_completado_individual', status: 'live', value: 749 },
    ],
    wow: [],
  },
  {
    id: 'wa-familiar',
    name: 'WhatsApp · Familiar',
    description: 'Alta online por WhatsApp — plan familiar (board Whatsapp Flows).',
    category: 'Conversión',
    steps: [
      { key: 'envio', label: 'Envió formulario', event: 'flow_1_envio_formulario', status: 'live', value: 6732 },
      { key: 'datos', label: 'Datos del titular', event: 'flow_2_datos_titular_familiar', status: 'live', value: 2991 },
      { key: 'cartilla', label: 'Tipo de cartilla', event: 'flow_5_tipo_cartilla_familiar', status: 'live', value: 2052 },
      { key: 'opciones', label: 'Opciones', event: 'flow_6_opciones_familiar', status: 'live', value: 2025 },
      { key: 'plan', label: 'Seleccionó plan', event: 'flow_10_seleccion_plan_familiar', status: 'live', value: 1985 },
      { key: 'detalle', label: 'Detalle del plan', event: 'flow_12_detalle_plan_familiar', status: 'live', value: 1296 },
      { key: 'solicitud', label: 'Solicitó contacto', event: 'flow_13_solicitud_contacto_familiar', status: 'live', value: 563 },
      { key: 'completado', label: 'Flujo completado', event: 'flow_14_flujo_completado_familiar', status: 'live', value: 563 },
    ],
    wow: [],
  },
  {
    id: 'portal-express',
    name: 'Onboarding · Portal Express',
    description: 'Alta online en el portal (Chengo) — del ingreso al pago. Board "Portal Express".',
    category: 'Onboarding',
    steps: [
      { key: 'ingreso', label: 'Ingreso al portal', event: 'proceso_portal_express', status: 'live', value: 238 },
      { key: 'dni', label: 'Captura de DNI', event: 'captura_DNI', status: 'live', value: 124 },
      { key: 'datos', label: 'Carga de datos', event: 'carga_datos', status: 'live', value: 98 },
      { key: 'biometria', label: 'Verificación biométrica', event: 'Verificacion_Biometrica', status: 'live', value: 94 },
      { key: 'ddjj', label: 'Declaración jurada', event: 'DDJJ', status: 'live', value: 36 },
      { key: 'recotiza', label: 'Recotización', event: 'recotizacion', status: 'live', value: 30 },
      { key: 'resumen', label: 'Resumen del plan', event: 'resumen', status: 'live', value: 30 },
      { key: 'docs', label: 'Generación de documentos', event: 'Generacion_documentos', status: 'live', value: 29 },
      { key: 'firma', label: 'Firma de solicitud', event: 'firma_solicitud', status: 'live', value: 29 },
      { key: 'pago', label: 'Pago', event: 'pago', status: 'live', value: 17 },
    ],
    wow: [],
  },
  {
    id: 'contacto',
    name: 'Lead · Contacto',
    description: 'Formulario de contacto general.',
    category: 'Leads',
    steps: [
      { key: 'envio', label: 'Envió formulario', event: 'Flow_Contacto_1_Formulario_Envio', status: 'live', value: 4585 },
      { key: 'completo', label: 'Completó formulario', event: 'Flow_Contacto_2_Formulario_Completo', status: 'live', value: 2149 },
    ],
    wow: [
      { key: 'envio', label: 'Envió formulario', current: 4585, previous: 1573 },
      { key: 'completo', label: 'Completó formulario', current: 2149, previous: 995 },
    ],
  },
  {
    id: 'empresa',
    name: 'Lead · Empresa (B2B)',
    description: 'Formulario de empresas / corporativo.',
    category: 'Leads',
    steps: [
      { key: 'envio', label: 'Envió formulario', event: 'Flow_Empresa_1_Formulario_Envio', status: 'live', value: 217 },
      { key: 'completo', label: 'Completó formulario', event: 'Flow_Empresa_2_Formulario_Completo', status: 'live', value: 33 },
    ],
    wow: [
      { key: 'envio', label: 'Envió formulario', current: 217, previous: 75 },
      { key: 'completo', label: 'Completó formulario', current: 33, previous: 18 },
    ],
  },
];

// Desglose de la fuga del cotizador por canal (utm_source) — solo el cotizador taggea utm_source.
export const COTIZADOR_CHANNELS: { source: string; visits: number; conv: number }[] = [
  { source: 'google', visits: 15429, conv: 0.16 },
  { source: 'medicus_home', visits: 14756, conv: 0.16 },
  { source: 'display', visits: 9628, conv: 0.0002 },
  { source: '(sin utm)', visits: 1330, conv: 0.16 },
  { source: 'meta', visits: 369, conv: 0.31 },
  { source: 'Programatica369', visits: 185, conv: 0.05 },
  { source: 'meta_ads', visits: 95, conv: 0.45 },
  { source: 'chatgpt.com', visits: 83, conv: 0.18 },
];

export const DEAD_EVENTS = ['Flow_FollowUp_Alta', 'flow_2_datos_titular', 'cotizador__paso_4__view', 'cotizador__alta_online_modal__click'];
