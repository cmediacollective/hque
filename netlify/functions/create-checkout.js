const Stripe = require('stripe')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const { priceId, orgId, email } = JSON.parse(event.body)

  try {
    // Use the same env var name the webhook reads (STRIPE_PRICE_APPSUMO) so the
    // direct $159 one-time link and the webhook agree on which price is one-off.
    const isOneTime = priceId === process.env.STRIPE_PRICE_APPSUMO
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: isOneTime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      allow_promotion_codes: true,
      metadata: { orgId },
      success_url: `https://h-que.com?checkout=success`,
      cancel_url: `https://h-que.com?checkout=cancelled`,
    })
    return { statusCode: 200, body: JSON.stringify({ url: session.url }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
