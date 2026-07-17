// Shared Klaviyo lifecycle helper. Every contact lives in exactly one of four
// lists; syncStage(email, stage) subscribes them to the target list and removes
// them from the other three. Used by the HTTP endpoint (subscribe-klaviyo) and
// server-side events (Stripe webhook, AppSumo redeem, scheduled winback job).
//
//   stage: 'leads' | 'nonsubscribers' | 'subscribers' | 'winback'
//
// Best-effort by design: callers should not let a Klaviyo failure affect their
// own work (a payment, a redemption, a signup).

const API_KEY = process.env.KLAVIYO_API_KEY
const LISTS = {
  leads: process.env.KLAVIYO_LIST_LEADS,
  nonsubscribers: process.env.KLAVIYO_LIST_NONSUBSCRIBERS,
  subscribers: process.env.KLAVIYO_LIST_SUBSCRIBERS,
  winback: process.env.KLAVIYO_LIST_WINBACK,
}
const REVISION = '2026-07-15'
const headers = () => ({
  revision: REVISION,
  'Content-Type': 'application/json',
  accept: 'application/json',
  Authorization: `Klaviyo-API-Key ${API_KEY}`,
})

async function subscribeToList(listId, email) {
  const res = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          profiles: { data: [{ type: 'profile', attributes: { email, subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } } } }] },
        },
        relationships: { list: { data: { type: 'list', id: listId } } },
      },
    }),
  })
  if (!res.ok) console.error('klaviyo subscribe error', res.status, await res.text().catch(() => ''))
  return res.ok
}

async function getProfileId(email) {
  const url = `https://a.klaviyo.com/api/profiles/?filter=${encodeURIComponent(`equals(email,"${email}")`)}`
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) return null
  const j = await res.json().catch(() => null)
  return j && j.data && j.data[0] && j.data[0].id
}

async function removeFromList(listId, profileId) {
  const res = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({ data: [{ type: 'profile', id: profileId }] }),
  })
  if (!res.ok && res.status !== 404) console.error('klaviyo remove error', listId, res.status)
}

// Move an email to `stage`: add to that list, remove from the other three.
async function syncStage(email, stage) {
  const target = LISTS[stage]
  if (!API_KEY || !target || !email) {
    console.error('klaviyo syncStage: missing config/args', { hasKey: !!API_KEY, stage, hasList: !!target, hasEmail: !!email })
    return false
  }
  await subscribeToList(target, email)
  const profileId = await getProfileId(email)
  if (profileId) {
    const others = Object.entries(LISTS).filter(([k, v]) => k !== stage && v).map(([, v]) => v)
    await Promise.all(others.map(listId => removeFromList(listId, profileId)))
  }
  return true
}

module.exports = { syncStage }
