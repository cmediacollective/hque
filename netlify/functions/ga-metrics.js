const { createClient } = require('@supabase/supabase-js')
const { GoogleAuth } = require('google-auth-library')

// Google Analytics numbers for the HQ Metrics dashboard (master admin only).
// Pulls website visitors + traffic sources for the last 28 days straight from
// the GA4 Data API, so the marketing team sees them inside HQue instead of
// having to open Google Analytics.
//
// Requires three Netlify env vars (see the setup steps we handed over):
//   GA_PROPERTY_ID   – the NUMERIC GA4 property id (not the "G-XXXX" tag id)
//   GA_CLIENT_EMAIL  – the service account's email
//   GA_PRIVATE_KEY   – the service account's private key
// If any are missing, we return { configured:false } so the dashboard shows a
// friendly "connect Google Analytics" note instead of an error.
exports.handler = async (event) => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  // Same gate as hq-metrics: valid session + master admin + owner/admin role.
  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json(401, { ok: false, reason: 'no_auth' })
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) return json(401, { ok: false, reason: 'bad_auth' })
  const [{ data: admin }, { data: profile }] = await Promise.all([
    supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ])
  if (!admin || !profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return json(403, { ok: false, reason: 'not_admin' })
  }

  const propertyId = process.env.GA_PROPERTY_ID
  const clientEmail = process.env.GA_CLIENT_EMAIL
  const privateKey = (process.env.GA_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (!propertyId || !clientEmail || !privateKey) {
    return json(200, { ok: true, configured: false })
  }

  try {
    // Get an OAuth access token for the service account (read-only analytics).
    const auth = new GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    })
    const client = await auth.getClient()
    const { token: accessToken } = await client.getAccessToken()
    const base = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`
    const call = (payload) => fetch(base, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async r => {
      const b = await r.json()
      if (!r.ok) throw new Error(b?.error?.message || `GA ${r.status}`)
      return b
    })

    const range = [{ startDate: '28daysAgo', endDate: 'today' }]

    // Report 1: totals + daily trend.
    const totalsReq = call({
      dateRanges: range,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    })
    // Report 2: where the traffic comes from (default channel grouping).
    const sourcesReq = call({
      dateRanges: range,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    })

    const [totals, sources] = await Promise.all([totalsReq, sourcesReq])

    // Sum the totals and build a compact daily visitor trend.
    let users = 0, sessions = 0, views = 0
    const trend = []
    for (const row of totals.rows || []) {
      const d = row.dimensionValues?.[0]?.value || ''
      const u = Number(row.metricValues?.[0]?.value || 0)
      users += u
      sessions += Number(row.metricValues?.[1]?.value || 0)
      views += Number(row.metricValues?.[2]?.value || 0)
      trend.push({ date: d, label: d.slice(6, 8), users: u })
    }

    const channels = (sources.rows || []).map(r => ({
      source: r.dimensionValues?.[0]?.value || '(other)',
      sessions: Number(r.metricValues?.[0]?.value || 0),
    }))

    return json(200, {
      ok: true,
      configured: true,
      rangeLabel: 'Last 28 days',
      totals: { users, sessions, views },
      trend,
      channels,
    })
  } catch (e) {
    console.error('ga-metrics error:', e.message)
    return json(200, { ok: true, configured: true, error: e.message })
  }
}

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }
}
