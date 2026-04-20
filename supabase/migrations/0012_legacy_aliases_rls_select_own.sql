-- Participants could SELECT only unclaimed rows; after a claim the row disappeared from RLS,
-- which broke UPDATE return paths and SECURITY DEFINER RPC joins on legacy_aliases for the invoker.
-- Allow each user to read their own claimed alias row.

drop policy if exists "legacy_aliases_select_own" on public.legacy_aliases;

create policy "legacy_aliases_select_own"
  on public.legacy_aliases for select
  to authenticated
  using (claimed_by_user_id = auth.uid());
