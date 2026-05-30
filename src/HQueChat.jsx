import { useState } from 'react'

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim())

const TOPICS = [
  {
    id: 1,
    label: 'What is HQue?',
    ctas: ['trial', 'pricing'],
    answer: (
      <>
        <p>HQue is a CRM and workspace built for people who work with talent. It replaces the spreadsheets, email threads, and scattered tools most teams are using today.</p>
        <p>You get a talent roster, campaign tracking, a team workspace, and reporting — all in one place, built specifically for how talent-driven work actually runs.</p>
      </>
    ),
  },
  {
    id: 2,
    label: 'Who is it for?',
    ctas: ['trial', 'pricing'],
    answer: (
      <>
        <p>HQue is built for three types of people:</p>
        <p><strong>Agencies</strong> — talent agencies, management firms, and booking teams managing rosters and campaigns across multiple clients.</p>
        <p><strong>Brand Teams</strong> — in-house marketing and partnerships teams running talent campaigns like seasonal activations, product launches, or creator programs.</p>
        <p><strong>Entrepreneurs</strong> — independent managers, founders, and one-person teams building their roster and managing deals on their own.</p>
        <p>If you work with talent in any capacity, HQue was built for you.</p>
      </>
    ),
  },
  {
    id: 3,
    label: 'How does pricing work?',
    ctas: ['trial', 'pricing'],
    answer: (
      <>
        <p>HQue has three plans:</p>
        <p><strong>Starter</strong> at $49/month — for entrepreneurs and small teams just getting started. Up to 50 talent, 2 team members.</p>
        <p><strong>Pro</strong> at $99/month — for growing agencies and brand teams. Unlimited talent, 5 team members, advanced reporting, payment tracking, and workspace tools.</p>
        <p><strong>Business</strong> at $199/month — for established agencies and teams running multiple campaigns and clients. Unlimited everything, custom onboarding, dedicated support, and custom branding.</p>
        <p>All plans include a 14-day free trial. No credit card required.</p>
      </>
    ),
  },
  {
    id: 4,
    label: 'Is there a free trial?',
    ctas: ['trial'],
    answer: (
      <>
        <p>Yes — every plan comes with a full 14-day free trial. No credit card required, no commitments.</p>
        <p>You get complete access from day one so you can test everything before spending a dollar. If it's not the right fit, just don't upgrade. No pressure.</p>
      </>
    ),
  },
  {
    id: 5,
    label: 'What types of talent can I manage?',
    ctas: ['trial', 'pricing'],
    answer: (
      <>
        <p>HQue works for any type of talent roster — it's not limited to influencers. You can manage:</p>
        <p>Actors · UGC Creators · Influencers · Speakers · Hosts · Podcast Guests · Athletes · Models · Voiceover Artists · Wellness &amp; Lifestyle Talent</p>
        <p>Each talent profile stores social handles, contact info, rates, outreach history, and more. Whatever your roster looks like, HQue works with it.</p>
      </>
    ),
  },
  {
    id: 6,
    label: 'How is this different from a spreadsheet or CRM?',
    ctas: ['trial', 'pricing'],
    answer: (
      <>
        <p>Spreadsheets break down the moment your roster grows or your team adds a second person. And general CRMs like HubSpot or Salesforce weren't built for talent — you'd spend more time customizing them than actually using them.</p>
        <p>HQue gives you everything out of the box: a talent database, campaign pipeline, team workspace, and payment tracking — all designed around how agencies and brand teams actually work. No setup required, no duct tape.</p>
      </>
    ),
  },
  {
    id: 7,
    label: 'Can my whole team use it?',
    ctas: ['trial', 'pricing'],
    answer: (
      <>
        <p>Yes. Every plan supports multiple team members:</p>
        <p><strong>Starter</strong> — 2 seats<br /><strong>Pro</strong> — 5 seats<br /><strong>Business</strong> — unlimited seats</p>
        <p>Everyone on your team gets full access. You can collaborate on campaigns, assign tasks, and manage your roster together — all in the same platform.</p>
      </>
    ),
  },
  {
    id: 8,
    label: 'Talk to support',
    ctas: ['trial', 'support'],
    answer: (
      <>
        <p>Our team is happy to help. Send us a message at <a href="mailto:support@h-que.com" style={{ color: '#5b7c99', textDecoration: 'none', borderBottom: '0.5px solid #5b7c99' }}>support@h-que.com</a> and we'll get back to you within one business day.</p>
        <p>If you'd like to see HQue in action before reaching out, you can start a free 14-day trial anytime — no credit card required.</p>
      </>
    ),
  },
]

const primaryBtn = {
  display: 'block', textAlign: 'center', padding: '11px',
  background: '#5b7c99', color: '#fff', textDecoration: 'none',
  fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
  borderRadius: '3px', border: 'none', cursor: 'pointer',
}
const secondaryBtn = {
  display: 'block', textAlign: 'center', padding: '11px',
  background: 'none', color: '#aaa', textDecoration: 'none',
  border: '0.5px solid #2A2A2A',
  fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
  borderRadius: '3px', cursor: 'pointer',
}

