import { useState, useRef, useEffect } from 'react'

const SYSTEM_PROMPT = `You are the HQue assistant — a helpful, knowledgeable, and friendly chatbot for HQue, an agency operating system built for talent agencies and brands that work with talent partnerships.

Your job is to help visitors understand HQue, answer questions, and guide them toward signing up.

ABOUT HQUE:
- HQue is an all-in-one operating system for talent agencies and influencer marketing teams
- It replaces spreadsheets, Monday.com, and disconnected tools
- Key features: Talent roster management, Campaign tracking, Workspace (kanban tasks), Reports and analytics, Talent inquiry forms, Team collaboration, Payment tracking
- Pricing: Starter $49/month (2 seats, 50 talent), Pro $99/month (5 seats, unlimited talent), Agency $199/month (unlimited everything)
- All plans include a 14-day free trial, no credit card required
- Support: support@h-que.com

TONE:
- Warm, direct, and professional
- Keep responses concise — 2-4 sentences max unless a detailed answer is needed
- Always encourage the visitor to start their free trial if they seem interested

Do not make up features or pricing not listed above. If you do not know something, say "That is a great question — reach out to support@h-que.com and we will get you an answer."

Never mention that you are Claude or built by Anthropic. You are simply the HQue assistant.`


function renderMessage(text) {
  const parts = []
  let remaining = text

  while (remaining.length > 0) {
    // Check for email
    const emailMatch = remaining.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/)
    // Check for trial phrases
    const trialMatch = remaining.match(/(start (your |a )?(free )?14-day trial|start (your |a )?free trial|try (it )?free|sign up( for free)?)/i)
    // Check for pricing phrases
    const pricingMatch = remaining.match(/(view pricing|see pricing|check (out )?pricing|our pricing)/i)

    const emailIdx = emailMatch ? remaining.indexOf(emailMatch[0]) : Infinity
    const trialIdx = trialMatch ? remaining.indexOf(trialMatch[0]) : Infinity
    const pricingIdx = pricingMatch ? remaining.indexOf(pricingMatch[0]) : Infinity

    const minIdx = Math.min(emailIdx, trialIdx, pricingIdx)

    if (minIdx === Infinity) {
      parts.push(<span key={parts.length}>{remaining}</span>)
      break
    }

    if (minIdx > 0) {
      parts.push(<span key={parts.length}>{remaining.slice(0, minIdx)}</span>)
      remaining = remaining.slice(minIdx)
    }

    if (emailIdx === 0 && emailMatch) {
      parts.push(<a key={parts.length} href={`mailto:${emailMatch[0]}`} style={{ color: '#5b7c99', textDecoration: 'none', borderBottom: '0.5px solid #5b7c99' }}>{emailMatch[0]}</a>)
      remaining = remaining.slice(emailMatch[0].length)
    } else if (trialIdx === 0 && trialMatch) {
      parts.push(
        <span key={parts.length}>
          {trialMatch[0]}
          <a href="https://h-que.com" onClick={e => { e.preventDefault(); window.location.href = 'https://h-que.com' }} style={{ display: 'inline-block', marginLeft: '6px', padding: '2px 10px', background: '#5b7c99', color: '#fff', fontSize: '10px', borderRadius: '3px', textDecoration: 'none', verticalAlign: 'middle', letterSpacing: '0.08em' }}>Start free →</a>
        </span>
      )
      remaining = remaining.slice(trialMatch[0].length)
    } else if (pricingIdx === 0 && pricingMatch) {
      parts.push(
        <a key={parts.length} href="https://h-que.com/#pricing" style={{ color: '#5b7c99', textDecoration: 'none', borderBottom: '0.5px solid #5b7c99' }}>{pricingMatch[0]}</a>
      )
      remaining = remaining.slice(pricingMatch[0].length)
    } else {
      parts.push(<span key={parts.length}>{remaining[0]}</span>)
      remaining = remaining.slice(1)
    }
  }
  return <>{parts}</>
}

export default function HQueChat() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am the HQue assistant. Ask me anything about how HQue works, pricing, or how to get started.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [submittingEmail, setSubmittingEmail] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function submitEmail() {
    if (!email.trim() || submittingEmail) return
    if (!email.includes('@')) return setEmailError('Please enter a valid email')
    setSubmittingEmail(true)
    setEmailError('')
    try {
      await fetch('/.netlify/functions/subscribe-mailchimp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
    } catch {}
    setEmailSubmitted(true)
    setSubmittingEmail(false)
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
        })
      })
      const data = await response.json()
      const reply = data.content?.[0]?.text || 'Sorry, something went wrong. Try again or email support@h-que.com.'
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Something went wrong. Please try again or email support@h-que.com.' }])
    }
    setLoading(false)
  }

  return (
    <>
      {open && (
        <div style={{ position: 'fixed', bottom: '90px', right: '24px', width: '340px', height: '480px', background: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '8px', display: 'flex', flexDirection: 'column', zIndex: 1000, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '16px 20px', background: '#111', borderBottom: '0.5px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#5b7c99', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#F0ECE6', fontWeight: 500 }}>HQue Assistant</div>
                <div style={{ fontSize: '9px', color: '#5b7c99', letterSpacing: '0.1em' }}>● Online</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
          </div>

          {/* Email capture or chat */}
          {!emailSubmitted ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#5b7c99', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#F0ECE6', marginBottom: '8px' }}>Chat with HQue</div>
              <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.7, marginBottom: '24px' }}>Enter your email to get started. We will only reach out if you have questions.</div>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitEmail()}
                placeholder='your@email.com'
                type='email'
                style={{ width: '100%', background: '#111', border: '0.5px solid #2A2A2A', borderRadius: '4px', padding: '10px 14px', fontSize: '13px', color: '#F0ECE6', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px' }}
              />
              {emailError && <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '8px' }}>{emailError}</div>}
              <button onClick={submitEmail} disabled={submittingEmail || !email.trim()} style={{ width: '100%', padding: '10px', background: '#5b7c99', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', opacity: submittingEmail || !email.trim() ? 0.5 : 1 }}>
                {submittingEmail ? 'Starting...' : 'Start chatting'}
              </button>
              <button onClick={() => setEmailSubmitted(true)} style={{ marginTop: '10px', background: 'none', border: 'none', color: '#444', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}>Skip</button>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: m.role === 'user' ? '#5b7c99' : '#222', fontSize: '13px', color: '#F0ECE6', lineHeight: 1.6 }}>
                      {m.role === 'assistant' ? renderMessage(m.content) : m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: '#222', fontSize: '13px', color: '#666' }}>Typing...</div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <div style={{ padding: '12px 16px', borderTop: '0.5px solid #2A2A2A', display: 'flex', gap: '8px' }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder='Ask anything...' style={{ flex: 1, background: '#111', border: '0.5px solid #2A2A2A', borderRadius: '4px', padding: '8px 12px', fontSize: '13px', color: '#F0ECE6', outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ padding: '8px 14px', background: '#5b7c99', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '13px', opacity: loading || !input.trim() ? 0.5 : 1 }}>→</button>
              </div>
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
