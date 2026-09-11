-- Outreach: cold pitches and paid-partnership leads, inside HQue.
--
-- Replaces the standalone outreach tool (cmedia-outreach.netlify.app). One
-- table holds both pitches and leads: a lead is a pitch with the lead columns
-- filled in and is_lead = true. When a lead becomes a real deal, "Make it a
-- campaign" (a later step) creates the campaign and stores the link both ways —
-- pitches.campaign_id and campaigns.pitch_id — with no ongoing sync.
--
-- The section is gated per company by organizations.outreach_enabled, which is
-- true only for cMedia for now. Everyone who is a member of a flagged company
-- sees it (Annie and Haydee are members, not admins, so this can't hang off a
-- master-admin check). It becomes a per-member switch later, like Contacts.
--
-- Also retires the 'Seeding' campaign type: existing rows become 'Gifting'.
--
-- NOTE: applied in the Supabase dashboard, not via auto migrations. Paste into
-- the Supabase SQL Editor and Run once. Safe to re-run.

-- ── The company flag ────────────────────────────────────────────────────────
alter table public.organizations
  add column if not exists outreach_enabled boolean not null default false;

-- Switch it on for cMedia. Matched on the company name so this file needs no
-- id pasted in; the select at the bottom shows exactly which rows it hit.
update public.organizations
   set outreach_enabled = true
 where id in (
   select o.id
     from public.organizations o
     left join public.org_settings s on s.org_id = o.id
    where o.name ilike '%c%media%collective%'
       or s.agency_name ilike '%c%media%collective%'
 );

-- ── Pitches (and leads) ─────────────────────────────────────────────────────
create table if not exists public.pitches (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,

  -- Who the pitch is for: a talent record. cMedia's own media brands (Momé,
  -- Mommish) are entered as talent of type "Media brand", so this is uniform.
  -- The name is kept as text too, so the row survives the talent being deleted.
  creator_id    uuid references public.creators(id) on delete set null,
  client_name   text not null,

  -- The outreach itself.
  brand         text not null,                 -- brand / outlet pitched
  website       text,
  contact       text,
  contact_email text,
  type          text,                          -- Brand partnership, Podcast, …
  status        text not null default 'Drafted',
  pitched_by    uuid references public.profiles(id) on delete set null,
  sent_on       date,
  follow_up     date,
  -- Append-only note log: [{id, at, text}], newest first. Adding a note never
  -- rewrites the ones already there. Whole emails get pasted in.
  note_entries  jsonb not null default '[]'::jsonb,

  -- The lead: null until "Track as lead". Paid partnerships only.
  is_lead       boolean not null default false,
  campaign      text,                          -- what's being sold
  amount        numeric(12,2),
  stage         text,                          -- Identified … Closed lost
  likelihood    integer check (likelihood is null or likelihood between 0 and 100),
  timing        text,
  next_step     text,
  lost_reason   text,

  -- What it became (set by "Make it a campaign", a later step).
  campaign_id   uuid references public.campaigns(id) on delete set null,

  created_by    text not null default 'app',   -- 'app' | 'bailey'
  source_ref    text,                          -- Slack permalink when Bailey logged it
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Status and stage are deliberately NOT check-constrained: the standalone app
-- was bitten twice by needing SQL to add a value. The lists live in
-- src/outreach/constants.js; an unknown value renders as plain text.

create index if not exists pitches_org_id_idx     on public.pitches (org_id);
create index if not exists pitches_org_lead_idx   on public.pitches (org_id, is_lead);
create index if not exists pitches_creator_id_idx on public.pitches (creator_id);

-- updated_at is what the board sorts and syncs on, so keep it honest even for
-- writers that don't set it (Bailey, a manual SQL fix).
create or replace function public.pitches_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_pitches_touch_updated_at on public.pitches;
create trigger trg_pitches_touch_updated_at
  before update on public.pitches
  for each row execute function public.pitches_touch_updated_at();

-- ── RLS: any member of the company may read and manage its pitches ──────────
-- Same shape as brand_contacts (20260726_crm_contacts.sql).
alter table public.pitches enable row level security;

drop policy if exists pitches_org_select on public.pitches;
create policy pitches_org_select on public.pitches
  for select using (
    exists (select 1 from public.org_members om
            where om.org_id = pitches.org_id and om.user_id = auth.uid())
  );

drop policy if exists pitches_org_insert on public.pitches;
create policy pitches_org_insert on public.pitches
  for insert with check (
    exists (select 1 from public.org_members om
            where om.org_id = pitches.org_id and om.user_id = auth.uid())
  );

drop policy if exists pitches_org_update on public.pitches;
create policy pitches_org_update on public.pitches
  for update using (
    exists (select 1 from public.org_members om
            where om.org_id = pitches.org_id and om.user_id = auth.uid())
  );

drop policy if exists pitches_org_delete on public.pitches;
create policy pitches_org_delete on public.pitches
  for delete using (
    exists (select 1 from public.org_members om
            where om.org_id = pitches.org_id and om.user_id = auth.uid())
  );

-- Live updates: three people work the board at once, and Bailey will log
-- pitches from Slack. The app subscribes to changes on this table.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pitches'
  ) then
    alter publication supabase_realtime add table public.pitches;
  end if;
end $$;

-- ── Campaigns: the back-link, and Seeding folds into Gifting ────────────────
alter table public.campaigns
  add column if not exists pitch_id uuid references public.pitches(id) on delete set null;

update public.campaigns
   set campaign_type = 'Gifting'
 where campaign_type = 'Seeding';

-- ── What this did ───────────────────────────────────────────────────────────
-- Should list exactly one company (cMedia). If it lists none, set the flag by
-- hand:  update public.organizations set outreach_enabled = true where id = '<org id>';
select o.id, o.name, s.agency_name, o.outreach_enabled
  from public.organizations o
  left join public.org_settings s on s.org_id = o.id
 where o.outreach_enabled;
