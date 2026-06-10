# Growth Brain — Blueprint del Motor

> Documento maestro de diseño. Qué es esta herramienta, cómo funciona el loop, qué está construido y qué falta.
> Última actualización: 2026-06-09.

---

## 1. Propósito (el reframe)

Growth Brain **NO es** un dashboard de ventas ni de plata. Eso ya lo cubre **Metabase** (cápitas, ingresos, gasto de ads, etc.).

Growth Brain **es el MOTOR DE EXPERIMENTACIÓN**: entender el funnel y los eventos de Mixpanel, **armar experimentos a partir de esos eventos**, medir su impacto, aprender, y retroalimentarse — para hacer que todo el sistema (y por ende la conversión a cápitas) **vaya mejor de forma sistemática**.

La forma en que ayuda al negocio es **indirecta pero compuesta**: maximiza **velocidad de aprendizaje × tasa de acierto × impacto**. Cada experimento que valida y levanta un paso del funnel se propaga hacia abajo hasta la cápita.

---

## 2. El loop (el corazón del motor)

```
   Insight (fuga/oportunidad)
            │
            ▼
        Hipótesis  ◀── priors del Playbook (confianza por categoría)
            │
            ▼
       Experimento  ──► baseline de TODOS los pasos del funnel
            │
            ▼
   Medición (sobre los eventos reales de Mixpanel)
            │   clasifica el impacto en cada paso:
            │   🎯 intencional · 🌊 ripple (¿llegó a la cápita?) · 🛡️ guardrail (¿rompió algo?)
            ▼
       Resultado (validado / refutado / inconcluso, con significancia)
            │
            ▼
   Aprendizaje ──► se anota como REGLA en el Playbook (MD)
            │
            └──────────► retroalimenta la priorización de la próxima recomendación
```

La clave: **el dato de eventos ES la medición.** Ahí está el diferencial vs. Metabase — Metabase te muestra la plata; el motor te dice **qué cambio causó qué movimiento en el funnel**.

---

## 3. Estado actual (qué está construido)

| Pieza | Estado | Dónde |
|---|---|---|
| Capa de datos Mixpanel (snapshot real vía MCP) | ✅ | `src/lib/mixpanel/snapshot.ts` |
| Cómputo de funnels (fuga, conversión, WoW, canales, valor) | ✅ | `src/lib/mixpanel/analytics.ts` |
| Multi-funnel (Cotizador, Contacto, Empresa, Alta) | ✅ | snapshot + `/funnels` |
| Deep-dive por funnel | ✅ | `/funnel/[id]` |
| Motor de recomendaciones (reglas deterministas, por disciplina) | ✅ | `src/lib/mixpanel/recommendations.ts` |
| Lifecycle de recos (hecha/en progreso/descartada + progreso) | ✅ | `/recomendaciones` (localStorage) |
| **Playbook / memoria (reglas en MD)** | ✅ | `playbook.ts` + `/playbook` + `growth-playbook.md` |
| **Priors: recos respaldadas por el Playbook** | ✅ | `recommendations.ts` (REC_PLAYBOOK_MAP) |
| Navbar superior, diseño minimalista | ✅ | `Navbar.tsx` |
| Medición de impacto cruzado de experimentos | ⏳ diseño | (necesita datos en vivo + runner) |
| Reco → Experimento (hipótesis) | ⏳ diseño | sección 4 |
| Auto-append de reglas al concluir experimento | ⏳ diseño | sección 4 |

---

## 4. El Experiment Runner (blueprint)

El puente que cierra el loop. Modelo de datos de un experimento:

```
Experimento {
  id, hipótesis, categoría (UX/Copy/Pricing/Producto/Marketing/Tech),
  funnel_step_objetivo,            // el paso que querés mover
  estado: planeado|corriendo|cerrado,
  baseline: { [step]: valor },     // snapshot de TODOS los pasos al arrancar
  resultado: { [step]: valor },    // snapshot de TODOS los pasos al cerrar
  deltas: { [step]: { abs, pct, tipo: 'intencional'|'ripple'|'guardrail'|'neutro' } },
  significancia, muestra,
  veredicto: validado|refutado|inconcluso,
  aprendizaje: string              // → se appendea al Playbook como regla
}
```

