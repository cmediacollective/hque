import useSEO from './useSEO'
import { useState } from 'react'
import MarketingNav from './MarketingNav'

const PLANS = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'Perfect for solo operators and small teams just getting started.',
    features: [
      'Up to 50 talent',
      '2 team members',
      'Talent roster management',
      'Campaign tracking',
      'Talent inquiry form',
      'Basic reporting',
      'Email support',
    ]
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/month',
    description: 'For growing agencies that need more power and deeper insights.',
    highlight: true,
    features: [
      'Unlimited talent',
      '5 team members',
      'Everything in Starter',
      'Advanced reports & analytics',
      'Payment tracking',
      'Workspace & task management',
      'Priority support',
    ]
  },
  {
    name: 'Agency',
    price: '$199',
    period: '/month',
    description: 'For established agencies running multiple clients and campaigns.',
    features: [
      'Unlimited everything',
      'Unlimited team members',
      'Everything in Pro',
      'Custom onboarding',
      'Dedicated account support',
      'Custom branding on PDFs & talent inquiries',
      'Early access to new features',
    ]
  },
]

const FAQS = [
  { q: 'Is there a free trial?', a: 'Yes — every plan starts with a 14-day free trial. No credit card required. You get full access to all features during your trial.' },
  { q: 'Can I switch plans later?', a: 'Yes. You can upgrade or downgrade at any time from your billing settings. Changes take effect at the start of your next billing cycle.' },
  { q: 'What happens when my trial ends?', a: 'You\'ll be prompted to choose a plan. Your data is never deleted — reach out to support@h-que.com if you need more time.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No long-term contracts. Cancel from your billing settings and you\'ll retain access until the end of your billing period.' },
  { q: 'Do you offer discounts for smaller agencies?', a: 'The Starter plan at $49/month is built for smaller teams. If you have specific needs, reach out to support@h-que.com.' },
]

export default function PricingPage({ onGetStarted }) {
  useSEO({
    title: 'Pricing — HQue',
    description: 'Simple, transparent pricing for talent and influencer agencies of every size. Start free, upgrade as you grow.',
    canonical: 'https://h-que.com/pricing',
  })
  const [openFaq, setOpenFaq] = useState(null)
  const isMobile = window.innerWidth < 768

  return (
    <div style={{ background: '#111', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#F0ECE6' }}>

      <MarketingNav onGetStarted={onGetStarted} />

      {/* Header */}
      <div style={{ padding: isMobile ? '100px 24px 40px' : '120px 48px 60px', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '16px' }}>Pricing</div>
        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: isMobile ? '36px' : '52px', fontWeight: 'normal', color: '#F0ECE6', lineHeight: 1.1, marginBottom: '16px' }}>
          Simple, transparent pricing.
        </div>
        <div style={{ fontSize: '14px', color: '#666', lineHeight: 1.7 }}>
          14-day free trial on all plans. No credit card required. Cancel anytime.
        </div>
      </div>

      {/* Plans */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '0 24px 60px' : '0 48px 80px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '16px' : '24px', background: 'none' }}>
        {PLANS.map(plan => (
          <div key={plan.name} style={{ background: plan.highlight ? '#1E2428' : '#111', padding: '36px 28px', position: 'relative' }}>
            {plan.highlight && (
              <div style={{ position: 'absolute', top: '-1px', right: '20px', background: '#5b7c99', color: '#fff', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 2px 2px' }}>Most Popular</div>
            )}
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px' }}>{plan.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '48px', color: '#F0ECE6', lineHeight: 1 }}>{plan.price}</span>
              <span style={{ fontSize: '12px', color: '#555' }}>{plan.period}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.6, marginBottom: '28px', minHeight: '44px' }}>{plan.description}</div>
            <div style={{ borderTop: '0.5px solid #1E1E1E', paddingTop: '24px', marginBottom: '28px' }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#5b7c99', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                  <span style={{ fontSize: '13px', color: '#777', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={onGetStarted} style={{ width: '100%', padding: '13px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: plan.highlight ? '#5b7c99' : 'none', border: `0.5px solid ${plan.highlight ? '#5b7c99' : '#2A2A2A'}`, color: plan.highlight ? '#fff' : '#666', cursor: 'pointer', borderRadius: '1px' }}>
              Start free trial
            </button>
          </div>
        ))}
      </div>

      {/* Compare note */}
      <div style={{ textAlign: 'center', padding: '0 24px 80px', fontSize: '12px', color: '#444' }}>
        All plans include a 14-day free trial · Prices in USD · Billed monthly
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: isMobile ? '0 24px 80px' : '0 48px 100px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '16px', textAlign: 'center' }}>FAQ</div>
        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '28px', color: '#F0ECE6', marginBottom: '40px', textAlign: 'center', fontWeight: 'normal' }}>Pricing questions</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderTop: '0.5px solid #1A1A1A' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '16px' }}>
                <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#F0ECE6', lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{ color: '#5b7c99', fontSize: '20px', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
              </button>
              {openFaq === i && <div style={{ paddingBottom: '20px', fontSize: '13px', color: '#666', lineHeight: 1.9 }}>{faq.a}</div>}
            </div>
          ))}
          <div style={{ borderTop: '0.5px solid #1A1A1A' }} />
        </div>
      </div>

      {/* CTA */}
      <div style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '48px 24px' : '64px 48px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: isMobile ? '28px' : '40px', color: '#F0ECE6', marginBottom: '16px', fontWeight: 'normal' }}>Ready to get started?</div>
        <div style={{ fontSize: '13px', color: '#555', marginBottom: '32px' }}>14-day free trial. No credit card required.</div>
        <button onClick={onGetStarted} style={{ padding: '14px 40px', background: '#5b7c99', border: 'none', color: '#fff', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '1px' }}>Start free trial</button>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '20px 24px' : '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#2A2A2A' }}>© 2026 HQue. All rights reserved.</span>
        <a href="/" style={{ fontSize: '10px', color: '#333', textDecoration: 'none', letterSpacing: '0.1em' }}>← Back to home</a>
      </div>
    </div>
  )
}
