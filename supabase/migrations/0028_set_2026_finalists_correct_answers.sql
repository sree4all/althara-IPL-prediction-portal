-- Ensure 2026 Mega Bonus Q5-Q6 use the shared finalists answer set for scoring.
-- Each slot awards 3 points when the player picks RCB or RR (deduped per user).

update public.tournament_questions
set correct_answer = 'RCB
RR',
    updated_at = now()
where season_year = 2026
  and slot_no between 5 and 6;
