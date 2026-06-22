// Genera SysData-Documentacion.docx — documento de producto + arquitectura para PO y LT.
// Tablas con bordes + anchos fijos (layout FIXED) y capturas reales del producto embebidas.
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak, ShadingType,
  TableLayoutType, VerticalAlign, ImageRun,
} = require('docx');

const NAVY = '0E2E52', ACCENT = '1689C4', GREY = '5B6B7F', LINE = 'BFC9D4', ZEBRA = 'F2F5F8';
const TW = 9300;
const B = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const TABLE_BORDERS = { top: B, bottom: B, left: B, right: B, insideHorizontal: B, insideVertical: B };

// ---- texto ----
const h1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 } });
const h2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 160, after: 70 } });
const p = (t) => new Paragraph({ children: [new TextRun(t)], spacing: { after: 110 }, alignment: AlignmentType.JUSTIFIED });
const lead = (b, rest) => new Paragraph({ spacing: { after: 110 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: b, bold: true }), new TextRun(rest)] });
const bullet = (t) => new Paragraph({ text: t, bullet: { level: 0 }, spacing: { after: 50 } });
const bulletLead = (b, rest) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 50 }, children: [new TextRun({ text: b, bold: true }), new TextRun(rest)] });
const step = (n, title, rest) => new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: `Paso ${n} · ${title}. `, bold: true, color: NAVY }), new TextRun(rest)] });
const quoteBox = (t) => new Paragraph({
  spacing: { before: 60, after: 140 }, indent: { left: 320 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 12 } },
  children: [new TextRun({ text: t, italics: true, color: NAVY })],
});

// ---- tablas ----
const colsFromPct = (pcts) => { const w = pcts.map((x) => Math.round((TW * x) / 100)); w[w.length - 1] = TW - w.slice(0, -1).reduce((a, b) => a + b, 0); return w; };
const cell = (text, widthTw, { bold = false, color, fill } = {}) => new TableCell({
  width: { size: widthTw, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
  shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
  margins: { top: 70, bottom: 70, left: 130, right: 130 },
  children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text, bold, color: color || undefined, size: 20 })] })],
});
const tablePct = (heads, rows, pcts) => {
  const widths = colsFromPct(pcts);
  return new Table({
    width: { size: TW, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders: TABLE_BORDERS,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: heads.map((hh, i) => cell(hh, widths[i], { bold: true, color: 'FFFFFF', fill: NAVY })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], { bold: i === 0, fill: ri % 2 ? ZEBRA : undefined })) })),
    ],
  });
};
const afterTable = () => new Paragraph({ text: '', spacing: { after: 70 } });

// ---- figuras (capturas reales) ----
const IMG_W = 600, IMG_H = Math.round((IMG_W * 1640) / 2732);
const figure = (file, cap) => [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 70, after: 16 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync('docs/screenshots/' + file), transformation: { width: IMG_W, height: IMG_H }, border: { color: LINE, style: BorderStyle.SINGLE, size: 4 } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 180 }, children: [new TextRun({ text: cap, italics: true, size: 18, color: GREY })] }),
];

const children = [];
const push = (...xs) => children.push(...xs);

