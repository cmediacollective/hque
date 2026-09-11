# Outreach → HQue: migration plan

**Status:** steps 0, 1 and 2 done on 2026-09-11 — the section is live at
h-que.com, all 306 pitches are imported (`scripts/import-outreach.mjs`),
Bailey writes to HQue (`~/bailey` commit 5857020, deployed to Fly), and the
standalone site is read-only behind a "moved to HQue" banner. Step 3 is done
too: "Make it a campaign", Pitch status retired (for outreach-enabled companies
only — other customers still use it, see `src/campaignStatuses.js`), the three
Pitch-status campaigns migrated and archived, Outreach block in Reports.
Step 4 (per-member switch + announcement) is what's left.
**Written by:** the Claude Code session in `~/cmedia-outreach-pipeline` (the
standalone outreach tool), as a handoff to the HQue session. Read this whole
file before starting step 1. Everything in "Verified in code" was checked
against the HQue repo at commit `d1aaef8` and the outreach repo the same day.

---

## The one-paragraph version

cMedia tracks cold outreach (≈300 pitches, six clients) in a small standalone
app, https://cmedia-outreach.netlify.app, because logging outreach as HQue
*campaigns* became too heavy — the campaign form asks for a logo, brand record,
contacts, dates and talent before anything is real. Cherie wants the outreach
tool's speed and look **inside HQue** as a new **Outreach** section, gated to
cMedia only for now; leads (paid deals being worked) live in that section too;
and an HQue **campaign is created only when a deal is official**. The Pitch
status on campaigns goes away.

---

## Decisions already made (don't re-litigate)

1. **Two homes, not three.** Outreach section holds pitches *and* leads (a
   pitch grows lead fields when money is on the table). Campaigns hold only
   real campaigns.
2. **The campaign line is Contract Pending.** "Make it a campaign" on a lead
   creates the campaign pre-filled. Campaigns start at Contract Pending (or
   Active). The `Pitch` campaign status is removed, along with its kanban lane.
3. **Paid partnerships only become leads.** Gifting *offers* stay in Outreach as
   a status ("Offered gifting") and never become a lead unless they turn paid.
   Once a gifting deal is agreed it is a real campaign of type Gifting.
4. **Drop `Seeding` from campaign types.** Keep Paid, Non-paid, Gifting, Media.
   Relabel any existing Seeding rows to Gifting.
5. **Momé and Mommish are clients, not creators — but they are entered in HQue
   as talent with a new talent Type "Media brand".** HQue's talent Types are a
   per-org editable list, so this is data entry, not schema. A campaign's
   "who is this for" is then always `campaign_creators`, uniformly. Michelle
   Young, Jack Leius, Imani Jackson, Brittany Krystantos are ordinary talent.
6. **Gate to cMedia only.** A boolean on `organizations` (`outreach_enabled`,
   default false, true for cMedia). Everyone *in* cMedia sees the section
   (Annie and Haydee are members, not master admins, so the gate must be
   per-org, not `isMasterAdmin`). Later this becomes a per-member section
   switch like Contacts.
7. **One-way links.** A lead stores the campaign it became; a campaign stores
   `pitch_id`. No two-way sync — ever.
8. **No overlap period.** Cutover is one day: import, then the standalone site
   goes read-only with a "moved to HQue" banner.

---

## Step order (each step is usable on its own)

### Step 0 — data prep, Cherie does this by hand, no code
In HQue for the cMedia org: add talent Type **Media brand** (Settings → Talent
Labels), then add **Momé** and **Mommish** as talent of that type. Everything
else in the import maps to existing talent and team members.

### Step 1 — Outreach section in HQue, cMedia-only  ← start here
- `alter table organizations add column outreach_enabled boolean not null
  default false;` set true for cMedia's org.
- New table `public.pitches` (see schema below), RLS scoped to org members
  the same way `brand_contacts` is (`org_members` exists-check).
