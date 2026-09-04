-- Per-person section access for Members.
--
-- Until now every Member saw every section. This adds a per-membership switch
-- for the three optional sections, decided by an owner or admin:
--
--   Workspace  — always on. Every member gets it; there is no column for it.
--   Campaigns  — optional
--   Talent     — optional
--   Contacts   — optional
--
-- Owners and admins are never limited: they always see everything, whatever
-- these flags say. The flags only govern people whose role is 'member'.
--
--   • org_members.access_campaigns / _talent / _contacts  — the switches
--   • invitations.access_* — so access can be picked when the invite is sent
--   • org_team(org)                                 — now returns the switches
--   • set_member_access(org, user, section, on/off) — owners/admins only
--   • accept_pending_invitations()                  — carries invite → membership
--
-- Existing people are grandfathered: every membership and every outstanding
-- invite that exists when this runs keeps all three sections, so nobody loses
-- access they already had. Only people added AFTER this runs start out with
-- Workspace only.
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run — the column-adding
-- blocks only fire the first time, so a re-run never re-grants access that an
-- admin has since switched off.

-- ── The switches ─────────────────────────────────────────────────────────────
-- Added defaulting to TRUE (so the backfill of existing rows grants what people
-- already had), then the default is flipped to FALSE for everyone added later.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'org_members'
      and column_name = 'access_campaigns'
  ) then
    alter table public.org_members
      add column access_campaigns boolean not null default true,
      add column access_talent    boolean not null default true,
      add column access_contacts  boolean not null default true;
    alter table public.org_members
      alter column access_campaigns set default false,
      alter column access_talent    set default false,
      alter column access_contacts  set default false;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invitations'
      and column_name = 'access_campaigns'
  ) then
    alter table public.invitations
      add column access_campaigns boolean not null default true,
      add column access_talent    boolean not null default true,
      add column access_contacts  boolean not null default true;
    alter table public.invitations
      alter column access_campaigns set default false,
      alter column access_talent    set default false,
      alter column access_contacts  set default false;
  end if;
end $$;

-- ── Roster now carries each person's switches ────────────────────────────────
-- Dropped first because adding output columns changes the return type, which
-- create-or-replace can't do.
drop function if exists public.org_team(uuid);

create or replace function public.org_team(p_org_id uuid)
returns table (
  id uuid, email text, full_name text, title text, avatar_url text, role text,
  created_at timestamptz,
  access_campaigns boolean, access_talent boolean, access_contacts boolean
)
language sql
security definer
set search_path = 'public'
stable
as $function$
  select p.id, p.email, p.full_name, p.title, p.avatar_url, m.role, m.created_at,
         -- Owners and admins always see everything, so report them as fully
         -- open regardless of what their own flags happen to say.
         m.role in ('owner','admin') or m.access_campaigns,
         m.role in ('owner','admin') or m.access_talent,
         m.role in ('owner','admin') or m.access_contacts
  from org_members m
  join profiles p on p.id = m.user_id
  where m.org_id = p_org_id
    -- caller must themselves be a member of this org
    and exists (select 1 from org_members me where me.org_id = p_org_id and me.user_id = auth.uid())
  order by m.created_at asc;
$function$;

revoke all on function public.org_team(uuid) from public;
grant execute on function public.org_team(uuid) to authenticated;

-- ── Turn one section on or off for one person ────────────────────────────────
create or replace function public.set_member_access(
  p_org_id uuid, p_user_id uuid, p_section text, p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_caller_role text;
begin
  if p_section not in ('campaigns','talent','contacts') then
    raise exception 'Section must be campaigns, talent or contacts';
  end if;

  select role into v_caller_role from org_members
  where org_id = p_org_id and user_id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('owner','admin') then
    raise exception 'Only owners and admins can change what a member can see';
  end if;

  -- The owner always has everything; there is nothing to switch off.
  if exists (select 1 from org_members where org_id = p_org_id and user_id = p_user_id and role = 'owner') then
    raise exception 'The owner always has access to every section';
  end if;

  update org_members set
    access_campaigns = case when p_section = 'campaigns' then p_enabled else access_campaigns end,
    access_talent    = case when p_section = 'talent'    then p_enabled else access_talent    end,
    access_contacts  = case when p_section = 'contacts'  then p_enabled else access_contacts  end
  where org_id = p_org_id and user_id = p_user_id;
end;
$function$;

revoke all on function public.set_member_access(uuid, uuid, text, boolean) from public;
grant execute on function public.set_member_access(uuid, uuid, text, boolean) to authenticated;

-- ── Invites carry the chosen access through to the membership ────────────────
create or replace function public.accept_pending_invitations()
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_email    text := lower(auth.jwt() ->> 'email');
  v_uid      uuid := auth.uid();
  v_existing uuid;
  v_landing  uuid;
  v_role     text;
  r          record;
begin
  if v_uid is null or v_email is null then
    return null;
  end if;

  -- Need the profile row to exist before we can attach memberships to it.
  select org_id into v_existing from profiles where id = v_uid;
  if not found then
    return null;
  end if;

  -- Turn every pending invite for this email into a membership.
  for r in
    select id, org_id, coalesce(role, 'member') as role,
           coalesce(access_campaigns, false) as access_campaigns,
           coalesce(access_talent,    false) as access_talent,
           coalesce(access_contacts,  false) as access_contacts
    from invitations
    where lower(email) = v_email and accepted_at is null
    order by created_at desc
  loop
    insert into org_members (user_id, org_id, role, access_campaigns, access_talent, access_contacts)
    values (v_uid, r.org_id, r.role, r.access_campaigns, r.access_talent, r.access_contacts)
    on conflict (user_id, org_id) do nothing;

    update invitations set accepted_at = now() where id = r.id;

    -- Remember the most-recent invite's org as the landing spot for a user who
    -- has no active company yet.
    if v_landing is null then
      v_landing := r.org_id;
      v_role := r.role;
    end if;
  end loop;

  -- Brand-new user with no company yet: land them in the inviting company,
  -- exactly like the old accept_invitation did.
  if v_existing is null and v_landing is not null then
    update profiles set org_id = v_landing, role = v_role where id = v_uid;
    return v_landing;
  end if;

  -- Existing user: active company unchanged; the new company/companies now show
  -- up in their switcher.
  return v_existing;
end;
$function$;

revoke all on function public.accept_pending_invitations() from public;
grant execute on function public.accept_pending_invitations() to authenticated;
