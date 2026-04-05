import { useState } from 'react'

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '$49',
    period: '/month',
    priceId: import.meta.env.VITE_STRIPE_PRICE_STARTER,
    features: ['Up to 50 talent', '2 team members', 'Campaigns & outreach', 'Talent inquiry form']
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$99',
    period: '/month',
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO,
    features: ['Unlimited talent', '5 team members', 'Everything in Starter', 'Reports & analytics', 'Priority support'],
    recommended: true
  },
  {
    key: 'agency',
    name: 'Agency',
    price: '$199',
    period: '/month',
    priceId: import.meta.env.VITE_STRIPE_PRICE_AGENCY,
    features: ['Unlimited talent', 'Unlimited team members', 'Everything in Pro', 'Custom onboarding', 'Dedicated support']
  }
]

export default function BillingView({ dark = true, orgId, user }) {
  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#3A3A3A' : '#C4BFB8'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'

  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

  async function checkout(plan) {
    setLoading(plan.key)
    setError('')
    try {
      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId, orgId, email: user?.email })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error || 'Something went wrong')
    } catch (err) {
      setError('Failed to start checkout. Please try again.')
    }
    setLoading(null)
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '800px' }}>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '8px' }}>Billing</div>
      <div style={{ fontSize: '12px', color: muted, marginBottom: '32px', lineHeight: 1.7 }}>
        Choose a plan to unlock full access. All plans include a 14-day free trial.
      </div>

      {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '16px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {PLANS.map(plan => (
          <div key={plan.key} style={{
            background: card, border: `0.5px solid ${plan.recommended ? '#5b7c99' : border}`,
            borderRadius: '2px', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative'
          }}>
            {plan.recommended && (
              <div style={{ position: 'absolute', top: '-1px', right: '16px', background: '#5b7c99', color: '#fff', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '0 0 2px 2px' }}>
                Most Popular
              </div>
            )}
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '8px' }}>{plan.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '20px' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: text }}>{plan.price}</span>
              <span style={{ fontSize: '11px', color: muted }}>{plan.period}</span>
            </div>
            <div style={{ flex: 1, marginBottom: '20px' }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ color: '#5b7c99', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '12px', color: muted, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => checkout(plan)}
              disabled={loading === plan.key}
              style={{
                width: '100%', padding: '10px', fontSize: '9px', letterSpacing: '0.18em',
                textTransform: 'uppercase', background: plan.recommended ? '#5b7c99' : 'none',
                border: `0.5px solid ${plan.recommended ? '#5b7c99' : border2}`,
                color: plan.recommended ? '#fff' : muted,
                cursor: 'pointer', borderRadius: '1px', opacity: loading === plan.key ? 0.7 : 1
              }}>
              {loading === plan.key ? 'Loading...' : plan.key === 'appsumo' ? 'Buy Lifetime' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '24px', fontSize: '11px', color: subtle, lineHeight: 1.7 }}>
        Payments are processed securely by Stripe. You can cancel anytime from your billing portal.
        Questions? <a href='mailto:support@hque.com' style={{ color: '#5b7c99', textDecoration: 'none' }}>support@hque.com</a>
      </div>
    </div>
  )
}
