-- Replace expression unique index with partial unique indexes so PostgREST upserts can target stable columns.

drop index if exists public.prediction_bonus_answers_unique_idx;

create unique index if not exists prediction_bonus_answers_user_prompt_tourney
  on public.prediction_bonus_answers (user_id, prompt_id)
  where match_id is null;

create unique index if not exists prediction_bonus_answers_user_prompt_match
  on public.prediction_bonus_answers (user_id, prompt_id, match_id)
  where match_id is not null;
