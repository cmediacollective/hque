-- =====================================================================
-- Let OWNERS and ADMINS of the platform org (C Media) manage the roadmap,
-- not just the single seeded platform admin.
--
-- Still safely scoped: access requires being an owner/admin AND being in the
-- same organization as a seeded platform admin (i.e. C Media). Owners/admins of
-- *customer* accounts can never edit the company-wide roadmap. Members never can.
-- =====================================================================

create or replace function is_platform_admin()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1
    from profiles me
    where me.id = auth.uid()
      and me.role in ('owner', 'admin')
      and me.org_id in (
        select p.org_id
        from profiles p
        join platform_admins pa on pa.user_id = p.id
      )
  )
$$;

-- The table's write policy uses the same rule, so these users can manage items.
drop policy if exists "platform admins manage product_updates" on product_updates;
create policy "platform admins manage product_updates"
  on product_updates for all
  using (is_platform_admin())
  with check (is_platform_admin());
