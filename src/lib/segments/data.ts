// SEGMENTOS — a quién apuntamos, basado en DATOS REALES (auditoría read-only 2026-06-10).
// Regla: cada número tiene fuente + cobertura. Lo ralo se marca; nada teórico.
// Fuentes: Mixpanel (proyecto 3807904, user props + insights) + HubSpot (669.566 contactos).
// A futuro: live + cruce por prospecto_id/hubspot_id (que YA existen como user props en Mixpanel).

export interface Bucket {
  label: string;
  count: number;
}

export const SEGMENTS_AUDIT = {
  asOf: '2026-06-10',
  contactsTotal: 669_566,

  // Cobertura de campos (cuántos contactos tienen el dato poblado) — la honestidad del modelo.
  coverage: [
    { field: 'Edad', count: 250_571, source: 'HubSpot' },
    { field: 'Canal', count: 478_498, source: 'HubSpot' },
    { field: 'Sexo', count: 147_769, source: 'HubSpot' },
    { field: 'NPS (score)', count: 1_377, source: 'HubSpot (custom)' },
    { field: 'NPS (verbatim)', count: 733, source: 'HubSpot (custom)' },
    { field: 'Plan', count: 1_713, source: 'HubSpot' },
    { field: 'Cantidad de hijos', count: 4_323, source: 'HubSpot' },
  ] as { field: string; count: number; source: string }[],

  // Composición de la demanda (Mixpanel · flow_1_envio_formulario · 30d · breakdown por coverage).
  demanda: {
    overall: 6_829,
    rows: [
      { label: 'Individual', count: 2_727 },
      { label: 'Familiar', count: 2_047 },
      { label: 'Sin taggear', count: 2_055 },
    ] as Bucket[],
    completadosMes: { individual: 749, familiar: 563 }, // de los funnels WhatsApp (snapshot)
  },

  // Edad (HubSpot, 250.571 con dato). El grueso es 31-45.
  edad: [
    { label: '18–30', count: 80_800 },
    { label: '31–45', count: 101_026 },
    { label: '46–60', count: 43_450 },
    { label: '61+', count: 23_848 },
  ] as Bucket[],

  // Canales reales (HubSpot · opciones del campo "canal").
  canales: ['META', 'CHENGO', 'WEB MEDICUS / COTI ONLINE', 'OB WHATSAPP', 'REFERIDOS', 'Influencers', 'Comparadores (Mios-ElegiMejor)', 'Eventos'],

  // NPS (muestra 400 de 1.377 con score). Direccional — ralo, no por micro-segmento.
  nps: { score: 48, sample: 400, total: 1_377, promoters: 277, passives: 37, detractors: 86, avg: 8.0, verbatimCount: 733 },

  // Señales de "lo que necesitan" (no teórico — campos reales).
  needSignals: [
    { label: 'Importancia de una cartilla amplia', detail: 'Pregunta de formulario (Form_1) — qué valoran al elegir.', source: 'HubSpot' },
    { label: 'Verbatim del NPS — el "por qué"', detail: '733 comentarios abiertos de socios. La voz cruda del cliente.', source: 'HubSpot' },
    { label: 'Composición del grupo (hijos / pareja)', detail: 'incluir_hijos · incluir_pareja · coverage_type — para qué arman el plan.', source: 'Mixpanel' },
  ],

  // El cruce que lo desbloquea todo.
  joinKeys: ['prospecto_id', 'hubspot_id'],
};

export type SegmentsAudit = typeof SEGMENTS_AUDIT;
