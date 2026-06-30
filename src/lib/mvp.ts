// MVP MODE — recorte a Mínimo Producto Viable. Un solo lugar para prender/apagar.
// En true: el nav muestra solo el núcleo (Resumen + Oportunidades) y el detalle de oportunidad
// esconde lo "fancy" (Monte Carlo, desglose del score). NADA se borra: poniendo false vuelve todo.
export const MVP_MODE = true;

// Pestañas del núcleo MVP: Resumen + Embudos + Oportunidades + Experimentos (trackear desde adentro).
export const MVP_NAV_PATHS = new Set(['/', '/funnel', '/oportunidades', '/experimentos']);
