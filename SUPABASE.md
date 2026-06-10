# Supabase — setup y migración del estado

La app HOY guarda el estado en **localStorage** (por navegador → no compartido). Para que sea una tool de equipo, ese estado va a **Supabase**. Acá está todo lo que necesita.

## Proyecto
- **URL:** `https://qpjsqbgwoaqbktjqioyb.supabase.co` (ya reactivado)
- Auth de la app: ya funciona con Supabase (login). En prod el login está activo; en local se saltea con `NEXT_PUBLIC_DEV_BYPASS_AUTH=true`.

## Variables de entorno (ya seteadas en `.env.local` y en Vercel)
| Var | Para qué | Estado |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | endpoint | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | acceso client-side (RLS) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | **opcional** — solo si hacés escrituras server-side que bypasean RLS | ⬜ a agregar si hace falta |

## Paso 1 — Crear las tablas
Supabase Dashboard → **SQL Editor** → New query → pegá [`supabase/schema.sql`](supabase/schema.sql) → **Run**.

Crea 4 tablas (con RLS de "workspace de equipo": cualquier usuario logueado lee/escribe):

| Tabla | Reemplaza al localStorage | Contenido |
|---|---|---|
| `experimentos` | `gb_experiments` | hipótesis, baseline, resultado, measurement, veredicto… |
| `oportunidad_status` | `gb_rec_status` | estado de cada oportunidad (pendiente/en_progreso/hecha/descartada) |
| `pelg_history` | `gb_pelg_history` | el PELG mes a mes |
| `aprendizajes_runtime` | (nuevo) | reglas del playbook generadas al cerrar experimentos |

> Las tablas viejas `experimentos`/`aprendizajes`/`metricas_snapshots` estaban **vacías** (diseño anterior). El schema redefine `experimentos` y deja las otras dos sin tocar.

## Paso 2 — Cuentas del equipo
Supabase → **Authentication → Users** → invitá/creá las cuentas del equipo (para que puedan loguearse en prod).

## Paso 3 — Migrar las lecturas/escrituras (trabajo de dev)
Hoy el estado se lee/escribe en estos puntos (buscar `localStorage`):
- **Oportunidades** → `src/app/oportunidades/page.tsx` (`gb_rec_status`) + `src/lib/experiments/fromOpportunity.ts` (escribe experimentos al "tomar").
- **Experimentos** → `src/app/experimentos/page.tsx` (`gb_experiments`).
- **Economía** → `src/lib/economics/history.ts` (`gb_pelg_history`).

Patrón sugerido: reemplazar los helpers de localStorage por llamadas a Supabase con la sesión del usuario (client-side, anon key + RLS) — no hace falta service-role para el caso normal. Ejemplo:
```ts
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
// leer:    const { data } = await sb.from('experimentos').select('*').order('created_at', { ascending: false });
// upsert:  await sb.from('experimentos').upsert({ id, hipotesis, estado, baseline, ... });
```
(El cliente de Supabase ya está en el proyecto para el auth — reutilizarlo.)

## RLS (seguridad)
RLS está **activado** en las 4 tablas con una política única: usuarios **autenticados** pueden todo. Es una tool interna y compartida, así que el equipo ve el mismo estado. Si más adelante se quiere granularidad (por usuario/rol), se ajustan las policies.

---
_Regla del proyecto: el estado va a Supabase, pero HubSpot y Mixpanel siguen siendo SOLO LECTURA — eso no cambia._
