alter table public.tournament_config
  add column if not exists mega_bonus_all_answers_visible boolean not null default false;

comment on column public.tournament_config.mega_bonus_all_answers_visible is
  'When true, any signed-in user can open the All player answers tab for Mega Bonus slot picks.';
