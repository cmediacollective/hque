import useSEO from './useSEO'
import { useState } from 'react'
import MarketingNav from './MarketingNav'

const FAQS = [
  { q: 'What is HQue?', a: 'HQue is an operating system for talent agencies and brands built on talent partnerships. It replaces spreadsheets, email threads, and disconnected tools with one platform for managing your roster, campaigns, payments, and team.' },
  { q: 'Who is HQue for?', a: 'HQue is built for influencer marketing agencies, talent management companies, and brand partnerships teams. If you manage a roster of creators or public figures and run campaigns on their behalf, HQue was made for you.' },
  { q: 'How is HQue different from Monday.com or a spreadsheet?', a: 'Spreadsheets break quickly. Monday.com is generic — it has no concept of talent, campaigns, or brand partnerships. HQue is purpose-built for the way agencies actually work.' },
  { q: 'Can multiple team members use HQue?', a: 'Yes. All plans include multiple team members. Starter includes 2 seats, Pro includes 5, and Agency includes unlimited seats.' },
  { q: 'Is there a free trial?', a: 'Yes — every plan starts with a 14-day free trial. No credit card required. You\'ll have full access to all features during your trial.' },
  { q: 'What happens after my trial ends?', a: 'You\'ll be prompted to choose a plan to continue. Your data is never deleted — if you need more time, reach out to us at support@h-que.com.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No long-term contracts. Cancel anytime from your billing settings and you\'ll retain access until the end of your billing period.' },
  { q: 'Do you offer discounts for smaller agencies?', a: 'We built the Starter plan at $49/month specifically for smaller teams. If you\'re a solo operator just getting started, reach out to support@h-que.com.' },
]

export default function FAQPage() {
  useSEO({
    title: 'FAQ — HQue',
    description: 'Answers to the most common questions about HQue, the agency OS built for talent and influencer agencies.',
    canonical: 'https://h-que.com/faq',
  })
  const [open, setOpen] = useState(null)
  const isMobile = window.innerWidth < 768
  const left = FAQS.filter((_, i) => i % 2 === 0)
  const right = FAQS.filter((_, i) => i % 2 !== 0)

  return (
    <div style={{ background: '#111', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      <MarketingNav onGetStarted={() => window.location.href = '/'} />

      {/* Hero */}
      <div style={{ padding: isMobile ? '60px 24px 40px' : '80px 48px 60px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '16px' }}>Support</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '36px' : '56px', fontWeight: 'normal', color: '#F0ECE6', lineHeight: 1.05 }}>
            Frequently<br />asked questions.
          </div>
        </div>
        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
          <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>Still have questions?</div>
          <a href="mailto:support@h-que.com" style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', textDecoration: 'none' }}>support@h-que.com →</a>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '0.5px', background: '#1A1A1A', maxWidth: '1100px', margin: '0 auto 60px' }} />

      {/* Two column FAQ */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 24px 80px' : '0 48px 100px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 60px' }}>
        {(isMobile ? FAQS : left).map((faq, i) => {
          const idx = isMobile ? i : i * 2
          return (
            <div key={idx} style={{ borderTop: '0.5px solid #1A1A1A', marginBottom: '0' }}>
              <button onClick={() => setOpen(open === idx ? null : idx)} style={{ width: '100%', padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '16px' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#F0ECE6', lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{ color: '#5b7c99', fontSize: '18px', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: open === idx ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', marginTop: '2px' }}>+</span>
              </button>
              {open === idx && <div style={{ paddingBottom: '24px', fontSize: '13px', color: '#666', lineHeight: 1.9 }}>{faq.a}</div>}
            </div>
          )
        })}
        {!isMobile && right.map((faq, i) => {
          const idx = i * 2 + 1
          return (
            <div key={idx} style={{ borderTop: '0.5px solid #1A1A1A' }}>
              <button onClick={() => setOpen(open === idx ? null : idx)} style={{ width: '100%', padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '16px' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#F0ECE6', lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{ color: '#5b7c99', fontSize: '18px', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: open === idx ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', marginTop: '2px' }}>+</span>
              </button>
              {open === idx && <div style={{ paddingBottom: '24px', fontSize: '13px', color: '#666', lineHeight: 1.9 }}>{faq.a}</div>}
            </div>
          )
        })}
      </div>

      {/* CTA bar */}
      <div style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '40px 24px' : '48px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '20px' }}>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#F0ECE6', marginBottom: '6px' }}>Still have questions?</div>
          <div style={{ fontSize: '13px', color: '#555' }}>Our team is happy to help. We usually respond within a few hours.</div>
        </div>
        <a href="mailto:support@h-que.com" style={{ display: 'inline-block', padding: '12px 28px', background: '#5b7c99', color: '#fff', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: '1px', whiteSpace: 'nowrap' }}>Contact support</a>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '20px 24px' : '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#2A2A2A' }}>© 2026 HQue</span>
        <a href="/" style={{ fontSize: '10px', color: '#333', textDecoration: 'none', letterSpacing: '0.1em' }}>← Back to home</a>
      </div>
    </div>
  )
}
