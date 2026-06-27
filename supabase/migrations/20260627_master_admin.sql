-- =====================================================================
-- Master Admin model
-- The roadmap's incoming-request queue + management is controlled by ONE
-- master admin (HQue's creator, Cherie) — not by customer owners/admins.
-- is_platform_admin() = "is the current user a master admin" = membership in
-- the platform_admins table. (Reverts the earlier C-Media-owners broadening.)
--
-- Everyone else only ever reads the curated public roadmap via
-- get_public_updates(), so they still get a read-only Product Updates view.
-- =====================================================================

create or replace function is_platform_admin()
returns boolean
language sql security definer stable
as $$
  select exists (select 1 from platform_admins pa where pa.user_id = auth.uid())
$$;

drop policy if exists "platform admins manage product_updates" on product_updates;
create policy "platform admins manage product_updates"
  on product_updates for all
  using (is_platform_admin())
  with check (is_platform_admin());
