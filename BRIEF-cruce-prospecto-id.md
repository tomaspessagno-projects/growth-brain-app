# Brief técnico — Cerrar el cruce visita → cápita

**Para:** equipo Data / Dev (Medicus · armatuplan)
**De:** SysData (motor de mejora continua)
**Fecha:** 2026-06-10
**Tipo:** desbloqueante de medición (no es un feature, es plomería de datos)
**Prioridad:** alta — desbloquea atribución end-to-end y medición real de experimentos

---

## TL;DR
Tenemos los dos extremos del flujo (comportamiento en Mixpanel, comercial en HubSpot) pero **no se pueden unir por persona**. La causa no es falta de herramienta: es que **la identidad está fragmentada**. El fix es de una línea conceptual: **el alta de socio tiene que estampar la misma llave de identidad que ya tiene el lead**. Hecho eso, todo el resto (atribución, ripple-a-cápita, segmentos como personas) se desbloquea solo.

---

## El problema, con evidencia (medido read-only, 2026-06-10)

En Mixpanel (proyecto `3807904`), vía Engage API:

| Selector | Perfiles |
|---|---|
| `defined(hubspot_id)` — leads identificados | **3.988** |
| `defined(vigencia)` — socios (vigencia = inicio de cobertura) | **404** |
| `defined(hubspot_id) AND defined(vigencia)` | **0** ⛔ |
| `defined(coverage) AND defined(vigencia)` | **0** ⛔ |
| `defined(prospecto_id)` | 15.119 |
| `defined(coverage) AND defined(hubspot_id)` | 3.972 |

**Lectura:** los perfiles de **lead** (traen `hubspot_id`, `coverage`, `edad`, `incluir_hijos`… del flujo web/WhatsApp) y los de **socio** (traen `vigencia` y casi nada más) son **conjuntos disjuntos**: ni un solo perfil es lead *y* socio a la vez. Las llaves de cruce existen (`prospecto_id`, `hubspot_id`) pero **no aparecen en el registro de resultado** (el perfil con `vigencia` está casi vacío).

Del lado HubSpot (vía batch read):
- La llave **sí resuelve**: de 1.000 leads identificados en Mixpanel, **891 (89%)** matchean un contacto real de HubSpot (y la `edad` coincide en ambos lados → es la misma persona).
- Pero los contactos de leads de WhatsApp/Chengo **no tienen deal asociado**, y `lifecyclestage = customer` casi no se usa (**56** contactos en toda la base de 669k).

**Conclusión:** no es que falte data; está **desconectada**. Por eso hoy NO publicamos una tasa lead→cápita: calcularla con sets disjuntos sería medir personas distintas (mentira).

---

## El fix (en orden de preferencia)

### Opción A — Estampar la identidad en el alta de socio *(la correcta)*
El sistema/proceso que setea la user property **`vigencia`** (el alta de socio) debe, en el mismo momento, **identificar el perfil con la misma llave que el lead**:

- Llamar a Mixpanel `identify()` (o enviar el evento de alta) usando **el mismo `$distinct_id` del lead**, o como mínimo setear la user property **`prospecto_id`** (y/o `hubspot_id`) en el perfil del socio.
- Así Mixpanel **mergea** el perfil de socio con el de lead, y `vigencia` queda sobre el mismo perfil que `coverage`/`edad`/`hubspot_id`.

**Pregunta abierta para ustedes:** ¿qué sistema dispara el alta y setea `vigencia`? ¿Tiene a mano el `prospecto_id` del lead en ese momento? (Si el alta viene del core/gestión, hay que pasarle el `prospecto_id` que se generó en la cotización/WhatsApp.)

### Opción B — Cruzar en el data warehouse *(si A es difícil de tocar)*
Si el merge de identidad en Mixpanel es complejo, unir en el warehouse:
- Tabla de **socios** (tiene `prospecto_id` + `vigencia` + plan) ⨝ export de **comportamiento** de Mixpanel (tiene `prospecto_id`) **on `prospecto_id`**.
- Requiere que el export de Mixpanel al warehouse incluya `prospecto_id`, y que la tabla de socios lo tenga (confirmar).

### Opción C — Asociar el deal ganado al contacto de origen en HubSpot
- Cuando un lead de WhatsApp/Chengo cierra, el **deal ganado** ("Negocio Vendido" / "Alta de Socio") debe quedar **asociado al contacto** que originó el lead. Hoy esos contactos quedan sin deal.
- Esto cierra el loop del lado HubSpot (lead → won) sin depender de Mixpanel.

> A y C son complementarias, no excluyentes. Con cualquiera de las dos ya hay atribución.

---

## Criterio de aceptación (cómo sabemos que quedó)
1. En Mixpanel: `count(defined(hubspot_id) AND defined(vigencia))` pasa de **0** a **≈ count(vigencia)** (la mayoría de los socios también tienen las props de lead).
2. El diagnóstico `/loop` de SysData cambia de **"⛔ no medible"** a **"✅ medible"** (lo chequea solo).
3. Se puede responder, por segmento (edad/canal/composición): **qué % de los leads se vuelve cápita** — medido, no supuesto.

## El payoff (qué se desbloquea)
- **Tasa lead→cápita REAL** por canal/segmento → reemplaza el supuesto `dato→cápita = 6%` que hoy usa el score de Oportunidades.
- **Ripple-a-cápita medido** en cada experimento (hoy el motor lo declara "no medible").
- **Segmentos → personas reales** con cápita y plata atrás (hoy son cortes aislados).
- Priorización de Oportunidades por **margen real**, no estimado.

## Restricciones
- SysData lee **solo lectura** de Mixpanel y HubSpot — este cambio lo hacen ustedes en el origen (alta/core/instrumentación o warehouse). SysData lo único que hace es **detectar automáticamente** cuando quede arreglado (criterio #2).

---
*Generado por SysData a partir de una investigación read-only del cruce. Evidencia reproducible vía Mixpanel Engage API + HubSpot Search/Batch API.*
