// MVP MODE — recorte a Mínimo Producto Viable. Un solo lugar para prender/apagar.
// En true: el nav muestra solo el núcleo (Resumen + Oportunidades) y el detalle de oportunidad
// esconde lo "fancy" (Monte Carlo, desglose del score). NADA se borra: poniendo false vuelve todo.
export const MVP_MODE = true;

// MÍNIMA EXPRESIÓN: el MVP es UNA sola pantalla (la cadena de crecimiento cruzada + el cuello de
// botella). No hay pestañas: el detalle de cada oportunidad se abre desde la pantalla ("ver la
// lógica"). Todo lo demás (histórico, experimentos, detección, selector, $) queda detrás del flag
// para v1.1+. Poniendo MVP_MODE=false vuelve el nav completo y las pantallas ricas.
export const MVP_NAV_PATHS = new Set(['/']);
