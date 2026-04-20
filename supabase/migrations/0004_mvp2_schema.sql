create table if not exists public.tournament_config (
  id uuid primary key default gen_random_uuid(),
  season_year int not null unique,
  answer_lock_utc timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournament_questions (
  id uuid primary key default gen_random_uuid(),
  season_year int not null,
  slot_no int not null check (slot_no between 1 and 5),
  question_text text not null,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_year, slot_no)
);

create table if not exists public.tournament_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.tournament_questions (id) on delete cascade,
  answer_text text not null,
  answered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists public.bonus_prompts (
  id uuid primary key default gen_random_uuid(),
  season_year int not null,
  scope text not null check (scope in ('match', 'tournament')),
  match_id uuid references public.matches (id) on delete cascade,
  prompt_key text not null,
  prompt_text text not null,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prediction_bonus_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid references public.matches (id) on delete cascade,
  prompt_id uuid not null references public.bonus_prompts (id) on delete cascade,
  answer_text text not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists prediction_bonus_answers_unique_idx
  on public.prediction_bonus_answers (user_id, prompt_id, coalesce(match_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.legacy_aliases (
  id uuid primary key default gen_random_uuid(),
  season_label text not null,
  legacy_name text not null,
  legacy_email text,
  claimed_by_user_id uuid references public.profiles (id),
  claimed_at timestamptz,
  migration_payload jsonb,
  unique (season_label, legacy_name)
);

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null check (source_type in ('match', 'bonus', 'tournament_question')),
  source_id uuid not null,
  points_delta numeric not null,
  reason text,
  awarded_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text not null default 'user';

