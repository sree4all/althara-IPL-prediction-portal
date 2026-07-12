-- Knockout match bonus prompts: M101 (SF), M102 (SF), M103 (third place), M104 (final).
-- Two questions per match. M101 already has an AI-generated bonus
-- ("Will there be 3 or more goals in the match?", prompt_key ai_m101_*) which is
-- kept as its first question; only a second one is added here (display_order 1).
-- Scoring uses platform default +2 / 0 via MATCH_BONUS_POINTS.
-- Fixtures resolved by external_key (WC26-M{n}); team names for M102-M104 are
-- still bracket placeholders, so pairing-based resolution is not possible.

delete from public.bonus_prompts
where prompt_key in (
  'm101_bonus_qn2',
  'm102_bonus_qn', 'm102_bonus_qn2',
  'm103_bonus_qn', 'm103_bonus_qn2',
  'm104_bonus_qn', 'm104_bonus_qn2'
);

with defs (external_key, prompt_key, prompt_text, display_order) as (
  values
    -- M101 semi-final: France vs Spain (Q1 is the existing AI prompt)
    ('WC26-M101', 'm101_bonus_qn2', 'Does Kylian Mbappé get a goal or assist?', 1),
    -- M102 semi-final: England vs winner of M100
    ('WC26-M102', 'm102_bonus_qn', 'Does England score first?', 0),
    ('WC26-M102', 'm102_bonus_qn2', 'Will both teams score?', 1),
    -- M103 third-place playoff: teams unknown until semis complete
    ('WC26-M103', 'm103_bonus_qn', 'Will there be 4 or more goals in the match?', 0),
    ('WC26-M103', 'm103_bonus_qn2', 'Will a substitute score a goal?', 1),
    -- M104 final: teams unknown until semis complete
    ('WC26-M104', 'm104_bonus_qn', 'Does the match need extra time or penalties?', 0),
    ('WC26-M104', 'm104_bonus_qn2', 'Is there a goal in the first 30 minutes?', 1)
),
fixtures as (
  select
    d.prompt_key,
    d.prompt_text,
    d.display_order,
    m.id as match_id
  from defs d
  join public.matches m
    on m.external_key = d.external_key
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
    source,
    updated_at
  )
  select
    2026,
    'match',
    f.match_id,
    f.prompt_key,
    f.prompt_text,
    true,
    f.display_order,
    'single_choice',
    'manual',
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
