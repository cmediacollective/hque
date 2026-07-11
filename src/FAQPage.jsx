import useSEO from './useSEO'
import { useState } from 'react'
import MarketingNav from './MarketingNav'
import Footer from './Footer'
import Linkify from './Linkify'
import { FAQS } from './faqData'

export default function FAQPage({ onGetStarted, onSignIn }) {
  useSEO({
    title: 'FAQ — HQue',
    description: 'Answers to the most common questions about HQue, the agency OS built for talent and influencer agencies.',
    canonical: 'https://h-que.com/faq',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  })
  const [open, setOpen] = useState(null)
  const isMobile = window.innerWidth < 768

  return (
    <div style={{ background: '#111', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#F0ECE6' }}>

      <MarketingNav onGetStarted={onGetStarted} onSignIn={onSignIn} />

      {/* Header */}
      <div style={{ padding: isMobile ? '100px 24px 40px' : '120px 48px 60px', textAlign: 'center', maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '16px' }}>Support</div>
        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: isMobile ? '36px' : '52px', fontWeight: 'normal', color: '#F0ECE6', lineHeight: 1.1, marginBottom: '16px' }}>
          Frequently asked questions.
        </div>
        <div style={{ fontSize: '14px', color: '#DCDCDC', lineHeight: 1.7 }}>
          Everything you need to know about HQue, in one place.
        </div>
      </div>

      {/* FAQ — single centered column */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: isMobile ? '0 24px 60px' : '0 48px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderTop: '0.5px solid #1A1A1A' }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', padding: '22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '16px', fontFamily: 'inherit' }}>
                <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '17px', color: '#F0ECE6', lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{ color: '#5b7c99', fontSize: '20px', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', marginTop: '2px' }}>+</span>
              </button>
              {open === i && <div style={{ paddingBottom: '22px', fontSize: '14px', color: '#DCDCDC', lineHeight: 1.85 }}><Linkify text={faq.a} dark /></div>}
            </div>
          ))}
          <div style={{ borderTop: '0.5px solid #1A1A1A' }} />
        </div>
      </div>

      {/* Still have questions? — centered block */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: isMobile ? '0 24px 80px' : '0 48px 100px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: isMobile ? '26px' : '32px', color: '#F0ECE6', marginBottom: '12px', fontWeight: 'normal' }}>Still have questions?</div>
        <div style={{ fontSize: '14px', color: '#DCDCDC', lineHeight: 1.7, marginBottom: '24px' }}>
          Our team is happy to help. We usually respond within a few hours.
        </div>
        <a href="mailto:support@h-que.com" style={{ display: 'inline-block', padding: '14px 36px', background: '#5b7c99', color: '#fff', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: '1px' }}>Contact Support →</a>
      </div>

      {/* Ready to get started? — full-width CTA */}
      <div style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '48px 24px' : '64px 48px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: isMobile ? '28px' : '40px', color: '#F0ECE6', marginBottom: '16px', fontWeight: 'normal' }}>Ready to get started?</div>
        <div style={{ fontSize: '13px', color: '#DCDCDC', marginBottom: '32px' }}>14-day free trial. No credit card required.</div>
        <button onClick={onGetStarted} style={{ padding: '14px 40px', background: '#5b7c99', border: 'none', color: '#fff', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '1px' }}>Start Free Trial →</button>
      </div>

      <Footer />
    </div>
  )
}
