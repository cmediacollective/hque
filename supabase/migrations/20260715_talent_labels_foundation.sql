-- Custom Talent Labels — Phase 1: foundation (invisible).
--
-- Moves the Types/Niches lists out of hardcoded arrays into data:
--   • talent_label_defaults — the master "Default Labels" set (master-admin
--     editable later); seeds every NEW company. Pre-loaded with today's presets.
--   • org_talent_labels — each company's OWN list; seeded from the defaults.
--     Every existing company is backfilled with the current presets, so nothing
--     changes for anyone.
--
-- Writes to org_talent_labels go through SECURITY DEFINER RPCs (Phase 2), so
-- there is deliberately no client write policy here. Reads are scoped to the
-- caller's companies.
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.talent_label_defaults (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('type','niche')),
  label      text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
-- Case-insensitive uniqueness needs an expression index (can't be an inline UNIQUE).
create unique index if not exists talent_label_defaults_uniq on public.talent_label_defaults (kind, lower(label));

create table if not exists public.org_talent_labels (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  kind       text not null check (kind in ('type','niche')),
  label      text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists org_talent_labels_uniq on public.org_talent_labels (org_id, kind, lower(label));
create index if not exists org_talent_labels_org_idx on public.org_talent_labels (org_id, kind, position);

-- ── Seed the master defaults with today's presets (idempotent) ───────────────
insert into public.talent_label_defaults (kind, label, position)
select 'type', label, ord
from unnest(array['Influencer','UGC','Model','Actor','Public Figure','Sports','Athlete','Podcast','Speaker/Host']) with ordinality as t(label, ord)
on conflict (kind, lower(label)) do nothing;

insert into public.talent_label_defaults (kind, label, position)
select 'niche', label, ord
from unnest(array['Wellness','Beauty','Lifestyle','Parenting','Fashion','Fitness','Food','Travel','Entertainment','Books','Specialty']) with ordinality as t(label, ord)
on conflict (kind, lower(label)) do nothing;

-- ── Backfill every existing company from the defaults ────────────────────────
insert into public.org_talent_labels (org_id, kind, label, position)
select o.id, d.kind, d.label, d.position
from public.organizations o
cross join public.talent_label_defaults d
on conflict (org_id, kind, lower(label)) do nothing;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.talent_label_defaults enable row level security;
drop policy if exists "defaults read admin"  on public.talent_label_defaults;
drop policy if exists "defaults write admin" on public.talent_label_defaults;
create policy "defaults read admin"  on public.talent_label_defaults for select using (public.is_platform_admin());
create policy "defaults write admin" on public.talent_label_defaults for all    using (public.is_platform_admin()) with check (public.is_platform_admin());

alter table public.org_talent_labels enable row level security;
drop policy if exists "labels read members" on public.org_talent_labels;
create policy "labels read members" on public.org_talent_labels for select using (
  org_id in (select m.org_id from public.org_members m where m.user_id = auth.uid())
);

-- ── New companies inherit the master defaults ────────────────────────────────
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
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'Company name is required'; end if;

  if exists (
    select 1 from public.org_members m
    join public.organizations o on o.id = m.org_id
    where m.user_id = v_uid and m.role = 'owner' and o.is_lifetime = true
  ) then
    raise exception 'Your lifetime plan covers one company. Creating additional companies isn''t available on this plan.';
  end if;

  v_slug := left(regexp_replace(lower(p_name), '[^a-z0-9]', '', 'g'), 20)
            || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);

  insert into public.organizations (name, slug) values (p_name, v_slug) returning id into v_org_id;
  insert into public.org_settings (org_id, agency_name) values (v_org_id, p_name);
  update public.profiles set org_id = v_org_id, role = 'owner' where id = v_uid;
  insert into public.org_members (user_id, org_id, role) values (v_uid, v_org_id, 'owner')
    on conflict (user_id, org_id) do update set role = 'owner';

  -- Seed this new company's talent labels from the master defaults.
  insert into public.org_talent_labels (org_id, kind, label, position)
  select v_org_id, d.kind, d.label, d.position from public.talent_label_defaults d
  on conflict (org_id, kind, lower(label)) do nothing;

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;