- Nav item **Outreach** shown only when the active org has the flag. Follow the
  Contacts pattern in `src/App.jsx` (`OPTIONAL_SECTIONS`, `canSee`, the nav
  array around line 817) — but gate on the org flag, not on member access,
  for now.
- Port the board (spec below). It must be as fast to use as the standalone one:
  the create modal is six fields and a note; nothing else is required.
- Remove `Seeding` from the three dropdowns (`src/CampaignForm.jsx:474`,
  `src/CampaignView.jsx:387`, `:466`) and
  `update campaigns set campaign_type = 'Gifting' where campaign_type = 'Seeding'`.
- Deploy. Cherie runs both apps side by side for a few days to check feel.

### Step 2 — cutover day
- Import every pitch and lead from the standalone database (mapping below).
- Point Bailey (`~/bailey`, the Slack agent that logs pitches from Slack into
  the standalone `pitches` table) at HQue's `pitches` instead.
- In `~/cmedia-outreach-pipeline`: add a banner "This moved to HQue →" and make
  the UI read-only. Deploy that (`npm run build && npx netlify deploy --prod
  --dir=dist` from that folder). Do NOT delete its database — it is the backup.

### Step 3 — campaigns become real campaigns
- "Make it a campaign" on a lead: creates a campaign with `status: 'Contract
  Pending'`, `campaign_type` from the lead (Paid), `brand` text + find-or-create
  `brands` row by name/website, `contact_id` from a find-or-create
  `brand_contacts` row, `budget` = lead value, `notes` = latest note,
  `pitched_by` = pitch owner, `campaign_creators` = the pitch's client, and
  `pitch_id` back-link. Lead row gets `campaign_id` and shows "Campaign →".
- Remove `Pitch` from campaign status lists and the kanban (`src/CampaignView.jsx`
  line 20 and the column filter ~513; `src/CampaignForm.jsx` defaults at 31/46/479).
  New campaigns default to Contract Pending.
- Migrate campaigns currently in `Pitch` status into Outreach as leads (stage
  "Proposal sent" unless notes say otherwise), then delete or archive them.
- `src/ReportsView.jsx` counts `Pitch` as "Pitched" per person (lines 21, 160).
  Replace with an Outreach report: pitches sent, response rate, leads and
  weighted pipeline per person and per client.

### Step 4 — later, when Cherie is happy
Turn the org flag into a per-member section switch (`org_members.access_outreach`,
like `access_contacts`), announce as a product update, "New" badge on the nav.

---

## Spec of the board being ported

Everything here exists and works in `~/cmedia-outreach-pipeline/src`. Read
those files for exact behaviour; this is the summary.

**Two pages (in HQue: one section with two sub-tabs or two pages):**

**Outreach (pitches)**
- Stats: total pitches · active in pipeline · response rate · moved to HQue.
- Pipeline bar by status, with counts.
- Tabs Active / Closed.
- Client chips: All clients · Talent · Media brands · one chip per client, each
  with a count. **Counts are taken after the dropdowns and search have run**,
  so a chip's number is always what clicking it shows (this was a bug once).
- Dropdowns: status (scoped to the tab) · pitch type · pitched by · search
  (brand, contact, email, pitcher) · "Clear filters" when any is set.
- Table sorted by brand A→Z (`localeCompare`, base sensitivity, numeric), 50
  rows per page. Row expands to a notes log + Edit / Track as lead / Delete
  (two-step inline delete, no browser confirm).
- Statuses, in order: Drafted, Sent, Follow-up sent, Offered gifting,
  In negotiation, Success → HQue, No response, Bounced, Declined.
  Closed = Success → HQue, No response, Bounced, Declined.
  Response rate = (Offered gifting + In negotiation + Success + Declined) /
  (everything except Drafted and Bounced).
  In HQue, "Success → HQue" becomes the real "Make it a campaign" action.
- Pitch types: Brand partnership, Podcast, Editorial / press, Event /
  appearance, Speaking, Other PR. "Track as lead" is hidden for Editorial /
  press and Other PR.
