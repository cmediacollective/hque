const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const sig = event.headers['stripe-signature']

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return { statusCode: 400, body: `Webhook error: ${err.message}` }
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

    // Fetch the session with line_items expanded
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items']
    })

    const priceId = fullSession.line_items?.data?.[0]?.price?.id
    console.log('PriceId from line items:', priceId)

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Determine plan from priceId
    let plan = null
    if (priceId === process.env.STRIPE_PRICE_STARTER) plan = 'starter'
    else if (priceId === process.env.STRIPE_PRICE_PRO) plan = 'pro'
    else if (priceId === process.env.STRIPE_PRICE_AGENCY) plan = 'agency'
    else if (priceId === process.env.STRIPE_PRICE_APPSUMO) plan = 'pro'

    console.log('Resolved plan:', plan, 'from priceId:', priceId)

    if (!plan) {
      console.error('Could not resolve plan from priceId:', priceId)
      console.error('Available price IDs:', {
        starter: process.env.STRIPE_PRICE_STARTER,
        pro: process.env.STRIPE_PRICE_PRO,
        agency: process.env.STRIPE_PRICE_AGENCY,
      })
    }

    const { error } = await supabase.from('organizations').update({
      stripe_customer_id: customerId,
      stripe_plan: plan,
      trial_ends_at: null
    }).eq('id', orgId)

    if (error) console.error('Supabase update error:', error)
    else console.log('Organization updated successfully with plan:', plan)
  }

  return { statusCode: 200, body: 'OK' }
}