// Portada
push(
  new Paragraph({ text: '', spacing: { before: 1400 } }),
  new Paragraph({ text: 'SysData', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new TextRun({ text: 'Motor de mejora continua de growth', bold: true, size: 30, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: 'Documentación de producto', size: 26, color: GREY })] }),
  new Paragraph({ text: '', spacing: { before: 460 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'armatuplan · Medicus', bold: true, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: 'Audiencia: Product Owner y Líder Técnica', color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: 'Versión 2.1 · 22 de junio de 2026', color: GREY })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// Contenido
push(
  h1('Contenido'),
  ...[
    '1. Resumen ejecutivo',
    '2. Qué puntos de dolor resolvemos',
    '3. Qué es SysData (y qué no es)',
    '4. El flujo de trabajo en la webapp',
    '5. Las fuentes de datos (y cómo entra Binary)',
    '6. Cómo decide: ecuaciones y lógica',
    '7. Decisiones de producto y su porqué',
    '8. Arquitectura del motor: las 4 capas',
    '9. Rigor de medición de experimentos',
    '10. La dependencia clave: el cruce visita → cápita',
    '11. Estado actual y roadmap',
    '12. Principios y restricciones',
    '13. Glosario',
  ].map((t) => new Paragraph({ text: t, spacing: { after: 36 } })),
  new Paragraph({ children: [new PageBreak()] }),
);

// 1. Resumen ejecutivo
push(
  h1('1. Resumen ejecutivo'),
  p('SysData es la capa de decisión de growth. Lee las fuentes que Medicus ya tiene —comportamiento (Mixpanel), comercial (HubSpot), inversión/costos (PELG) y la base de socios (Binary)— y las cruza para responder, con un número de plata atrás, qué conviene mejorar, dónde, cuándo y por qué.'),
  p('El objetivo, en concreto: que el equipo sepa en minutos qué está mal, qué mejorar primero (priorizado por plata, no por intuición), por qué lo dice (con la evidencia y los supuestos a la vista) y si lo que probó funcionó (con rigor estadístico). Cada experimento que se cierra vuelve al motor como aprendizaje: es mejora continua, no un dashboard estático.'),
  quoteBox('En una línea: convierte datos dispersos en decisiones de growth priorizadas por plata —y, con los datos cruzados y completos, en saber a quién apuntar y cuándo—. Todo con la evidencia y la honestidad a la vista.'),
);

// 2. Puntos de dolor
push(
  h1('2. Qué puntos de dolor resolvemos'),
  p('Hoy los datos que importan para crecer viven en sistemas que no se hablan entre sí, están incompletos y las decisiones se toman por opinión. SysData ataca eso de frente:'),
  tablePct(['Dolor de hoy', 'Cómo lo resuelve SysData'], [
    ['Datos en silos: Mixpanel, HubSpot, PELG y Binary no se cruzan.', 'Una sola capa los une y los traduce en decisiones; nadie tiene que abrir cuatro herramientas y reconciliarlas a mano.'],
    ['Datos incompletos: muchos contactos de HubSpot están vacíos, porque los asesores cargan la info en prospectos o en Binary.', 'Al cruzar las fuentes por persona (trazar al mismo socio entre HubSpot, prospectos y Binary), esos contactos se completan con lo que ya existe en las otras bases → sube fuerte el % de datos completos, y con eso mejoran la segmentación y el análisis.'],
    ['No sabemos con precisión a quién apuntar ni cuándo.', 'Con los datos completos y cruzados se segmenta al usuario objetivo de verdad: a quién apuntar, con qué plan y en qué momento. Es un insumo de venta directo, no solo de growth.'],
    ['Se prioriza por opinión o por el % de fuga más grande.', 'Ranking por plata en juego (margen): primero lo que más mueve el negocio, no lo que parece urgente.'],
    ['No se sabe si una mejora funcionó (o fue casualidad).', 'Medición con significancia estadística (señal vs ruido) + guardrails (que no rompa otra cosa).'],
    ['Números sin respaldo, imposibles de discutir.', 'Honestidad: cada cifra muestra su fuente y marca explícitamente lo que es supuesto.'],
    ['La memoria del equipo se pierde con la rotación.', 'El Playbook y los priors guardan lo aprendido y lo reutilizan: el motor mejora con cada experimento.'],
  ], [40, 60]),
  afterTable(),
);

// 3. Qué es / qué no es
push(
  h1('3. Qué es SysData (y qué no es)'),
  bulletLead('Es la capa de decisión', ' de growth: “¿qué hacemos con los datos?”, no “¿dónde los miro?”.'),
  bulletLead('Es un traductor', ' de comportamiento + comercial + economía + socios a oportunidades priorizadas por margen.'),
  bulletLead('Es un motor que aprende', ': cada experimento ajusta sus parámetros y mejora la próxima recomendación.'),
  bulletLead('NO es un CRM ni una base de datos', ': no reemplaza a HubSpot, Binary ni Metabase; los interpreta.'),
  bulletLead('NO escribe en los sistemas productivos', ': es estrictamente solo lectura sobre Mixpanel, HubSpot y Binary.'),
);

// 4. Flujo de trabajo
push(
  h1('4. El flujo de trabajo en la webapp'),
  p('La app es un ciclo cerrado de cinco pasos. En cada uno la herramienta deja registro, así que el camino completo —de un problema a un aprendizaje— queda enlazado de punta a punta.'),
  step(1, 'Detectar (Resumen)', 'De un vistazo: los KPIs norte, la salud por área (semáforos contra una meta), qué viene bien y qué mal, y las señales que el motor detecta solo (un quiebre que se sale de rango, o una métrica que a este ritmo no llega a la meta).'),
  ...figure('resumen.png', 'Resumen — salud por área, “yendo bien / yendo mal” y señales automáticas.'),
  step(2, 'Priorizar (Oportunidades)', 'Una lista ordenada por plata en juego, no por intuición. Cada tarjeta muestra el margen, su rango (escenario conservador → optimista) y de qué fuente sale. Se filtra por disciplina (diseño, producto, desarrollo, datos).'),
  ...figure('oportunidades.png', 'Oportunidades — priorizadas por margen, con el rango y la evidencia de cada una.'),
  step(3, 'Entender (el detalle de la oportunidad)', 'Con un clic se abre la lógica completa: la ecuación, el cálculo paso a paso, la fuente de cada número y los supuestos (ver sección 6).'),
  step(4, 'Probar (Experimentos)', 'Desde una oportunidad se crea un experimento con un clic: la app captura el baseline del funnel y lo deja enlazado a esa oportunidad. Cuando termina, se mide solo (antes vs después) y emite un veredicto.'),
  ...figure('experimentos.png', 'Experimentos — del baseline al veredicto, cada uno enlazado a su oportunidad de origen.'),
  step(5, 'Aprender (Aprendizajes)', 'El resultado se vuelve una regla del Playbook y un “prior” numérico que afina el próximo ranking. El loop se cierra: lo aprendido hace más certera la siguiente recomendación.'),
  ...figure('playbook.png', 'Aprendizajes — el Playbook y los priors numéricos que el motor reutiliza.'),
);

// 5. Fuentes de datos
push(
  h1('5. Las fuentes de datos (y cómo entra Binary)'),
  p('SysData no genera datos: orquesta cuatro fuentes que ya existen en Medicus, todas en solo lectura. Binary —la base de socios— es la pieza que vuelve “reales” a los unit economics y la que ayuda a completar y cerrar los datos de punta a punta.'),
  tablePct(['Fuente', 'Qué aporta', 'Cómo lo usa SysData'], [
    ['Mixpanel', 'Comportamiento: funnels, eventos, pasos del cotizador y del alta.', 'Mide dónde se cae la gente y dimensiona la fuga (volumen recuperable).'],
    ['HubSpot', 'Comercial: deals, etapas, win rate, contactos y voz del cliente (NPS).', 'Mide el lado comercial (win rate, stock atascado) y la reputación (verbatims).'],
    ['PELG', 'Inversión y costos: gasto por canal, CAC, leads.', 'Aporta el CAC y la inversión para evaluar la rentabilidad de cada canal.'],
    ['Binary', 'La base de socios (fuente de verdad): asociados, medicards, planes, vigencias y bajas.', 'Aporta los unit economics REALES (LTV, permanencia/churn, ARPU por plan) y la cápita confirmada para cerrar el cruce.'],
  ], [16, 42, 42]),
  afterTable(),
  lead('Un beneficio inmediato de cruzar las fuentes: ', 'hoy muchos contactos de HubSpot están a medias porque el asesor carga los datos en prospectos o en Binary. Reconciliando al mismo socio entre las fuentes, SysData completa esos contactos con lo que ya existe → un % mucho mayor de datos utilizables para segmentar y analizar.'),
  quoteBox('Dato clave de venta: con los datos completos y cruzados podemos segmentar al usuario objetivo de verdad —a quién apuntar, con qué plan y en qué momento—. Deja de ser intuición y pasa a ser un insumo accionable para el equipo comercial.'),
  lead('¿Esto es un data warehouse? No. ', 'Un data warehouse (ej. BigQuery/Snowflake) copia y consolida datos crudos de muchas fuentes para análisis a escala. SysData solo guarda métricas derivadas (la foto diaria de KPIs y recos) como su memoria. Un DWH real —donde convivan Mixpanel, HubSpot y Binary— sería del equipo de Data, y SysData lo consumiría (es la base de la “Opción B” del cruce).'),
);

// 6. Ecuaciones y lógica
push(
  h1('6. Cómo decide: ecuaciones y lógica'),
  p('Toda la priorización se ancla en una cadena causal, “la ecuación de la cápita”:'),
  quoteBox('visitas → conversión por paso → datos → (% que se vuelve socio) → cápitas → margen ($)'),
  p('A partir de esa cadena, el motor aplica cuatro cálculos encadenados. La idea es comparar peras con peras: una mejora chica en un paso de mucho volumen puede valer más que una grande en uno de poco.'),
  h2('1) Dimensionar la fuga'),
  quoteBox('fuga del paso = personas que entran − personas que avanzan   (se elige la mayor caída en personas, no en %)'),
  h2('2) Traducir a plata'),
  quoteBox('LTV = ARPU × permanencia × margen de contribución\nplata en juego = fuga × recuperable × (dato → cápita) × LTV'),
  p('El LTV hoy se modela con supuestos (permanencia, margen); con Binary pasa a medirse con datos reales de socios, y todo el ranking se recalibra.'),
  h2('3) Ordenar (el score)'),
  quoteBox('score = plata en juego × confianza × urgencia ÷ esfuerzo   (lo acumulado se prorratea a mensual)'),
  h2('4) Mostrar la incertidumbre y validar'),
  bulletLead('Rango P10–P90', ': como varios inputs son supuestos, el motor simula miles de escenarios (Monte Carlo) y muestra un rango, no un número falso-exacto.'),
  bulletLead('¿Funcionó?', ': un experimento se mide con un test de proporciones; si no supera el ruido (p < 0,05), no es resultado.'),
  p('El detalle de cada oportunidad expone esta lógica completa: la fórmula, el cálculo paso a paso, la fuente de cada número y los supuestos detrás.'),
  ...figure('oportunidad-detalle.png', 'Detalle de una oportunidad — la ecuación paso a paso, con la fuente de cada número y los supuestos marcados.'),
  lead('Ejemplo (cotizador): ', 'de ~41.500 visitas, ~36.300 se caen en el primer paso. Recuperando ~25% (supuesto), son ~9.000 datos/mes; a 6% dato→cápita (supuesto) y LTV ~$388.800, da del orden de $200M/mes en juego. Ese número —no el % de caída— la pone arriba del ranking.'),
);

// 7. Decisiones de producto
push(
  h1('7. Decisiones de producto y su porqué'),
  tablePct(['Decisión', 'Por qué'], [
    ['Priorizar por plata, no por % de fuga', 'La fuga más grande no siempre es la más valiosa: una caída enorme sobre tráfico que no convierte vale poco.'],
    ['Honestidad: medido vs supuesto', 'Si el motor disfraza supuestos de datos, el equipo deja de confiar la primera vez que falla. Cada número muestra su origen.'],
    ['Ser la capa de decisión, no otro dashboard', 'Ya hay dashboards. Lo que faltaba era decidir qué hacer con los datos, cruzando las fuentes.'],
    ['Solo lectura sobre los sistemas productivos', 'Mixpanel, HubSpot y Binary son productivos. El riesgo de escribir (romper eventos, deals, registros de socios) es inaceptable.'],
    ['Motor determinista + aprendizaje, no IA caja negra', 'A nuestra escala, el rigor estadístico y las reglas transparentes le ganan a un modelo opaco. La IA solo redacta y agrupa, no inventa números.'],
    ['Estado compartido de equipo, no Excel personal', 'Para ser una herramienta de equipo, todo (experimentos, estados, aprendizajes) tiene que ser compartido y persistente.'],
    ['Experimentos con significancia + guardrails', 'Un “subió 5%” sin significancia es ruido; y una mejora que rompe un paso de abajo no es victoria.'],
    ['Score como rango (P10–P90), no número puntual', 'Como hay supuestos, una cifra exacta es falsa precisión. El rango comunica la incertidumbre.'],
  ], [33, 67]),
  afterTable(),
);

// 8. Las 4 capas
push(
  h1('8. Arquitectura del motor: las 4 capas'),
  p('El “cerebro” se organiza en cuatro capas encadenadas: la memoria habilita la detección; la detección y la economía alimentan la decisión; los experimentos vuelven como aprendizaje que afina todo.'),
  tablePct(['Capa', 'Qué hace', 'Por qué importa'], [
    ['1 · Memoria', 'Un barrido diario de los datos guarda la foto del día.', 'Sin serie histórica propia no hay detección, forecast ni aprendizaje.'],
    ['2 · Detección', 'Distingue un quiebre real del ruido y proyecta si llegamos a la meta.', 'Avisa cuando algo se rompió, antes de notarlo a mano.'],
    ['3 · Decisión', 'Puntúa por plata y muestra un rango (conservador → optimista).', 'Convierte la incertidumbre en una apuesta cuantificada.'],
    ['4 · Aprendizaje', 'Los resultados de los experimentos afinan los parámetros del motor.', 'Lo hace “cada vez más inteligente”: aprende la realidad de nuestro producto.'],
  ], [18, 41, 41]),
  afterTable(),
);

// 9. Rigor
push(
  h1('9. Rigor de medición de experimentos'),
  p('Al cerrar un experimento, el motor lo mide de forma triangulada y honesta:'),
  bulletLead('Significancia', ' — test de dos proporciones (antes vs después). Si p ≥ 0,05, es “inconcluso”, no resultado.'),
  bulletLead('Guardrails', ' — que la mejora no haya roto un paso de abajo, ni el win rate, ni el margen.'),
  bulletLead('Ripple', ' — si el efecto se propagó aguas abajo o se quedó en un paso intermedio.'),
  bulletLead('Confounds declarados', ' — qué no se controla (antes/después, no A/B), para leer el resultado con cautela.'),
);

// 10. Cruce
push(
  h1('10. La dependencia clave: el cruce visita → cápita'),
  p('Para medir de punta a punta “qué visita termina siendo socio” falta estampar el mismo identificador (prospecto_id) en el alta de socio. Hoy el lead (Mixpanel/HubSpot) y el socio (Binary) son registros separados que no se pueden unir.'),
  lead('Qué significa: ', 'mientras no se cierre, la conversión visita→cápita es supuesta (hoy 6%), no medida. Por eso el motor la marca como supuesto.'),
  lead('De quién depende: ', 'NO es trabajo de SysData, sino instrumentación upstream (Data/Dev). Caminos: (A) estampar el prospecto_id en el alta; (B) cruzar las fuentes uniendo el comportamiento con la base de socios de Binary; (C) en HubSpot, asociar el deal ganado al contacto de origen.'),
  lead('El payoff: ', 'datos más completos (se llenan los contactos vacíos de HubSpot con lo cargado en prospectos/Binary), tasa lead→cápita real por canal y segmento, ripple a cápita medido, y priorización por margen real. SysData ya detecta solo cuándo queda resuelto.'),
);

// 11. Estado y roadmap
push(
  h1('11. Estado actual y roadmap'),
  h2('Funcionando hoy'),
  bullet('El loop completo (Resumen, Oportunidades, Experimentos, Aprendizajes) con datos en vivo de Mixpanel + HubSpot.'),
  bullet('Las 4 capas del motor: memoria diaria, detección, score con rango y priors que se afinan con cada experimento.'),
  h2('Pendiente'),
  bullet('Integrar Binary para unit economics reales (LTV/churn), completar los contactos y cerrar el cruce visita→cápita.'),
  bullet('Cerrar el cruce prospecto_id (trabajo de Data/Dev).'),
  h2('Próximo (ideas)'),
  bullet('Brief automático del “Lunes de growth”; “Value of Information” (cuánto vale en pesos cerrar cada supuesto); tarjeta de impacto multi-moneda.'),
);

// 12. Principios
push(
  h1('12. Principios y restricciones'),
  bulletLead('Solo lectura', ' sobre los sistemas productivos (Mixpanel, HubSpot, Binary): nunca crear, editar ni borrar nada.'),
  bulletLead('Honestidad', ': medido vs supuesto siempre explícito; cada número muestra su fuente.'),
  bulletLead('Herramienta de equipo', ': estado compartido y persistente, no un archivo personal.'),
);

// 13. Glosario
push(
  h1('13. Glosario'),
  tablePct(['Término', 'Qué significa'], [
    ['Binary', 'La base de socios de Medicus (asociados, medicards, planes, vigencias, bajas). Fuente de verdad de los unit economics reales.'],
    ['Cápita', 'Un socio activo. El resultado de negocio que SysData busca aumentar.'],
    ['Dato', 'Un lead que dejó sus datos en el cotizador.'],
    ['Fuga (leak)', 'El paso donde más gente se cae; SysData la mide en personas y en plata.'],
    ['Win rate', 'Porcentaje de deals comerciales que se cierran (en HubSpot).'],
    ['LTV', 'Valor de contribución de una cápita en su permanencia (ARPU × meses × margen). Hoy supuesto; con Binary, real.'],
    ['CAC', 'Costo de adquirir una cápita (del PELG).'],
    ['prospecto_id', 'El identificador que uniría el comportamiento (Mixpanel) con la cápita (HubSpot/Binary).'],
    ['Prior', 'Lo aprendido de experimentos pasados; el motor lo usa para estimar mejor.'],
    ['Significancia', 'Que un resultado supere el ruido estadístico; sin ella, no es resultado.'],
    ['Data warehouse', 'Repositorio central que copia datos crudos de muchas fuentes para análisis. SysData no es uno: lo consumiría.'],
  ], [22, 78]),
);

const doc = new Document({
  creator: 'SysData',
  title: 'SysData — Documentación de producto',
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }],
});

Packer.toBuffer(doc).then((buffer) => { fs.writeFileSync('SysData-Documentacion.docx', buffer); console.log('OK: SysData-Documentacion.docx (' + buffer.length + ' bytes)'); });
