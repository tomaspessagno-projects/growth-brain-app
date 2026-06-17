-- ============================================================
--  SysData · Capa 1 (memoria) + Capa 4 (priors numéricos)
--
--  Capa 1 — el motor barre 1 vez por día (cron) y PERSISTE la foto:
--    analytics_snapshots      → la analítica completa del día (series temporales propias)
--    recommendation_snapshots → las oportunidades rankeadas de ese día
--  Capa 4 — el Playbook deja de ser solo texto y pasa a PRIORS NUMÉRICOS:
--    intervention_priors      → por familia de intervención, la fracción de fuga REALMENTE
--                               recuperada (aprendida de los experimentos) + confianza
--
--  CÓMO APLICARLO: Supabase Dashboard → SQL Editor → pegá este archivo → Run. Idempotente.
--  Escritura: SOLO la service-role (el cron). Lectura: cualquier usuario autenticado.
-- ============================================================

-- ---------- Capa 1 · foto diaria de la analítica ----------
create table if not exists public.analytics_snapshots (
  day        date primary key,                 -- fin de la ventana Mixpanel (días completos)
  source     text not null default 'live',     -- live | snapshot
  summary    jsonb not null default '{}'::jsonb, -- KPIs resumidos (totales, biggestLeak, etc.)
  payload    jsonb not null default '{}'::jsonb, -- funnels + hubspot + window (la foto entera)
  created_at timestamptz not null default now()
);

-- ---------- Capa 1 · oportunidades rankeadas del día ----------
create table if not exists public.recommendation_snapshots (
  id          bigint generated always as identity primary key,
  day         date not null,
  rec_id      text not null,
  title       text,
  priority    text,
  discipline  text,
  owner       text,
  funnel      text,
  score       numeric,            -- ranking compuesto (mensualizado)
  margin_ars  numeric,            -- $ en juego
  cadence     text,               -- mensual | acumulado
  confidence  numeric,
  urgency     numeric,
  effort      numeric,
  created_at  timestamptz not null default now()
);
create index if not exists idx_rec_snap_day on public.recommendation_snapshots (day);
create index if not exists idx_rec_snap_recid on public.recommendation_snapshots (rec_id);

-- ---------- Capa 4 · priors aprendidos por familia de intervención ----------
create table if not exists public.intervention_priors (
  family        text primary key,            -- formularios | canal | pricing | comercial | voz | instrumentacion | otro
  recovery_mean numeric not null,            -- fracción de fuga recuperada (empirical-Bayes), 0..1
  recovery_n    integer not null default 0,  -- experimentos significativos que la informan
  validated     integer not null default 0,
  refuted       integer not null default 0,
  inconclusive  integer not null default 0,
  observations  jsonb   not null default '[]'::jsonb,  -- recoveries observadas (transparencia)
  updated_at    timestamptz not null default now()
);

-- ============================================================
--  RLS — lectura para autenticados; escritura SOLO service-role (el cron la bypassa).
--  A diferencia del estado editable por el equipo (experimentos/oportunidades), estas tablas
--  las escribe únicamente el motor: nadie las edita a mano.
-- ============================================================
alter table public.analytics_snapshots      enable row level security;
alter table public.recommendation_snapshots  enable row level security;
alter table public.intervention_priors        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['analytics_snapshots','recommendation_snapshots','intervention_priors']
  loop
    execute format('drop policy if exists "team_read" on public.%I;', t);
    execute format(
      'create policy "team_read" on public.%I for select
         to authenticated using (true);', t);
  end loop;
end $$;

-- ============================================================
--  Listo. Tablas: analytics_snapshots · recommendation_snapshots · intervention_priors
-- ============================================================
