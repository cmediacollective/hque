-- CRM Phase 1.5 — Companies in the CRM + customizable Contact Types.
--
-- Two additions on top of 20260726_crm_contacts.sql:
--
--   1) Brands can carry a phone/company number, so they show up as "Company"
--      entries in Contacts (name + website + phone), editable from either side.
--
--   2) The contact "type" list becomes per-company customizable — like Talent
--      Labels. Each org gets its own editable set (Client, Prospect, Press,
--      Vendor, Other by default) that owners/admins can rename, recolor, remove,
--      reorder, or extend with their own (Photographer, Stylist, …).
--      Talent, Talent's Manager, and Company are DERIVED (pulled live from the
--      Talent/Brand records) — they're display-only and never stored here.
--
-- Because types are now open-ended, the old fixed CHECK on brand_contacts.type
-- is dropped.
--
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query → paste → Run).
-- Safe to re-run.

-- ── 1) Brands get an optional phone / company number ─────────────────────────
alter table public.brands
  add column if not exists phone text;

-- ── 2) Types are open-ended now: drop the fixed check ────────────────────────
alter table public.brand_contacts drop constraint if exists brand_contacts_type_chk;

-- ── Per-company contact types ────────────────────────────────────────────────
create table if not exists public.org_contact_types (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  key        text not null,                       -- stored on brand_contacts.type
  label      text not null,                       -- what the user sees
  color      text not null default '#8C877D',     -- the dot / pill color
  position   int  not null default 0,
  is_system  boolean not null default false,      -- true = can't be deleted (e.g. Client)
  created_at timestamptz not null default now(),
  unique (org_id, key)
);
create index if not exists org_contact_types_org_idx on public.org_contact_types (org_id, position);

-- Seed the default set for every existing company (idempotent).
insert into public.org_contact_types (org_id, key, label, color, position, is_system)
select o.id, d.key, d.label, d.color, d.position, d.is_system
from public.organizations o
cross join (values
  ('client',   'Client',   '#5b7c99', 0, true),
  ('prospect', 'Prospect', '#A67C52', 1, false),
  ('press',    'Press',    '#9B7A9B', 2, false),
  ('vendor',   'Vendor',   '#8E7A5B', 3, false),
  ('other',    'Other',    '#8C877D', 4, false)
) as d(key, label, color, position, is_system)
on conflict (org_id, key) do nothing;

-- ── RLS: members read; owners/admins manage ─────────────────────────────────
alter table public.org_contact_types enable row level security;

drop policy if exists org_contact_types_read on public.org_contact_types;
create policy org_contact_types_read on public.org_contact_types
  for select using (
    exists (select 1 from public.org_members m
            where m.org_id = org_contact_types.org_id and m.user_id = auth.uid())
  );

drop policy if exists org_contact_types_write on public.org_contact_types;
create policy org_contact_types_write on public.org_contact_types
  for all using (
    exists (select 1 from public.org_members m
            where m.org_id = org_contact_types.org_id and m.user_id = auth.uid()
              and m.role in ('owner','admin'))
  ) with check (
    exists (select 1 from public.org_members m
            where m.org_id = org_contact_types.org_id and m.user_id = auth.uid()
              and m.role in ('owner','admin'))
  );

-- ── New companies inherit the default set ────────────────────────────────────
create or replace function public.seed_default_contact_types()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.org_contact_types (org_id, key, label, color, position, is_system) values
    (new.id, 'client',   'Client',   '#5b7c99', 0, true),
    (new.id, 'prospect', 'Prospect', '#A67C52', 1, false),
    (new.id, 'press',    'Press',    '#9B7A9B', 2, false),
    (new.id, 'vendor',   'Vendor',   '#8E7A5B', 3, false),
    (new.id, 'other',    'Other',    '#8C877D', 4, false)
  on conflict (org_id, key) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_seed_contact_types on public.organizations;
create trigger trg_seed_contact_types
  after insert on public.organizations
  for each row execute function public.seed_default_contact_types();