- Notes are an append-only log (`[{id, at, text}]`, newest first); typing in
  the modal appends, never overwrites. Whole emails get pasted in.

**Leads (paid partnerships)**
- Same client chips; tabs Open / Won / Lost.
- Stats: open leads · pipeline value · weighted (Σ value × likelihood over open
  leads) · closed won.
- Stages: Identified 10% → Proposal sent 25% → In negotiation 50% → Verbal yes
  75% → Closed won 100% / Closed lost 0%. Picking a stage sets likelihood to
  its default; the picker (10/25/50/75/90) then overrides. Won/lost pin it.
- **Likelihood gauge**: four segments (25/50/75/100), filled to the value,
  half-tone for the segment the value lands in, white for won, copper for
  lost. Plain boxes so it prints. `src/components/leads/LikelihoodGauge.jsx`.
- Lost reasons: Budget cut, Went quiet, Went with competitor, Went with
  previous partner, Change in direction, Flight pushed, Unqualified lead, Went
  programmatic, Previous poor performance, Other.
- **Client report**: for the selected client, a light print-ready page
  (summary numbers, In progress with gauge + next step, Closed won, Closed lost
  with reason). Print / Save as PDF, plus CSV. Owner, contact email and notes
  are deliberately left off the printed page. `LeadReport.jsx` — portalled to
  `<body>` with print CSS hiding the app behind it.

**Look.** The standalone app uses the HQue design tokens already (`hq-*`
classes, `#5b7c99` blue, Fraunces for numerals, no green/no red palette rule
for statuses). Port into HQue's own light/dark theming; don't carry the
standalone's dark-only styling.

---

## Proposed HQue schema (draft — adjust to HQue conventions)

One table for pitches and leads: a lead is a pitch with the lead columns
filled. This is deliberately simpler than the standalone app, which used two
tables (`pitches`, `leads`) with a `pitch_id` link.

