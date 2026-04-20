-- Configurable points + admin completion/scoring hooks

create table if not exists public.scoring_config (
  season_year int primary key,
  match_winner_points numeric not null default 2,
  match_bonus_points numeric not null default 2,
  tournament_slot_points jsonb not null default '[2,2,2,2,2]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.scoring_config (season_year, match_winner_points, match_bonus_points, tournament_slot_points)
values (2026, 2, 2, '[2,2,2,2,2]'::jsonb)
on conflict (season_year) do nothing;

alter table public.matches
  add column if not exists scored_at timestamptz;

alter table public.tournament_questions
  add column if not exists correct_answer text,
  add column if not exists scored_at timestamptz;

alter table public.bonus_prompts
  add column if not exists correct_answer text;

-- Admin can update match results for scoring
create policy "matches_update_admin"
  on public.matches for update
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

-- Admins need to read all ledger rows when reconciling match scores
create policy "points_ledger_select_admin"
  on public.points_ledger for select
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

-- Ledger writes for scoring runs
create policy "points_ledger_insert_admin"
  on public.points_ledger for insert
  to authenticated
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "points_ledger_delete_admin"
  on public.points_ledger for delete
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

-- Admins may adjust participant season points when applying ledger deltas
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

alter table public.scoring_config enable row level security;

create policy "scoring_config_select_authenticated"
  on public.scoring_config for select
  to authenticated
  using (true);

create policy "scoring_config_update_admin"
  on public.scoring_config for update
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "scoring_config_insert_admin"
  on public.scoring_config for insert
  to authenticated
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');
