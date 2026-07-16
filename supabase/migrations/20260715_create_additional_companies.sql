-- Multi-company Phase 4: let owners create ADDITIONAL companies, with the
-- lifetime/comped exception.
--
-- Change to create_organization:
--   • Drops the old "one workspace per user" guard so an existing owner can
--     spin up another company (each new company starts its own trial and pays
--     its own way — all billing columns stay at their table defaults).
--   • Adds the exception: if the caller already OWNS a lifetime/comped company
--     (organizations.is_lifetime = true), they cannot create more — that single
--     deal covers one company. They can still be invited into / join others.
--   • Still records the owner membership and lands the creator in the new company.
--
-- Also: my_organizations() now returns is_lifetime, so the app can hide the
-- "Add a company" button for lifetime/comped owners.
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

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
    raise exception 'Company name is required';
  end if;

  -- Lifetime/comped exception: a lifetime deal covers the ONE company you own.
  -- Owners of a lifetime/comped company can join others, but can't create more.
  if exists (
    select 1
    from public.org_members m
    join public.organizations o on o.id = m.org_id
    where m.user_id = v_uid and m.role = 'owner' and o.is_lifetime = true
  ) then
    raise exception 'Your lifetime plan covers one company. Creating additional companies isn''t available on this plan.';
  end if;

  v_slug := left(regexp_replace(lower(p_name), '[^a-z0-9]', '', 'g'), 20)
            || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);

  insert into public.organizations (name, slug)
  values (p_name, v_slug)
  returning id into v_org_id;

  insert into public.org_settings (org_id, agency_name)
  values (v_org_id, p_name);

  -- Land the creator in the new company as its owner (active pointer + membership).
  update public.profiles
  set org_id = v_org_id, role = 'owner'
  where id = v_uid;

  insert into public.org_members (user_id, org_id, role)
  values (v_uid, v_org_id, 'owner')
  on conflict (user_id, org_id) do update set role = 'owner';

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;

-- my_organizations() + is_lifetime so the app can gate the create button.
-- Drop first: adding an OUT column changes the return type, which
-- create-or-replace can't do.
drop function if exists public.my_organizations();
create or replace function public.my_organizations()
returns table (org_id uuid, name text, role text, is_active boolean, is_lifetime boolean)
language sql
security definer
set search_path = ''
stable
as $function$
  select m.org_id,
         coalesce(o.name, 'Untitled')  as name,
         m.role,
         (m.org_id = p.org_id)         as is_active,
         coalesce(o.is_lifetime, false) as is_lifetime
  from public.org_members m
  join public.organizations o on o.id = m.org_id
  join public.profiles p      on p.id = auth.uid()
  where m.user_id = auth.uid()
    and o.deleted_at is null
  order by lower(coalesce(o.name, 'Untitled'));
$function$;

revoke all on function public.my_organizations() from public;
grant execute on function public.my_organizations() to authenticated;
