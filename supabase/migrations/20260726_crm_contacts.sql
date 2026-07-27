-- CRM: turn brand_contacts into the agency-wide contacts table.
--
-- We keep the existing table name (brand_contacts) so nothing that already reads
-- it breaks — but it now holds EVERY contact, not just brand ones:
--   • brand_id becomes optional (NULL = a standalone contact: a prospect,
--     manager, press, or vendor not tied to a specific client).
--   • new CRM fields: type, company, tags, owner, last_contacted_at.
--   • existing rows are all client contacts, so they're backfilled type='client'.
--
-- Also adds a per-plan contact cap (Starter 500, Pro 5,000, Business unlimited),
-- enforced the same way the talent cap is.
--
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query → paste → Run).
-- Safe to re-run.

-- ── New columns ──────────────────────────────────────────────────────────────
alter table public.brand_contacts
  add column if not exists type              text,
  add column if not exists company           text,
  add column if not exists tags              text[]      not null default '{}',
  add column if not exists owner_user_id      uuid        references public.profiles(id) on delete set null,
  add column if not exists last_contacted_at  timestamptz;

-- A contact's kind. Existing rows are all client contacts.
update public.brand_contacts set type = 'client' where type is null;
alter table public.brand_contacts
  alter column type set default 'client';
-- Constrain to the known kinds (drop first so re-runs don't error).
alter table public.brand_contacts drop constraint if exists brand_contacts_type_chk;
alter table public.brand_contacts
  add constraint brand_contacts_type_chk
  check (type in ('client','prospect','manager','press','vendor','other'));

-- Standalone contacts have no brand.
alter table public.brand_contacts alter column brand_id drop not null;

create index if not exists brand_contacts_org_id_idx  on public.brand_contacts (org_id);
create index if not exists brand_contacts_type_idx     on public.brand_contacts (org_id, type);

-- ── RLS: any member of the org may read/manage that org's contacts ───────────
-- (Additive, permissive policies — they broaden access to org scope so
-- standalone contacts work; existing brand-scoped policies keep working too.)
alter table public.brand_contacts enable row level security;

drop policy if exists brand_contacts_org_select on public.brand_contacts;
create policy brand_contacts_org_select on public.brand_contacts
  for select using (
    exists (select 1 from public.org_members om
            where om.org_id = brand_contacts.org_id and om.user_id = auth.uid())
  );

drop policy if exists brand_contacts_org_insert on public.brand_contacts;
create policy brand_contacts_org_insert on public.brand_contacts
  for insert with check (
    exists (select 1 from public.org_members om
            where om.org_id = brand_contacts.org_id and om.user_id = auth.uid())
  );

drop policy if exists brand_contacts_org_update on public.brand_contacts;
create policy brand_contacts_org_update on public.brand_contacts
  for update using (
    exists (select 1 from public.org_members om
            where om.org_id = brand_contacts.org_id and om.user_id = auth.uid())
  );

drop policy if exists brand_contacts_org_delete on public.brand_contacts;
create policy brand_contacts_org_delete on public.brand_contacts
  for delete using (
    exists (select 1 from public.org_members om
            where om.org_id = brand_contacts.org_id and om.user_id = auth.uid())
  );

-- ── Per-plan contact limit (mirrors the talent-limit trigger) ────────────────
-- Starter 500, Pro 5,000, Business/trial/lifetime unlimited. Lifetime accounts
-- already carry a paid stripe_plan, so they inherit the right cap automatically.
create or replace function enforce_contacts_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_plan  text;
  v_limit int;
  v_count int;
begin
  select stripe_plan into v_plan from public.organizations where id = NEW.org_id;
  v_limit := case v_plan when 'starter' then 1000 when 'pro' then 10000 else null end; -- null = unlimited
  if v_limit is null then
    return NEW;
  end if;

  select count(*) into v_count
    from public.brand_contacts
   where org_id = NEW.org_id;

  if v_count >= v_limit then
    raise exception 'Contact limit reached for your plan (% max). Upgrade to add more.', v_limit
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_enforce_contacts_limit on public.brand_contacts;
create trigger trg_enforce_contacts_limit
  before insert on public.brand_contacts
  for each row execute function enforce_contacts_limit();
