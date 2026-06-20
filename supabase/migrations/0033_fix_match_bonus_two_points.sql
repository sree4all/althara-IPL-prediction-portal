-- M31 match bonus must be +2, not a mis-set scoring_config value (e.g. 22).

update public.scoring_config
set match_bonus_points = 2,
    updated_at = now()
where season_year = 2026
  and match_bonus_points is distinct from 2;
