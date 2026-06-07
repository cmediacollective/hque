-- create_organization: lets a newly signed-up user create their first workspace.
--
-- WHY: the organizations table has RLS enabled (since June 2) with no INSERT
-- policy, so the old client-side insert in Onboarding.jsx fails with "new row
-- violates row-level security policy". This SECURITY DEFINER function runs with
-- elevated rights and performs ALL THREE signup writes (org, org_settings, and
-- the profile link) in one atomic step — so RLS on any of those tables can no
-- longer half-break signup.
--
-- SECURITY: the function leaves every billing/plan column at its table default
-- (is_lifetime stays false, no Stripe plan, normal trial). A user can therefore
-- NEVER grant themselves lifetime/Pro by crafting a request — the function, not
-- the client, controls exactly which columns get set.
--
-- Does NOT touch the appsumo_codes table or its lockdown in any way.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- Safe to re-run: create or replace + idempotent grants.

create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_org_id uuid;
  v_slug   text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Agency name is required';
  end if;

  -- One workspace per user via this path: if they already belong to an org, stop.
  if exists (select 1 from public.profiles where id = v_uid and org_id is not null) then
    raise exception 'You already belong to an organization';
  end if;

  -- Slug: lowercased alphanumerics of the name + short random suffix for uniqueness.
  v_slug := left(regexp_replace(lower(p_name), '[^a-z0-9]', '', 'g'), 20)
            || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);

  insert into public.organizations (name, slug)
  values (p_name, v_slug)
  returning id into v_org_id;

  insert into public.org_settings (org_id, agency_name)
  values (v_org_id, p_name);

  update public.profiles
  set org_id = v_org_id, role = 'owner'
  where id = v_uid;

  return v_org_id;
end;
$$;

-- Only logged-in users may call it.
revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;
