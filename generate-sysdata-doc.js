// Genera SysData-Documentacion.docx — documento completo de producto + arquitectura para PO y LT.
// Tablas con bordes + anchos fijos (twips) + layout FIXED → Word las renderiza prolijas.
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak, ShadingType,
  TableLayoutType, VerticalAlign,
} = require('docx');

const NAVY = '0E2E52';
const ACCENT = '1689C4';
const GREY = '5B6B7F';
const LINE = 'BFC9D4';
const ZEBRA = 'F2F5F8';

// Ancho útil de la página (Letter, márgenes de 1") = 12240 - 2*1440 = 9360 twips. Usamos 9300.
const TW = 9300;
const B = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const TABLE_BORDERS = { top: B, bottom: B, left: B, right: B, insideHorizontal: B, insideVertical: B };

// ---- helpers de texto ----
const h1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 } });
const h2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 80 } });
const p = (t) => new Paragraph({ children: [new TextRun(t)], spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED });
const lead = (b, rest) => new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: b, bold: true }), new TextRun(rest)] });
const bullet = (t) => new Paragraph({ text: t, bullet: { level: 0 }, spacing: { after: 60 } });
const bulletLead = (b, rest) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: b, bold: true }), new TextRun(rest)] });
const quoteBox = (t) => new Paragraph({
  spacing: { before: 80, after: 160 }, indent: { left: 360 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 12 } },
  children: [new TextRun({ text: t, italics: true, color: NAVY })],
});

// ---- helpers de tabla (bordes + anchos fijos) ----
const colsFromPct = (pcts) => {
  const w = pcts.map((x) => Math.round((TW * x) / 100));
  w[w.length - 1] = TW - w.slice(0, -1).reduce((a, b) => a + b, 0);
  return w;
};
const cell = (text, widthTw, { bold = false, color, fill } = {}) =>
  new TableCell({
    width: { size: widthTw, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
    margins: { top: 80, bottom: 80, left: 130, right: 130 },
    children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text, bold, color: color || undefined, size: 20 })] })],
  });

const tablePct = (heads, rows, pcts, { boldFirstCol = true } = {}) => {
  const widths = colsFromPct(pcts);
  return new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: heads.map((hh, i) => cell(hh, widths[i], { bold: true, color: 'FFFFFF', fill: NAVY })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], { bold: i === 0 && boldFirstCol, fill: ri % 2 ? ZEBRA : undefined })) })),
    ],
  });
};
const afterTable = () => new Paragraph({ text: '', spacing: { after: 80 } });

// ---- contenido ----
const children = [];
const push = (...xs) => children.push(...xs);

