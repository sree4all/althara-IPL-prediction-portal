-- =============================================================================
-- Legacy prediction staging (single migration — replaces older 0011–0013 fix files)
-- Run after 0009. Safe to paste entire file in Supabase SQL editor (one block).
--
-- 1) legacy_prediction_staging — historical Form rows before users exist
-- 2) enforce_prediction_lock — adds ipl.bypass_prediction_lock; lock uses subqueries only (no PL INTO)
-- 3) migrate_legacy_predictions_from_staging — join staging to legacy_aliases (no SELECT INTO / v_* in WHERE)
-- =============================================================================

create table if not exists public.legacy_prediction_staging (
  id uuid primary key default gen_random_uuid(),
  season_label text not null,
  legacy_name_key text not null,
  match_id uuid not null references public.matches (id) on delete cascade,
  predicted_winner text not null,
  bonus_pick text,
  source_submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (season_label, legacy_name_key, match_id)
);

create index if not exists legacy_prediction_staging_lookup_idx
  on public.legacy_prediction_staging (season_label, legacy_name_key);

alter table public.legacy_prediction_staging enable row level security;

create or replace function public.enforce_prediction_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('ipl.bypass_prediction_lock', true), '') = 'on' then
    new.updated_at := coalesce(new.updated_at, now());
    return new;
  end if;
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

create or replace function public.migrate_legacy_predictions_from_staging(p_alias_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  stg record;
  v_count int := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.legacy_aliases where id = p_alias_id) then
    raise exception 'alias not found';
  end if;

  if (select claimed_by_user_id from public.legacy_aliases where id = p_alias_id) is distinct from auth.uid() then
    raise exception 'alias not claimed by current user';
  end if;

  if coalesce(
    (select lower(trim(regexp_replace(trim(legacy_name), '\s+', ' ', 'g')))
     from public.legacy_aliases
     where id = p_alias_id),
    ''
  ) = '' then
    return 0;
  end if;

  perform set_config('ipl.bypass_prediction_lock', 'on', true);

  for stg in
    select
      lp.id,
      lp.match_id,
      lp.predicted_winner,
      lp.bonus_pick,
      lp.source_submitted_at
    from public.legacy_prediction_staging lp
    inner join public.legacy_aliases la on la.id = p_alias_id
      and lp.season_label = la.season_label
      and lp.legacy_name_key = lower(trim(regexp_replace(trim(la.legacy_name), '\s+', ' ', 'g')))
    where la.claimed_by_user_id = auth.uid()
  loop
    insert into public.predictions (user_id, match_id, predicted_winner, bonus_pick, updated_at)
    values (
      auth.uid(),
      stg.match_id,
      stg.predicted_winner,
      stg.bonus_pick,
      coalesce(stg.source_submitted_at, now())
    )
    on conflict (user_id, match_id) do update
      set predicted_winner = excluded.predicted_winner,
          bonus_pick = excluded.bonus_pick,
          updated_at = excluded.updated_at;
    v_count := v_count + 1;
  end loop;

  delete from public.legacy_prediction_staging lp
  using public.legacy_aliases la
  where la.id = p_alias_id
    and lp.season_label = la.season_label
    and lp.legacy_name_key = lower(trim(regexp_replace(trim(la.legacy_name), '\s+', ' ', 'g')));

  perform set_config('ipl.bypass_prediction_lock', '', true);
  return v_count;
end;
$$;

grant execute on function public.migrate_legacy_predictions_from_staging(uuid) to authenticated;
