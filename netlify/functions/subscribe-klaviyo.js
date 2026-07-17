// Klaviyo lifecycle sync. Every contact lives in EXACTLY ONE of four lists that
// mirror their journey; this moves them to the target stage and removes them
// from the other three, so they never pile up in multiple lists.
//
//   leads          — marketing opt-in (footer / chat / blog), no trial yet
//   nonsubscribers — started a free trial, hasn't paid
//   subscribers    — paying (incl. lifetime / AppSumo / comped)
//   winback        — was a trial/customer and lapsed
//
// Call with { email, firstName?, lastName?, stage }. Best-effort; never throws
// back to the caller.
//
// Env vars (Netlify → Site settings → Environment variables):
//   KLAVIYO_API_KEY              private key (pk_...) — server-only
//   KLAVIYO_LIST_LEADS
//   KLAVIYO_LIST_NONSUBSCRIBERS
//   KLAVIYO_LIST_SUBSCRIBERS
//   KLAVIYO_LIST_WINBACK

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
  // NB: this endpoint only accepts email + subscriptions on the profile (no
  // first_name/last_name), and the list goes in relationships (not attributes).
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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  try {
    const { email, firstName, lastName, stage } = JSON.parse(event.body || '{}')
    if (!email || !stage) return { statusCode: 400, body: JSON.stringify({ error: 'email and stage required' }) }
    const target = LISTS[stage]
    if (!API_KEY || !target) {
      console.error('klaviyo-sync: missing config', { hasKey: !!API_KEY, stage, hasList: !!target })
      return { statusCode: 200, body: JSON.stringify({ skipped: true }) }
    }

    // 1. Put them in the target list (creates/updates the profile).
    await subscribeToList(target, email)

    // 2. Move: remove them from the other three lists so they're in exactly one.
    const profileId = await getProfileId(email)
    if (profileId) {
      const others = Object.entries(LISTS).filter(([k, v]) => k !== stage && v).map(([, v]) => v)
      await Promise.all(others.map(listId => removeFromList(listId, profileId)))
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e) {
    console.error('klaviyo-sync error', e)
    return { statusCode: 200, body: JSON.stringify({ ok: false }) }
  }
}
