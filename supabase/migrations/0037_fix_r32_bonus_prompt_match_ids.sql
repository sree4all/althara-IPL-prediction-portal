-- Fix R32 bonus prompts linked to wrong matches when match_number / external_key disagree
-- (e.g. m86_bonus_qn on Colombia vs Ghana instead of Argentina vs Cabo Verde).

with defs (home_team, away_team, prompt_key) as (
  values
    ('Belgium', 'Senegal', 'm82_bonus_qn'),
    ('Spain', 'Austria', 'm84_bonus_qn'),
    ('Argentina', 'Cabo Verde', 'm86_bonus_qn'),
    ('Australia', 'Egypt', 'm88_bonus_qn')
),
fixtures as (
  select distinct on (d.prompt_key)
    d.prompt_key,
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
)
update public.bonus_prompts bp
set
  match_id = f.match_id,
  updated_at = now()
from fixtures f
where bp.prompt_key = f.prompt_key
  and bp.match_id is distinct from f.match_id;

-- Re-point any answers submitted on the wrong match row.
update public.prediction_bonus_answers pba
set
  match_id = bp.match_id,
  updated_at = now()
from public.bonus_prompts bp
where pba.prompt_id = bp.id
  and bp.prompt_key in ('m82_bonus_qn', 'm84_bonus_qn', 'm86_bonus_qn', 'm88_bonus_qn')
  and pba.match_id is distinct from bp.match_id;