// Portada
push(
  new Paragraph({ text: '', spacing: { before: 1400 } }),
  new Paragraph({ text: 'SysData', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new TextRun({ text: 'Motor de mejora continua de growth', bold: true, size: 30, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: 'Documentación de producto y arquitectura', size: 26, color: GREY })] }),
  new Paragraph({ text: '', spacing: { before: 500 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'armatuplan · Medicus', bold: true, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: 'Audiencia: Product Owner y Líder Técnica', color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: 'Versión 1.2 · 19 de junio de 2026', color: GREY })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// Contenido
push(
  h1('Contenido'),
  ...[
    '1. Resumen ejecutivo',
    '2. El problema: por qué existe SysData',
    '3. Qué es SysData (y qué no es)',
    '4. El objetivo',
    '5. Cómo se usa: el loop',
    '6. Las fuentes de datos (y cómo entra Binary)',
    '7. Cómo decide: la lógica',
    '8. Decisiones de producto y su porqué',
    '9. Arquitectura del motor: las 4 capas',
    '10. Rigor de medición de experimentos',
    '11. Stack técnico',
    '12. La dependencia clave: el cruce visita → cápita',
    '13. Estado actual y roadmap',
    '14. Principios, seguridad y restricciones',
    '15. Glosario',
  ].map((t) => new Paragraph({ text: t, spacing: { after: 40 } })),
  new Paragraph({ children: [new PageBreak()] }),
);

// 1. Resumen ejecutivo
push(
  h1('1. Resumen ejecutivo'),
  p('SysData es una herramienta interna de growth: la capa de decisión que se para arriba de los datos que Medicus ya tiene —comportamiento (Mixpanel), comercial (HubSpot), inversión y costos (PELG) y la base de socios (Binary)— y los cruza para responder una sola pregunta: qué conviene mejorar, dónde, cuándo, y cuánta plata hay en juego.'),
  p('No reemplaza a Mixpanel, HubSpot, Binary ni Metabase. Los une y los traduce en decisiones priorizadas por impacto en el negocio (cápitas y margen), separando siempre lo que es dato medido de lo que es supuesto. Cada experimento que el equipo cierra alimenta al motor y lo vuelve más certero: es un sistema de mejora continua, no un dashboard estático.'),
  quoteBox('En una línea: convertir datos dispersos en decisiones de growth priorizadas por plata, con la evidencia y la honestidad a la vista.'),
);

// 2. El problema
push(
  h1('2. El problema: por qué existe SysData'),
  p('Hoy los datos que importan para crecer viven en sistemas que no se hablan entre sí: el comportamiento del usuario en Mixpanel, el pipeline comercial en HubSpot, la inversión y los costos por canal en el PELG, y la base de socios —asociados, medicards, planes, vigencias y bajas— en Binary. Cada uno, mirado por separado, cuenta solo una parte de la historia.'),
  lead('La consecuencia: ', 'se prioriza por opinión y por urgencia del momento, no por impacto. Se discute “qué fuga arreglar” mirando porcentajes, sin saber cuál mueve la aguja del negocio. Y cuando algo se prueba, muchas veces no se puede afirmar si funcionó de verdad o fue ruido.'),
  lead('Lo que faltaba: ', 'una capa que junte las fuentes y diga, con un número de plata atrás, qué mover para subir la conversión y las cápitas — y que sea honesta sobre qué tan sólido es ese número.'),
);

// 3. Qué es / qué no es
push(
  h1('3. Qué es SysData (y qué no es)'),
  h2('Qué es'),
  bulletLead('La capa de decisión', ' del stack de growth: “¿qué hacemos al respecto?”, arriba de los datos.'),
  bulletLead('Un traductor', ' de comportamiento + comercial + economía + base de socios a oportunidades priorizadas por margen.'),
  bulletLead('Un motor que aprende', ': cada experimento ajusta sus parámetros y mejora la próxima recomendación.'),
  h2('Qué NO es'),
  bulletLead('No es un CRM', ' ni reemplaza a HubSpot.'),
  bulletLead('No es la base de datos', ': no reemplaza a Binary ni a Metabase; es la capa que los interpreta.'),
  bulletLead('No escribe en los sistemas productivos', ': es estrictamente solo lectura sobre Mixpanel, HubSpot y Binary.'),
);

// 4. Objetivo
push(
  h1('4. El objetivo'),
  p('Que el equipo abra SysData y en minutos sepa:'),
  bulletLead('Qué está bien y qué está mal', ' — la salud por área del negocio, de un vistazo.'),
  bulletLead('Qué conviene mejorar primero', ' — priorizado por plata en juego, no por el % de fuga más grande ni por intuición.'),
  bulletLead('Por qué lo dice', ' — la evidencia de cada fuente, y qué parte del número es dato medido vs supuesto.'),
  bulletLead('Qué estamos probando y si funcionó', ' — experimentos medidos con rigor estadístico.'),
  bulletLead('Qué aprendimos', ' — que queda como memoria del equipo y hace al motor más preciso con el tiempo.'),
);

// 5. El loop
push(
  h1('5. Cómo se usa: el loop'),
  p('La navegación de SysData es un ciclo de mejora continua:'),
  bulletLead('Resumen', ' — cómo viene Medicus: qué está bien, qué está mal, y las señales que el motor detecta solo.'),
  bulletLead('Oportunidades', ' — qué mejorar, priorizado por plata, con la lógica y la evidencia detrás de cada una.'),
  bulletLead('Experimentos', ' — qué estamos probando, medido automáticamente (antes vs después) con significancia y guardrails.'),
  bulletLead('Aprendizajes (Playbook)', ' — qué validamos o refutamos; la memoria que el motor usa como prior.'),
  bulletLead('Segmentos', ' — discovery: entender al usuario cruzando lo cuanti y lo cuali.'),
  bulletLead('Explorador', ' — el detalle: funnels, CRM, economía y el estado del cruce de datos.'),
);

// 6. Las fuentes de datos (y cómo entra Binary)  ← NUEVO
push(
  h1('6. Las fuentes de datos (y cómo entra Binary)'),
  p('SysData no genera datos: orquesta cuatro fuentes que ya existen en Medicus, todas en solo lectura. Binary —nuestra base de socios— es la pieza que vuelve “reales” a los unit economics y la que ayuda a cerrar el cruce de punta a punta.'),
  tablePct(['Fuente', 'Qué aporta', 'Cómo lo usa SysData'], [
    ['Mixpanel', 'Comportamiento: funnels, eventos, pasos del cotizador y del alta.', 'Mide dónde se cae la gente y dimensiona la fuga (volumen recuperable).'],
    ['HubSpot', 'Comercial: deals, etapas, win rate, contactos y voz del cliente (NPS).', 'Mide el lado comercial (win rate, stock atascado) y la reputación (verbatims).'],
    ['PELG', 'Inversión y costos: gasto por canal, CAC, leads.', 'Aporta el CAC y la inversión para evaluar la rentabilidad de cada canal.'],
    ['Binary', 'La base de socios (fuente de verdad): asociados, medicards, planes, coberturas, vigencias y bajas.', 'Aporta los unit economics REALES —LTV, permanencia/churn y ARPU por plan— y la cápita confirmada para cerrar el cruce visita→cápita.'],
  ], [16, 42, 42]),
  afterTable(),
  h2('Cómo usaríamos Binary dentro de SysData'),
  bulletLead('Unit economics reales (el cambio más importante)', ': hoy el LTV se arma con supuestos (permanencia 24 meses, margen 18%). Con Binary, la permanencia/churn y el ARPU por plan salen de datos reales de socios → el LTV deja de ser supuesto y pasa a medido. Como TODO el ranking de oportunidades se mide en plata (y la plata depende del LTV), esto recalibra el motor entero.'),
  bulletLead('Cerrar el cruce visita → cápita', ': Binary tiene el socio real con su identificador de alta. Es el candidato natural para unir, en el data warehouse, el comportamiento (Mixpanel) y el comercial (HubSpot) con la cápita confirmada (Binary) — la “Opción B” del cruce. Cuando esté, la conversión a socio pasa de supuesta a medida.'),
  bulletLead('Segmentación real', ': cortar por plan, tipo de medicard, cobertura y antigüedad reales (no solo por los campos de HubSpot), para ver qué segmentos retienen y rinden más.'),
  bulletLead('Retención / churn', ': medir bajas reales por cohorte → alimenta el LTV y habilita a futuro un área de retención dentro del loop.'),
  bulletLead('Solo lectura', ': igual que el resto de las fuentes, SysData lee de Binary; nunca escribe.'),
);

// 7. Cómo decide
push(
  h1('7. Cómo decide: la lógica'),
  p('Toda la priorización se ancla en una cadena simple, “la ecuación de la cápita”:'),
  quoteBox('visitas → conversión por paso → datos → (% que se vuelve socio) → cápitas → margen ($)   ·   (y por el lado comercial: deals → win rate → cápitas)'),
  p('Cada recomendación es, en el fondo, una frase: “acá hay un eslabón de esta cadena dejando plata sobre la mesa, y esto es cuánto”. Esto permite comparar peras con peras: una mejora chica en un paso de mucho volumen puede valer más que una grande en uno de poco.'),
  h2('El score (cómo se ordenan las oportunidades)'),
  quoteBox('score = margen en juego × confianza × urgencia ÷ esfuerzo   (lo acumulado se prorratea a mensual)'),
  p('Ejemplo real con los datos del cotizador: de ~41.500 visitas, ~36.300 se caen antes de avanzar. Si una mejora recupera ~25% de esa fuga (supuesto), son ~9.000 datos extra por mes; a una tasa dato→cápita de 6% (supuesto) y un LTV de contribución de ~$388.800, eso son del orden de $200M por mes en juego. Ese número —no el porcentaje de caída— es lo que pone a esa oportunidad arriba del ranking.'),
  lead('De dónde sale el LTV (importante): ', 'hoy el LTV y la permanencia son supuestos. Al integrar Binary pasan a ser datos reales (permanencia/churn y ARPU por plan), y todo el ranking se recalibra solo. Es decir: Binary no es un “nice to have”, es lo que vuelve confiables los números de plata que ya usa el motor.'),
);

// 8. Decisiones de producto
push(
  h1('8. Decisiones de producto y su porqué'),
  p('SysData está lleno de decisiones deliberadas. Las principales, con su fundamento:'),
  tablePct(['Decisión', 'Por qué'], [
    ['Priorizar por plata, no por % de fuga', 'La fuga más grande no siempre es la más valiosa: una caída enorme sobre tráfico que no convierte vale poco. Ordenar por margen evita gastar esfuerzo donde no mueve el negocio.'],
    ['Honestidad: medido vs supuesto', 'Si el motor disfraza supuestos de datos, el equipo deja de confiar la primera vez que falla. Cada número muestra su origen y marca explícitamente lo que es estimación.'],
    ['Ser la capa de decisión, no otro dashboard', 'Ya hay dashboards (Mixpanel, Metabase). Lo que faltaba no era “ver datos”, sino “decidir qué hacer con ellos”, cruzando las fuentes.'],
    ['Solo lectura sobre los sistemas productivos', 'Mixpanel, HubSpot y Binary son productivos. El riesgo de escribir (romper eventos, deals, registros de socios) es inaceptable. SysData nunca escribe ahí.'],
    ['Motor determinista + aprendizaje, no IA caja negra', 'A nuestra escala, el rigor estadístico y las reglas transparentes le ganan a un modelo opaco. La IA se reserva para redactar y agrupar, nunca para inventar números.'],
    ['Estado compartido (Supabase), no Excel personal', 'Para que sea una herramienta de equipo, los experimentos, estados y aprendizajes tienen que ser de todos y persistentes, no de un navegador.'],
    ['Experimentos con significancia + guardrails', 'Un “subió 5%” sin significancia es ruido. Y una mejora que rompe un paso de más abajo no es victoria. El motor exige las dos cosas antes de cantar un resultado.'],
    ['Score como rango (P10–P90), no número puntual', 'Como varios inputs son supuestos, mostrar una cifra exacta es falsa precisión. El rango comunica la incertidumbre y de qué supuesto depende.'],
  ], [33, 67]),
  afterTable(),
);

// 9. Las 4 capas
push(
  h1('9. Arquitectura del motor: las 4 capas'),
  p('El “cerebro” de SysData está organizado en cuatro capas encadenadas: la memoria habilita la detección; la detección y la economía alimentan la decisión; y los resultados de los experimentos vuelven como aprendizaje que afina todo.'),
  tablePct(['Capa', 'Qué hace', 'Por qué importa'], [
    ['1 · Memoria', 'Un proceso diario (cron) barre los datos y guarda la foto del día.', 'Sin serie histórica propia no hay detección, ni forecast, ni aprendizaje. La historia consultable es nuestra o no existe.'],
    ['2 · Detección', 'Distingue un quiebre real del ruido y proyecta si llegamos a la meta.', 'Responde el “dónde y cuándo” solo: avisa cuando algo se rompió, antes de notarlo a mano.'],
    ['3 · Decisión', 'Puntúa cada oportunidad por plata y la muestra como un rango (conservador → optimista).', 'Convierte la incertidumbre en una apuesta cuantificada, en vez de un número falso-exacto.'],
    ['4 · Aprendizaje', 'Los resultados de los experimentos se vuelven parámetros que afinan el motor.', 'Es lo que lo hace “cada vez más inteligente”: aprende la realidad de nuestro producto, no supuestos genéricos.'],
  ], [18, 41, 41]),
  afterTable(),
);

// 10. Rigor
push(
  h1('10. Rigor de medición de experimentos'),
  p('Cuando se cierra un experimento, el motor lo mide de forma triangulada y honesta:'),
  bulletLead('Significancia estadística', ' — test de dos proporciones (antes vs después). Si el movimiento no supera el ruido (p < 0,05), no se declara resultado: es “inconcluso”.'),
  bulletLead('Guardrails', ' — chequea que la mejora no haya roto un paso de más abajo (comportamiento), ni el win rate (comercial), ni el margen (económico).'),
  bulletLead('Ripple', ' — verifica si el efecto se propagó aguas abajo o se quedó en un paso intermedio (un lift que no llega a socio cerrado es hueco).'),
  bulletLead('Confounds declarados', ' — el motor dice qué no controla (es antes/después, no A/B; campañas, estacionalidad), para leer el resultado con la cautela justa.'),
);

// 11. Stack
push(
  h1('11. Stack técnico'),
  bulletLead('Frontend / app', ': Next.js 16 (App Router) + React 19 + TypeScript + CSS Modules.'),
  bulletLead('Datos del equipo', ': Supabase (login + estado compartido: experimentos, estados, aprendizajes, snapshots, priors), con Row Level Security.'),
  bulletLead('Hosting', ': Vercel. El barrido diario corre como Vercel Cron.'),
  bulletLead('Fuentes (solo lectura)', ': Mixpanel (Query/Engage API) para comportamiento; HubSpot (CRM v3) para comercial y NPS; PELG para inversión/CAC; y Binary (base de socios) para unit economics reales —LTV, churn, ARPU por plan— y la cápita confirmada.'),
  bulletLead('IA (acotada)', ': Gemini, reservada para tareas de lenguaje (redactar, agrupar), nunca para producir números.'),
  bulletLead('Seguridad', ': los tokens van server-side (nunca expuestos al cliente); las rutas /api están detrás de login (dominio @medicus.com.ar).'),
);

// 12. La dependencia clave
push(
  h1('12. La dependencia clave: el cruce visita → cápita'),
  p('Para medir de punta a punta “qué visita termina siendo socio” falta un dato de plomería: estampar el mismo identificador (prospecto_id) en el momento del alta de socio.'),
  lead('La evidencia (medida en solo lectura): ', 'en Mixpanel, los perfiles de lead (que traen hubspot_id, edad, etc.) y los de socio (que traen la vigencia) son hoy conjuntos disjuntos — no comparten ningún id en común. Las llaves para unirlos existen, pero no quedan estampadas en el registro del resultado.'),
  lead('Qué significa para el negocio: ', 'mientras esto no se cierre, la conversión visita→cápita es modelada (supuesta, hoy 6%), no medida. Por eso el motor lo declara como supuesto y no publica una tasa que sería engañosa.'),
  lead('De quién depende: ', 'NO es trabajo de SysData. Es instrumentación upstream (Data / Dev). Hay tres caminos complementarios: (A) estampar el prospecto_id en el alta de socio; (B) cruzar en el data warehouse, uniendo el comportamiento con la base de socios de Binary (que tiene la cápita confirmada); (C) en HubSpot, asociar el deal ganado al contacto de origen.'),
  lead('El payoff de cerrarlo: ', 'tasa lead→cápita real por canal y segmento, ripple a cápita medido en cada experimento, y priorización por margen real en vez de estimado. SysData ya detecta solo cuándo queda resuelto.'),
);

// 13. Estado y roadmap
push(
  h1('13. Estado actual y roadmap'),
  h2('Funcionando hoy'),
  bullet('El loop completo (Resumen, Oportunidades priorizadas, Experimentos medidos, Aprendizajes) con datos en vivo de Mixpanel + HubSpot.'),
  bullet('Las 4 capas del motor: memoria diaria, detección de quiebres + pace vs meta, score con rango (Monte Carlo) y priors que se afinan con cada experimento.'),
  h2('Pendiente de activación'),
  bullet('Integrar Binary (base de socios) para unit economics reales —LTV, churn, ARPU por plan— y como fuente de la cápita confirmada para cerrar el cruce.'),
  bullet('Encender el proceso diario en producción (variables de entorno en Vercel + correr la migración en Supabase).'),
  bullet('Cerrar el cruce prospecto_id (trabajo upstream de Data / Dev).'),
  h2('Próximos incrementos (ideas)'),
  bullet('Brief automático del “Lunes de growth” (resumen redactado y enviado solo).'),
  bullet('“Value of Information”: ponerle precio en pesos a cerrar cada supuesto (ej. cuánto vale cerrar el cruce).'),
  bullet('Tarjeta de impacto multi-moneda (plata, tiempo, confianza, reputación) y optimizador de sprint.'),
);

// 14. Principios
push(
  h1('14. Principios, seguridad y restricciones'),
  bulletLead('Solo lectura', ' sobre sistemas productivos (Mixpanel, HubSpot, Binary). Nunca crear, editar ni borrar nada.'),
  bulletLead('Honestidad', ': medido vs supuesto siempre explícito; cada número muestra su fuente.'),
  bulletLead('Herramienta de equipo', ': estado compartido y persistente, no un archivo personal.'),
  bulletLead('Seguridad', ': tokens server-side, acceso por login de dominio Medicus, secretos fuera del repositorio.'),
);

// 15. Glosario
push(
  h1('15. Glosario'),
  tablePct(['Término', 'Qué significa'], [
    ['Binary', 'La base de datos de socios de Medicus (asociados, medicards, planes, coberturas, vigencias y bajas). Fuente de verdad de los unit economics reales y de la cápita confirmada.'],
    ['Cápita', 'Un socio activo. Es el resultado final del negocio que SysData busca aumentar.'],
    ['Dato', 'Un lead que dejó sus datos en el cotizador (paso clave del funnel de adquisición).'],
    ['Funnel / embudo', 'La secuencia de pasos que recorre un usuario (visita → datos → cotización → alta).'],
    ['Fuga (leak)', 'El paso donde más gente se cae. SysData la mide en personas y en plata.'],
    ['Win rate', 'Porcentaje de deals comerciales que se cierran (ganados / decididos), en HubSpot.'],
    ['LTV', 'Valor de contribución de una cápita a lo largo de su permanencia (ARPU × meses × margen). Hoy estimado con supuestos; con Binary, medido con permanencia y ARPU reales.'],
    ['CAC', 'Costo de adquirir una cápita (del PELG).'],
    ['ARPU', 'Ingreso promedio mensual por socio (real, por plan, desde Binary).'],
    ['prospecto_id', 'El identificador que permitiría unir el comportamiento (Mixpanel) con la cápita (HubSpot / Binary).'],
    ['Prior', 'Lo aprendido de experimentos pasados; el motor lo usa para estimar mejor (ej. cuánto de una fuga se recupera de verdad).'],
    ['Snapshot', 'La foto diaria de los datos que guarda la capa de Memoria.'],
    ['Guardrail', 'Un chequeo de seguridad: que una mejora no rompa otra métrica.'],
    ['Significancia', 'Que un resultado supere el ruido estadístico; sin ella, no es un resultado.'],
  ], [22, 78]),
);

const doc = new Document({
  creator: 'SysData',
  title: 'SysData — Documentación de producto y arquitectura',
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('SysData-Documentacion.docx', buffer);
  console.log('OK: SysData-Documentacion.docx (' + buffer.length + ' bytes)');
});
