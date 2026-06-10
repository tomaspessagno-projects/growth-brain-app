# SysData — motor de mejora continua de Medicus (armatuplan)

Tool interno de growth para **entender a los usuarios y decidir qué mejorar**, cruzando comportamiento (Mixpanel), comercial (HubSpot) y unit economics (PELG). No es un CRM ni reemplaza Mixpanel/HubSpot/Metabase: es la **capa de decisión** ("¿qué hacemos al respecto?") arriba de los datos.

> ## ⚠️ REGLA DURA PARA TODO EL EQUIPO
> **El acceso a HubSpot y Mixpanel es SOLO LECTURA. Nunca escribir, crear, editar ni borrar nada** en esas plataformas (ni eventos, ni propiedades, ni deals, ni experimentos de Mixpanel). Son sistemas productivos. Usar solo GET / search / query / batch-read. Los tokens van **server-side** (sin `NEXT_PUBLIC_`), nunca expuestos al cliente.

## El loop (la navegación)
**Resumen** (qué está bien/mal) → **Oportunidades** (qué mejorar, priorizado por plata) → **Experimentos** (qué estamos mejorando, auto-medidos) → **Aprendizajes/Playbook** (qué aprendimos → priors). **Segmentos** = discovery (entender al usuario por convergencia cuali+cuanti). **Explorador** = funnels + CRM + economía + estado del cruce.

## Stack
- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript + CSS Modules
- **Mixpanel** Query/Engage API (lectura) · **HubSpot** CRM v3 (lectura) · **PELG** (PDF de unit economics, snapshot)
- **Supabase** (auth + estado compartido — en migración desde localStorage)
- **Vercel** (hosting, ya linkeado)

## Setup
```bash
cp .env.example .env.local   # completá los valores (pedíselos al owner)
npm install
npm run dev                  # http://localhost:3000
npm run build                # verificá el build de producción antes de pushear
```
Variables de entorno: ver [`.env.example`](.env.example). En prod se cargan en **Vercel → Settings → Environment Variables** (no se commitean).

## Arquitectura (dónde está cada cosa)
- `src/lib/mixpanel/` — `analytics.ts` (motor: funnels + salud + resumen), `recommendations.ts` (oportunidades), `playbook.ts` (memoria/priors), `benchmarks.ts` (metas), `live.ts` (lectura Mixpanel), `snapshot.ts` (datos base).
- `src/lib/triangulation/` — `score.ts` (score por margen, Mixpanel×HubSpot×PELG) · `measure.ts` (medición de experimentos: significancia + 3 guardrails + confounds).
- `src/lib/economics/` — `model.ts` (LTV/CAC, **supuestos explícitos**) · `history.ts` (PELG mensual).
- `src/lib/voice/verbatims.ts` — voz del cliente (verbatims NPS agrupados por tema, × canal, drivers).
- `src/lib/loop/attribution.ts` — diagnóstico del cruce visita→cápita.
- `src/lib/hubspot/client.ts` — pipeline comercial (lectura).
- `src/app/api/*` — rutas server-side (todas lectura): `mixpanel/analytics`, `voice`, `loop`, `hubspot/pipeline`, `mixpanel/experiment-measure`.
- `src/app/*` — las páginas del loop.

## Estado del proyecto y tareas para el equipo
1. **Migrar el estado a Supabase (PRIORIDAD).** Hoy vive en `localStorage` (por navegador): `gb_experiments`, `gb_rec_status`, `gb_pelg_history`. Para que sea una tool de equipo hay que persistirlo en Supabase. **El schema y la guía de migración están en [`SUPABASE.md`](SUPABASE.md) + [`supabase/schema.sql`](supabase/schema.sql)** (correr el SQL en el dashboard, después swapear los helpers de localStorage).
2. **Cerrar el cruce visita→cápita.** Hoy está bloqueado por identidad fragmentada — ver el brief: [`BRIEF-cruce-prospecto-id.md`](BRIEF-cruce-prospecto-id.md). Es trabajo **upstream** (estampar `prospecto_id` en el alta de socio). Cuando se haga, la página `/loop` se pone verde sola.
3. **Auth en prod.** `NEXT_PUBLIC_DEV_BYPASS_AUTH=true` solo va en local. En prod el login de Supabase queda activo (no setear esa var).
4. **Hardening de rate limit** en las llamadas a Mixpanel (ya hay cache + retry; revisar bajo carga).

## Documentos
- [`BRIEF-cruce-prospecto-id.md`](BRIEF-cruce-prospecto-id.md) — el pedido técnico para cerrar el loop (data/dev).
- [`growth-engine-blueprint.md`](growth-engine-blueprint.md) — diseño del motor.
- [`growth-playbook.md`](growth-playbook.md) — la memoria/reglas (también en la app, tab Aprendizajes).

---
_Interno de Medicus. No distribuir los tokens. Cualquier integración nueva con HubSpot/Mixpanel debe ser solo lectura._
