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

  // Date range: the dashboard passes ?start=YYYY-MM-DD&end=YYYY-MM-DD. Fall back
  // to the last 28 days if they're missing or malformed.
  const qs = event.queryStringParameters || {}
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '')
  const startDate = isDate(qs.start) ? qs.start : '28daysAgo'
  const endDate = isDate(qs.end) ? qs.end : 'today'
  const range = [{ startDate, endDate }]
  // Prior equal-length period (for the trend arrows).
  const priorRange = (() => {
    if (isDate(qs.start) && isDate(qs.end)) {
      const s = new Date(qs.start + 'T00:00:00Z'), e = new Date(qs.end + 'T00:00:00Z')
      const spanDays = Math.round((e - s) / 86400000)
      const pe = new Date(s.getTime() - 86400000)
      const ps = new Date(pe.getTime() - spanDays * 86400000)
      return [{ startDate: ps.toISOString().slice(0, 10), endDate: pe.toISOString().slice(0, 10) }]
    }
    return [{ startDate: '56daysAgo', endDate: '29daysAgo' }]
  })()

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

    // Report 1: headline totals for the range.
    const totalsReq = call({
      dateRanges: range,
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
    })
    // Report 2: where the traffic comes from (default channel grouping).
    const sourcesReq = call({
      dateRanges: range,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    })
    // Report 2b: the actual referring sites/sources (google, instagram.com, …).
    const referrersReq = call({
      dateRanges: range,
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 15,
    })
    // Report 3: visitors by country.
    const countriesReq = call({
      dateRanges: range,
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 8,
    })
    // Report 4: visitors by city.
    const citiesReq = call({
      dateRanges: range,
      dimensions: [{ name: 'city' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 8,
    })
    // Report 5: most-viewed MARKETING pages. GA tracks the whole site, including
    // the logged-in app (which lives on the same domain), so we exclude internal
    // app routes (/task, /campaign, /roster, /reports, /sandbox) — this is for
    // marketing tracking, not internal usage.
    const pagesReq = call({
      dateRanges: range,
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      dimensionFilter: {
        notExpression: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: { matchType: 'FULL_REGEXP', value: '^/(task|campaign|roster|reports|sandbox)(/.*)?$', caseSensitive: false },
          },
        },
      },
      limit: 25,
    })

    // Report 6: daily series over the range (for the traffic line chart).
    const dailyReq = call({
      dateRanges: range,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 400,
    })
    // Report 7: prior-period totals (for the trend arrows).
    const prevTotalsReq = call({
      dateRanges: priorRange,
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
    })

    const [totals, sources, referrers, countries, cities, pages, dailyRep, prevTotals] = await Promise.all([totalsReq, sourcesReq, referrersReq, countriesReq, citiesReq, pagesReq, dailyReq, prevTotalsReq])

    const t = totals.rows?.[0]?.metricValues || []
    const users = Number(t[0]?.value || 0)
    const sessions = Number(t[1]?.value || 0)
    const views = Number(t[2]?.value || 0)

    const channels = (sources.rows || []).map(r => ({
      source: r.dimensionValues?.[0]?.value || '(other)',
      sessions: Number(r.metricValues?.[0]?.value || 0),
    }))
    // Referring sites/sources — tidy "(direct)" and drop "(not set)".
    const referrerList = (referrers.rows || [])
      .map(r => {
        const raw = r.dimensionValues?.[0]?.value || ''
        const name = raw === '(direct)' ? 'Direct' : raw
        return { name, sessions: Number(r.metricValues?.[0]?.value || 0) }
      })
      .filter(x => x.name && x.name !== '(not set)')
    const mapLoc = (rep) => (rep.rows || [])
      .map(r => ({ name: r.dimensionValues?.[0]?.value || '(unknown)', users: Number(r.metricValues?.[0]?.value || 0) }))
      .filter(x => x.name && x.name !== '(not set)')
    const countryList = mapLoc(countries)
    const cityList = mapLoc(cities)
    // Friendly page names: "/" → "Home", strip query strings, keep the path.
    const pageList = (pages.rows || []).map(r => {
      let p = r.dimensionValues?.[0]?.value || ''
      p = p.split('?')[0]
      const name = p === '/' || p === '' ? 'Home' : p
      return { name, views: Number(r.metricValues?.[0]?.value || 0) }
    })

    const daily = (dailyRep.rows || []).map(r => {
      const d = r.dimensionValues?.[0]?.value || ''
      const date = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d
      const m = r.metricValues || []
      return { date, users: Number(m[0]?.value || 0), sessions: Number(m[1]?.value || 0), views: Number(m[2]?.value || 0) }
    })
    const pt = prevTotals.rows?.[0]?.metricValues || []
    const prev = { users: Number(pt[0]?.value || 0), sessions: Number(pt[1]?.value || 0), views: Number(pt[2]?.value || 0) }

    return json(200, {
      ok: true,
      configured: true,
      startDate,
      endDate,
      totals: { users, sessions, views },
      prev,
      daily,
      channels,
      referrers: referrerList,
      countries: countryList,
      cities: cityList,
      pages: pageList,
    })
  } catch (e) {
    console.error('ga-metrics error:', e.message)
    return json(200, { ok: true, configured: true, error: e.message })
  }
}

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }
}
