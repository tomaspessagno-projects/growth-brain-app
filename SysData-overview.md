# SysData — Visión y objetivo

_Documento de contexto para Product Owner y Líder Técnica · armatuplan / Medicus_

---

## Qué es

**SysData es la capa de decisión de growth.** Se para arriba de los datos que ya tenemos —comportamiento (Mixpanel), comercial (HubSpot) y unit economics (PELG)— y los cruza para responder una sola pregunta:

> **¿Qué conviene mejorar, dónde, cuándo, y cuánta plata hay en juego?**

No reemplaza Mixpanel, HubSpot ni Metabase. Los **une y los traduce en decisiones priorizadas**.

## El problema que resuelve

Hoy los datos viven en tres sistemas que no se hablan entre sí. Mirar cada uno por separado lleva a **discutir opiniones** sobre qué mejorar, en vez de **priorizar por impacto**. Falta una capa que junte las tres fuentes y diga, con un número de plata atrás, qué mover para subir la **conversión** y las **cápitas** — no por corazonada.

## El objetivo

Que el equipo abra SysData y en minutos sepa:

- **Qué está bien y qué está mal** (salud por área del negocio).
- **Qué conviene mejorar primero**, priorizado por **plata en juego** — no por el % de fuga más grande ni por intuición.
- **Por qué** lo dice: la evidencia de cada fuente, y qué es **dato medido vs supuesto**.
- **Qué estamos probando** y si **funcionó**, medido con rigor estadístico.
- **Qué aprendimos** — que queda como memoria y hace al motor más preciso con el tiempo.

En una línea: **convertir datos dispersos en decisiones de growth priorizadas por impacto en el negocio.**

## Cómo decide (sin tecnicismos)

Todo se ancla en una cadena simple, "la ecuación de la cápita":

> visitas → conversión por paso → datos → (% que se vuelve socio) → **cápitas** → **margen ($)**
> (y por el lado comercial: deals → win rate → cápitas)

Cada recomendación es: _"acá hay un eslabón de esta cadena dejando plata sobre la mesa, y esto es cuánto"_. Eso permite **comparar peras con peras**: una mejora chica en un paso de mucho volumen puede valer más que una grande en un paso de poco.

## Qué la hace distinta (el valor)

1. **Prioriza por plata, no por porcentaje.** La fuga más grande no siempre es la más valiosa (ej.: fuga sobre tráfico que no convierte ≈ sin valor).
2. **Honestidad radical.** Lo que no está medido se marca como **supuesto**, nunca se hace pasar por dato. Cada número muestra de dónde sale.
3. **Mide impacto de negocio, no solo clicks.** Lo expresa en plata, y contempla también reputación (voz del cliente vía NPS) y confianza del dato.
4. **Aprende.** Cada experimento que cerramos ajusta los parámetros internos del motor: la próxima recomendación es más certera. Es un **motor de mejora continua**, no un dashboard estático.
5. **Solo lectura.** Nunca escribe en Mixpanel ni HubSpot — son sistemas productivos.

## Cómo está construido (para la Líder Técnica)

**Stack:** Next.js 16 + React 19 + TypeScript · Supabase (login + estado compartido del equipo) · Vercel (hosting). Lee Mixpanel (Query/Engage API) y HubSpot (CRM v3) en **solo lectura**; los unit economics salen del PELG.

**El motor tiene 4 capas:**

1. **Memoria** — un proceso diario (cron) barre los datos y guarda la foto del día → así tenemos serie histórica propia (no dependemos de consultar en vivo cada vez).
2. **Detección** — sobre esa serie, distingue un **quiebre real** (algo se rompió) del ruido del día a día, y proyecta si vamos a llegar a la meta del período.
3. **Decisión** — puntúa cada oportunidad por plata en juego, y la muestra como un **rango** (escenario conservador → optimista), no como un número falso-exacto.
4. **Aprendizaje** — los resultados de los experimentos se vuelven parámetros numéricos que afinan el motor con cada iteración.

**Rigor:** los experimentos se miden con **test de significancia estadística** + _guardrails_ (que una mejora no rompa un paso de más abajo). Sin significancia, no se declara resultado.

## La dependencia clave (importante para ambos)

Para medir de punta a punta **"qué visita termina siendo socio"** falta un dato de plomería: estampar el mismo identificador (`prospecto_id`) en el momento del alta de socio. Hoy el lead y el socio quedan como registros separados que no se pueden unir.

- **No es trabajo de SysData** — es instrumentación _upstream_ (Data / Dev).
- Mientras no esté, la conversión visita→cápita es **modelada (supuesta), no medida**.
- Cerrarlo desbloquea **atribución real** y mediciones precisas de cada experimento. (Detalle en el brief técnico del cruce.)

## Estado actual

- ✅ **Funcionando:** el loop completo —Resumen, Oportunidades priorizadas, Experimentos medidos, Aprendizajes— con datos en vivo de Mixpanel + HubSpot.
- ✅ **Recién incorporado:** las 4 capas del motor que aprende (memoria diaria, detección, score con rango, parámetros que se afinan solos).
- ⏳ **Pendiente:** activar el proceso diario en producción (config en Vercel + Supabase) y cerrar el cruce `prospecto_id` (upstream).

## Principios

- **Solo lectura** sobre sistemas productivos (Mixpanel / HubSpot).
- **Honestidad:** medido vs supuesto, siempre explícito.
- **Herramienta de equipo** (estado compartido), no un Excel personal.

---

_En resumen: SysData es el lugar donde convergen nuestros sistemas y nos dicen, con plata atrás, qué mejorar para crecer en cápitas — aprendiendo de cada experimento que hacemos._
