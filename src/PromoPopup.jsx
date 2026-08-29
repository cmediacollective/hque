import { useState, useEffect, useRef } from 'react'

// Email capture for the launch offer, shown on the public marketing pages only.
//
// The deal: give us your email, get the promo code for 50% off your first month.
// The code isn't a secret — anyone could type it at checkout — but asking for the
// email is the point, so the code is only revealed after they hand it over.
//
// Restraint is deliberate. It waits, it takes exit intent as the cue on desktop,
// it never reappears once dismissed or submitted, and it stays away entirely from
// anyone who already gave an email through the chat widget. A popup that fires
// instantly on every visit costs more goodwill than it earns addresses.

// ── The offer. Change these two lines when the promotion changes. ────────────
// PROMO_CODE must match the promotion code created in Stripe exactly, or people
// will be told at checkout that it isn't valid.
const PROMO_CODE = 'WELCOME50'
const PROMO_EYEBROW = 'Welcome!'          // rendered uppercase by the style below
const PROMO_HEADLINE = '50% off your first month'

const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyvyIlOEgMAP_UOT4O07lUzQpB6MPJ5pipONT7Fem1IynGiDolHRfTQMQxWDtfIDk7e/exec'

const SEEN_KEY = 'hque_promo_seen'          // dismissed or submitted — don't show again
const DELAY_MS = 25000                       // fallback trigger if they never move to leave

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim())

export default function PromoPopup({ onGetStarted }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)
  const firedRef = useRef(false)

  const mobile = typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    // Never pester someone who has already dismissed this, already taken the
    // offer, or already given us their email somewhere else on the site.
    let alreadySeen = false
    try {
      alreadySeen = localStorage.getItem(SEEN_KEY) === 'true' ||
                    localStorage.getItem('hque_chat_email_submitted') === 'true'
    } catch { /* private browsing — fall through and show it */ }
    if (alreadySeen) return

    const fire = () => {
      if (firedRef.current) return
      firedRef.current = true
      setOpen(true)
    }

    // Desktop: the moment the cursor leaves the top of the window, they're going.
    const onLeave = (e) => { if (e.clientY <= 0) fire() }
    if (!mobile) document.addEventListener('mouseout', onLeave)

    const timer = setTimeout(fire, DELAY_MS)
    return () => { clearTimeout(timer); document.removeEventListener('mouseout', onLeave) }
  }, [mobile])

  function remember() {
    try { localStorage.setItem(SEEN_KEY, 'true') } catch { /* nothing we can do */ }
  }

  function close() {
    remember()
    setOpen(false)
  }

  // Escape closes it, like any other dialog.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    setTimeout(() => inputRef.current && inputRef.current.focus(), 120)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function submit() {
    if (!isValidEmail(email)) { setError('Please enter a valid email address'); return }
    setError('')
    const trimmed = email.trim()
    remember()

    // Same two destinations the chat widget and blog signup already use, so
    // every address on the marketing site lands in the same places.
    fetch(GOOGLE_SHEETS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ email: trimmed, firstName: 'Promo — 50% off', list: 'marketing' })
    }).catch(() => {})
    fetch('/.netlify/functions/subscribe-klaviyo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed, firstName: 'Promo — 50% off', stage: 'leads', source: 'promo-welcome50' })
    }).catch(() => {})

    setDone(true)
  }

  function copyCode() {
    try {
      navigator.clipboard.writeText(PROMO_CODE)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* they can still read it off the screen */ }
  }

  if (!open) return null

  return (
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'hqueFade 0.25s ease' }}>
      <style>{`@keyframes hqueFade { from { opacity: 0 } to { opacity: 1 } }
               @keyframes hqueRise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }`}</style>

      <div
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-label={PROMO_HEADLINE}
        style={{ position: 'relative', width: '100%', maxWidth: '420px', background: '#141414', border: '0.5px solid #2A2A2A', borderRadius: '10px', padding: mobile ? '32px 24px 26px' : '38px 36px 30px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', animation: 'hqueRise 0.3s ease' }}>

        <button onClick={close} aria-label='Close'
          style={{ position: 'absolute', top: '12px', right: '14px', background: 'none', border: 'none', color: '#666', fontSize: '22px', lineHeight: 1, cursor: 'pointer', padding: '4px' }}>×</button>

        {!done ? (
          <>
            <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '14px' }}>{PROMO_EYEBROW}</div>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: mobile ? '26px' : '30px', color: '#F0ECE6', lineHeight: 1.15, marginBottom: '14px', letterSpacing: '-0.02em' }}>
              {PROMO_HEADLINE}
            </div>
            <div style={{ fontSize: '13px', color: '#BDBDBD', lineHeight: 1.7, marginBottom: '22px' }}>
              Drop your email and we'll give you the code. Works on any plan, on top of your 14-day free trial.
            </div>

            <input
              ref={inputRef}
              value={email}
              onChange={e => { setEmail(e.target.value); if (error) setError('') }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              type='email'
              autoComplete='email'
              placeholder='your@email.com'
              style={{ width: '100%', background: '#0E0E0E', border: `0.5px solid ${error ? '#c0392b' : '#2A2A2A'}`, borderRadius: '6px', padding: '13px 15px', fontSize: '14px', color: '#F0ECE6', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: error ? '8px' : '14px' }} />
            {error && <div style={{ fontSize: '11px', color: '#c0392b', marginBottom: '12px' }}>{error}</div>}

            <button onClick={submit}
              style={{ width: '100%', padding: '13px', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Get my code
            </button>

            <div style={{ fontSize: '10px', color: '#666', marginTop: '14px', textAlign: 'center' }}>No spam. Unsubscribe anytime.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#5C9E52', marginBottom: '14px' }}>You're in</div>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: mobile ? '24px' : '27px', color: '#F0ECE6', lineHeight: 1.2, marginBottom: '18px', letterSpacing: '-0.02em' }}>
              Here's your code.
            </div>

            <div onClick={copyCode}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#0E0E0E', border: '1px dashed #3A3A3A', borderRadius: '6px', padding: '15px 18px', marginBottom: '18px', cursor: 'pointer' }}>
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '21px', color: '#F0ECE6', letterSpacing: '0.06em' }}>{PROMO_CODE}</span>
              <span style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: copied ? '#5C9E52' : '#5b7c99', whiteSpace: 'nowrap' }}>{copied ? 'Copied' : 'Copy'}</span>
            </div>

            <div style={{ fontSize: '12px', color: '#BDBDBD', lineHeight: 1.7, marginBottom: '22px' }}>
              Enter it at checkout under <span style={{ color: '#F0ECE6' }}>Add promotion code</span>. Copy it somewhere safe — this is the only place it's shown.
            </div>

            <button onClick={() => { close(); onGetStarted && onGetStarted() }}
              style={{ width: '100%', padding: '13px', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Start free trial
            </button>
          </>
        )}
      </div>
    </div>
  )
}
