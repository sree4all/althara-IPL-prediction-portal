-- Round of 32 (M73–M88): correct kickoff times only.
-- Source: docs/fifa/matches.csv (Eastern wall clock → UTC, same as app import).
-- Skips any fixture that already has at least one prediction (operator rule A).
--
-- Paste into Supabase SQL editor. Run the preview first, then the apply block.

-- ── Preview: current vs proposed ─────────────────────────────────────────────
with kickoffs (match_number, match_time_utc) as (
  values
    (73, '2026-06-28 19:00:00+00'::timestamptz),
    (74, '2026-06-29 20:30:00+00'::timestamptz),
    (75, '2026-06-30 00:00:00+00'::timestamptz),
    (76, '2026-06-29 17:00:00+00'::timestamptz),
    (77, '2026-06-30 21:00:00+00'::timestamptz),
    (78, '2026-06-30 17:00:00+00'::timestamptz),
    (79, '2026-07-01 00:00:00+00'::timestamptz),
    (80, '2026-07-01 16:00:00+00'::timestamptz),
    (81, '2026-07-02 00:00:00+00'::timestamptz),
    (82, '2026-07-01 20:00:00+00'::timestamptz),
    (83, '2026-07-02 23:00:00+00'::timestamptz),
    (84, '2026-07-02 19:00:00+00'::timestamptz),
    (85, '2026-07-03 03:00:00+00'::timestamptz),
    (86, '2026-07-03 22:00:00+00'::timestamptz),
    (87, '2026-07-04 01:30:00+00'::timestamptz),
    (88, '2026-07-03 18:00:00+00'::timestamptz)
),
r32_matches as (
  select
    m.id,
    m.external_key,
    coalesce(
      m.match_number,
      nullif(substring(m.external_key from 'M([0-9]+)$'), '')::int
    ) as fixture_number,
    m.home_team,
    m.away_team,
    m.match_time_utc as current_time_utc
  from public.matches m
  where m.match_number between 73 and 88
     or m.external_key ~ '^WC26-M(7[3-9]|8[0-8])$'
     or m.external_key ~ '^wc2026:m(7[3-9]|8[0-8])$'
),
predicted_fixtures as (
  select distinct rm.fixture_number
  from public.predictions p
  join r32_matches rm on rm.id = p.match_id
  where rm.fixture_number is not null
)
select
  rm.fixture_number as match_number,
  rm.external_key,
  rm.home_team || ' vs ' || rm.away_team as fixture,
  rm.current_time_utc,
  k.match_time_utc as new_time_utc,
  case
    when pf.fixture_number is not null then 'SKIP (has predictions)'
    when rm.current_time_utc is not distinct from k.match_time_utc then 'unchanged'
    else 'UPDATE'
  end as action
from r32_matches rm
join kickoffs k on k.match_number = rm.fixture_number
left join predicted_fixtures pf on pf.fixture_number = rm.fixture_number
order by rm.fixture_number, rm.external_key;

-- ── Apply ─────────────────────────────────────────────────────────────────────
begin;

with kickoffs (match_number, match_time_utc) as (
  values
    (73, '2026-06-28 19:00:00+00'::timestamptz),
    (74, '2026-06-29 20:30:00+00'::timestamptz),
    (75, '2026-06-30 00:00:00+00'::timestamptz),
    (76, '2026-06-29 17:00:00+00'::timestamptz),
    (77, '2026-06-30 21:00:00+00'::timestamptz),
    (78, '2026-06-30 17:00:00+00'::timestamptz),
    (79, '2026-07-01 00:00:00+00'::timestamptz),
    (80, '2026-07-01 16:00:00+00'::timestamptz),
    (81, '2026-07-02 00:00:00+00'::timestamptz),
    (82, '2026-07-01 20:00:00+00'::timestamptz),
    (83, '2026-07-02 23:00:00+00'::timestamptz),
    (84, '2026-07-02 19:00:00+00'::timestamptz),
    (85, '2026-07-03 03:00:00+00'::timestamptz),
    (86, '2026-07-03 22:00:00+00'::timestamptz),
    (87, '2026-07-04 01:30:00+00'::timestamptz),
    (88, '2026-07-03 18:00:00+00'::timestamptz)
),
predicted_fixtures as (
  select distinct coalesce(
    m.match_number,
    nullif(substring(m.external_key from 'M([0-9]+)$'), '')::int
  ) as fixture_number
  from public.predictions p
  join public.matches m on m.id = p.match_id
  where m.match_number between 73 and 88
     or m.external_key ~ '^WC26-M(7[3-9]|8[0-8])$'
     or m.external_key ~ '^wc2026:m(7[3-9]|8[0-8])$'
)
update public.matches m
set
  match_time_utc = k.match_time_utc,
  updated_at = now()
from kickoffs k
where (
    m.match_number = k.match_number
    or m.external_key = 'WC26-M' || k.match_number::text
    or m.external_key = 'wc2026:m' || k.match_number::text
  )
  and not exists (
    select 1
    from predicted_fixtures pf
    where pf.fixture_number = k.match_number
  )
  and m.match_time_utc is distinct from k.match_time_utc;

-- Rows changed in this transaction (re-run preview above to confirm skipped fixtures).
select
  m.match_number,
  m.external_key,
  m.home_team || ' vs ' || m.away_team as fixture,
  m.match_time_utc
from public.matches m
where m.match_number between 73 and 88
   or m.external_key ~ '^WC26-M(7[3-9]|8[0-8])$'
order by m.match_time_utc, m.match_number;

commit;

-- ── Verify (June 29 order: M76 Brazil–Japan first at 17:00 UTC) ───────────────
select
  match_number,
  external_key,
  home_team,
  away_team,
  match_time_utc,
  tournament_stage
from public.matches
where match_number between 73 and 88
   or external_key ~ '^WC26-M(7[3-9]|8[0-8])$'
order by match_time_utc, match_number;
