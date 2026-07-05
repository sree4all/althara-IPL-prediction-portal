-- FIFA knockout enhancements: tournament forecast, bonus overrides, forecast stats toggle.

alter table public.tournament_config
  add column if not exists forecast_stats_visible boolean not null default false;

comment on column public.tournament_config.forecast_stats_visible is
  'When true, signed-in users may view aggregate Tournament Forecast statistics.';

create table if not exists public.tournament_forecast_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  season_year int not null,
  semi_finalist_teams text[] not null default '{}',
  finalist_teams text[] not null default '{}',
  winner_team text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, season_year)
);

create index if not exists tournament_forecast_answers_season_idx
  on public.tournament_forecast_answers (season_year);

alter table public.bonus_prompts
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'ai_generated')),
  add column if not exists correct_points numeric,
  add column if not exists incorrect_points numeric;

alter table public.tournament_forecast_answers enable row level security;

drop policy if exists "forecast_answers_select_own" on public.tournament_forecast_answers;
create policy "forecast_answers_select_own"
  on public.tournament_forecast_answers for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "forecast_answers_select_admin" on public.tournament_forecast_answers;
create policy "forecast_answers_select_admin"
  on public.tournament_forecast_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "forecast_answers_insert_own" on public.tournament_forecast_answers;
create policy "forecast_answers_insert_own"
  on public.tournament_forecast_answers for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "forecast_answers_update_own" on public.tournament_forecast_answers;
create policy "forecast_answers_update_own"
  on public.tournament_forecast_answers for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.tournament_forecast_answers to authenticated;
grant select, insert, update, delete on public.tournament_forecast_answers to service_role;
