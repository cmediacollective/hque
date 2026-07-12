const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

// Open the Stripe billing portal (update card, cancel, view invoices).
//
// Security: the portal lets you change and cancel a subscription, so the caller
// must be proven to be the OWNER of the account being billed. We do NOT trust a
// customerId sent from the browser — that would let anyone open any customer's
// portal. Instead we validate the caller's Supabase session, look up their own
// org, and use the customer id stored on that org.
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
    return json(403, { error: 'Only the workspace owner can manage billing.' })
  }

  // 3. Bill the customer on THEIR org — never one named by the browser.
  const { data: org } = await supabase
    .from('organizations').select('stripe_customer_id').eq('id', profile.org_id).maybeSingle()
  const customerId = org?.stripe_customer_id
  if (!customerId) return json(400, { error: 'No billing account on file. Please contact support.' })

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://h-que.com',
    })
    return json(200, { url: session.url })
  } catch (err) {
    return json(500, { error: err.message })
  }
}

const json = (statusCode, body) => ({ statusCode, body: JSON.stringify(body) })
