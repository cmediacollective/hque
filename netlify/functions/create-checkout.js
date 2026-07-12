const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

// Start a Stripe checkout for a plan.
//
// Security: choosing/paying for a plan is owner-only. We validate the caller's
// Supabase session and derive the org from THEIR profile rather than trusting an
// orgId sent by the browser, so nobody can start a checkout against another
// workspace.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  // 1. Who is asking?
  const authHeader = event.headers.authorization || event.headers.Authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json(401, { error: 'Please sign in again.' })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) return json(401, { error: 'Please sign in again.' })

  // 2. Are they the owner of their org?
  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).maybeSingle()
  if (!profile?.org_id) return json(403, { error: 'No workspace found for this account.' })
  if (profile.role !== 'owner') {
    return json(403, { error: 'Only the workspace owner can choose a plan.' })
  }

  const { priceId } = JSON.parse(event.body || '{}')
  if (!priceId) return json(400, { error: 'No plan selected.' })

  const orgId = profile.org_id

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    // Use the same env var name the webhook reads (STRIPE_PRICE_APPSUMO) so the
    // direct $159 one-time link and the webhook agree on which price is one-off.
    const isOneTime = priceId === process.env.STRIPE_PRICE_APPSUMO
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: isOneTime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      allow_promotion_codes: true,
      metadata: { orgId },
      success_url: `https://h-que.com?checkout=success`,
      cancel_url: `https://h-que.com?checkout=cancelled`,
    })
    return json(200, { url: session.url })
  } catch (err) {
    return json(500, { error: err.message })
  }
}

const json = (statusCode, body) => ({ statusCode, body: JSON.stringify(body) })
