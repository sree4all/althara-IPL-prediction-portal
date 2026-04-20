alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.import_batches enable row level security;

-- Profiles: leaderboard visibility + own row updates
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Matches: read-only for participants
create policy "matches_select_authenticated"
  on public.matches for select
  to authenticated
  using (true);

-- Predictions: own rows only
create policy "predictions_select_own"
  on public.predictions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "predictions_insert_own"
  on public.predictions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "predictions_update_own"
  on public.predictions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "predictions_delete_own"
  on public.predictions for delete
  to authenticated
  using (auth.uid() = user_id);

-- import_batches: operators use service role only (no policies for authenticated)
