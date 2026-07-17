const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

// Real revenue + subscriber growth for the HQue Metrics dashboard (master admin
// only). Pulls from Stripe — the accurate source for money — for whatever date
// range the dashboard asks for (?start=YYYY-MM-DD&end=YYYY-MM-DD):
//   - revenue in range (net of refunds)
//   - new customers in range
//   - new subscriptions in range
//   - current active MRR (a "right now" figure, not range-bound)
//
// Uses the STRIPE_SECRET_KEY that already powers checkout/webhooks. If that key
// is a restricted key without read access to charges/customers/subscriptions,
// the call fails and we return a clear error the dashboard can show.
exports.handler = async (event) => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  // Gate: valid session + master admin + owner/admin role (same as hq-metrics).
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

  if (!process.env.STRIPE_SECRET_KEY) return json(200, { ok: true, configured: false })

  // Date range → unix seconds. Default to the last 30 days.
  const qs = event.queryStringParameters || {}
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '')
  const now = new Date()
  const startStr = isDate(qs.start) ? qs.start : new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10)
  const endStr = isDate(qs.end) ? qs.end : now.toISOString().slice(0, 10)
  const gte = Math.floor(new Date(`${startStr}T00:00:00Z`).getTime() / 1000)
  const lte = Math.floor(new Date(`${endStr}T23:59:59Z`).getTime() / 1000)

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  // Walk every page of a Stripe list (capped so a huge range can't run away).
  async function each(resource, params, fn) {
    let startingAfter
    for (let page = 0; page < 100; page++) {
      const res = await resource.list({ ...params, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) })
      for (const item of res.data) fn(item)
      if (!res.has_more || res.data.length === 0) break
      startingAfter = res.data[res.data.length - 1].id
    }
  }

  try {
    let revenueCents = 0, chargeCount = 0
    const dailyMap = {}
    await each(stripe.charges, { created: { gte, lte } }, (c) => {
      if (c.status === 'succeeded' && c.paid) {
        const net = (c.amount || 0) - (c.amount_refunded || 0)
        revenueCents += net
        chargeCount++
        const day = new Date((c.created || 0) * 1000).toISOString().slice(0, 10)
        dailyMap[day] = (dailyMap[day] || 0) + net
      }
    })
    // Fill every day in the range (zeros included) for a continuous line.
    const dailyRevenue = []
    for (let t = gte; t <= lte; t += 86400) {
      const day = new Date(t * 1000).toISOString().slice(0, 10)
      dailyRevenue.push({ date: day, revenue: Math.round(dailyMap[day] || 0) / 100 })
    }

    // Prior equal-length period — for the trend arrows.
    const span = lte - gte
    const prevLte = gte - 1
    const prevGte = gte - span - 1
    let prevRevenueCents = 0
    await each(stripe.charges, { created: { gte: prevGte, lte: prevLte } }, (c) => {
      if (c.status === 'succeeded' && c.paid) prevRevenueCents += (c.amount || 0) - (c.amount_refunded || 0)
    })
    let prevNewSubscriptions = 0
    await each(stripe.subscriptions, { created: { gte: prevGte, lte: prevLte }, status: 'all' }, () => { prevNewSubscriptions++ })

    let newCustomers = 0
    await each(stripe.customers, { created: { gte, lte } }, () => { newCustomers++ })

    let newSubscriptions = 0
    await each(stripe.subscriptions, { created: { gte, lte }, status: 'all' }, () => { newSubscriptions++ })

    // Current active MRR — sum active subscriptions, normalised to monthly.
    let mrrCents = 0
    await each(stripe.subscriptions, { status: 'active' }, (sub) => {
      for (const item of sub.items?.data || []) {
        const price = item.price || {}
        let amt = (price.unit_amount || 0) * (item.quantity || 1)
        const rec = price.recurring
        if (rec) {
          const n = rec.interval_count || 1
          if (rec.interval === 'year') amt = amt / (12 * n)
          else if (rec.interval === 'week') amt = (amt * 52) / (12 * n)
          else if (rec.interval === 'day') amt = (amt * 365) / (12 * n)
          else amt = amt / n // month
        }
        mrrCents += amt
      }
    })

    return json(200, {
      ok: true,
      configured: true,
      startDate: startStr,
      endDate: endStr,
      revenue: Math.round(revenueCents) / 100,
      charges: chargeCount,
      newCustomers,
      newSubscriptions,
      activeMrr: Math.round(mrrCents) / 100,
      dailyRevenue,
      prevRevenue: Math.round(prevRevenueCents) / 100,
      prevNewSubscriptions,
    })
  } catch (e) {
    console.error('stripe-metrics error:', e.message)
    return json(200, { ok: true, configured: true, error: e.message })
  }
}

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }
}
