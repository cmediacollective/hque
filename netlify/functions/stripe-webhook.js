const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')
const { syncStage } = require('./klaviyo-lib')

// Look up an org (id + lifetime flag) by its Stripe customer id.
async function orgForCustomer(supabase, customerId) {
  if (!customerId) return null
  const { data } = await supabase.from('organizations').select('id, is_lifetime').eq('stripe_customer_id', customerId).maybeSingle()
  return data || null
}

// The owner's email for an org (for Klaviyo). Prefers the membership list, falls
// back to the auth record.
async function ownerEmail(supabase, orgId) {
  if (!orgId) return null
  const { data: m } = await supabase.from('org_members').select('user_id').eq('org_id', orgId).eq('role', 'owner').maybeSingle()
  if (!m) return null
  const { data: p } = await supabase.from('profiles').select('email').eq('id', m.user_id).maybeSingle()
  if (p?.email) return p.email
  const { data: u } = await supabase.auth.admin.getUserById(m.user_id).catch(() => ({ data: null }))
  return u?.user?.email || null
}

// Move an org's owner to a Klaviyo stage — never lets a Klaviyo failure affect
// the webhook's response to Stripe.
async function klaviyo(supabase, { orgId, customerId, stage }) {
  try {
    const oid = orgId || (await orgForCustomer(supabase, customerId))?.id
    const email = await ownerEmail(supabase, oid)
    if (email) await syncStage(email, stage)
  } catch (e) {
    console.error('klaviyo sync failed (non-fatal)', stage, e)
  }
}

exports.handler = async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const sig = event.headers['stripe-signature']
  if (!sig) {
    console.error('No stripe-signature header on request')
    return { statusCode: 400, body: 'Missing signature' }
  }

  // Stripe signature verification requires the EXACT raw body bytes.
  // Netlify gives us event.body as either a base64 string (when isBase64Encoded)
  // or a plain string. Convert to Buffer either way so we pass raw bytes.
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64')
    : Buffer.from(event.body, 'utf8')

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  console.log('Verified event:', stripeEvent.type)

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  if (stripeEvent.type === 'invoice.payment_failed') {
    const invoice = stripeEvent.data.object
    const customerId = invoice.customer
    console.log('Payment failed for customer:', customerId)
    if (customerId) {
      // Skip lifetime (AppSumo) orgs — they have no subscription to fall past due.
      const { data: org } = await supabase.from('organizations').select('id, past_due_since, is_lifetime').eq('stripe_customer_id', customerId).maybeSingle()
      if (org && !org.is_lifetime) {
        const update = { subscription_status: 'past_due' }
        if (!org.past_due_since) update.past_due_since = new Date().toISOString()
        const { error } = await supabase.from('organizations').update(update).eq('id', org.id)
        if (error) console.error('Supabase past_due update error:', error)
      }
    }
    return { statusCode: 200, body: 'OK' }
  }

  if (stripeEvent.type === 'invoice.payment_succeeded') {
    const invoice = stripeEvent.data.object
    const customerId = invoice.customer
    console.log('Payment succeeded for customer:', customerId)
    if (customerId) {
      const { error } = await supabase.from('organizations').update({ subscription_status: 'active', past_due_since: null }).eq('stripe_customer_id', customerId)
      if (error) console.error('Supabase recovery update error:', error)
      // Paying (or recovered) → Subscribers.
      await klaviyo(supabase, { customerId, stage: 'subscribers' })
    }
    return { statusCode: 200, body: 'OK' }
  }

  if (stripeEvent.type === 'customer.subscription.deleted') {
    const sub = stripeEvent.data.object
    const customerId = sub.customer
    console.log('Subscription deleted for customer:', customerId)
    if (customerId) {
      // Never cancel a lifetime (AppSumo) org — their access is permanent.
      const { error } = await supabase.from('organizations').update({ subscription_status: 'canceled' }).eq('stripe_customer_id', customerId).neq('is_lifetime', true)
      if (error) console.error('Supabase cancel update error:', error)
      // Canceled (and not lifetime) → Winback.
      const org = await orgForCustomer(supabase, customerId)
      if (org && !org.is_lifetime) await klaviyo(supabase, { orgId: org.id, stage: 'winback' })
    }
    return { statusCode: 200, body: 'OK' }
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    const orgId = session.metadata?.orgId
    const customerId = session.customer

    console.log('Checkout completed. orgId:', orgId, 'customerId:', customerId)

    if (!orgId) {
      console.error('No orgId in session metadata')
      return { statusCode: 200, body: 'No orgId' }
    }

    // Fetch the session with line_items expanded so we can read the price
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items']
    })

    const priceId = fullSession.line_items?.data?.[0]?.price?.id
    console.log('PriceId from line items:', priceId)

    let plan = null
    if (priceId === process.env.STRIPE_PRICE_STARTER) plan = 'starter'
    else if (priceId === process.env.STRIPE_PRICE_PRO) plan = 'pro'
    else if (priceId === process.env.STRIPE_PRICE_AGENCY) plan = 'agency'
    else if (priceId === process.env.STRIPE_PRICE_APPSUMO) plan = 'pro'

    console.log('Resolved plan:', plan, 'from priceId:', priceId)

    const { error } = await supabase.from('organizations').update({
      stripe_customer_id: customerId,
      stripe_plan: plan,
      trial_ends_at: null,
      subscription_status: 'active',
      past_due_since: null
    }).eq('id', orgId)

    if (error) console.error('Supabase update error:', error)
    else console.log('Organization updated successfully with plan:', plan)

    // Paid → Subscribers.
    await klaviyo(supabase, { orgId, customerId, stage: 'subscribers' })
  }

  return { statusCode: 200, body: 'OK' }
}