function CtaRow({ ctas }) {
  return (
    <div style={{ padding: '12px 16px 16px', borderTop: '0.5px solid #2A2A2A', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
      {ctas.includes('trial') && <a href="/signup" style={primaryBtn}>Start Free Trial →</a>}
      {ctas.includes('pricing') && <a href="/#pricing" style={secondaryBtn}>See Pricing</a>}
      {ctas.includes('support') && <a href="mailto:support@h-que.com" style={secondaryBtn}>Email Support →</a>}
    </div>
  )
}

export default function HQueChat() {
  const [open, setOpen] = useState(false)
  const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('hque_chat_email') : ''
  const [step, setStep] = useState(savedEmail ? 'topics' : 'email')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTopicId, setActiveTopicId] = useState(null)

  async function submitEmail() {
    if (submitting) return
    if (!isValidEmail(email)) { setEmailError('Please enter a valid email address'); return }
    setSubmitting(true); setEmailError('')
    try {
      await fetch('/.netlify/functions/subscribe-mailchimp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
    } catch {}
    localStorage.setItem('hque_chat_email', email.trim())
    setSubmitting(false)
    setStep('topics')
  }

  function openTopic(id) {
    setActiveTopicId(id)
    setStep('answer')
  }

  function backToTopics() {
    setActiveTopicId(null)
    setStep('topics')
  }

  const activeTopic = TOPICS.find(t => t.id === activeTopicId)

  return (
    <>
      {open && (
        <div style={{ position: 'fixed', bottom: '90px', right: '24px', width: '340px', height: '480px', background: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '8px', display: 'flex', flexDirection: 'column', zIndex: 1000, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '16px 20px', background: '#111', borderBottom: '0.5px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#5b7c99', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#F0ECE6', fontWeight: 500 }}>HQue Assistant</div>
                <div style={{ fontSize: '9px', color: '#5C9E52', letterSpacing: '0.1em' }}>● Online</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
          </div>

          {/* Step 1 — Email capture */}
          {step === 'email' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#F0ECE6', marginBottom: '8px' }}>Before we dive in —</div>
              <div style={{ fontSize: '12px', color: '#DCDCDC', lineHeight: 1.6, marginBottom: '20px' }}>Drop your email and we'll send you helpful resources, tips, and updates from HQue.</div>
              <input
                value={email}
                onChange={e => { setEmail(e.target.value); if (emailError) setEmailError('') }}
                onKeyDown={e => e.key === 'Enter' && submitEmail()}
                placeholder='your@email.com'
                type='email'
                required
                style={{ width: '100%', background: '#111', border: `0.5px solid ${emailError ? '#c0392b' : '#2A2A2A'}`, borderRadius: '4px', padding: '11px 14px', fontSize: '13px', color: '#F0ECE6', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px' }}
              />
              {emailError && <div style={{ fontSize: '11px', color: '#c0392b', marginBottom: '8px' }}>{emailError}</div>}
              <button
                onClick={submitEmail}
                disabled={submitting || !email.trim()}
                style={{ width: '100%', padding: '11px', background: '#5b7c99', border: 'none', borderRadius: '4px', color: '#fff', cursor: submitting || !email.trim() ? 'default' : 'pointer', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: submitting || !email.trim() ? 0.5 : 1, marginBottom: '10px' }}
              >
                {submitting ? 'Submitting…' : 'Continue →'}
              </button>
              <div style={{ fontSize: '10px', color: '#777', textAlign: 'center' }}>No spam. Unsubscribe anytime.</div>
            </div>
          )}

          {/* Step 2 — Topic selection */}
          {step === 'topics' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ fontSize: '13px', color: '#F0ECE6', lineHeight: 1.5, padding: '8px 4px 14px' }}>Hi there 👋 What can we help you with?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {TOPICS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => openTopic(t.id)}
                    style={{ textAlign: 'left', padding: '11px 14px', background: '#222', border: '0.5px solid #2A2A2A', borderRadius: '4px', color: '#F0ECE6', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.4 }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Topic answer */}
          {step === 'answer' && activeTopic && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <button onClick={backToTopics} style={{ background: 'none', border: 'none', color: '#5b7c99', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0 0 12px', fontFamily: 'inherit' }}>← Back</button>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#F0ECE6', marginBottom: '12px', lineHeight: 1.3 }}>{activeTopic.label}</div>
                <div style={{ fontSize: '13px', color: '#DCDCDC', lineHeight: 1.7 }} className='hque-chat-answer'>
                  {activeTopic.answer}
                </div>
                <style>{`.hque-chat-answer p { margin: 0 0 12px; } .hque-chat-answer p:last-child { margin-bottom: 0; } .hque-chat-answer strong { color: #F0ECE6; font-weight: 600; }`}</style>
              </div>
              <CtaRow ctas={activeTopic.ctas} />
            </>
          )}
        </div>
      )}

      <button onClick={() => setOpen(o => !o)} style={{ position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px', borderRadius: '50%', background: '#5b7c99', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(91,124,153,0.4)', zIndex: 1000 }}>
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
      </button>
    </>
  )
}
