-- Flat +2 points for all tournament bonus slots (Mega Bonus Q1-Q9).

update public.scoring_config
set tournament_slot_points = '[2,2,2,2,2,2,2,2,2]'::jsonb,
    updated_at = now()
where season_year = 2026;

alter table public.scoring_config
  alter column tournament_slot_points
  set default '[2,2,2,2,2,2,2,2,2]'::jsonb;
