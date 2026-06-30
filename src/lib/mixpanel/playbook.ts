// El Playbook: la memoria de growth de armatuplan. El motor anota acá cada cosa que aprende
// (observaciones del funnel + resultados de experimentos). Hoy sembrado con los hallazgos reales
// de Mixpanel; a futuro, cada experimento que concluye appendea su regla (vía Supabase en prod).

// 'principio' = conocimiento DIGERIDO de la literatura (Producto/UX/BI/Data Science): un marco o
// benchmark externo, DIRECCIONAL, que informa al motor — NO una medición sobre datos de Medicus.
export type RuleStatus = 'validado' | 'refutado' | 'observacion' | 'guardrail' | 'principio';
export type RuleSource = 'observacion' | 'experimento' | 'manual' | 'investigacion';

export interface PlaybookRule {
  id: string;
  category: string;
  status: RuleStatus;
  statement: string;
  evidence: string; // para observaciones: el dato de Medicus. para principios: la fuente/cita.
  date: string;
  source: RuleSource;
}

export const PLAYBOOK_UPDATED = '2026-06-30';

export const RULE_CATEGORIES = [
  'Metodología / Triangulación',
  'Marco de métricas (Producto / BI)',
  'Estadística y causalidad (Data Science)',
  'Identidad y calidad del dato',
  'Canales',
  'Formularios / UX',
  'Conversión',
  'Segmentos / Audiencia',
  'Pricing / Oferta',
  'Comercial / CRM',
  'Instrumentación / Sistema',
];

export const STATUS_META: Record<RuleStatus, { label: string; emoji: string }> = {
  validado: { label: 'Validado', emoji: '✅' },
  refutado: { label: 'Refutado', emoji: '❌' },
  observacion: { label: 'Observación', emoji: '🔍' },
  guardrail: { label: 'Guardrail', emoji: '⚠️' },
  principio: { label: 'Principio', emoji: '📚' },
};