**Impacto cruzado (lo más importante):**
- 🎯 **Intencional** — ¿se movió el paso objetivo?
- 🌊 **Ripple** — ¿se propagó hacia abajo hasta la cápita? Un +15% en "datos" que no llega a "socio" es hueco.
- 🛡️ **Guardrail** — ¿rompió algo? Ej.: subir `cotizaron` pero bajar `intención` = trampa, no mejora.

**Al cerrar:** el aprendizaje se escribe solo como regla en el Playbook (validado/refutado), y ajusta los priors de la próxima recomendación.

---

## 5. La retroalimentación (Playbook como priors)

El motor lee el Playbook antes de recomendar:
- Una regla **guardrail** ("display no convierte") **suprime** recos de escalar ese canal y **respalda** la de pausarlo.
- Una categoría con alta tasa de validación histórica **sube la confianza** de sus recomendaciones.
- Hoy (v1): cada reco muestra "📖 Respaldado por el playbook" cuando una regla la respalda (`REC_PLAYBOOK_MAP`).
- Próximo: ajuste cuantitativo de confianza/prioridad según la tasa de acierto por categoría (el `CorrelationAnalysis` original ya calcula esto).

---

## 6. El Playbook (la memoria)

`/playbook` + `growth-playbook.md`. Cada cosa que el motor aprende se anota como una **regla** categorizada con estado: ✅ Validado · ❌ Refutado · 🔍 Observación · ⚠️ Guardrail. Exportable como Markdown. A futuro, en prod, respaldado por Supabase y appendeado automáticamente por el runner.

---

## 7. Backlog priorizado (RICE)

_RICE = R·I·C / E. Reach 1–10 · Impact 0.25–3 · Confidence 0–1 · Effort en semanas-persona._

| # | Mejora | Quién | RICE |
|---|---|---|---|
| 1 | Online para el equipo (deploy Vercel + auth real) | Tool | 32.4 |
| 2 | Datos en vivo (Service Account + Query API + cache + Cron) | Tool+vos | 27.0 |
| 3 | Selector de rango de fechas *(dep: #2)* | Tool | 20.4 |
| 4 | Estado de recos en Supabase (compartido) | Tool | 18.9 |
| 5 | Pulido UX (responsive + skeletons + empty states) | Tool | 10.8 |
| 6 | ARPU real (plan_precio) | Dato | 10.5 |
| 7 | Segmentación por device/navegador | Tool | 10.5 |
| 8 | Gemini → hipótesis de experimento + "preguntale a tu funnel" | Tool | 9.8 |
| 9 | Alertas de caída WoW | Tool | 7.4 |
| 10 | Atribución de experimentos (annotation + antes/después) | Tool+dev | 7.2 |
| 11 | Export/compartir reporte (PDF/link PO) | Tool | 7.2 |
| 12 | Cerrar loop cotizador→socio (`prospecto_id`) | Dev web | 6.0 |
| 13 | Instrumentar `utm_source` en Contacto/Empresa/Alta | Dev web | 6.0 |
| 14 | Unificar instrumentación `flow_N` (alta) | Dev web | 2.8 |
| 15 | Roadmap/Experimentos: cargar datos o retirar | Decisión | 2.4 |

**Secuencia:** Tanda 1 = #2 datos en vivo + #1 online → deja de ser demo. Tanda 2 = #3/#4/#7/#6. Tanda 3 = #8/#9/#11/#10. Tanda 4 (dev web) = #12/#13/#14.

---

## 8. Dependencias críticas

- **Datos en vivo** (Service Account de Mixpanel) → desbloquea medición de experimentos, selector de fechas, todo lo temporal.
- **`prospecto_id` de punta a punta** → cierra el loop visita→cápita (hoy 0 cruce cotizador→socio).
- **Supabase** → estado compartido de recos + experimentos + playbook en prod.

---

## 9. Hallazgos clave hasta hoy (resumen)

- Funnel cotizador: 41.820 visitas → **fuga del 88%** en el primer formulario de datos.
- Canal **`display`**: 23% del tráfico, **convierte ~0%** (basura). `meta_ads`/`meta`: 31–45% (premium).
- WoW: tráfico plano, pero **datos +40%, intención +66%** (el medio del funnel mejoró).
- **Loop roto**: 0 usuarios del cotizador llegan a `Flow_Asociado` en 30d (falta `prospecto_id`).
- Otros funnels vivos: Contacto (47%), Empresa B2B (15%), Alta (3.900 asociados/mes, instrumentación inconsistente).

_(El detalle completo y vivo está en `growth-playbook.md` y en `/playbook`.)_
