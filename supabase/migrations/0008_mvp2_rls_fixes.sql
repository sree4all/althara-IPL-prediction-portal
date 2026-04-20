-- Tighten participant reads; allow admins to see inactive rows; enable admin writes and legacy alias flows.

drop policy if exists "tournament_questions_select_authenticated" on public.tournament_questions;
drop policy if exists "bonus_prompts_select_authenticated" on public.bonus_prompts;
drop policy if exists "tournament_config_insert_admin" on public.tournament_config;
drop policy if exists "tournament_config_update_admin" on public.tournament_config;
drop policy if exists "tournament_questions_insert_admin" on public.tournament_questions;
drop policy if exists "tournament_questions_update_admin" on public.tournament_questions;
drop policy if exists "bonus_prompts_insert_admin" on public.bonus_prompts;
drop policy if exists "bonus_prompts_update_admin" on public.bonus_prompts;
drop policy if exists "legacy_aliases_select_unclaimed" on public.legacy_aliases;
drop policy if exists "legacy_aliases_insert_admin" on public.legacy_aliases;
drop policy if exists "legacy_aliases_update_admin" on public.legacy_aliases;
drop policy if exists "legacy_aliases_update_claim" on public.legacy_aliases;

drop policy if exists "tournament_questions_read_authenticated" on public.tournament_questions;
create policy "tournament_questions_select_authenticated"
  on public.tournament_questions for select
  to authenticated
  using (
    is_active = true
    or (select role from public.profiles p where p.id = auth.uid()) = 'admin'
  );

drop policy if exists "bonus_prompts_read_authenticated" on public.bonus_prompts;
create policy "bonus_prompts_select_authenticated"
  on public.bonus_prompts for select
  to authenticated
  using (
    is_active = true
    or (select role from public.profiles p where p.id = auth.uid()) = 'admin'
  );

-- Admin mutations (JWT must map to profiles.role = 'admin')
create policy "tournament_config_insert_admin"
  on public.tournament_config for insert
  to authenticated
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "tournament_config_update_admin"
  on public.tournament_config for update
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "tournament_questions_insert_admin"
  on public.tournament_questions for insert
  to authenticated
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "tournament_questions_update_admin"
  on public.tournament_questions for update
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "bonus_prompts_insert_admin"
  on public.bonus_prompts for insert
  to authenticated
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "bonus_prompts_update_admin"
  on public.bonus_prompts for update
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

-- Legacy aliases: list unclaimed; admin import; participant claim
create policy "legacy_aliases_select_unclaimed"
  on public.legacy_aliases for select
  to authenticated
  using (claimed_by_user_id is null);

create policy "legacy_aliases_insert_admin"
  on public.legacy_aliases for insert
  to authenticated
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "legacy_aliases_update_admin"
  on public.legacy_aliases for update
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "legacy_aliases_update_claim"
  on public.legacy_aliases for update
  to authenticated
  using (claimed_by_user_id is null)
  with check (claimed_by_user_id = auth.uid());
