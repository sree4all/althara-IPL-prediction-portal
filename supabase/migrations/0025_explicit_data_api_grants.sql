-- Explicit Data API grants for all public tables (Supabase rollout: Oct 2026 on existing projects).
-- RLS policies remain the access control layer; grants allow PostgREST / supabase-js roles to reach tables.

do $$
declare
  t text;
  tables text[] := array[
    'profiles',
    'matches',
    'predictions',
    'import_batches',
    'tournament_config',
    'tournament_questions',
    'tournament_answers',
    'bonus_prompts',
    'prediction_bonus_answers',
    'legacy_aliases',
    'points_ledger',
    'scoring_config',
    'legacy_prediction_staging',
    'bonus_prompt_options',
    'tournament_question_options',
    'legacy_prediction_exclusions'
  ];
begin
  foreach t in array tables loop
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated',
      t
    );
    execute format(
      'grant select, insert, update, delete on public.%I to service_role',
      t
    );
  end loop;
end;
$$;
