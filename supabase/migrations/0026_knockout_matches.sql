-- Knockout phase (M71–M74): bracket placeholders, per-stage scoring via knockout_stage column.

alter table public.matches
  add column if not exists knockout_stage text;

alter table public.matches
  drop constraint if exists matches_knockout_stage_check;

alter table public.matches
  add constraint matches_knockout_stage_check
  check (knockout_stage is null or knockout_stage in ('q1', 'eliminator', 'q2', 'final'));

create index if not exists matches_knockout_stage_idx on public.matches (knockout_stage)
  where knockout_stage is not null;

-- Fixture times: 7:30 pm IST on listed dates → 14:00 UTC
insert into public.matches (
  external_key,
  home_team,
  away_team,
  match_time_utc,
  status,
  knockout_stage
)
values
  (
    'M71',
    'Team 1 (set in Admin → Knockout)',
    'Team 2 (set in Admin → Knockout)',
    '2026-05-26T14:00:00.000Z',
    'scheduled',
    'q1'
  ),
  (
    'M72',
    'Team 3 (set in Admin → Knockout)',
    'Team 4 (set in Admin → Knockout)',
    '2026-05-27T14:00:00.000Z',
    'scheduled',
    'eliminator'
  ),
  (
    'M73',
    'Loser of Qualifier 1',
    'Winner of Eliminator',
    '2026-05-29T14:00:00.000Z',
    'scheduled',
    'q2'
  ),
  (
    'M74',
    'Winner of Qualifier 1',
    'Winner of Qualifier 2',
    '2026-05-31T14:00:00.000Z',
    'scheduled',
    'final'
  )
on conflict (external_key) do update set
  knockout_stage = excluded.knockout_stage,
  match_time_utc = excluded.match_time_utc,
  updated_at = now();

-- Only fill placeholder teams when row still has defaults (do not overwrite admin-set names).
update public.matches m
set
  home_team = v.home_team,
  away_team = v.away_team,
  updated_at = now()
from (
  values
    ('M71', 'Team 1 (set in Admin → Knockout)', 'Team 2 (set in Admin → Knockout)'),
    ('M72', 'Team 3 (set in Admin → Knockout)', 'Team 4 (set in Admin → Knockout)'),
    ('M73', 'Loser of Qualifier 1', 'Winner of Eliminator'),
    ('M74', 'Winner of Qualifier 1', 'Winner of Qualifier 2')
) as v (external_key, home_team, away_team)
where m.external_key = v.external_key
  and m.knockout_stage is not null
  and m.status <> 'completed'
  and (
    m.home_team like 'Team % (set in Admin%'
    or m.home_team like 'Loser of%'
    or m.home_team like 'Winner of%'
    or m.away_team like 'Team % (set in Admin%'
    or m.away_team like 'Loser of%'
    or m.away_team like 'Winner of%'
  );
