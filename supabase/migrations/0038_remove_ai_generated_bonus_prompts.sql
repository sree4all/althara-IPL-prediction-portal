-- Remove AI-generated match bonus prompts (including ones mistakenly created for completed fixtures).

delete from public.points_ledger pl
using public.bonus_prompts bp
where pl.source_type = 'bonus'
  and pl.reason = 'match_bonus:' || bp.id::text
  and (bp.source = 'ai_generated' or bp.prompt_key ~ '^ai_m');

delete from public.points_ledger pl
using public.bonus_prompts bp
join public.matches m on m.id = bp.match_id
where pl.source_type = 'bonus'
  and pl.reason = 'match_bonus'
  and pl.source_id = m.id
  and (bp.source = 'ai_generated' or bp.prompt_key ~ '^ai_m');

delete from public.prediction_bonus_answers pba
using public.bonus_prompts bp
where pba.prompt_id = bp.id
  and (bp.source = 'ai_generated' or bp.prompt_key ~ '^ai_m');

delete from public.bonus_prompt_options bpo
using public.bonus_prompts bp
where bpo.prompt_id = bp.id
  and (bp.source = 'ai_generated' or bp.prompt_key ~ '^ai_m');

delete from public.bonus_prompts
where source = 'ai_generated'
   or prompt_key ~ '^ai_m';

update public.profiles p
set current_points = coalesce((
      select sum(pl.points_delta)
      from public.points_ledger pl
      where pl.user_id = p.id
    ), 0),
    updated_at = now();
