-- Multi-company foundation (Phase 1 of "one email, many companies").
--
-- WHY: today a user belongs to exactly one company — a single org_id on their
-- profiles row. To let one email belong to several companies and toggle between
-- them, we need a proper membership LIST. This migration adds that list
-- (org_members) and backfills it from existing accounts.
--
-- SAFE / ZERO BEHAVIOR CHANGE: this is purely additive.
--   • profiles.org_id stays exactly as-is and remains the "currently-active
--     company" pointer that every existing RLS policy and query already reads.
--   • Each existing user gets exactly ONE membership row == their current org,
--     so nothing they see or can do changes.
--   • No app code reads org_members yet; the switcher wires it up in Phase 2.
--
-- NOTE: this project applies DB rules in the Supabase dashboard, not via auto
-- migrations. Paste this into the Supabase SQL Editor and Run it once.
-- Safe to re-run: create-if-not-exists + idempotent backfill (on conflict do nothing).

-- ── The membership list ──────────────────────────────────────────────────────
create table if not exists public.org_members (
  user_id    uuid not null references public.profiles(id)      on delete cascade,
  org_id     uuid not null references public.organizations(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

-- Fast lookup of "everyone in org X" (seat counts, team roster) and
-- "every org for user U" (the switcher).
create index if not exists org_members_org_id_idx  on public.org_members (org_id);
create index if not exists org_members_user_id_idx on public.org_members (user_id);

-- ── RLS: a user may read only their OWN memberships ──────────────────────────
-- Writes happen only through SECURITY DEFINER RPCs (create_organization,
-- accept_invitation, the future switch/leave RPCs) and service-role jobs, so
-- there is deliberately NO client insert/update/delete policy.
alter table public.org_members enable row level security;

drop policy if exists "members read own memberships" on public.org_members;
create policy "members read own memberships"
  on public.org_members for select
  using (user_id = auth.uid());

-- ── Backfill: one membership per existing account == its current org ─────────
insert into public.org_members (user_id, org_id, role)
select id, org_id, coalesce(role, 'member')
from public.profiles
where org_id is not null
on conflict (user_id, org_id) do nothing;

-- ── Keep the list in sync at signup ─────────────────────────────────────────
-- create_organization already writes the org, org_settings and the profile link
-- atomically; add the matching owner membership so new signups never drift out
-- of the list. (Everything else is byte-for-byte identical to the prior version.)
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

  -- NEW: record the owner membership in the list.
  insert into public.org_members (user_id, org_id, role)
  values (v_uid, v_org_id, 'owner')
  on conflict (user_id, org_id) do update set role = 'owner';

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;
