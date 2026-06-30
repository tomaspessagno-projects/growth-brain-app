// MVP MODE — recorte a Mínimo Producto Viable. Un solo lugar para prender/apagar.
// En true: el nav muestra solo el núcleo (Resumen + Oportunidades) y el detalle de oportunidad
// esconde lo "fancy" (Monte Carlo, desglose del score). NADA se borra: poniendo false vuelve todo.
export const MVP_MODE = true;

// Pestañas del núcleo MVP: Resumen + Histórico + Oportunidades + Experimentos.
// Embudos no va en el nav: se navega desde Resumen (el selector reacomoda los KPIs por embudo y
// cada embudo tiene su drill-down). Así el nav queda en 4 pantallas, como define el plan de MVP.
export const MVP_NAV_PATHS = new Set(['/', '/historico', '/oportunidades', '/experimentos']);
