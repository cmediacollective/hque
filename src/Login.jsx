import { useState } from 'react'
import { supabase } from './supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) return setError('Please enter your email and password')
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    onLogin(data.user)
  }

  return (
    <div style={{
      background: '#1A1A1A',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    }}>
      <div style={{ width: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img src="/logo.svg" alt="HQue" style={{ width: '220px', height: 'auto', display: 'block', margin: '0 auto' }} />
        </div>

        <div style={{ background: '#222', border: '0.5px solid #2A2A2A', borderRadius: '2px', padding: '32px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F2EEE8', marginBottom: '24px' }}>Sign in</div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '6px' }}>Email</label>
            <input
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder='you@example.com'
              style={{ width: '100%', background: '#141414', border: '0.5px solid #2A2A2A', borderRadius: '1px', padding: '10px 12px', fontSize: '13px', color: '#F2EEE8', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

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

          {error && <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '16px' }}>{error}</div>}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%', padding: '10px', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#444' }}>
          Contact your admin to get access
        </div>
      </div>
    </div>
  )
}