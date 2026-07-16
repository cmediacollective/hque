-- Multi-company Phase 3b: make the Team page read/write the membership list.
--
-- The roster used to be "profiles where org_id = this org" — which misses any
-- member whose ACTIVE company is elsewhere (a stacked member). These functions
-- move team management onto org_members so an org sees its true roster
-- regardless of where each member is currently working.
--
--   • org_team(org)                     — the roster (any member may read)
--   • set_member_role(org, user, role)  — owners/admins only; never the owner
--   • remove_member(org, user)          — owners/admins only; never the owner;
--                                         re-homes the member's active company
--   • enforce_seat_limit (updated)      — counts memberships, not profiles
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

-- Safety re-backfill: catch any account attached to an org that predates the
-- membership list (e.g. invited between Phase 1 and Phase 3). Idempotent.
insert into public.org_members (user_id, org_id, role)
select id, org_id, coalesce(role, 'member')
from public.profiles
where org_id is not null
on conflict (user_id, org_id) do nothing;

-- ── Roster ───────────────────────────────────────────────────────────────────
create or replace function public.org_team(p_org_id uuid)
returns table (id uuid, email text, full_name text, title text, avatar_url text, role text, created_at timestamptz)
language sql
security definer
set search_path = 'public'
stable
as $function$
  select p.id, p.email, p.full_name, p.title, p.avatar_url, m.role, m.created_at
  from org_members m
  join profiles p on p.id = m.user_id
  where m.org_id = p_org_id
    -- caller must themselves be a member of this org
    and exists (select 1 from org_members me where me.org_id = p_org_id and me.user_id = auth.uid())
  order by m.created_at asc;
$function$;

revoke all on function public.org_team(uuid) from public;
grant execute on function public.org_team(uuid) to authenticated;

-- ── Change a member's role ───────────────────────────────────────────────────
create or replace function public.set_member_role(p_org_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_caller_role text;
begin
  if p_role not in ('admin','member') then
    raise exception 'Role must be admin or member';
  end if;

  select role into v_caller_role from org_members
  where org_id = p_org_id and user_id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('owner','admin') then
    raise exception 'Only owners and admins can change roles';
  end if;

  if exists (select 1 from org_members where org_id = p_org_id and user_id = p_user_id and role = 'owner') then
    raise exception 'The owner''s role cannot be changed here';
  end if;

  update org_members set role = p_role
  where org_id = p_org_id and user_id = p_user_id;

  -- If this org is the member's ACTIVE company, mirror the role to their profile
  -- so their live permissions update immediately.
  update profiles set role = p_role
  where id = p_user_id and org_id = p_org_id;
end;
$function$;

revoke all on function public.set_member_role(uuid, uuid, text) from public;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

-- ── Remove a member from an org ──────────────────────────────────────────────
create or replace function public.remove_member(p_org_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_caller_role text;
  v_email       text;
  v_next        uuid;
  v_next_role   text;
begin
  select role into v_caller_role from org_members
  where org_id = p_org_id and user_id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('owner','admin') then
    raise exception 'Only owners and admins can remove members';
  end if;

  if exists (select 1 from org_members where org_id = p_org_id and user_id = p_user_id and role = 'owner') then
    raise exception 'The owner cannot be removed. Transfer ownership first.';
  end if;

  -- Drop the membership.
  delete from org_members where org_id = p_org_id and user_id = p_user_id;

  -- Clear any pending invites for them in this org.
  select email into v_email from profiles where id = p_user_id;
  if v_email is not null then
    delete from invitations where org_id = p_org_id and lower(email) = lower(v_email);
  end if;

  -- If they were actively viewing this org, move them to another company they
  -- still belong to (or clear it if none remain).
  if exists (select 1 from profiles where id = p_user_id and org_id = p_org_id) then
    select org_id, role into v_next, v_next_role
    from org_members where user_id = p_user_id
    order by created_at asc limit 1;
    update profiles set org_id = v_next, role = coalesce(v_next_role, 'member')
    where id = p_user_id;
  end if;
end;
$function$;

revoke all on function public.remove_member(uuid, uuid) from public;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

-- ── Seat limit now counts memberships, not profiles ──────────────────────────
create or replace function enforce_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan  text;
  v_limit int;
  v_used  int;
begin
  select stripe_plan into v_plan from public.organizations where id = NEW.org_id;
  v_limit := case v_plan when 'starter' then 2 when 'pro' then 5 else null end;  -- null = unlimited
  if v_limit is null then
    return NEW;
  end if;

  -- Seats used = current members (memberships) + outstanding (unaccepted) invites.
  select (select count(*) from public.org_members where org_id = NEW.org_id)
       + (select count(*) from public.invitations where org_id = NEW.org_id and accepted_at is null)
    into v_used;

  if v_used >= v_limit then
    raise exception 'Team seat limit reached for your plan (% max). Upgrade to add more.', v_limit
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;
