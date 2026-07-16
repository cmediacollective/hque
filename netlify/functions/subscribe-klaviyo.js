// Adds an email to the right Klaviyo list based on the capture point's `list`
// tag (marketing / leads / feedback). Best-effort: called alongside the existing
// Google Sheet write, and never throws back to the visitor.
//
// Env vars (set in Netlify → Site settings → Environment variables):
//   KLAVIYO_API_KEY        private API key (pk_...) — server-only, never VITE_*
//   KLAVIYO_LIST_MARKETING list id for chat + blog signups
//   KLAVIYO_LIST_LEADS     list id for footer signups
//   KLAVIYO_LIST_FEEDBACK  list id for Product Updates submissions

const API_KEY = process.env.KLAVIYO_API_KEY
const LISTS = {
  marketing: process.env.KLAVIYO_LIST_MARKETING,
  leads: process.env.KLAVIYO_LIST_LEADS,
  feedback: process.env.KLAVIYO_LIST_FEEDBACK,
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  try {
    const { email, firstName, lastName, list } = JSON.parse(event.body || '{}')
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'email required' }) }

    const listId = LISTS[list] || LISTS.marketing
    if (!API_KEY || !listId) {
      console.error('subscribe-klaviyo: missing config', { hasKey: !!API_KEY, list, hasListId: !!listId })
      return { statusCode: 200, body: JSON.stringify({ skipped: true }) } // don't break capture
    }

    const attributes = { email }
    if (firstName) attributes.first_name = firstName
    if (lastName) attributes.last_name = lastName
    attributes.subscriptions = { email: { marketing: { consent: 'SUBSCRIBED' } } }

    const res = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs', {
      method: 'POST',
      headers: {
        revision: '2026-07-15',
        'Content-Type': 'application/json',
        accept: 'application/json',
        Authorization: `Klaviyo-API-Key ${API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'profile-subscription-bulk-create-job',
          attributes: {
            profiles: { data: [{ type: 'profile', attributes }] },
            list_id: listId,
          },
        },
      }),
    })

    if (!res.ok) {
      console.error('subscribe-klaviyo: Klaviyo error', res.status, await res.text().catch(() => ''))
      return { statusCode: 502, body: JSON.stringify({ error: 'klaviyo failed' }) }
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e) {
    console.error('subscribe-klaviyo error', e)
    return { statusCode: 200, body: JSON.stringify({ ok: false }) }
  }
}
