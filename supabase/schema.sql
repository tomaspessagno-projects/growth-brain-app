-- ============================================================
--  SysData · Schema de Supabase (estado compartido del equipo)
--  Reemplaza el localStorage del cliente por persistencia en DB.
--
--  CÓMO APLICARLO: Supabase Dashboard → SQL Editor → New query →
--  pegá TODO este archivo → Run. (Idempotente salvo el DROP de abajo.)
--
--  Nota: la tabla `experimentos` ya existe VACÍA (de un diseño viejo).
--  El DROP de abajo no pierde datos (está vacía) y la redefine al shape actual.
-- ============================================================

-- ---------- Experimentos (era localStorage `gb_experiments`) ----------
drop table if exists public.experimentos cascade;
create table public.experimentos (
  id                     text primary key,
  hipotesis              text not null,
  funnel_id              text,
  funnel_name            text,
  target_step_key        text,
  target_step_label      text,
  target_step_event      text,
  estado                 text not null default 'planeado'
                           check (estado in ('planeado','en_curso','cerrado')),
  baseline               jsonb not null default '[]'::jsonb,   -- [{key,label,value}]
  resultado              jsonb,                                 -- {event: count}
  veredicto              text,                                  -- validado | refutado | inconcluso
  aprendizaje            text,
  mixpanel_funnel        text,                                  -- link/ID del board
  fecha_inicio           date,
  before_range           text,
  after_range            text,
  measurement            jsonb,                                 -- veredicto triangulado del motor
  auto_measured          boolean not null default false,
  from_opportunity       text,                                  -- rec.id de origen
  from_opportunity_title text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------- Estado de oportunidades (era `gb_rec_status`) ----------
create table if not exists public.oportunidad_status (
  rec_id     text primary key,
  status     text not null check (status in ('pendiente','en_progreso','hecha','descartada')),
  updated_at timestamptz not null default now()
);

-- ---------- Histórico PELG mensual (era `gb_pelg_history`) ----------
create table if not exists public.pelg_history (
  month            text primary key,          -- 'YYYY-MM'
  label            text,
  total_spend_ars  numeric,
  total_leads      integer,
  blended_cac_ars  numeric,
  channels         jsonb not null default '[]'::jsonb,  -- [{label, spendArs}]
  pdf_name         text,
  source           text not null default 'manual',
  created_at       timestamptz not null default now()
);

-- ---------- Aprendizajes generados en runtime (complementa los priors del código) ----------
create table if not exists public.aprendizajes_runtime (
  id         text primary key default gen_random_uuid()::text,
  category   text,
  status     text,                            -- validado | refutado | observacion | guardrail
  statement  text not null,
  evidence   text,
  source     text not null default 'experimento',
  created_at timestamptz not null default now()
);

-- ============================================================
--  updated_at automático
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_exp_touch on public.experimentos;
create trigger trg_exp_touch before update on public.experimentos
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_opp_touch on public.oportunidad_status;
create trigger trg_opp_touch before update on public.oportunidad_status
  for each row execute function public.touch_updated_at();

-- ============================================================
--  RLS — workspace de equipo: cualquier usuario AUTENTICADO lee/escribe.
--  (Es una tool interna; todos los del equipo comparten el mismo estado.)
--  Los endpoints server-side con service-role key bypassean RLS.
-- ============================================================
alter table public.experimentos          enable row level security;
alter table public.oportunidad_status     enable row level security;
alter table public.pelg_history           enable row level security;
alter table public.aprendizajes_runtime   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['experimentos','oportunidad_status','pelg_history','aprendizajes_runtime']
  loop
    execute format('drop policy if exists "team_all" on public.%I;', t);
    execute format(
      'create policy "team_all" on public.%I for all
         to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================
--  Listo. Tablas: experimentos · oportunidad_status · pelg_history · aprendizajes_runtime
-- ============================================================
