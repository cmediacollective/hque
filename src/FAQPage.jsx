import useSEO from './useSEO'
import { useState } from 'react'
import MarketingNav from './MarketingNav'
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
