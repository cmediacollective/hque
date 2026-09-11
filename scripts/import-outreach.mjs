// One-off: bring every pitch from the standalone outreach tool into HQue.
//
//   node scripts/import-outreach.mjs <pitches.json> [leads.json]
//
// <pitches.json> is the standalone app's `pitches` table as JSON — fetched from
// its Supabase project with the anon key:
//   GET $VITE_SUPABASE_URL/rest/v1/pitches?select=*   (apikey + Bearer = anon key)
// Needs HQue's SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment
// (`npx netlify-cli env:get SUPABASE_SERVICE_KEY` has it).
//
// Idempotent: rows keep the standalone app's ids, so a re-run inserts nothing
// that is already here. Mapping is the one in docs/outreach-migration-plan.md.

import { readFileSync } from 'node:fs'

const ORG_ID = '00000000-0000-0000-0000-000000000001' // C Media Collective
const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY
if (!URL || !KEY) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1) }

const [, , pitchesPath, leadsPath] = process.argv
if (!pitchesPath) { console.error('Usage: node scripts/import-outreach.mjs <pitches.json> [leads.json]'); process.exit(1) }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
async function get(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers })
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`)
  return r.json()
}

// Who pitched it: the standalone app stored a display name; HQue stores the
// profile id. Matched by email, which is the stable thing.
const PITCHER_EMAIL = {
  'cherie marquez': 'cherie@cmediacollective.com',
  'annie jimenez': 'annie@cmediacollective.com',
  'haydee dela cruz': 'haydee@cmediacollective.com',
}

const norm = (s) => (s || '').trim().toLowerCase()
const orNull = (v) => { const t = typeof v === 'string' ? v.trim() : v; return t === '' || t === undefined || t === '—' ? null : t }
const LEGACY_PLACEHOLDER = 'No notes yet.'

const members = await get(`org_members?select=user_id,profiles(email)&org_id=eq.${ORG_ID}`)
const profileByEmail = new Map(members.map((m) => [norm(m.profiles?.email), m.user_id]))
const creators = await get(`creators?select=id,name&org_id=eq.${ORG_ID}`)
const creatorByName = new Map(creators.map((c) => [norm(c.name), c.id]))
const existing = new Set((await get(`pitches?select=id&org_id=eq.${ORG_ID}`)).map((p) => p.id))

const src = JSON.parse(readFileSync(pitchesPath, 'utf8'))
const leads = leadsPath ? JSON.parse(readFileSync(leadsPath, 'utf8')) : []
const leadByPitch = new Map(leads.filter((l) => l.pitch_id).map((l) => [l.pitch_id, l]))

const warnings = []
function mapPitch(p) {
  const creator_id = creatorByName.get(norm(p.client)) || null
  if (!creator_id) warnings.push(`no talent named "${p.client}" (pitch ${p.brand})`)
  const email = PITCHER_EMAIL[norm(p.pitcher)]
  const pitched_by = email ? profileByEmail.get(email) || null : null
  if (p.pitcher && !pitched_by) warnings.push(`no team member for pitcher "${p.pitcher}" (pitch ${p.brand})`)

  let note_entries = Array.isArray(p.note_entries) ? p.note_entries : []
  const legacy = (p.notes || '').trim()
  if (note_entries.length === 0 && legacy && legacy !== LEGACY_PLACEHOLDER) {
    note_entries = [{ id: 'legacy', at: null, text: legacy }]
  }
  // `source` ("Apollo", "inbound") has no column here; it rides along in
  // source_ref so nothing is lost.
  const source_ref = [orNull(p.source), orNull(p.source_ref)].filter(Boolean).join(' · ') || null

  const row = {
    id: p.id,
    org_id: ORG_ID,
    creator_id,
    client_name: p.client,
    brand: (p.brand || '').trim() || 'Untitled brand',
    website: orNull(p.website),
    contact: orNull(p.contact),
    contact_email: orNull(p.contact_email),
    type: orNull(p.type),
    status: p.status || 'Drafted',
    pitched_by,
    sent_on: orNull(p.sent_on),
    follow_up: orNull(p.follow_up),
    note_entries,
    is_lead: false,
    created_by: p.created_by || 'app',
    source_ref,
    created_at: p.created_at,
    updated_at: p.updated_at || p.created_at,
  }

  const lead = leadByPitch.get(p.id)
  if (lead) Object.assign(row, leadFields(lead))
  return row
}

function leadFields(l) {
  return {
    is_lead: true,
    campaign: orNull(l.campaign),
    amount: l.amount == null ? null : Number(l.amount),
    stage: l.stage || 'Identified',
    likelihood: l.likelihood ?? null,
    timing: orNull(l.timing),
    next_step: orNull(l.next_step ?? l.nextStep),
    lost_reason: orNull(l.lost_reason ?? l.lostReason),
  }
}

const rows = src.map(mapPitch)
// Leads with no pitch behind them become their own row, mid-pipeline.
for (const l of leads.filter((x) => !x.pitch_id)) {
  rows.push({
    ...mapPitch({ ...l, pitcher: l.owner, status: 'In negotiation', note_entries: l.note_entries, notes: l.notes }),
    ...leadFields(l),
  })
}

const fresh = rows.filter((r) => !existing.has(r.id))
console.log(`${rows.length} rows in export, ${existing.size} already in HQue, ${fresh.length} to insert`)
for (const w of [...new Set(warnings)]) console.log('warning:', w)

if (fresh.length === 0) process.exit(0)

for (let i = 0; i < fresh.length; i += 100) {
  const batch = fresh.slice(i, i + 100)
  const r = await fetch(`${URL}/rest/v1/pitches?on_conflict=id`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(batch),
  })
  if (!r.ok) { console.error(`insert failed at ${i}: ${r.status} ${await r.text()}`); process.exit(1) }
  console.log(`inserted ${Math.min(i + 100, fresh.length)} / ${fresh.length}`)
}
console.log('done')
