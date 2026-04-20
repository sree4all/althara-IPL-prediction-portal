-- Mega Bonus: 9 tournament questions with fixed options and scoring for 2026

alter table public.tournament_questions
  drop constraint if exists tournament_questions_slot_no_check;

alter table public.tournament_questions
  drop constraint if exists slot_no_check;

alter table public.tournament_questions
  add constraint tournament_questions_slot_no_check
  check (slot_no between 1 and 9);

update public.scoring_config
set tournament_slot_points = '[2,2,2,2,3,3,5,3,3]'::jsonb,
    updated_at = now()
where season_year = 2026;

alter table public.scoring_config
  alter column tournament_slot_points
  set default '[2,2,2,2,3,3,5,3,3]'::jsonb;

insert into public.tournament_questions (
  season_year,
  slot_no,
  question_text,
  is_active,
  display_order,
  updated_at
)
values
  (2026, 1, 'Name one team that will finish in the Top 4.', true, 1, now()),
  (2026, 2, 'Name a second team that will finish in the Top 4.', true, 2, now()),
  (2026, 3, 'Name a third team that will finish in the Top 4.', true, 3, now()),
  (2026, 4, 'Name a fourth team that will finish in the Top 4.', true, 4, now()),
  (2026, 5, 'Name the first finalist', true, 5, now()),
  (2026, 6, 'Name the second finalist', true, 6, now()),
  (2026, 7, 'Name the IPL 2026 Winner', true, 7, now()),
  (2026, 8, 'Name the Orange Cap Winner of the Tournament', true, 8, now()),
  (2026, 9, 'Name the Purple Cap Winner of the Tournament', true, 9, now())
on conflict (season_year, slot_no)
do update set
  question_text = excluded.question_text,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  updated_at = now();

update public.tournament_questions
set is_active = false,
    updated_at = now()
where season_year = 2026
  and slot_no > 9;

delete from public.tournament_question_options tqo
using public.tournament_questions tq
where tq.id = tqo.question_id
  and tq.season_year = 2026
  and tq.slot_no between 1 and 9;

insert into public.tournament_question_options (question_id, label, value, sort_order, updated_at)
select tq.id, x.label, x.value, x.sort_order, now()
from public.tournament_questions tq
join (
  values
    (1, 'CSK', 'CSK', 0),
    (1, 'DC', 'DC', 1),
    (1, 'GT', 'GT', 2),
    (1, 'KKR', 'KKR', 3),
    (1, 'LSG', 'LSG', 4),
    (1, 'MI', 'MI', 5),
    (1, 'PBKS', 'PBKS', 6),
    (1, 'RCB', 'RCB', 7),
    (1, 'RR', 'RR', 8),
    (1, 'SRH', 'SRH', 9),
    (2, 'CSK', 'CSK', 0),
    (2, 'DC', 'DC', 1),
    (2, 'GT', 'GT', 2),
    (2, 'KKR', 'KKR', 3),
    (2, 'LSG', 'LSG', 4),
    (2, 'MI', 'MI', 5),
    (2, 'PBKS', 'PBKS', 6),
    (2, 'RCB', 'RCB', 7),
    (2, 'RR', 'RR', 8),
    (2, 'SRH', 'SRH', 9),
    (3, 'CSK', 'CSK', 0),
    (3, 'DC', 'DC', 1),
    (3, 'GT', 'GT', 2),
    (3, 'KKR', 'KKR', 3),
    (3, 'LSG', 'LSG', 4),
    (3, 'MI', 'MI', 5),
    (3, 'PBKS', 'PBKS', 6),
    (3, 'RCB', 'RCB', 7),
    (3, 'RR', 'RR', 8),
    (3, 'SRH', 'SRH', 9),
    (4, 'CSK', 'CSK', 0),
    (4, 'DC', 'DC', 1),
    (4, 'GT', 'GT', 2),
    (4, 'KKR', 'KKR', 3),
    (4, 'LSG', 'LSG', 4),
    (4, 'MI', 'MI', 5),
    (4, 'PBKS', 'PBKS', 6),
    (4, 'RCB', 'RCB', 7),
    (4, 'RR', 'RR', 8),
    (4, 'SRH', 'SRH', 9),
    (5, 'CSK', 'CSK', 0),
    (5, 'DC', 'DC', 1),
    (5, 'GT', 'GT', 2),
    (5, 'KKR', 'KKR', 3),
    (5, 'LSG', 'LSG', 4),
    (5, 'MI', 'MI', 5),
    (5, 'PBKS', 'PBKS', 6),
    (5, 'RCB', 'RCB', 7),
    (5, 'RR', 'RR', 8),
    (5, 'SRH', 'SRH', 9),
    (6, 'CSK', 'CSK', 0),
    (6, 'DC', 'DC', 1),
    (6, 'GT', 'GT', 2),
    (6, 'KKR', 'KKR', 3),
    (6, 'LSG', 'LSG', 4),
    (6, 'MI', 'MI', 5),
    (6, 'PBKS', 'PBKS', 6),
    (6, 'RCB', 'RCB', 7),
    (6, 'RR', 'RR', 8),
    (6, 'SRH', 'SRH', 9),
    (7, 'CSK', 'CSK', 0),
    (7, 'DC', 'DC', 1),
    (7, 'GT', 'GT', 2),
    (7, 'KKR', 'KKR', 3),
    (7, 'LSG', 'LSG', 4),
    (7, 'MI', 'MI', 5),
    (7, 'PBKS', 'PBKS', 6),
    (7, 'RCB', 'RCB', 7),
    (7, 'RR', 'RR', 8),
    (7, 'SRH', 'SRH', 9),
    (8, 'Shubhman Gill', 'Shubhman Gill', 0),
    (8, 'Virat Kohli', 'Virat Kohli', 1),
    (8, 'Vaibhav Sooryavansi', 'Vaibhav Sooryavansi', 2),
    (8, 'Rajat Patidar', 'Rajat Patidar', 3),
    (8, 'Shreyas Iyer', 'Shreyas Iyer', 4),
    (8, 'Yashasvi Jaiswal', 'Yashasvi Jaiswal', 5),
    (8, 'Ishan Kishan', 'Ishan Kishan', 6),
    (8, 'Priyansh Arya', 'Priyansh Arya', 7),
    (8, 'Prabhsimran Singh', 'Prabhsimran Singh', 8),
    (8, 'None of the above', 'None of the above', 9),
    (9, 'Anshul Kamboj', 'Anshul Kamboj', 0),
    (9, 'Prince Yadav', 'Prince Yadav', 1),
    (9, 'Prasidh Krishna', 'Prasidh Krishna', 2),
    (9, 'Bhuveneshwar Kumar', 'Bhuveneshwar Kumar', 3),
    (9, 'Joffra Archer', 'Joffra Archer', 4),
    (9, 'krunal Pandya', 'krunal Pandya', 5),
    (9, 'Kartik Tyagi', 'Kartik Tyagi', 6),
    (9, 'Jamie Overton', 'Jamie Overton', 7),
    (9, 'Ravi Bishnoi', 'Ravi Bishnoi', 8),
    (9, 'None of the above', 'None of the above', 9)
) as x(slot_no, label, value, sort_order)
  on x.slot_no = tq.slot_no
where tq.season_year = 2026;
