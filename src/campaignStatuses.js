// Campaign statuses, and the one that depends on the company.
//
// 'Pitch' is a campaign that hasn't been won yet. For a company with the
// Outreach section switched on, pitches live there instead (as pitches and
// leads), and a campaign only exists once a deal is real — so it starts at
// Contract Pending and 'Pitch' disappears from every status list and from the
// board. Companies without Outreach keep 'Pitch' exactly as before.
//
// Held here as a module flag rather than a prop because five components read
// it (list, form, detail, board, reports) and it never changes while the app
// is open: App sets it before the first paint, and switching company reloads.

const ALL_STATUSES = ['Pitch', 'Contract Pending', 'Active', 'Pending Payment', 'Completed', 'Cancelled', 'Dead']

let outreachOn = false

export function setOutreachEnabled(value) {
  outreachOn = value === true
}

export function outreachEnabled() {
  return outreachOn
}

/**
 * Statuses to offer in a dropdown. `current` is the row's stored status: if
 * it isn't in the list any more (an archived cMedia campaign still at
 * 'Pitch'), it's kept as the first option so the dropdown shows the truth.
 */
export function campaignStatuses(current) {
  const list = outreachOn ? ALL_STATUSES.filter((s) => s !== 'Pitch') : ALL_STATUSES
  return current && !list.includes(current) ? [current, ...list] : list
}

export function defaultCampaignStatus() {
  return outreachOn ? 'Contract Pending' : 'Pitch'
}

/** Kanban lanes. The first lane is the pre-win one: Pitch, or Contract Pending. */
export function boardColumns() {
  return [
    outreachOn ? { key: 'Contract Pending', label: 'Contract Pending' } : { key: 'Pitch', label: 'Pitch' },
    { key: 'Active', label: 'Active' },
    { key: 'Pending Payment', label: 'Pending Payment' },
    { key: 'Completed', label: 'Completed' },
    { key: 'Cancelled', label: 'Cancelled' },
    { key: '__archived', label: 'Archived' },
  ]
}
