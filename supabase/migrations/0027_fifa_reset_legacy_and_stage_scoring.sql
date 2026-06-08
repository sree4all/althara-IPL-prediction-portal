-- FIFA World Cup 2026: stage scoring matrix, tournament_stage on matches, legacy removal.

-- Per-stage match-winner scoring (replaces flat match_winner_points + IPL knockout)
create table if not exists public.stage_scoring_config (
  season_year int not null,
  stage_slug text not null,
  correct_points numeric not null,
  incorrect_points numeric not null,
  updated_at timestamptz not null default now(),
  primary key (season_year, stage_slug),
  constraint stage_scoring_config_slug_check check (
    stage_slug in ('group', 'r32', 'r16', 'qf', 'sf', 'third_place', 'final')
  )
);

insert into public.stage_scoring_config (season_year, stage_slug, correct_points, incorrect_points)
values
  (2026, 'group', 2, 0),
  (2026, 'r32', 3, -1),
  (2026, 'r16', 5, -2),
  (2026, 'qf', 8, -3),
  (2026, 'sf', 12, -4),
  (2026, 'third_place', 8, -3),
  (2026, 'final', 20, -10)
on conflict (season_year, stage_slug) do nothing;

alter table public.stage_scoring_config enable row level security;

grant select on public.stage_scoring_config to authenticated;
grant insert, update on public.stage_scoring_config to authenticated;

drop policy if exists "stage_scoring_config_select_authenticated" on public.stage_scoring_config;
create policy "stage_scoring_config_select_authenticated"
  on public.stage_scoring_config for select
  to authenticated
  using (true);

drop policy if exists "stage_scoring_config_update_admin" on public.stage_scoring_config;
create policy "stage_scoring_config_update_admin"
  on public.stage_scoring_config for update
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

drop policy if exists "stage_scoring_config_insert_admin" on public.stage_scoring_config;
create policy "stage_scoring_config_insert_admin"
  on public.stage_scoring_config for insert
  to authenticated
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

-- Replace IPL knockout_stage with FIFA tournament_stage
alter table public.matches
  add column if not exists tournament_stage text not null default 'group';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'matches'
      and column_name = 'knockout_stage'
  ) then
    update public.matches
    set tournament_stage = case knockout_stage
      when 'final' then 'final'
      when 'q1' then 'qf'
      when 'q2' then 'qf'
      when 'eliminator' then 'qf'
      else 'group'
    end
    where knockout_stage is not null;
  end if;
end $$;

alter table public.matches drop constraint if exists matches_knockout_stage_check;
drop index if exists matches_knockout_stage_idx;
alter table public.matches drop column if exists knockout_stage;

alter table public.matches drop constraint if exists matches_tournament_stage_check;
alter table public.matches
  add constraint matches_tournament_stage_check
  check (tournament_stage in ('group', 'r32', 'r16', 'qf', 'sf', 'third_place', 'final'));

create index if not exists matches_tournament_stage_idx on public.matches (tournament_stage);

-- Legacy artifacts (full removal per FR-003a)
drop table if exists public.legacy_prediction_exclusions cascade;
drop table if exists public.legacy_prediction_staging cascade;
drop table if exists public.legacy_aliases cascade;

alter table public.profiles drop column if exists legacy_points;
alter table public.profiles drop column if exists legacy_alias_onboarding_completed;