```sql
create table public.pitches (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,

  -- who it's for: a talent record (real talent or a "Media brand" talent)
  creator_id    uuid references public.creators(id) on delete set null,
  client_name   text not null,          -- denormalised, survives talent deletion

  -- the outreach
  brand         text not null,          -- brand / outlet pitched
  website       text,
  contact       text,
  contact_email text,
  type          text,                   -- Brand partnership, Podcast, …
  status        text not null default 'Drafted',
  pitched_by    uuid references public.profiles(id) on delete set null,
  sent_on       date,
  follow_up     date,
  note_entries  jsonb not null default '[]'::jsonb,   -- [{id, at, text}], newest first

  -- the lead (null until "Track as lead")
  is_lead       boolean not null default false,
  campaign      text,                   -- what's being sold
  amount        numeric(12,2),
  stage         text,                   -- Identified … Closed lost
  likelihood    integer check (likelihood between 0 and 100),
  timing        text,
  next_step     text,
  lost_reason   text,

  -- what it became
  campaign_id   uuid references public.campaigns(id) on delete set null,

  created_by    text not null default 'app',   -- 'app' | 'bailey'
  source_ref    text,                          -- Slack permalink when Bailey logged it
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

And on campaigns: `add column pitch_id uuid references public.pitches(id) on
delete set null`.

Use check constraints for `status` and `stage` **only if** you also document
that adding a value needs SQL — the standalone app got bitten by that twice.

---

## Import mapping (step 2)

Source: the standalone app's Supabase project `hqupaszoyvcjseaptfvu`, tables
`public.pitches` and `public.leads`, single tenant. Easiest export: from
`~/cmedia-outreach-pipeline`, `.env` has `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_TENANT_ID`; the anon key can read everything:

```
GET $VITE_SUPABASE_URL/rest/v1/pitches?select=*   (headers: apikey, Authorization: Bearer <anon>)
GET $VITE_SUPABASE_URL/rest/v1/leads?select=*
```

Or use the app's own "Export backup" (JSON, camelCase, the shape the
components read — see `src/lib/usePitches.js` `fromRow`).

| Standalone `pitches` | HQue `pitches` |
|---|---|
| `client` (text: "Michelle Young", "Momé", …) | `creator_id` by `creators.name` within cMedia org (after step 0); keep text in `client_name` |
| `brand`, `website`, `contact`, `contact_email`, `type`, `status`, `sent_on`, `follow_up`, `note_entries`, `created_by`, `source_ref`, `created_at` | same names |
| `pitcher` (text: "Cherie Marquez" / "Annie Jimenez" / "Haydee Dela Cruz") | `pitched_by` = `profiles.id` by email |
| `notes` (legacy single string) | if `note_entries` is empty and `notes` is non-empty and not "No notes yet.", wrap as one entry `{id:'legacy', at:null, text}` |

| Standalone `leads` | HQue `pitches` |
|---|---|
| a lead with `pitch_id` | update that imported pitch: `is_lead=true` + lead columns |
| a lead without `pitch_id` | insert a new pitch row with `is_lead=true`, status 'In negotiation' |
| `owner` | `pitched_by` |
| `email` → `contact_email`, `nextStep` → `next_step`, `lostReason` → `lost_reason` | |

Team member emails: Cherie is cherie@cmediacollective.com; Annie and Haydee
are cMedia members — look them up in `profiles`.

Idempotency: match on lower(brand) + client_name, like the standalone import
does, so a re-run adds nothing twice.

---

## Verified in code (so the HQue session doesn't have to re-check)

- HQue campaign statuses: Pitch, Contract Pending, Active, Pending Payment,
  Completed, Cancelled, Dead (`src/CampaignView.jsx:395`). Kanban lane keys at
  line 20. Reports bucket Pitch as "Pitched" (`src/ReportsView.jsx:21,160`).
- Campaign types: Paid, Non-paid, Gifting, Seeding, Media — plain literals, no
  DB constraint found in `supabase/migrations`.
- Campaign payload fields (`src/CampaignForm.jsx:270-292`): org_id, name,
  brand_id (nullable), brand (text), brand_logo_url, brand_website, contact_id,
  campaign_type, status, pitched_by, campaign_manager, closed_by, budget,
  start_date, end_date, deliverables, deliverables_link, timeline, brief_url,
  contract_url, notes. Talent via `campaign_creators (campaign_id, creator_id)`.
- Talent types are per-org data: `org_talent_labels (org_id, kind
  'type'|'niche', label, position)`; writes go through RPCs
  (`20260715_talent_labels_rpcs.sql`). `creators.manager_user_id` exists.
- Contacts: `brand_contacts` is the org-wide CRM table, `brand_id` nullable,
  `type` open-ended per `org_contact_types`. RLS = org-member exists-check
  (`20260726_crm_contacts.sql`) — copy that pattern for `pitches`.
- Section gating: `OPTIONAL_SECTIONS`, `canSee`, `org_members.access_*`
  (`20260904_member_section_access.sql`); master-admin-only items use
  `isMasterAdmin` (`src/App.jsx:880`).
- HQue Supabase project: `wxdxkbhnfaamxpbpulrg` (from `.env`). Different
  project from the outreach app — no shared tables, no cross-project reads.
- Migrations in HQue are applied by pasting into the Supabase SQL editor, not
  by a CLI (see the NOTE headers in recent migrations). Same for the outreach
  app. Cherie runs the SQL; Claude can't type into that editor.
- Both repos deploy with `npx netlify deploy --prod`. Cherie works from the
  live URLs only — a change isn't done until it's deployed.

---

## Open questions for Cherie (ask when they come up, not before)

- Should Annie and Haydee see Leads (values, likelihood) or only Outreach?
  The standalone app shows both to everyone.
- Does the client report need cMedia's logo on it? (The standalone one uses a
  text wordmark because the only logo asset is white-on-transparent.)
- What to do with the standalone app's Netlify site after cutover: keep the
  read-only banner version up indefinitely, or take it down after a month.
