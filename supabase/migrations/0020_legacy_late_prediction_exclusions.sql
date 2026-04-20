-- Explicit exclusions for legacy-late rows so scoring/recompute can skip them.

create table if not exists public.legacy_prediction_exclusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create index if not exists legacy_prediction_exclusions_user_idx
  on public.legacy_prediction_exclusions (user_id);

create index if not exists legacy_prediction_exclusions_match_idx
  on public.legacy_prediction_exclusions (match_id);

alter table public.legacy_prediction_exclusions enable row level security;

drop policy if exists "legacy_prediction_exclusions_select_admin" on public.legacy_prediction_exclusions;
create policy "legacy_prediction_exclusions_select_admin"
  on public.legacy_prediction_exclusions for select
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

drop policy if exists "legacy_prediction_exclusions_insert_admin" on public.legacy_prediction_exclusions;
create policy "legacy_prediction_exclusions_insert_admin"
  on public.legacy_prediction_exclusions for insert
  to authenticated
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

drop policy if exists "legacy_prediction_exclusions_update_admin" on public.legacy_prediction_exclusions;
create policy "legacy_prediction_exclusions_update_admin"
  on public.legacy_prediction_exclusions for update
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

drop policy if exists "legacy_prediction_exclusions_delete_admin" on public.legacy_prediction_exclusions;
create policy "legacy_prediction_exclusions_delete_admin"
  on public.legacy_prediction_exclusions for delete
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin');
