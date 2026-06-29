-- Round of 32 match bonus prompts: M82, M84, M86, M88 (July 1–3, 2026).
-- Scoring uses platform default +2 / 0 via MATCH_BONUS_POINTS.
-- Fixtures resolved by team pairing (not match_number / external_key — those can disagree).

delete from public.bonus_prompts
where prompt_key in ('m82_bonus_qn', 'm84_bonus_qn', 'm86_bonus_qn', 'm88_bonus_qn');

with defs (home_team, away_team, prompt_key, prompt_text) as (
  values
    ('Belgium', 'Senegal', 'm82_bonus_qn', 'Does Belgium score first?'),
    ('Spain', 'Austria', 'm84_bonus_qn', 'Does Spain have 60%+ possession?'),
    ('Argentina', 'Cabo Verde', 'm86_bonus_qn', 'Does Messi get a goal or assist?'),
    ('Australia', 'Egypt', 'm88_bonus_qn', 'Does the match need extra time or penalties?')
),
fixtures as (
  select distinct on (d.prompt_key)
    d.prompt_key,
    d.prompt_text,
    m.id as match_id
  from defs d
  join public.matches m
    on trim(m.home_team) = d.home_team
    and (
      trim(m.away_team) = d.away_team
      or (d.home_team = 'Argentina' and trim(m.away_team) in ('Cabo Verde', 'Cape Verde'))
    )
  order by
    d.prompt_key,
    case
      when m.external_key ~ '^WC26-M\d+$' then 0
      when m.external_key ~ '^wc2026:m' then 1
      else 2
    end,
    case when m.match_number is not null then 0 else 1 end
),
inserted as (
  insert into public.bonus_prompts (
    season_year,
    scope,
    match_id,
    prompt_key,
    prompt_text,
    is_active,
    display_order,
    input_type,
    updated_at
  )
  select
    2026,
    'match',
    f.match_id,
    f.prompt_key,
    f.prompt_text,
    true,
    0,
    'single_choice',
    now()
  from fixtures f
  returning id
)
insert into public.bonus_prompt_options (prompt_id, label, value, sort_order, updated_at)
select i.id, o.label, o.value, o.sort_order, now()
from inserted i
cross join (
  values
    ('Yes', 'A', 0),
    ('No', 'B', 1)
) as o(label, value, sort_order);
