import { useState } from 'react'
import { supabase } from './supabase'

export default function Login({ onLogin }) {
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

  return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ width: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img src="/logo.svg" alt="HQue" style={{ width: '220px', height: 'auto', display: 'block', margin: '0 auto' }} />
        </div>

        <div style={{ background: '#222', border: '0.5px solid #2A2A2A', borderRadius: '2px', padding: '32px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F2EEE8', marginBottom: '24px' }}>Sign in</div>

          {magicSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>✉️</div>
              <div style={{ fontSize: '14px', color: '#F2EEE8', marginBottom: '8px' }}>Check your email</div>
              <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.7 }}>We sent a magic link to <span style={{ color: '#5b7c99' }}>{email}</span>. Click it to sign in.</div>
              <button onClick={() => { setMagicSent(false); setEmail('') }} style={{ marginTop: '20px', fontSize: '10px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Use a different email</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '6px' }}>Email</label>
                <input
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (useMagic ? handleMagicLink() : handleLogin())}
                  placeholder='you@example.com'
                  style={{ width: '100%', background: '#141414', border: '0.5px solid #2A2A2A', borderRadius: '1px', padding: '10px 12px', fontSize: '13px', color: '#F2EEE8', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {!useMagic && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '6px' }}>Password</label>
                  <input
                    type='password'
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder='••••••••'
                    style={{ width: '100%', background: '#141414', border: '0.5px solid #2A2A2A', borderRadius: '1px', padding: '10px 12px', fontSize: '13px', color: '#F2EEE8', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {useMagic && <div style={{ marginBottom: '24px' }} />}

              {error && <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '16px' }}>{error}</div>}

              <button
                onClick={useMagic ? handleMagicLink : handleLogin}
                disabled={loading}
                style={{ width: '100%', padding: '10px', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: loading ? 0.7 : 1, marginBottom: '12px' }}>
                {loading ? 'Please wait...' : useMagic ? 'Send Magic Link' : 'Sign in'}
              </button>

              <button
                onClick={() => { setUseMagic(m => !m); setError('') }}
                style={{ width: '100%', padding: '8px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #2A2A2A', color: '#555', cursor: 'pointer', borderRadius: '1px' }}>
                {useMagic ? 'Sign in with password instead' : 'Send magic link instead'}
              </button>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#444' }}>
          Contact your admin to get access
        </div>
      </div>
    </div>
  )
}
