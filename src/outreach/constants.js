// Domain constants for the Outreach section. The strings are stored as-is in
// pitches.status / .stage / .type — there is no database constraint on them
// (on purpose: adding a value here must never need SQL), so an unknown value
// simply renders as plain text.

export const PITCH_TYPES = [
  'Brand partnership',
  'Podcast',
  'Editorial / press',
  'Event / appearance',
  'Speaking',
  'Other PR',
]

// Press and PR pitches are never paid partnerships, so they never become leads.
export const NON_PAID_PITCH_TYPES = ['Editorial / press', 'Other PR']
export const canTrackAsLead = (pitch) => !NON_PAID_PITCH_TYPES.includes(pitch.type)

// Display order for the pipeline bar and the status dropdown.
export const STATUSES = [
  'Drafted',
  'Sent',
  'Follow-up sent',
  'Offered gifting',
  'In negotiation',
  'Success → HQue',
  'No response',
  'Bounced',
  'Declined',
]

// 'Success → HQue' is the stored value (it's what the standalone tool wrote,
// and what the import carries across). Inside HQue that reads oddly, so the
// screen calls it "Success". A later step turns it into "Make it a campaign".
export const SUCCESS_STATUS = 'Success → HQue'
export const statusLabel = (status) => (status === SUCCESS_STATUS ? 'Success' : status)

// Terminal statuses: won and handed on, or dead. They drop off the Active list.
export const CLOSED_STATUSES = [SUCCESS_STATUS, 'No response', 'Bounced', 'Declined']
export const OPEN_STATUSES = STATUSES.filter((s) => !CLOSED_STATUSES.includes(s))
export const isClosed = (status) => CLOSED_STATUSES.includes(status)

// Live and still needing attention.
export const ACTIVE_STATUSES = ['Sent', 'Follow-up sent', 'Offered gifting', 'In negotiation']

// The other side actually came back to us.
export const RESPONDED_STATUSES = ['Offered gifting', 'In negotiation', SUCCESS_STATUS, 'Declined']

// Response-rate denominator: pitches that reached a human. A draft never went
// out and a bounce never landed, so neither counts.
export const DELIVERED_STATUSES = STATUSES.filter((s) => s !== 'Drafted' && s !== 'Bounced')

// The follow-up date only reads as "live" while a reply is outstanding.
export const AWAITING_REPLY_STATUSES = ['Sent', 'Follow-up sent']

// ── Leads ───────────────────────────────────────────────────────────────────

export const STAGES = [
  'Identified',
  'Proposal sent',
  'In negotiation',
  'Verbal yes',
  'Closed won',
  'Closed lost',
]

// What a stage implies, applied when the stage changes and then free to be
// overridden — the owner's own read on whether it closes is the point.
export const STAGE_LIKELIHOOD = {
  Identified: 10,
  'Proposal sent': 25,
  'In negotiation': 50,
  'Verbal yes': 75,
  'Closed won': 100,
  'Closed lost': 0,
}

export const LIKELIHOOD_OPTIONS = [10, 25, 50, 75, 90]

export const WON_STAGE = 'Closed won'
export const LOST_STAGE = 'Closed lost'
export const CLOSED_STAGES = [WON_STAGE, LOST_STAGE]
export const OPEN_STAGES = STAGES.filter((s) => !CLOSED_STAGES.includes(s))
export const isOpenStage = (stage) => OPEN_STAGES.includes(stage)

export const LEAD_VIEWS = ['Open', 'Won', 'Lost']
export const leadViewFor = (stage) =>
  stage === WON_STAGE ? 'Won' : stage === LOST_STAGE ? 'Lost' : 'Open'

export const LOST_REASONS = [
  'Budget cut',
  'Went quiet',
  'Went with competitor',
  'Went with previous partner',
  'Change in direction',
  'Flight pushed',
  'Unqualified lead',
  'Went programmatic',
  'Previous poor performance',
  'Other',
]

// Value × likelihood — "weighted" pipeline. Only open leads count.
export const weightedValue = (lead) =>
  isOpenStage(lead.stage)
    ? Math.round((Number(lead.amount) || 0) * ((Number(lead.likelihood) || 0) / 100))
    : 0

// ── Colours ─────────────────────────────────────────────────────────────────
// `color` is the text colour, `bar` the swatch / segment fill. The palette has
// no green and no red: success is ink, declined/lost is a muted copper.

export function statusMeta(dark) {
  const ink = dark ? '#F0ECE6' : '#1a1a1a'
  return {
    'Drafted':         { color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', bar: dark ? '#3a3a3a' : '#c9c4bb' },
    'Sent':            { color: dark ? '#dcdcdc' : '#444',                             bar: '#7a8b9a' },
    'Follow-up sent':  { color: dark ? '#9db4c8' : '#6f8ea8',                          bar: '#9db4c8' },
    'Offered gifting': { color: dark ? '#c2b493' : '#7f7350',                          bar: '#9a8f6d' },
    'In negotiation':  { color: '#5b7c99',                                             bar: '#5b7c99' },
    [SUCCESS_STATUS]:  { color: ink,                                                   bar: ink },
    'No response':     { color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', bar: dark ? '#2a2a2a' : '#dedad2' },
    'Bounced':         { color: '#7d7d7d',                                             bar: dark ? '#4a4a4a' : '#b5b0a8' },
    'Declined':        { color: '#8a7068',                                             bar: dark ? '#4a3d38' : '#b9a59e' },
  }
}

export function stageMeta(dark) {
  const ink = dark ? '#F0ECE6' : '#1a1a1a'
  return {
    'Identified':     { color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', bar: dark ? '#3a3a3a' : '#c9c4bb' },
    'Proposal sent':  { color: dark ? '#dcdcdc' : '#444',                             bar: '#7a8b9a' },
    'In negotiation': { color: dark ? '#9db4c8' : '#6f8ea8',                          bar: '#9db4c8' },
    'Verbal yes':     { color: '#5b7c99',                                             bar: '#5b7c99' },
    [WON_STAGE]:      { color: ink,                                                   bar: ink },
    [LOST_STAGE]:     { color: '#8a7068',                                             bar: dark ? '#4a3d38' : '#b9a59e' },
  }
}

// ── Formatting ──────────────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
export const isISODate = (value) => ISO_DATE.test(value || '')

/** "2026-08-24" → "Aug 24". Empty renders as an em dash. */
export function formatDate(value) {
  if (!value) return '—'
  if (!isISODate(value)) return value
  // Midday avoids the date shifting a day in timezones behind UTC.
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Strip any protocol so websites store and display as a bare domain. */
export const bareDomain = (value) => (value || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')

/** Website falls back to the contact email's domain when left blank. */
export function websiteFor(pitch) {
  if (pitch.website) return bareDomain(pitch.website)
  const email = pitch.contact_email || ''
  return email.includes('@') ? email.split('@')[1].toLowerCase() : ''
}

export const websiteUrl = (site) => (site ? `https://${bareDomain(site)}` : null)

/** "$25,000". Whole dollars; blank or zero renders as an em dash. */
export function formatMoney(value) {
  const number = Number(value)
  if (!number) return '—'
  return number.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

/** Brand A→Z: case- and accent-folded, "Brand 2" before "Brand 10". */
export const byBrand = (a, b) =>
  (a.brand || '').localeCompare(b.brand || '', 'en', {
    sensitivity: 'base',
    numeric: true,
    ignorePunctuation: true,
  })
