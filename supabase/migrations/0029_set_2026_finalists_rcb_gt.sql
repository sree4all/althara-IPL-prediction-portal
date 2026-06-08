-- Finalists Q5-Q6: correct teams are RCB and GT (not RR).

update public.tournament_questions
set correct_answer = 'RCB
GT',
    updated_at = now()
where season_year = 2026
  and slot_no between 5 and 6;
