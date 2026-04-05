const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const sig = event.headers['stripe-signature']

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return { statusCode: 400, body: `Webhook error: ${err.message}` }
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    const orgId = session.metadata?.orgId
    const customerId = session.customer
    const priceId = session.line_items?.data?.[0]?.price?.id

    if (!orgId) return { statusCode: 200, body: 'No orgId' }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Determine plan from priceId
    let plan = null
    if (priceId === process.env.VITE_STRIPE_PRICE_STARTER) plan = 'starter'
    else if (priceId === process.env.VITE_STRIPE_PRICE_PRO) plan = 'pro'
    else if (priceId === process.env.VITE_STRIPE_PRICE_AGENCY) plan = 'agency'
    else if (priceId === process.env.VITE_STRIPE_PRICE_APPSUMO) plan = 'pro'

    await supabase.from('organizations').update({
      stripe_customer_id: customerId,
      stripe_plan: plan,
      trial_ends_at: null
    }).eq('id', orgId)
  }

  return { statusCode: 200, body: 'OK' }
}
