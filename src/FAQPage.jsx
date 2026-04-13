import { useState } from 'react'

const FAQS = [
  { q: 'What is HQue?', a: 'HQue is an operating system for talent agencies and brands built on talent partnerships. It replaces spreadsheets, email threads, and disconnected tools with one platform for managing your roster, campaigns, payments, and team.' },
  { q: 'Who is HQue for?', a: 'HQue is built for influencer marketing agencies, talent management companies, and brand partnerships teams. If you manage a roster of creators or public figures and run campaigns on their behalf, HQue was made for you.' },
  { q: 'How is HQue different from Monday.com or a spreadsheet?', a: 'Spreadsheets break quickly. Monday.com is generic — it has no concept of talent, campaigns, or brand partnerships. HQue is purpose-built for the way agencies actually work.' },
  { q: 'Can multiple team members use HQue?', a: 'Yes. All plans include multiple team members. Starter includes 2 seats, Pro includes 5, and Agency includes unlimited seats.' },
  { q: 'Is there a free trial?', a: 'Yes — every plan starts with a 14-day free trial. No credit card required. You\'ll have full access to all features during your trial.' },
  { q: 'What happens after my trial ends?', a: 'You\'ll be prompted to choose a plan to continue. Your data is never deleted — if you need more time, reach out to us at support@hque.com.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No long-term contracts. Cancel anytime from your billing settings and you\'ll retain access until the end of your billing period.' },
  { q: 'Do you offer discounts for smaller agencies?', a: 'We built the Starter plan specifically for smaller teams at $49/month. If you\'re a solo operator or just getting started, reach out to support@hque.com.' },
]

export default function FAQPage() {
  const [open, setOpen] = useState(null)

  return (
    <div style={{ background: '#111', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#F0ECE6' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '80px 24px' }}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '48px' }}>
          <img src="/logo.svg" alt="HQue" style={{ width: '100px' }} />
        </a>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '16px' }}>Support</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 'normal', color: '#F0ECE6', marginBottom: '12px' }}>Frequently asked questions</div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '56px' }}>Can't find what you're looking for? Email us at <a href="mailto:support@hque.com" style={{ color: '#5b7c99', textDecoration: 'none' }}>support@hque.com</a></div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderTop: '0.5px solid #222' }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '16px' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#F0ECE6', lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{ color: '#5b7c99', fontSize: '20px', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
              </button>
              {open === i && <div style={{ paddingBottom: '20px', fontSize: '14px', color: '#666', lineHeight: 1.8 }}>{faq.a}</div>}
            </div>
          ))}
          <div style={{ borderTop: '0.5px solid #222' }} />
        </div>
        <div style={{ marginTop: '64px', padding: '32px', background: '#1A1A1A', border: '0.5px solid #222', borderRadius: '2px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F0ECE6', marginBottom: '8px' }}>Still have questions?</div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>We're happy to help. Reach out anytime.</div>
          <a href="mailto:support@hque.com" style={{ display: 'inline-block', padding: '10px 24px', background: '#5b7c99', color: '#fff', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', borderRadius: '1px' }}>Contact support</a>
        </div>
        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <a href="/" style={{ fontSize: '10px', color: '#444', textDecoration: 'none', letterSpacing: '0.1em' }}>Back to HQue</a>
        </div>
      </div>
    </div>
  )
}
