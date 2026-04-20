-- IPL Prediction Portal — core schema (GMT/UTC via timestamptz)

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default '',
  legacy_points numeric,
  current_points numeric not null default 0,
  rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  home_team text not null,
  away_team text not null,
  match_time_utc timestamptz not null,
  winner text,
  bonus_result text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  predicted_winner text not null,
  bonus_pick text,
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  created_at timestamptz not null default now(),
  row_count integer not null default 0,
  error_log jsonb
);

create index predictions_user_id_idx on public.predictions (user_id);
create index predictions_match_id_idx on public.predictions (match_id);
create index matches_match_time_idx on public.matches (match_time_utc);

-- Lock enforcement at DB layer (defense in depth; API also checks)
create or replace function public.enforce_prediction_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.matches where id = new.match_id) then
    raise exception 'match not found';
  end if;
  if now() > (
    select match_time_utc - interval '30 minutes'
    from public.matches
    where id = new.match_id
  ) then
    raise exception 'MATCH_LOCKED' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists predictions_lock_bi on public.predictions;
create trigger predictions_lock_bi
  before insert or update on public.predictions
  for each row execute function public.enforce_prediction_lock();
