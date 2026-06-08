-- Run in Supabase SQL Editor if new signups fail with
-- "Database error saving new user" after migration 0027.
-- Then apply migration 0030_fixup_handle_new_user_after_fifa_reset.sql on all envs.

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
