-- Copy to NNNN_your_feature.sql (NNNN > grant-check baseline in supabase/.migration-grant-check-baseline).
-- Required for CI: explicit Data API grants + RLS in the same file as CREATE TABLE.

create table if not exists public.your_table (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Data API roles (RLS still enforces row access)
grant select on public.your_table to authenticated;
grant select, insert, update, delete on public.your_table to service_role;

alter table public.your_table enable row level security;

create policy "your_table_select_own"
  on public.your_table
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "your_table_insert_own"
  on public.your_table
  for insert
  to authenticated
  with check (auth.uid() = user_id);
