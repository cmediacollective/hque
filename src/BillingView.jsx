import { useState, useEffect } from 'react'
import { supabase } from './supabase'

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
    features: ['Unlimited talent', 'Unlimited team members', 'Everything in Pro', 'Custom onboarding', 'Dedicated support', 'Remove HQue branding']
  }
]

export default function BillingView({ dark = true, orgId, user }) {
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#3A3A3A' : '#C4BFB8'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const isMobile = window.innerWidth < 768

  const [loading, setLoading] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState('')
  const [stripeCustomerId, setStripeCustomerId] = useState(null)
  const [stripePlan, setStripePlan] = useState(null)

  useEffect(() => { fetchOrgBilling() }, [])

  async function fetchOrgBilling() {
    const { data } = await supabase.from('organizations').select('stripe_customer_id, stripe_plan').eq('id', orgId).single()
    if (data?.stripe_customer_id) setStripeCustomerId(data.stripe_customer_id)
    if (data?.stripe_plan) setStripePlan(data.stripe_plan)
  }

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

  async function openPortal() {
    if (!stripeCustomerId) return
    setPortalLoading(true)
    try {
      const res = await fetch('/.netlify/functions/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: stripeCustomerId })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error || 'Something went wrong')
    } catch (err) {
      setError('Failed to open billing portal.')
    }
    setPortalLoading(false)
  }

  const currentPlan = PLANS.find(p => p.key === stripePlan)

  return (
    <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '8px' }}>Billing</div>

      {currentPlan && (
        <div style={{ background: card, border: `0.5px solid #5b7c99`, borderRadius: '2px', padding: '20px 24px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '4px' }}>Current Plan</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: text }}>{currentPlan.name} — {currentPlan.price}{currentPlan.period}</div>
          </div>
          <button onClick={openPortal} disabled={portalLoading} style={{ padding: '9px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px', opacity: portalLoading ? 0.7 : 1 }}>
            {portalLoading ? 'Loading...' : 'Manage Billing & Invoices'}
          </button>
        </div>
      )}

      {!currentPlan && (
        <div style={{ fontSize: '12px', color: muted, marginBottom: '32px', lineHeight: 1.7 }}>
          Choose a plan to unlock full access. All plans include a 14-day free trial.
        </div>
      )}

      {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '16px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {PLANS.map(plan => (
          <div key={plan.key} style={{
            background: card,
            border: `0.5px solid ${plan.key === stripePlan ? '#5b7c99' : plan.recommended ? '#5b7c99' : border}`,
            borderRadius: '2px', padding: '32px 28px',
            display: 'flex', flexDirection: 'column', position: 'relative',
            opacity: stripePlan && plan.key !== stripePlan ? 0.6 : 1
          }}>
            {plan.recommended && !stripePlan && (
              <div style={{ position: 'absolute', top: '-1px', right: '20px', background: '#5b7c99', color: '#fff', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 2px 2px' }}>
                Most Popular
              </div>
            )}
            {plan.key === stripePlan && (
              <div style={{ position: 'absolute', top: '-1px', right: '20px', background: '#5C9E52', color: '#fff', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 2px 2px' }}>
                Current Plan
              </div>
            )}
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px' }}>{plan.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '28px' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '36px', color: text }}>{plan.price}</span>
              <span style={{ fontSize: '12px', color: muted }}>{plan.period}</span>
            </div>
            <div style={{ flex: 1, marginBottom: '28px', borderTop: `0.5px solid ${border}`, paddingTop: '20px' }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ color: '#5b7c99', fontSize: '13px', marginTop: '1px', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '13px', color: muted, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => plan.key === stripePlan ? openPortal() : checkout(plan)}
              disabled={loading === plan.key || portalLoading}
              style={{
                width: '100%', padding: '13px', fontSize: '9px', letterSpacing: '0.18em',
                textTransform: 'uppercase',
                background: plan.key === stripePlan ? 'none' : plan.recommended ? '#5b7c99' : 'none',
                border: `0.5px solid ${plan.key === stripePlan ? '#5C9E52' : plan.recommended ? '#5b7c99' : border2}`,
                color: plan.key === stripePlan ? '#5C9E52' : plan.recommended ? '#fff' : muted,
                cursor: 'pointer', borderRadius: '1px', opacity: loading === plan.key ? 0.7 : 1
              }}>
              {loading === plan.key ? 'Loading...' : plan.key === stripePlan ? 'Manage Plan' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '11px', color: subtle, lineHeight: 1.7 }}>
        Payments processed securely by Stripe. Click Manage Plan above to cancel or update your subscription through Stripe's billing portal. Questions? <a href='mailto:support@h-que.com' style={{ color: '#5b7c99', textDecoration: 'none' }}>support@h-que.com</a>
      </div>
    </div>
  )
}
