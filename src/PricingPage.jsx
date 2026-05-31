import useSEO from './useSEO'
import { useState } from 'react'
import MarketingNav from './MarketingNav'

const PLANS = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'For entrepreneurs and small teams who need a clean, simple way to manage talent and run campaigns.',
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
    description: 'For agencies and brand teams scaling their campaigns and ready for deeper analytics and workflows.',
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
    name: 'Business',
    price: '$199',
    period: '/month',
    description: 'For established agencies and brands running high-volume talent operations across multiple campaigns and clients.',
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
  { q: 'Is there a free trial?', a: 'Yes — every plan includes a 14-day free trial. No credit card required. You get full access to all features during your trial period.' },
  { q: 'Can I switch plans later?', a: 'Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.' },
  { q: 'What happens when my trial ends?', a: 'Once your 14-day trial ends, you\'ll be prompted to choose a plan to continue. If you don\'t upgrade, your account will be paused — no charges, no surprises.' },
  { q: 'Can I cancel anytime?', a: 'Yes. There are no long-term contracts. You can cancel your subscription at any time from your account settings, and you won\'t be charged again.' },
  { q: 'Do you offer discounts?', a: 'The Starter plan at $49/month is built for smaller teams, solo entrepreneurs, and those just getting started. If you have specific needs or want to discuss volume pricing, reach out to support@h-que.com.' },
]

export default function PricingPage({ onGetStarted }) {
  useSEO({
    title: 'HQue Pricing — Plans for Agencies, Brands & Entrepreneurs',
    description: 'Simple, transparent pricing for agencies, brand teams, and entrepreneurs who work with talent. Start free, upgrade as you grow.',
    canonical: 'https://h-que.com/pricing',
  })
  const [openFaq, setOpenFaq] = useState(null)
  const [hoveredPlan, setHoveredPlan] = useState(null)
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
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: isMobile ? '0 24px 60px' : '0 48px 80px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '16px' : '20px', alignItems: 'start' }}>
        {PLANS.map(plan => {
          const isHovered = hoveredPlan === plan.name
          return (
            <div
              key={plan.name}
              onMouseEnter={() => setHoveredPlan(plan.name)}
              onMouseLeave={() => setHoveredPlan(null)}
              style={{
                background: plan.highlight ? '#1A2024' : '#141414',
                border: `0.5px solid ${plan.highlight ? '#5b7c99' : (isHovered ? '#333' : '#222')}`,
                borderRadius: '3px',
                padding: isMobile ? '32px 26px' : '38px 30px',
                position: 'relative',
                transform: !isMobile && isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: plan.highlight ? '0 1px 44px rgba(91,124,153,0.10)' : 'none',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
            >
              {plan.highlight && (
                <div style={{ position: 'absolute', top: '-9px', left: '30px', background: '#5b7c99', color: '#fff', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '4px 11px', borderRadius: '2px' }}>Most Popular</div>
              )}
              <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '14px' }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '14px' }}>
                <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '52px', color: '#F0ECE6', lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: '12px', color: '#666' }}>{plan.period}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#DCDCDC', lineHeight: 1.65, marginBottom: '26px', minHeight: '44px' }}>{plan.description}</div>
              <div style={{ borderTop: '0.5px solid #262626', paddingTop: '24px', marginBottom: '28px' }}>
                {plan.features.map(f => {
                  const inherited = f.startsWith('Everything in')
                  return (
                    <div key={f} style={{ display: 'flex', gap: '11px', marginBottom: '13px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#5b7c99', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>✓</span>
                      <span style={{ fontSize: '13px', color: '#DCDCDC', fontWeight: inherited ? 500 : 400, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={onGetStarted}
                style={{
                  width: '100%', padding: '13px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase',
                  background: plan.highlight ? '#5b7c99' : 'none',
                  border: `0.5px solid ${plan.highlight ? '#5b7c99' : (isHovered ? '#3A3A3A' : '#2A2A2A')}`,
                  color: plan.highlight ? '#fff' : (isHovered ? '#F0ECE6' : '#999'),
                  cursor: 'pointer', borderRadius: '2px',
                  transition: 'color 0.2s ease, border-color 0.2s ease',
                }}
              >
                <span>Start free trial</span>
                <span style={{ display: 'inline-block', transform: isHovered ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 0.2s ease' }}>→</span>
              </button>
            </div>
          )
        })}
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
      <footer style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '40px 24px' : '60px 48px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1fr 1fr', gap: isMobile ? '32px' : '48px', maxWidth: '1100px', margin: '0 auto 48px' }}>
          <div>
            <a href="/"><img src="/logo.svg" alt="HQue" style={{ width: '100px', marginBottom: '16px', display: 'block', cursor: 'pointer' }} /></a>
            <div style={{ fontSize: '12px', color: '#DCDCDC', lineHeight: 1.7, maxWidth: '260px' }}>The CRM and workspace for agencies, brands, and entrepreneurs who work with talent.</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', marginBottom: '16px' }}>Product</div>
            {[['Features', '/#features'], ['Pricing', '/pricing'], ['FAQ', '/faq']].map(([l, h]) => (
              <div key={l} style={{ marginBottom: '10px' }}><a href={h} style={{ fontSize: '12px', color: '#aaa', textDecoration: 'none' }}>{l}</a></div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', marginBottom: '16px' }}>Resources</div>
            {[['The Pitch', '/blog'], ['Help Center', null]].map(([l, h]) => (
              <div key={l} style={{ marginBottom: '10px' }}>
                {h ? <a href={h} style={{ fontSize: '12px', color: '#aaa', textDecoration: 'none' }}>{l}</a> : <span style={{ fontSize: '12px', color: '#555' }}>{l}</span>}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', marginBottom: '16px' }}>Legal</div>
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['support@h-que.com', 'mailto:support@h-que.com']].map(([l, h]) => (
              <div key={l} style={{ marginBottom: '10px' }}><a href={h} style={{ fontSize: '12px', color: '#aaa', textDecoration: 'none' }}>{l}</a></div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '0.5px solid #1A1A1A', paddingTop: '24px', maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#DCDCDC', whiteSpace: 'nowrap' }}>© 2026 HQue. All rights reserved.</span>
          <span style={{ fontSize: '10px', color: '#DCDCDC', fontStyle: 'italic', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '60px' }}>Made for people who work with talent.</span>
        </div>
      </footer>
    </div>
  )
}
