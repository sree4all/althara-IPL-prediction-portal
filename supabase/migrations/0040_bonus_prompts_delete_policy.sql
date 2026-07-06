-- Allow admins to delete bonus prompts (cascades to options and participant answers).

create policy "bonus_prompts_delete_admin"
  on public.bonus_prompts for delete
  to authenticated
  using ((select role from public.profiles p where p.id = auth.uid()) = 'admin');