export const PLAYBOOK_RULES: PlaybookRule[] = [
  // Metodología / Triangulación — cómo decide y mide SysData (el método, no solo los hallazgos).
  { id: 'm-triangulacion', category: 'Metodología / Triangulación', status: 'validado', source: 'manual', date: '2026-06-10',
    statement: 'Toda decisión se triangula entre Mixpanel (comportamiento), HubSpot (comercial) y PELG (plata). Ninguna fuente sola alcanza: cada una, aislada, miente.',
    evidence: 'Definición del método, 2026-06-10' },
  { id: 'm-margen', category: 'Metodología / Triangulación', status: 'validado', source: 'manual', date: '2026-06-10',
    statement: 'Priorizar por MARGEN en juego (volumen recuperable × conversión a cápita × (LTV−CAC)), no por % de fuga. La fuga más grande no siempre es la más valiosa (ej: fuga sobre tráfico de display ≈ sin valor).',
    evidence: 'Score triangulado' },
  { id: 'm-significancia', category: 'Metodología / Triangulación', status: 'guardrail', source: 'manual', date: '2026-06-10',
    statement: 'Un experimento sin significancia estadística (p<0,05) NO es un resultado: es ruido. El veredicto exige test de dos proporciones, no un % crudo.',
    evidence: 'Motor de medición' },
  { id: 'm-ripple-capita', category: 'Metodología / Triangulación', status: 'validado', source: 'manual', date: '2026-06-10',
    statement: 'El ripple de un experimento se traza hasta la cápita. Un lift en un paso intermedio que no llega a socio cerrado es hueco.',
    evidence: 'Definición de medición' },
  { id: 'm-guardrail3', category: 'Metodología / Triangulación', status: 'guardrail', source: 'manual', date: '2026-06-10',
    statement: 'Cada experimento se chequea en 3 controles de protección: comportamiento (un paso de abajo cae), comercial (tasa de cierre / calidad del lead) y económico (CAC sube / margen baja).',
    evidence: 'Motor de medición' },
  { id: 'm-ab', category: 'Metodología / Triangulación', status: 'guardrail', source: 'manual', date: '2026-06-10',
    statement: 'Preferir A/B (variante vs control) sobre antes/después. El antes/después confunde el efecto con cualquier cosa que cambió en el tiempo (campañas, estacionalidad).',
    evidence: 'Control de confounds' },
  { id: 'm-honestidad', category: 'Metodología / Triangulación', status: 'guardrail', source: 'manual', date: '2026-06-10',
    statement: 'Lo que no está medido se declara SUPUESTO, nunca se hace pasar por dato. Hoy son supuestos: LTV (permanencia 24m, margen 18%), dato→cápita (6%), CAC por canal (se usa blended).',
    evidence: 'Capa de honestidad del modelo económico' },
  { id: 'm-prospecto', category: 'Metodología / Triangulación', status: 'guardrail', source: 'manual', date: '2026-06-10',
    statement: 'El cruce prospecto_id (Mixpanel↔HubSpot) es EL habilitador: desbloquea la atribución real visita→cápita y el ripple medido (no modelado). Es la prioridad estructural.',
    evidence: 'Decisión de arquitectura' },

  // Canales
  { id: 'r-display', category: 'Canales', status: 'guardrail', source: 'observacion', date: '2026-06-09',
    statement: 'El canal "display" no convierte (~0%) pese a traer el 23% del tráfico. No escalar.',
    evidence: '9.628 visitas/mes, 2 datos. Funnel visita→datos por utm_source' },
  { id: 'r-meta', category: 'Canales', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'meta_ads (45%) y meta (31%) convierten 2-3x el promedio (16%). Candidatos a escalar.',
    evidence: 'Funnel visita→datos por canal' },
  { id: 'r-base', category: 'Canales', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'google y medicus_home son la base de tráfico (~30k/mes) y convierten 16%: el piso sano.',
    evidence: 'utm_source' },

  // Formularios / UX
  { id: 'r-leak', category: 'Formularios / UX', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'El 88% abandona entre visitar el cotizador y completar datos personales. La mayor fuga del funnel.',
    evidence: '41.820 → 5.223, funnel secuencial 30d' },
  { id: 'r-trend', category: 'Formularios / UX', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Con tráfico plano, completó datos +40% e intención +66% vs período previo: algo en el medio del funnel mejoró. Identificar qué para sostenerlo.',
    evidence: 'WoW abr vs may' },
  { id: 'r-form-fields', category: 'Formularios / UX', status: 'observacion', source: 'manual', date: '2026-06-26',
    statement: 'Reducir campos del formulario es la palanca de UX mejor documentada: el checkout promedio tiene ~13–15 campos y suele haber 20–60% para recortar; cada campo de más cuesta del orden de −10% de conversión y un flujo de una sola página puede convertir hasta +21% vs multi-paso. Atacar la fuga del paso de datos con menos campos, validación inline y barra de progreso.',
    evidence: 'Investigación CRO — Baymard Institute (benchmark de checkout/formularios). DIRECCIONAL: es e-commerce, no prepaga.' },
  { id: 'r-form-hick', category: 'Formularios / UX', status: 'observacion', source: 'manual', date: '2026-06-26',
    statement: 'Menos decisiones por paso = menos fricción (principio de Hick-Hyman): mostrar lo mínimo en cada pantalla y revelar el resto progresivamente (como Google/Slack). Aplicar a formularios y onboarding largos. OJO: es un principio direccional, no una fórmula exacta de "menos campos = más conversión".',
    evidence: 'Hick & Hyman (1952/53), principio de UX peer-reviewed; corroborado por datos CRO de reducción de fricción.' },

  // Conversión
  { id: 'r-b2b', category: 'Conversión', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Contacto convierte 47% pero Empresa B2B solo 15%. El form/flujo B2B necesita revisión.',
    evidence: 'Flow_Contacto vs Flow_Empresa' },

  // Segmentos / Audiencia (auditoría de datos reales 2026-06-10)
  { id: 's-edad', category: 'Segmentos / Audiencia', status: 'observacion', source: 'observacion', date: '2026-06-10',
    statement: 'El núcleo de la base es 31–45 (101k de 250.571 contactos con edad). 18–30 = 81k. La edad está poblada en el 37% de los contactos: usable para segmentar.',
    evidence: 'HubSpot contact properties · edad' },
  { id: 's-demanda', category: 'Segmentos / Audiencia', status: 'observacion', source: 'observacion', date: '2026-06-10',
    statement: 'La demanda del flujo WhatsApp es 40% individual / 30% familiar / 30% SIN TAGGEAR. Individual es el segmento más grande; el 30% sin coverage es un agujero de instrumentación.',
    evidence: 'Mixpanel flow_1_envio_formulario × coverage, 30d' },
  { id: 's-nps', category: 'Segmentos / Audiencia', status: 'observacion', source: 'observacion', date: '2026-06-10',
    statement: 'NPS direccional ~48 (muestra 400 de 1.377 con score, promedio 8.0) + 733 verbatims sin explotar. OJO: el NPS nativo de HubSpot está VACÍO; el dato vive en un campo custom y es ralo — termómetro, no corte fino.',
    evidence: 'HubSpot campo custom nps/nps_mensaje' },
  { id: 's-join', category: 'Segmentos / Audiencia', status: 'guardrail', source: 'observacion', date: '2026-06-10',
    statement: 'Para que los cortes (edad/canal/composición) sean PERSONAS reales con cápita atrás, falta cerrar el cruce — que HOY está bloqueado por identidad fragmentada (ver r-loop: lead y socio son perfiles disjuntos). Hasta arreglar eso, son cortes aislados, no cross-tabs medidos, y el dato→cápita 6% sigue SUPUESTO.',
    evidence: 'Investigación del cruce 2026-06-10' },

  // Pricing / Oferta
  { id: 'r-aporte', category: 'Pricing / Oferta', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Hipótesis a validar: cuando el aporte cubre la cuota, la intención de alta sube. El evento existe — armar experimento.',
    evidence: 'evento cotizador__aporte_cubre_cuota' },

  // Comercial / CRM (HubSpot)
  { id: 'r-winrate', category: 'Comercial / CRM', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Tasa de cierre del proceso de ventas: 38% (4.979 ganados / 8.092 perdidos). Subir la tasa de cierre es palanca directa de cápitas.',
    evidence: 'HubSpot negocios por etapa' },
  { id: 'r-hsstock', category: 'Comercial / CRM', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'El mayor stock abierto del proceso de ventas está en "Propuesta Enviada" (~13.480 negocios). Cuello comercial — revisar seguimiento.',
    evidence: 'HubSpot distribución por etapa' },
  { id: 'v-seguimiento', category: 'Comercial / CRM', status: 'observacion', source: 'observacion', date: '2026-06-10',
    statement: 'El #1 motivo de detractores en el NPS es el SEGUIMIENTO: el asesor no responde o responde tarde (93 menciones, score 2.6) — explica el 35% de TODA la detracción. Es SISTÉMICO (aparece en todos los canales por igual: REDES, WEB, CHENGO, WhatsApp), no un bug de un canal. Explica los ~13.485 negocios atascados en "Propuesta Enviada": falla de PROCESO comercial (falta un compromiso de tiempo de respuesta), no de producto.',
    evidence: 'Verbatims NPS × canal, 2026-06-10' },
  { id: 'v-promotores', category: 'Comercial / CRM', status: 'guardrail', source: 'observacion', date: '2026-06-10',
    statement: 'EL ASESOR HUMANO ES EL EJE DEL NPS: los 407 promotores valoran sobre todo claridad/buena info (186) y profesionalismo (135). El mismo eje en los dos extremos: presente y claro = promotor, ausente = detractor. GUARDRAIL: no automatizar/sacar el contacto humano — mejorar su SLA y consistencia.',
    evidence: 'Verbatims NPS de promotores (score≥9), 2026-06-10' },
  { id: 'r-hsloop', category: 'Comercial / CRM', status: 'guardrail', source: 'observacion', date: '2026-06-09',
    statement: 'Ya tenemos ambos lados del flujo (cotizador en Mixpanel + negocios en HubSpot), pero sin cruzar por prospecto_id no se puede medir visita→cápita de punta a punta.',
    evidence: 'Mixpanel + HubSpot' },

  // Instrumentación / Sistema
  { id: 'r-loop', category: 'Instrumentación / Sistema', status: 'guardrail', source: 'observacion', date: '2026-06-10',
    statement: 'El cruce visita→cápita está BLOQUEADO por IDENTIDAD FRAGMENTADA: en Mixpanel los perfiles de LEAD (hubspot_id 3.988 / coverage) y los de SOCIO (vigencia 404) son DISJUNTOS — overlap 0. Las llaves existen (prospecto_id 15.117) pero NO en el registro de resultado (el perfil con vigencia está casi vacío). En HubSpot la llave matchea 89%, pero los leads de WhatsApp no tienen deal asociado y lifecyclestage=customer casi no se usa (56). FIX: estampar prospecto_id en el alta de socio, o cruzar en el warehouse.',
    evidence: 'Investigación del cruce 2026-06-10 (Mixpanel Engage + HubSpot batch, solo lectura)' },
  { id: 'r-dead', category: 'Instrumentación / Sistema', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Eventos muertos, no usar: pago, firma_solicitud, Flow_FollowUp_Alta, flow_2_datos_titular.',
    evidence: '<5 usuarios/7d' },
  { id: 'r-utm', category: 'Instrumentación / Sistema', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Contacto/Empresa/Alta no taggean utm_source: no se puede analizar su origen.',
    evidence: 'breakdown = undefined' },
  { id: 'r-alta', category: 'Instrumentación / Sistema', status: 'guardrail', source: 'observacion', date: '2026-06-09',
    statement: 'El flujo Alta (flow_N) tiene instrumentación inconsistente (asociado 3.900 > completado 1.324). No confiar en su conversión hasta unificar.',
    evidence: 'multi-funnel counts' },
  { id: 'r-resolved', category: 'Instrumentación / Sistema', status: 'observacion', source: 'observacion', date: '2026-06-09',
    statement: 'Pasos resueltos: inicio_alta = cotizador__alta_online_modal__click; cliente = handoff al funnel Alta (Flow_Asociado).',
    evidence: 'validación secuencial' },

  // ======================================================================================
  // BASE DE CONOCIMIENTO (📚 principios). Marcos y benchmarks DIGERIDOS de la literatura de
  // Producto, UX, BI y Data Science. Son DIRECCIONALES y con fuente — informan al motor, NO son
  // mediciones sobre datos de Medicus. Lo medido en Medicus está arriba (🔍 observaciones).
  // ======================================================================================

  // Marco de métricas (Producto / BI)
  { id: 'kb-northstar', category: 'Marco de métricas (Producto / BI)', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'North Star Metric: una sola métrica que captura el VALOR real entregado al cliente; el resto son inputs que la mueven. Para una prepaga, la candidata es la cápita activa retenida — no “leads” ni “cotizaciones”, que son medios. Optimizar un medio puede romper el fin.',
    evidence: 'Sean Ellis; Amplitude / Reforge. Marco, no medición.' },
  { id: 'kb-metric-tree', category: 'Marco de métricas (Producto / BI)', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Árbol de métricas: la North Star se descompone en drivers casi multiplicativos — tráfico × conversión a dato × dato→cápita × retención × ARPU. Sirve para ubicar DÓNDE pega un cambio y propagar su efecto hasta la plata. Es la columna vertebral del score triangulado de SysData.',
    evidence: 'Metric trees (BI estándar; Amplitude). Marco.' },
  { id: 'kb-heart', category: 'Marco de métricas (Producto / BI)', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'HEART para medir UX más allá del último clic: Happiness, Engagement, Adoption, Retention, Task success — cada uno bajado a Goal → Signal → Metric. Recuerda medir éxito de tarea y satisfacción, no solo conversión.',
    evidence: 'Rodden, Hutchinson & Fu, Google (CHI 2010).' },
  { id: 'kb-aarrr', category: 'Marco de métricas (Producto / BI)', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Embudo de growth AARRR: Adquisición, Activación, Retención, Revenue, Referido. SysData hoy cubre fuerte Adquisición→Activación (cotizador, formularios); Retención / Revenue / Referido son el hueco de medición más grande (depende del cruce a cápita y del dato de bajas).',
    evidence: 'Dave McClure, 500 Startups (2007). Marco.' },
  { id: 'kb-vanity', category: 'Marco de métricas (Producto / BI)', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Métrica accionable vs vanidosa: una métrica sirve SOLO si cambia una decisión. Los totales que siempre suben (impresiones, visitas) tranquilizan pero no guían; preferir tasas, cohortes y márgenes. (Por eso el motor rankea por margen en juego, no por volumen.)',
    evidence: 'Lean Analytics — Croll & Yoskovitz (2013).' },

  // Estadística y causalidad (Data Science)
  { id: 'kb-power', category: 'Estadística y causalidad (Data Science)', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Antes de un A/B: fijar el efecto mínimo relevante (MDE) y calcular el N necesario para detectarlo con ~80% de poder. Correr sin N suficiente no concluye nada — y peor, invita a leer ruido como señal.',
    evidence: 'Kohavi, Tang & Xu — “Trustworthy Online Controlled Experiments” (2020).' },
  { id: 'kb-peeking', category: 'Estadística y causalidad (Data Science)', status: 'guardrail', source: 'investigacion', date: '2026-06-30',
    statement: 'No cortar el A/B “cuando da significativo” (peeking): mirar y parar infla el falso positivo. Fijar duración/N de antemano, o usar tests secuenciales diseñados para mirar en el camino.',
    evidence: 'Kohavi et al.; Johari et al. (always-valid / sequential testing).' },
  { id: 'kb-did', category: 'Estadística y causalidad (Data Science)', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Cuando no se puede randomizar, diferencias-en-diferencias (diff-in-diff): comparar el cambio del grupo tratado contra un control en el mismo período, restando la tendencia común. Exige tendencias paralelas previas — hay que chequearlas.',
    evidence: 'Card & Krueger (1994); econometría estándar.' },
  { id: 'kb-survival', category: 'Estadística y causalidad (Data Science)', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'El churn de una prepaga es CONTRACTUAL y censurado (la mayoría sigue activa hoy): usar análisis de supervivencia — Kaplan-Meier para la curva de permanencia y Cox para qué variables aceleran la baja — NO un “% que se dio de baja” crudo ni BG/NBD (que es para compras NO contractuales). Reemplaza el supuesto de permanencia 24m cuando llegue el dato de bajas.',
    evidence: 'Klein & Moeschberger; Fader & Hardie (contractual vs no-contractual). Pendiente del dato de bajas (Metabase).' },
  { id: 'kb-eb', category: 'Estadística y causalidad (Data Science)', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Empirical Bayes / shrinkage: con poca evidencia, mezclar el dato observado con un prior razonable; a medida que llegan experimentos, manda el dato. Evita sobre-reaccionar a un solo resultado. Es exactamente cómo SysData aprende el “recuperable” por familia de intervención.',
    evidence: 'Efron & Morris (1975). Implementado en los priors del motor (K0=4).' },
  { id: 'kb-rtm', category: 'Estadística y causalidad (Data Science)', status: 'guardrail', source: 'investigacion', date: '2026-06-30',
    statement: 'Regresión a la media: un valor extremo tiende a moderarse solo, sin que hayas hecho nada. No declarar victoria (ni desastre) por un día atípico; mirar la serie y desestacionalizar. (El motor desestacionaliza por día de semana antes de marcar un quiebre.)',
    evidence: 'Kahneman, “Thinking, Fast and Slow” (2011).' },
  { id: 'kb-simpson', category: 'Estadística y causalidad (Data Science)', status: 'guardrail', source: 'investigacion', date: '2026-06-30',
    statement: 'Paradoja de Simpson: un efecto agregado puede INVERTIRSE al segmentar (por canal, plan, edad). Antes de concluir “subió/bajó”, mirar los cortes — el promedio puede mentir.',
    evidence: 'Simpson (1951); BI estándar.' },
  { id: 'kb-montecarlo', category: 'Estadística y causalidad (Data Science)', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Ante supuestos inciertos, no dar un número puntual: muestrear los supuestos (Monte Carlo) y reportar un RANGO (P10–P90) + de qué supuesto depende más. Hace explícito cuánto de la cifra es apuesta. Es lo que hace el motor con el margen en juego.',
    evidence: 'Método estándar. Implementado en SysData (2.000 simulaciones, RNG seedeado).' },
  { id: 'kb-correlacion', category: 'Estadística y causalidad (Data Science)', status: 'guardrail', source: 'investigacion', date: '2026-06-30',
    statement: 'Correlación ≠ causa. Dos métricas que se mueven juntas (incluso con rezago) son una PISTA de dónde mirar, no una explicación. La causa se prueba con un experimento. Los “cruces” de SysData son diagnósticos, nunca causales.',
    evidence: 'Principio estadístico básico.' },

  // Identidad y calidad del dato
  { id: 'kb-fellegi', category: 'Identidad y calidad del dato', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Resolución de identidad probabilística (Fellegi-Sunter): sin una llave única, matchear registros por similitud ponderada de varios campos (documento, nombre, fecha) con umbrales de match/no-match. Herramienta open-source madura: Splink. Es la SALIDA si no se puede estampar una llave en origen.',
    evidence: 'Fellegi & Sunter (1969); Splink (UK Ministry of Justice).' },
  { id: 'kb-key', category: 'Identidad y calidad del dato', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Una sola llave estable estampada de punta a punta (CUIL / prospecto_id) vale más que cualquier match probabilístico posterior. Resolver la identidad en ORIGEN > resolverla después. Es el fix de fondo del loop visita→cápita (ver r-loop).',
    evidence: 'Principio de data modeling. Conecta con r-loop / r-hsloop.' },
  { id: 'kb-dataquality', category: 'Identidad y calidad del dato', status: 'guardrail', source: 'investigacion', date: '2026-06-30',
    statement: 'Garbage in, garbage out: un análisis sobre datos sucios (eventos muertos, utm faltante, esquemas inconsistentes) es PEOR que no tener análisis, porque da falsa confianza. La higiene del dato es prerequisito, no opcional.',
    evidence: 'DAMA-DMBOK. Conecta con r-dead, r-utm, r-alta y el canal display.' },

  // Formularios / UX (principios que complementan las observaciones de Medicus de arriba)
  { id: 'kb-price-first', category: 'Formularios / UX', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Mostrar precio/valor ANTES de pedir datos personales baja la fricción de entrada; los muros de registro previos a ver valor matan conversión. Sostiene la hipótesis de “cotizá sin registrarte” en el cotizador.',
    evidence: 'Baymard Institute; Nielsen Norman Group. DIRECCIONAL (evidencia de e-commerce).' },
  { id: 'kb-jakob', category: 'Formularios / UX', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Ley de Jakob: los usuarios pasan la mayor parte del tiempo en OTROS sitios y esperan que el tuyo funcione igual. No reinventar patrones conocidos de formularios, pasos y botones — la familiaridad reduce fricción.',
    evidence: 'Jakob Nielsen, Nielsen Norman Group.' },
  { id: 'kb-friction-tech', category: 'Formularios / UX', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Parte del abandono de un formulario es TÉCNICO (errores de validación, lentitud de carga), no de diseño. Instrumentar Validation Error y tiempo de carga del paso antes de rediseñar a ciegas — el rediseño no arregla un bug.',
    evidence: 'Práctica CRO estándar. Conecta con imp-cot-dev.' },

  // Comercial / CRM (principios que complementan las observaciones de NPS / pipeline)
  { id: 'kb-lead-speed', category: 'Comercial / CRM', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'La velocidad de respuesta al lead es decisiva: contactar en los primeros minutos aumenta drásticamente la probabilidad de calificarlo, y la chance cae fuerte pasada la primera hora. Conecta directo con el cuello de “Propuesta Enviada” y el compromiso de tiempo de respuesta que pide el NPS (ver v-seguimiento).',
    evidence: 'Oldroyd (Lead Response Management, 2007); HBR “The Short Life of Online Sales Leads” (2011). DIRECCIONAL.' },
  { id: 'kb-retention', category: 'Comercial / CRM', status: 'principio', source: 'investigacion', date: '2026-06-30',
    statement: 'Retener cuesta menos que adquirir y compone más: en negocios contractuales como prepaga, subir la retención unos puntos mueve el LTV más que bajar el CAC, y la baja TEMPRANA (primeros meses) es la más cara. Refuerza priorizar onboarding y seguimiento post-alta.',
    evidence: 'Reichheld, “The Loyalty Effect”; unit economics. Principio.' },
];

export function playbookToMarkdown(rules: PlaybookRule[]): string {
  let md = `# Growth Playbook — armatuplan\n_Reglas que el motor aprende y anota. Actualizado: ${PLAYBOOK_UPDATED}_\n`;
  for (const cat of RULE_CATEGORIES) {
    const inCat = rules.filter((r) => r.category === cat);
    if (!inCat.length) continue;
    md += `\n## ${cat}\n`;
    for (const r of inCat) {
      const s = STATUS_META[r.status];
      md += `- ${s.emoji} **[${s.label}]** ${r.statement} _(${r.evidence} · ${r.date})_\n`;
    }
  }
  return md;
}
