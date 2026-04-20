-- One-time legacy alias step: new signups must complete claim or skip before app routes.
-- Existing profiles default to completed = true; handle_new_user sets false for new rows.

alter table public.profiles
  add column if not exists legacy_alias_onboarding_completed boolean not null default true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, legacy_alias_onboarding_completed)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    false
  );
  return new;
end;
$$;
