alter table public.tournament_config
  add column if not exists maintenance_mode boolean not null default false,
  add column if not exists maintenance_banner_text text not null default 'അടിമ പണിയിലാണ്';
