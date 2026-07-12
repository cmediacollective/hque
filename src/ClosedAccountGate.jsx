import { useState } from 'react'
import { supabase } from './supabase'

// Shown to everyone in a workspace whose owner has closed it. The data is still
// there — it's wiped on purgeAfter — so the owner gets a one-click restore for
// the whole grace period. Teammates just get told what happened.
export default function ClosedAccountGate({ isOwner, purgeAfter, onLogout }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const purgeLabel = purgeAfter
    ? new Date(purgeAfter).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const daysLeft = purgeAfter
    ? Math.max(0, Math.ceil((new Date(purgeAfter) - new Date()) / 86400000))
    : null

  async function restore() {
    setBusy(true)
    setError('')
    const { data, error: rpcErr } = await supabase.rpc('restore_account')
    if (rpcErr || !data?.ok) {
      setError(
        data?.reason === 'too_late' ? 'This account has passed its restore window.'
        : data?.reason === 'not_owner' ? 'Only the workspace owner can restore this account.'
        : rpcErr?.message || 'Couldn’t restore the account. Please try again.'
      )
      setBusy(false)
      return
    }
    window.location.reload()
  }

  return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <img src="/logo.svg" alt="HQue" style={{ width: '120px', marginBottom: '40px' }} />

      <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#F0ECE6', marginBottom: '12px', textAlign: 'center' }}>
        This workspace has been closed
      </div>

      {isOwner ? (
        <>
          <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px', textAlign: 'center', lineHeight: 1.7, maxWidth: '460px' }}>
            You closed this account, and any billing has been cancelled. Nothing has been deleted yet — everything is still here and can be brought back.
          </div>
          <div style={{ fontSize: '13px', color: '#C77B5B', marginBottom: '32px', textAlign: 'center', lineHeight: 1.7, maxWidth: '460px' }}>
            {purgeLabel
              ? <>It will be <strong>permanently deleted on {purgeLabel}</strong>{daysLeft !== null ? ` — ${daysLeft} day${daysLeft === 1 ? '' : 's'} from now` : ''}.</>
              : <>It will be permanently deleted at the end of the grace period.</>}
          </div>

          {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '16px' }}>{error}</div>}

          <button
            onClick={restore}
            disabled={busy}
            style={{ padding: '12px 28px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: '#5b7c99', border: '0.5px solid #5b7c99', color: '#fff', cursor: busy ? 'default' : 'pointer', borderRadius: '3px', opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Restoring…' : 'Restore this workspace'}
          </button>

          <div style={{ fontSize: '11px', color: '#555', marginTop: '20px', textAlign: 'center', maxWidth: '400px', lineHeight: 1.6 }}>
            Restoring brings your team and all your data straight back. You'll need to choose a plan again to keep using it.
          </div>
        </>
      ) : (
        <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px', textAlign: 'center', lineHeight: 1.7, maxWidth: '440px' }}>
          The owner of this workspace has closed it, so it's no longer available. If you think this is a mistake, ask them to restore it.
        </div>
      )}

      <div style={{ fontSize: '11px', color: '#555', marginTop: '32px', textAlign: 'center', maxWidth: '380px', lineHeight: 1.6 }}>
        Need a hand? Email <a href="mailto:support@h-que.com" style={{ color: '#777', textDecoration: 'underline' }}>support@h-que.com</a>.
      </div>

      <button onClick={onLogout} style={{ marginTop: '24px', background: 'none', border: 'none', color: '#555', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        Sign out
      </button>
    </div>
  )
}
