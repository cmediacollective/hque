-- Multi-company Phase 2: the switcher's two server functions.
--
--   • my_organizations()  — returns every company the current user belongs to
--     (id, name, role, and which one is active), so the app can draw the list.
--   • switch_org(p_org_id) — flips the user's ACTIVE company to another one they
--     belong to, updating profiles.org_id + role atomically. Refuses any org the
--     user is not a member of, so this can never be used to peek into a company
--     you weren't invited to.
--
-- Both are SECURITY DEFINER so they can read org names / write the profile
-- pointer regardless of table RLS. Neither changes any existing behavior on its
-- own — nothing calls them until the switcher UI ships alongside this.
--
-- NOTE: this project applies DB rules in the Supabase dashboard, not via auto
-- migrations. Paste this into the Supabase SQL Editor and Run it once.
-- Safe to re-run (create or replace).

-- ── List the current user's companies ────────────────────────────────────────
create or replace function public.my_organizations()
returns table (org_id uuid, name text, role text, is_active boolean)
language sql
security definer
set search_path = ''
stable
as $$
  select m.org_id,
         coalesce(o.name, 'Untitled')            as name,
         m.role,
         (m.org_id = p.org_id)                   as is_active
  from public.org_members m
  join public.organizations o on o.id = m.org_id
  join public.profiles p      on p.id = auth.uid()
  where m.user_id = auth.uid()
    and o.deleted_at is null          -- hide closed/purged companies
  order by lower(coalesce(o.name, 'Untitled'));
$$;

revoke all on function public.my_organizations() from public;
grant execute on function public.my_organizations() to authenticated;

-- ── Switch the active company ────────────────────────────────────────────────
create or replace function public.switch_org(p_org_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Must be a real member of the target company — otherwise refuse.
  select role into v_role
  from public.org_members
  where user_id = v_uid and org_id = p_org_id;

  if v_role is null then
    raise exception 'You are not a member of that organization';
  end if;

  -- Active company + role always mirror the membership row we just verified.
  update public.profiles
  set org_id = p_org_id, role = v_role
  where id = v_uid;

  return p_org_id;
end;
$$;

revoke all on function public.switch_org(uuid) from public;
grant execute on function public.switch_org(uuid) to authenticated;
