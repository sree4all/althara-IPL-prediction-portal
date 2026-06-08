-- Migration 0027 dropped legacy_alias_onboarding_completed but handle_new_user still
-- inserted it (from 0011), breaking new signups with "Database error saving new user".

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  );
  return new;
end;
$$;
