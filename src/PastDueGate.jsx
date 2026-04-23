import { useState } from 'react'

export default function PastDueGate({ stripeCustomerId, pastDueSince, onLogout }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function openPortal() {
    if (!stripeCustomerId) {
      setError('No billing account on file. Please contact support.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/.netlify/functions/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: stripeCustomerId })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error || 'Something went wrong')
    } catch (err) {
      setError('Failed to open billing portal. Please try again.')
    }
    setLoading(false)
  }

  const sinceLabel = pastDueSince
    ? new Date(pastDueSince).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <img src="/logo.svg" alt="HQue" style={{ width: '120px', marginBottom: '40px' }} />

      <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#F0ECE6', marginBottom: '12px', textAlign: 'center' }}>
        Your payment didn't go through
      </div>

      <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px', textAlign: 'center', lineHeight: 1.7, maxWidth: '440px' }}>
        We weren't able to charge the card on file{sinceLabel ? ` since ${sinceLabel}` : ''}. Your HQue workspace is paused until billing is up to date.
      </div>

      <div style={{ fontSize: '12px', color: '#777', marginBottom: '40px', textAlign: 'center', lineHeight: 1.7, maxWidth: '440px' }}>
        Update your payment method and we'll retry the charge automatically — you'll be back in right after.
      </div>

      {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '16px' }}>{error}</div>}

      <button
        onClick={openPortal}
        disabled={loading}
        style={{ padding: '12px 28px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: '#5b7c99', border: '0.5px solid #5b7c99', color: '#fff', cursor: loading ? 'default' : 'pointer', borderRadius: '1px', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Opening…' : 'Update payment method'}
      </button>

      <div style={{ fontSize: '11px', color: '#555', marginTop: '32px', textAlign: 'center', maxWidth: '380px', lineHeight: 1.6 }}>
        Need a hand? Email <a href="mailto:support@h-que.com" style={{ color: '#777', textDecoration: 'underline' }}>support@h-que.com</a>.
      </div>

      <button onClick={onLogout} style={{ marginTop: '24px', background: 'none', border: 'none', color: '#555', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        Sign out
      </button>
    </div>
  )
}
