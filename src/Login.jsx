import { useState } from 'react'
import { supabase } from './supabase'

export default function Login({ onLogin, onShowSignUp }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [useMagic, setUseMagic] = useState(false)

  async function handleLogin() {
    if (!email || !password) return setError('Please enter your email and password')
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    onLogin(data.user)
  }

  async function handleMagicLink() {
    if (!email) return setError('Please enter your email')
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) return setError(error.message)
    setMagicSent(true)
  }

  async function handleGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://h-que.com' }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const inputStyle = { width: '100%', background: '#141414', border: '0.5px solid #2A2A2A', borderRadius: '1px', padding: '10px 12px', fontSize: '13px', color: '#F2EEE8', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ width: '380px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img src="/logo.svg" alt="HQue" style={{ width: '180px', height: 'auto', display: 'block', margin: '0 auto' }} />
        </div>

        <div style={{ background: '#222', border: '0.5px solid #2A2A2A', borderRadius: '2px', padding: '32px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F2EEE8', marginBottom: '24px' }}>Sign in</div>

          {magicSent ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: '28px', marginBottom: '16px' }}>✉️</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#F2EEE8', marginBottom: '10px' }}>Check your email</div>
              <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.7 }}>We sent a magic link to <span style={{ color: '#5b7c99' }}>{email}</span>. Click it to sign in.</div>
              <button onClick={() => { setMagicSent(false); setEmail('') }} style={{ marginTop: '20px', fontSize: '10px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Use a different email</button>
            </div>
          ) : (
            <>
              <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', padding: '11px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#fff', border: 'none', color: '#1A1A1A', cursor: 'pointer', borderRadius: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ flex: 1, height: '0.5px', background: '#2A2A2A' }} />
                <div style={{ fontSize: '10px', color: '#444' }}>or</div>
                <div style={{ flex: 1, height: '0.5px', background: '#2A2A2A' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '6px' }}>Email</label>
                <input type='email' value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && (useMagic ? handleMagicLink() : handleLogin())} placeholder='you@example.com' style={inputStyle} />
              </div>

              {!useMagic && (
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '6px' }}>Password</label>
                  <input type='password' value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder='••••••••' style={inputStyle} />
                </div>
              )}

              {useMagic && <div style={{ marginBottom: '22px' }} />}

              {error && <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '12px' }}>{error}</div>}

              <button onClick={useMagic ? handleMagicLink : handleLogin} disabled={loading} style={{ width: '100%', padding: '10px', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: loading ? 0.7 : 1, marginBottom: '10px' }}>
                {loading ? 'Please wait...' : useMagic ? 'Send Magic Link' : 'Sign in'}
              </button>

              <button onClick={() => { setUseMagic(m => !m); setError('') }} style={{ width: '100%', padding: '8px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #2A2A2A', color: '#555', cursor: 'pointer', borderRadius: '1px' }}>
                {useMagic ? 'Sign in with password instead' : 'Send magic link instead'}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#444' }}>
          Don't have an account? <button onClick={onShowSignUp} style={{ background: 'none', border: 'none', color: '#5b7c99', cursor: 'pointer', fontSize: '11px', padding: 0 }}>Start free trial</button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: '#333' }}>
          Questions? <a href='mailto:support@hque.com' style={{ color: '#444', textDecoration: 'none' }}>support@hque.com</a>
        </div>
      </div>
    </div>
  )
}
