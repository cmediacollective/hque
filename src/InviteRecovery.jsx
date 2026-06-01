import { useState } from 'react'
import { supabase } from './supabase'

// Shown when someone arrives via a magic / invite link that has expired or
// already been used (e.g. an email security scanner "clicked" it first).
// Instead of silently dropping them on the marketing page, we explain what
// happened and let them request a fresh link in one step.
export default function InviteRecovery({ onBackToSignIn }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function sendNewLink() {
    const clean = email.trim().toLowerCase()
    if (!clean) return setError('Please enter your email')
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true }
    })
    setLoading(false)
    if (error) return setError(error.message)
    setSent(true)
  }

  const inputStyle = { width: '100%', background: '#141414', border: '0.5px solid #2A2A2A', borderRadius: '1px', padding: '10px 12px', fontSize: '13px', color: '#F2EEE8', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ width: '400px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <img src="/logo.svg" alt="HQue" onClick={() => window.location.href = '/'} style={{ width: '170px', height: 'auto', display: 'block', margin: '0 auto', cursor: 'pointer' }} />
        </div>

        <div style={{ background: '#222', border: '0.5px solid #2A2A2A', borderRadius: '2px', padding: '32px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: '28px', marginBottom: '16px' }}>✉️</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#F2EEE8', marginBottom: '10px' }}>Check your email</div>
              <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.7 }}>
                We sent a fresh sign-in link to <span style={{ color: '#5b7c99' }}>{email.trim().toLowerCase()}</span>. Open it on this device, and try to click it as soon as it arrives.
              </div>
              <button onClick={() => { setSent(false); setEmail(''); setError('') }} style={{ marginTop: '20px', fontSize: '10px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Use a different email</button>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F2EEE8', marginBottom: '8px' }}>This link has expired</div>
              <div style={{ fontSize: '12px', color: '#777', marginBottom: '22px', lineHeight: 1.7 }}>
                Sign-in links can only be opened once, and they expire quickly. Sometimes an email provider's security scanner opens it before you do. Enter your email below and we'll send you a fresh link.
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '6px' }}>Email</label>
                <input
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendNewLink()}
                  placeholder='you@agency.com'
                  autoFocus
                  style={inputStyle}
                />
                <div style={{ fontSize: '10px', color: '#555', marginTop: '6px', lineHeight: 1.6 }}>
                  Use the exact email your invitation was sent to.
                </div>
              </div>

              {error && <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '12px' }}>{error}</div>}

              <button onClick={sendNewLink} disabled={loading} style={{ width: '100%', padding: '11px', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: loading ? 0.7 : 1, marginBottom: '10px' }}>
                {loading ? 'Sending...' : 'Send me a new link'}
              </button>
              <button onClick={onBackToSignIn} style={{ width: '100%', padding: '11px', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #2A2A2A', color: '#777', cursor: 'pointer', borderRadius: '1px' }}>
                Back to sign in
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#333' }}>
          Need help? <a href='mailto:support@h-que.com' style={{ color: '#444', textDecoration: 'none' }}>support@h-que.com</a>
        </div>
      </div>
    </div>
  )
}
