-- Ensure 2026 Mega Bonus Q1-Q4 use the shared Top 4 answer set for scoring.
-- Each of the first four slots awards its own 2 points when the player answer is
-- any one of these teams.

update public.tournament_questions
set correct_answer = 'RCB
RR
GT
SRH',
    updated_at = now()
where season_year = 2026
  and slot_no between 1 and 4;
