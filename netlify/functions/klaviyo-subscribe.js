// Adds a feedback submitter's email to a Klaviyo list with marketing consent.
// Called best-effort from the /updates submit form — the feedback row is
// already saved before this runs, so any failure here is non-fatal.
//
// Requires two Netlify environment variables:
//   KLAVIYO_API_KEY  — a Klaviyo PRIVATE API key (starts with "pk_")
//   KLAVIYO_LIST_ID  — the ID of the list to subscribe people to
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  const API_KEY = process.env.KLAVIYO_API_KEY
  const LIST_ID = process.env.KLAVIYO_LIST_ID
  if (!API_KEY || !LIST_ID) {
    console.error('klaviyo-subscribe: missing KLAVIYO_API_KEY or KLAVIYO_LIST_ID')
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'not_configured' }) }
  }

  try {
    const { email, name } = JSON.parse(event.body || '{}')
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, reason: 'invalid_email' }) }
    }

    const profileAttributes = {
      email,
      subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } },
    }
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/)
      profileAttributes.first_name = parts[0]
      if (parts.length > 1) profileAttributes.last_name = parts.slice(1).join(' ')
    }

    const body = {
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          profiles: { data: [{ type: 'profile', attributes: profileAttributes }] },
        },
        relationships: { list: { data: { type: 'list', id: LIST_ID } } },
      },
    }

    const resp = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', {
      method: 'POST',
      headers: {
        Authorization: `Klaviyo-API-Key ${API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        revision: '2024-10-15',
      },
      body: JSON.stringify(body),
    })

    if (resp.ok) return { statusCode: 200, body: JSON.stringify({ ok: true }) }

    const errText = await resp.text()
    console.error('klaviyo-subscribe: Klaviyo error', resp.status, errText)
    return { statusCode: 200, body: JSON.stringify({ ok: false, reason: 'klaviyo_error' }) }
  } catch (e) {
    console.error('klaviyo-subscribe: exception', e)
    return { statusCode: 200, body: JSON.stringify({ ok: false }) }
  }
}
