# Growth Playbook — armatuplan
_Reglas que el motor aprende y anota. Actualizado: 2026-06-09_

> Memoria de growth: cada observación del funnel y cada resultado de experimento se anota acá como una regla reusable. El motor lee este playbook como _priors_ para recomendar y priorizar mejor.

## Canales
- ⚠️ **[Guardrail]** El canal "display" no convierte (~0%) pese a traer el 23% del tráfico. No escalar. _(9.628 visitas/mes, 2 datos. Funnel visita→datos por utm_source · 2026-06-09)_
- 🔍 **[Observación]** meta_ads (45%) y meta (31%) convierten 2-3x el promedio (16%). Candidatos a escalar. _(Funnel visita→datos por canal · 2026-06-09)_
- 🔍 **[Observación]** google y medicus_home son la base de tráfico (~30k/mes) y convierten 16%: el piso sano. _(utm_source · 2026-06-09)_

## Formularios / UX
- 🔍 **[Observación]** El 88% abandona entre visitar el cotizador y completar datos personales. La mayor fuga del funnel. _(41.820 → 5.223, funnel secuencial 30d · 2026-06-09)_
- 🔍 **[Observación]** Con tráfico plano, completó datos +40% e intención +66% vs período previo: algo en el medio del funnel mejoró. Identificar qué para sostenerlo. _(WoW abr vs may · 2026-06-09)_

## Conversión
- 🔍 **[Observación]** Contacto convierte 47% pero Empresa B2B solo 15%. El form/flujo B2B necesita revisión. _(Flow_Contacto vs Flow_Empresa · 2026-06-09)_

## Pricing / Oferta
- 🔍 **[Observación]** Hipótesis a validar: cuando el aporte cubre la cuota, la intención de alta sube. El evento existe — armar experimento. _(evento cotizador__aporte_cubre_cuota · 2026-06-09)_

## Instrumentación / Sistema
- ⚠️ **[Guardrail]** Cotizador y Flow_Asociado están desconectados: 0 usuarios del cotizador llegan a socio en 30d. Sin prospecto_id no se puede atribuir visita→cápita. _(Funnel cotizador→Flow_Asociado = 0 · 2026-06-09)_
- 🔍 **[Observación]** Eventos muertos, no usar: pago, firma_solicitud, Flow_FollowUp_Alta, flow_2_datos_titular. _(<5 usuarios/7d · 2026-06-09)_
- 🔍 **[Observación]** Contacto/Empresa/Alta no taggean utm_source: no se puede analizar su origen. _(breakdown = undefined · 2026-06-09)_
- ⚠️ **[Guardrail]** El flujo Alta (flow_N) tiene instrumentación inconsistente (asociado 3.900 > completado 1.324). No confiar en su conversión hasta unificar. _(multi-funnel counts · 2026-06-09)_
- 🔍 **[Observación]** Pasos resueltos: inicio_alta = cotizador__alta_online_modal__click; cliente = handoff al funnel Alta (Flow_Asociado). _(validación secuencial · 2026-06-09)_
