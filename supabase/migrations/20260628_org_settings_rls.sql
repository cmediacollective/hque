-- Lock down org_settings at the database level:
--   • any member of an org can READ its settings (so the app shows Agency Info)
--   • only OWNERS / ADMINS of that org can INSERT / UPDATE / DELETE
--
-- This backs up the app-level edit lock with real enforcement, so a member
-- can't bypass the UI and write directly. The create_organization RPC inserts
-- org_settings as SECURITY DEFINER, so onboarding is unaffected; server-side
-- jobs use the service role, which bypasses RLS.
--
-- NOTE: this project applies RLS in the Supabase dashboard, not via automatic
-- migrations. Paste this into the Supabase SQL Editor and Run it once.

alter table public.org_settings enable row level security;

-- READ: any authenticated user in the same org
drop policy if exists "org members read org_settings" on public.org_settings;
create policy "org members read org_settings"
  on public.org_settings for select
  using (
    org_id in (select p.org_id from public.profiles p where p.id = auth.uid())
  );

-- WRITE (insert / update / delete): owners and admins only
drop policy if exists "owners admins write org_settings" on public.org_settings;
create policy "owners admins write org_settings"
  on public.org_settings for all
  using (
    org_id in (
      select p.org_id from public.profiles p
      where p.id = auth.uid() and p.role in ('owner','admin')
    )
  )
  with check (
    org_id in (
      select p.org_id from public.profiles p
      where p.id = auth.uid() and p.role in ('owner','admin')
    )
  );
