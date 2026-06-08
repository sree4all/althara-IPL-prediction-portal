-- Operator-only competition reset (FR-005). Preserves profiles; wipes game data.
-- Run during maintenance window with DB backup. NOT exposed in admin UI.

begin;

truncate table public.prediction_bonus_answers cascade;
truncate table public.predictions cascade;
truncate table public.points_ledger cascade;
truncate table public.tournament_answers cascade;
truncate table public.tournament_question_options cascade;
truncate table public.tournament_questions cascade;
truncate table public.bonus_prompt_options cascade;
truncate table public.bonus_prompts cascade;
truncate table public.matches cascade;
truncate table public.import_batches cascade;

update public.profiles
set current_points = 0,
    rank = null,
    updated_at = now();

commit;
