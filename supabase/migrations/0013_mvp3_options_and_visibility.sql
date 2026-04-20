-- MVP3: structured answer options + tournament question visibility

create table if not exists public.bonus_prompt_options (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.bonus_prompts (id) on delete cascade,
  label text not null,
  value text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prompt_id, value)
);

create index if not exists bonus_prompt_options_prompt_idx
  on public.bonus_prompt_options (prompt_id, sort_order);

create table if not exists public.tournament_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.tournament_questions (id) on delete cascade,
  label text not null,
  value text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, value)
);

create index if not exists tournament_question_options_q_idx
  on public.tournament_question_options (question_id, sort_order);

alter table public.bonus_prompts
  add column if not exists input_type text not null default 'single_choice';

alter table public.bonus_prompts
  drop constraint if exists bonus_prompts_input_type_check;

alter table public.bonus_prompts
  add constraint bonus_prompts_input_type_check
  check (input_type in ('text', 'single_choice'));

alter table public.tournament_questions
  add column if not exists visible_after_utc timestamptz;

alter table public.tournament_questions
  add column if not exists revealed_by_admin boolean not null default false;

-- Existing questions stay visible after deploy
update public.tournament_questions
set revealed_by_admin = true
where revealed_by_admin is not distinct from false;

-- RLS: option tables
alter table public.bonus_prompt_options enable row level security;
alter table public.tournament_question_options enable row level security;

create policy "bonus_prompt_options_select_authenticated"
  on public.bonus_prompt_options for select
  to authenticated
  using (true);

create policy "bonus_prompt_options_insert_admin"
  on public.bonus_prompt_options for insert
  to authenticated
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "bonus_prompt_options_update_admin"
  on public.bonus_prompt_options for update
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "bonus_prompt_options_delete_admin"
  on public.bonus_prompt_options for delete
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "tournament_question_options_select_authenticated"
  on public.tournament_question_options for select
  to authenticated
  using (true);

create policy "tournament_question_options_insert_admin"
  on public.tournament_question_options for insert
  to authenticated
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "tournament_question_options_update_admin"
  on public.tournament_question_options for update
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin')
  with check ((select role from public.profiles p where p.id = auth.uid()) = 'admin');

create policy "tournament_question_options_delete_admin"
  on public.tournament_question_options for delete
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin');
