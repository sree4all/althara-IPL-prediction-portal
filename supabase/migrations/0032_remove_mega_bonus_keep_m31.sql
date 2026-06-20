-- FIFA 2026: remove season-long Mega Bonus; keep only match bonus m31_bonus_qn.

-- Drop tournament-question points from the ledger.
delete from public.points_ledger
where source_type = 'tournament_question';

-- Drop bonus ledger rows tied to prompts we are about to remove.
delete from public.points_ledger pl
using public.bonus_prompts bp
where pl.source_type = 'bonus'
  and pl.reason = 'match_bonus:' || bp.id::text
  and bp.prompt_key <> 'm31_bonus_qn';

-- Legacy single bonus rows on matches that are not M31.
delete from public.points_ledger pl
using public.matches m
where pl.source_type = 'bonus'
  and pl.reason = 'match_bonus'
  and pl.source_id = m.id
  and coalesce(m.external_key, '') not ilike '%M31%';

-- Player answers for removed prompts.
delete from public.prediction_bonus_answers pba
using public.bonus_prompts bp
where pba.prompt_id = bp.id
  and bp.prompt_key <> 'm31_bonus_qn';

delete from public.bonus_prompt_options bpo
using public.bonus_prompts bp
where bpo.prompt_id = bp.id
  and bp.prompt_key <> 'm31_bonus_qn';

delete from public.bonus_prompts
where prompt_key <> 'm31_bonus_qn';

-- Mega Bonus tables (season-long questions).
delete from public.tournament_answers;
delete from public.tournament_question_options;
delete from public.tournament_questions;

-- Rebuild cached totals from the ledger.
update public.profiles p
set current_points = coalesce((
      select sum(pl.points_delta)
      from public.points_ledger pl
      where pl.user_id = p.id
    ), 0),
    updated_at = now();
