-- Correct FIFA match metadata. Auto-detects column names.
-- STEP 0: If unsure of schema, run diagnose-matches-schema.sql first.
--
-- Required for full app support (run in SQL Editor, in order):
--   supabase/migrations/0027_fifa_reset_legacy_and_stage_scoring.sql
--   supabase/migrations/0028_fifa_match_metadata.sql
-- Then: npm run seed -- fifa ./docs/fifa

-- Session-scoped helper; dropped automatically when the SQL editor session ends.
create or replace function pg_temp.apply_stage_correction(
  p_match_numbers int[],
  p_kickoff_times timestamptz[],
  p_tournament_stage text,
  p_stage_key text,
  p_kickoff_col text,
  p_has_match_number boolean,
  p_has_tournament_stage boolean,
  p_has_stage_key boolean
) returns void
language plpgsql
as $$
begin
  if p_has_match_number then
    if p_has_tournament_stage then
      update public.matches
      set tournament_stage = p_tournament_stage,
          updated_at = now()
      where match_number = any (p_match_numbers);
    end if;

    if p_has_stage_key then
      update public.matches
      set stage_key = p_stage_key,
          updated_at = now()
      where match_number = any (p_match_numbers);
    end if;
  end if;

  if p_kickoff_col is null then
    return;
  end if;

  if p_has_tournament_stage then
    execute format(
      'update public.matches
       set tournament_stage = %L, updated_at = now()
       where %I = any ($1)',
      p_tournament_stage,
      p_kickoff_col
    )
    using p_kickoff_times;
  end if;

  if p_has_stage_key then
    execute format(
      'update public.matches
       set stage_key = %L, updated_at = now()
       where %I = any ($1)',
      p_stage_key,
      p_kickoff_col
    )
    using p_kickoff_times;
  end if;
end;
$$;

begin;

do $$
declare
  -- m97–m102: quarter-finals and semi-finals.
  qf_match_numbers constant int[] := array[97, 98, 99, 100];
  sf_match_numbers constant int[] := array[101, 102];

  qf_kickoffs constant timestamptz[] := array[
    '2026-07-09 20:00:00+00',
    '2026-07-10 19:00:00+00',
    '2026-07-11 21:00:00+00',
    '2026-07-12 01:00:00+00'
  ]::timestamptz[];

  sf_kickoffs constant timestamptz[] := array[
    '2026-07-14 19:00:00+00',
    '2026-07-15 19:00:00+00'
  ]::timestamptz[];

  demo_external_keys constant text[] := array['M1', 'M2', 'M3', 'M4'];

  has_home_team boolean;
  has_external_key boolean;
  has_stage_key boolean;
  has_tournament_stage boolean;
  has_match_number boolean;
  kickoff_col text;
begin
  -- Single schema probe instead of five separate information_schema queries.
  select
    coalesce(bool_or(column_name = 'home_team'), false),
    coalesce(bool_or(column_name = 'external_key'), false),
    coalesce(bool_or(column_name = 'stage_key'), false),
    coalesce(bool_or(column_name = 'tournament_stage'), false),
    coalesce(bool_or(column_name = 'match_number'), false)
  into
    has_home_team,
    has_external_key,
    has_stage_key,
    has_tournament_stage,
    has_match_number
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'matches';

  if not has_home_team then
    raise exception
      'public.matches has no home_team column. Run diagnose-matches-schema.sql — wrong table or empty project?';
  end if;

  delete from public.matches
  where (home_team, away_team) in (
    values
      ('RCB', 'CSK'),
      ('MI', 'KKR'),
      ('SRH', 'DC'),
      ('RR', 'LSG')
  );

  if has_external_key then
    delete from public.matches
    where external_key like '2026-DEMO%'
       or external_key = any (demo_external_keys);
  end if;

  select column_name
  into kickoff_col
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'matches'
    and column_name = any (array['match_time_utc', 'kickoff_at', 'start_time_utc'])
  order by case column_name
    when 'match_time_utc' then 1
    when 'kickoff_at' then 2
    else 3
  end
  limit 1;

  perform pg_temp.apply_stage_correction(
    qf_match_numbers,
    qf_kickoffs,
    'qf',
    'quarterfinals',
    kickoff_col,
    has_match_number,
    has_tournament_stage,
    has_stage_key
  );

  perform pg_temp.apply_stage_correction(
    sf_match_numbers,
    sf_kickoffs,
    'sf',
    'semifinals',
    kickoff_col,
    has_match_number,
    has_tournament_stage,
    has_stage_key
  );

  if not has_tournament_stage and not has_stage_key then
    raise notice 'Skipped stage fixes: neither tournament_stage (0027) nor stage_key (0028) exists.';
  elsif kickoff_col is null and not has_match_number then
    raise notice
      'Skipped kickoff-based stage fixes: no match_time_utc/kickoff_at and no match_number.';
  end if;
end $$;

commit;

-- Verification (uses only columns guaranteed by the base matches table).
select count(*) as total_matches
from public.matches;

select count(*) as ipl_demo_rows_remaining
from public.matches
where (home_team, away_team) in (
  values
    ('RCB', 'CSK'),
    ('MI', 'KKR'),
    ('SRH', 'DC'),
    ('RR', 'LSG')
);
