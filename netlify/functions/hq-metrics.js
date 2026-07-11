const { createClient } = require('@supabase/supabase-js')

// HQ business metrics for the marketing team (master admin only).
// Returns platform-wide numbers that live in OUR database: subscribers by plan,
// trials, AppSumo redemptions, and signups over time. Money detail (exact
// revenue, promo codes used) lives in Stripe; traffic lives in Google Analytics.
//
// Security: this reads across EVERY org, so it must never be exposed to a normal
// customer. We verify the caller's Supabase session token and confirm they are a
// platform admin (a row in platform_admins) before returning anything. Only then
// do we use the service-role key, which bypasses RLS, to gather the aggregates.
exports.handler = async (event) => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  // 1. Who is asking? Validate the bearer token from the logged-in browser.
  const authHeader = event.headers.authorization || event.headers.Authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json(401, { ok: false, reason: 'no_auth' })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) return json(401, { ok: false, reason: 'bad_auth' })

  // 2. Are they a master admin AND an owner/admin? If not, refuse — no data
  //    leaks. Master account (platform_admins) gates WHICH account; owner/admin
  //    role gates WHO on that account. Both required.
  const [{ data: admin }, { data: profile }] = await Promise.all([
    supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ])
  if (!admin) return json(403, { ok: false, reason: 'not_admin' })
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return json(403, { ok: false, reason: 'not_admin' })
  }

  // 3. Gather the aggregates.
  try {
    const [{ data: orgs }, { data: codes }] = await Promise.all([
      supabase
        .from('organizations')
        .select('id, name, stripe_plan, subscription_status, is_lifetime, trial_ends_at, created_at'),
      supabase
        .from('appsumo_codes')
        .select('code, status, redeemed_by, redeemed_at, created_at'),
    ])

    const orgList = orgs || []
    const codeList = codes || []
    const now = Date.now()
    const PRICE = { starter: 49, pro: 99, agency: 199 }

    // Orgs that redeemed an AppSumo code — used to split lifetime accounts into
    // paid AppSumo deals vs. free comps granted from Settings → Comps.
    const appsumoOrgIds = new Set(codeList.filter(c => c.status === 'redeemed' && c.redeemed_by).map(c => c.redeemed_by))

    // --- Subscribers -----------------------------------------------------
    const s = {
      total: orgList.length,
      paying: 0,
      lifetime: 0,
      comps: 0,
      trialing: 0,
      trialExpired: 0,
      pastDue: 0,
      canceled: 0,
      byPlan: { starter: 0, pro: 0, agency: 0 },
      mrr: 0,
    }
    for (const o of orgList) {
      if (o.is_lifetime) { if (appsumoOrgIds.has(o.id)) s.lifetime++; else s.comps++; continue }
      if (o.stripe_plan && o.subscription_status === 'active') {
        s.paying++
        if (s.byPlan[o.stripe_plan] != null) s.byPlan[o.stripe_plan]++
        s.mrr += PRICE[o.stripe_plan] || 0
        continue
      }
      if (o.subscription_status === 'past_due') { s.pastDue++; continue }
      if (o.subscription_status === 'canceled') { s.canceled++; continue }
      const t = o.trial_ends_at ? new Date(o.trial_ends_at).getTime() : null
      if (t && t > now) s.trialing++
      else if (t && t <= now) s.trialExpired++
    }

    // --- AppSumo ---------------------------------------------------------
    const nameById = {}
    for (const o of orgList) nameById[o.id] = o.name || 'Unnamed org'
    const redeemed = codeList.filter(c => c.status === 'redeemed')
    const appsumo = {
      total: codeList.length,
      redeemed: redeemed.length,
      unused: codeList.length - redeemed.length,
      redemptionRate: codeList.length ? Math.round((redeemed.length / codeList.length) * 100) : 0,
      recent: redeemed
        .filter(c => c.redeemed_at)
        .sort((a, b) => new Date(b.redeemed_at) - new Date(a.redeemed_at))
        .slice(0, 25)
        .map(c => ({ code: c.code, orgName: nameById[c.redeemed_by] || '—', redeemedAt: c.redeemed_at })),
      byMonth: byMonth(redeemed.map(c => c.redeemed_at)),
    }

    // --- Signups (new orgs) over time ------------------------------------
    const created = orgList.map(o => o.created_at).filter(Boolean)
    const day = 24 * 60 * 60 * 1000
    const signups = {
      last7: created.filter(d => now - new Date(d).getTime() <= 7 * day).length,
      last30: created.filter(d => now - new Date(d).getTime() <= 30 * day).length,
      byMonth: byMonth(created),
    }

    return json(200, { ok: true, generatedAt: new Date().toISOString(), subscribers: s, appsumo, signups })
  } catch (e) {
    console.error('hq-metrics error:', e.message)
    return json(500, { ok: false, reason: 'server_error' })
  }
}

// Group ISO timestamps into the last 6 calendar months → [{ month:'2026-02', label:'Feb', count }].
function byMonth(dates) {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const counts = {}
  for (const d of dates) {
    if (!d) continue
    const dt = new Date(d)
    if (isNaN(dt)) continue
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    counts[key] = (counts[key] || 0) + 1
  }
  // Build the trailing 6 months off the newest date we saw (avoids Date.now bias
  // in empty months and keeps the axis stable).
  const anchor = dates.length
    ? new Date(Math.max(...dates.map(d => new Date(d).getTime()).filter(n => !isNaN(n))))
    : new Date()
  const out = []
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    out.push({ month: key, label: M[dt.getMonth()], count: counts[key] || 0 })
  }
  return out
}

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }
}
