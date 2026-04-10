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

export default function UpgradeWall({ orgId, user, onLogout }) {
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
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <img src="/logo.svg" alt="HQue" style={{ width: '120px', marginBottom: '40px' }} />
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#F0ECE6', marginBottom: '8px', textAlign: 'center' }}>Your trial has ended</div>
      <div style={{ fontSize: '14px', color: '#777', marginBottom: '40px', textAlign: 'center', lineHeight: 1.7, maxWidth: '400px' }}>
        Choose a plan to continue using HQue. All plans include everything you need to run your talent agency.
      </div>

      {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '16px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', gap: '12px', width: '100%', maxWidth: '700px' }}>
        {PLANS.map(plan => (
          <div key={plan.key} style={{ background: '#222', border: `0.5px solid ${plan.recommended ? '#5b7c99' : '#2A2A2A'}`, borderRadius: '2px', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {plan.recommended && (
              <div style={{ position: 'absolute', top: '-1px', right: '16px', background: '#5b7c99', color: '#fff', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '0 0 2px 2px' }}>Most Popular</div>
            )}
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '8px' }}>{plan.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '20px' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#F0ECE6' }}>{plan.price}</span>
              <span style={{ fontSize: '11px', color: '#777' }}>{plan.period}</span>
            </div>
            <div style={{ flex: 1, marginBottom: '20px' }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ color: '#5b7c99', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '12px', color: '#999', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={() => checkout(plan)} disabled={loading === plan.key} style={{ width: '100%', padding: '10px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: plan.recommended ? '#5b7c99' : 'none', border: `0.5px solid ${plan.recommended ? '#5b7c99' : '#3A3A3A'}`, color: plan.recommended ? '#fff' : '#888', cursor: 'pointer', borderRadius: '1px', opacity: loading === plan.key ? 0.7 : 1 }}>
              {loading === plan.key ? 'Loading...' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>

      <button onClick={onLogout} style={{ marginTop: '32px', background: 'none', border: 'none', color: '#555', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        Sign out
      </button>
    </div>
  )
}
