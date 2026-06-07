import { useState } from 'react'

// AppSumo lifetime redemption page (route: /redeem).
// Minimal by design — single code field, no upsells, no card, no extra opt-ins.
// Handles three states: signed-out, signed-in-without-an-agency, and ready.
export default function RedeemPage({ user, orgId, onSignIn, onSignUp }) {
  const initialCode = (() => {
    try { return (new URLSearchParams(window.location.search).get('code') || '').toUpperCase() }
    catch (e) { return '' }
  })()

  const [code, setCode] = useState(initialCode)
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [error, setError] = useState('')

  const inputStyle = { width: '100%', background: '#141414', border: '0.5px solid #2A2A2A', borderRadius: '1px', padding: '12px 14px', fontSize: '15px', letterSpacing: '0.08em', color: '#F2EEE8', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase', fontFamily: 'Georgia, serif' }
  const primaryBtn = { width: '100%', padding: '12px', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }

  // Keep a typed code in the URL so it survives the sign-in / sign-up detour.
  function preserveCodeThen(fn) {
    try {
      if (code) window.history.replaceState({}, '', '/redeem?code=' + encodeURIComponent(code))
    } catch (e) {}
    fn && fn()
  }

  async function handleRedeem() {
    const clean = code.trim().toUpperCase()
    if (!clean) { setError('Enter your AppSumo code.'); setStatus('error'); return }
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/.netlify/functions/redeem-appsumo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean, orgId })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) { setStatus('success'); return }
      setStatus('error')
      if (data.reason === 'already_redeemed') setError('This code has already been redeemed.')
      else if (data.reason === 'invalid') setError("We couldn't find that code. Double-check it and try again.")
      else setError('Something went wrong. Please try again or email support@h-que.com.')
    } catch (e) {
      setStatus('error')
      setError('Network error. Please try again or email support@h-que.com.')
    }
  }

  return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ width: '420px', maxWidth: '100%', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <img src="/logo.svg" alt="HQue" onClick={() => window.location.href = '/'} style={{ width: '180px', height: 'auto', display: 'block', margin: '0 auto', cursor: 'pointer' }} />
        </div>

        <div style={{ background: '#222', border: '0.5px solid #2A2A2A', borderRadius: '2px', padding: '36px 32px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '14px', textAlign: 'center' }}>AppSumo Lifetime Deal</div>

          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#5b7c99', margin: '0 auto 22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12' /></svg>
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '26px', color: '#F2EEE8', lineHeight: 1.2, marginBottom: '14px' }}>You're all set.</div>
              <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.7, marginBottom: '30px' }}>Lifetime Pro access is now unlocked on your account. No subscription, no monthly fees — it's yours for good.</div>
              <button onClick={() => window.location.href = '/'} style={primaryBtn}>Enter HQue</button>
            </div>

          ) : !user ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F2EEE8', marginBottom: '12px' }}>Redeem your code</div>
              <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.7, marginBottom: '26px' }}>First, sign in or create your free HQue account. Then you'll enter your code to unlock lifetime Pro.</div>
              <button onClick={() => preserveCodeThen(onSignUp)} style={{ ...primaryBtn, marginBottom: '12px' }}>Create account</button>
              <button onClick={() => preserveCodeThen(onSignIn)} style={{ width: '100%', padding: '11px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #2A2A2A', color: '#888', cursor: 'pointer', borderRadius: '1px' }}>I already have an account</button>
            </div>

          ) : !orgId ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F2EEE8', marginBottom: '12px' }}>One quick step first</div>
              <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.7, marginBottom: '26px' }}>Finish setting up your agency, then come back to this page to redeem your code.</div>
              <button onClick={() => window.location.href = '/'} style={primaryBtn}>Set up my agency</button>
            </div>

          ) : (
            <>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F2EEE8', marginBottom: '8px', textAlign: 'center' }}>Enter your code</div>
              <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.6, marginBottom: '22px', textAlign: 'center' }}>Paste the code from your AppSumo purchase to unlock lifetime Pro access.</div>

              <input
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); if (status === 'error') { setStatus('idle'); setError('') } }}
                onKeyDown={e => e.key === 'Enter' && status !== 'loading' && handleRedeem()}
                placeholder='HQUE-XXXX-XXXX-XXXX'
                autoFocus
                style={inputStyle}
              />

              {error && <div style={{ fontSize: '11px', color: '#e74c3c', marginTop: '12px', lineHeight: 1.5 }}>{error}</div>}

              <button onClick={handleRedeem} disabled={status === 'loading'} style={{ ...primaryBtn, marginTop: '20px', opacity: status === 'loading' ? 0.7 : 1 }}>
                {status === 'loading' ? 'Redeeming...' : 'Redeem code'}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#444' }}>
          Need help? <a href='mailto:support@h-que.com' style={{ color: '#5b7c99', textDecoration: 'none' }}>support@h-que.com</a>
        </div>
      </div>
    </div>
  )
}
