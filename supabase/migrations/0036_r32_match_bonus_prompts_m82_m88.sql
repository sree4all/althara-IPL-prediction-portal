-- Round of 32 match bonus prompts: M82, M84, M86, M88 (July 1–3, 2026).
-- Scoring uses platform default +2 / 0 via MATCH_BONUS_POINTS.

-- Replace any existing match-scoped bonus prompts on these fixtures.
delete from public.bonus_prompts bp
using public.matches m
where bp.match_id = m.id
  and bp.scope = 'match'
  and (
    m.match_number in (82, 84, 86, 88)
    or m.external_key in (
      'WC26-M82', 'WC26-M84', 'WC26-M86', 'WC26-M88',
      'wc2026:m82', 'wc2026:m84', 'wc2026:m86', 'wc2026:m88',
      'M82', 'M84', 'M86', 'M88'
    )
  );

with fixtures as (
  select distinct on (nums.n)
    nums.n as match_number,
    m.id as match_id
  from (
    values (82), (84), (86), (88)
  ) as nums(n)
  join public.matches m
    on m.match_number = nums.n
    or m.external_key in (
      'WC26-M' || nums.n::text,
      'wc2026:m' || nums.n::text,
      'M' || nums.n::text
    )
  order by
    nums.n,
    case
      when m.external_key = 'WC26-M' || nums.n::text then 0
      when m.external_key ~ '^WC26-M' then 1
      else 2
    end
),
defs (match_number, prompt_key, prompt_text) as (
  values
    (82, 'm82_bonus_qn', 'Does Belgium score first?'),
    (84, 'm84_bonus_qn', 'Does Spain have 60%+ possession?'),
    (86, 'm86_bonus_qn', 'Does Messi get a goal or assist?'),
    (88, 'm88_bonus_qn', 'Does the match need extra time or penalties?')
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
    d.prompt_key,
    d.prompt_text,
    true,
    0,
    'single_choice',
    now()
  from fixtures f
  join defs d on d.match_number = f.match_number
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
