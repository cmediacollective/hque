const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

// Cancel (or resume) the caller's subscription — owner-only.
//
// Cancelling sets Stripe to end the subscription when the already-paid period
// runs out, rather than cutting access off mid-month. We mirror that date onto
// organizations.cancel_at so Billing can say "your plan ends on X" and offer to
// resume, without calling Stripe on every page load. Resuming clears both.
//
// Body: { resume: true } to undo a pending cancellation.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const authHeader = event.headers.authorization || event.headers.Authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json(401, { error: 'Please sign in again.' })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) return json(401, { error: 'Please sign in again.' })

  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).maybeSingle()
  if (!profile?.org_id) return json(403, { error: 'No workspace found for this account.' })
  if (profile.role !== 'owner') return json(403, { error: 'Only the workspace owner can cancel the plan.' })

  const { data: org } = await supabase
    .from('organizations').select('stripe_customer_id, is_lifetime').eq('id', profile.org_id).maybeSingle()

  if (org?.is_lifetime) return json(400, { error: 'This account has lifetime access — there is no subscription to cancel.' })
  if (!org?.stripe_customer_id) return json(400, { error: 'No billing account on file.' })

  const { resume } = JSON.parse(event.body || '{}')

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    // We only store the customer, not the subscription, so find the live one.
    const subs = await stripe.subscriptions.list({ customer: org.stripe_customer_id, status: 'active', limit: 1 })
    const sub = subs.data[0]
    if (!sub) return json(400, { error: 'No active subscription found to change.' })

    const updated = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: !resume })

    const cancelAt = resume ? null : new Date(updated.current_period_end * 1000).toISOString()
    await supabase.from('organizations').update({ cancel_at: cancelAt }).eq('id', profile.org_id)

    return json(200, { ok: true, cancel_at: cancelAt })
  } catch (err) {
    return json(500, { error: err.message })
  }
}

const json = (statusCode, body) => ({ statusCode, body: JSON.stringify(body) })
