import { useState } from 'react'
import { supabase } from './supabase'

// Master-admin tool: comp an account to permanent, free Business access.
// Calls the grant_lifetime_business(p_email) Postgres RPC, which double-checks the
// caller is a platform admin, finds the person's workspace by email, and flips
// their org to Business ('agency') + is_lifetime (no billing, no trial expiry).
// Works whether the person is mid-trial or brand new — they just need an account
// (signed up + created a workspace) before you can grant it.
export default function GrantLifetimeAccess({ dark = true, card, border, text, muted, subtle, accent }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { ok: bool, msg: string }

  async function grant() {
    const e = email.trim()
    if (!e) return
    if (!window.confirm(`Give ${e} free, permanent Business access? This removes any trial or billing for that account.`)) return
    setBusy(true)
    setResult(null)
    try {
      const { data, error } = await supabase.rpc('grant_lifetime_business', { p_email: e })
      if (error) {
        const m = error.message || ''
        const msg = /not_authorized/.test(m)
          ? 'Only the master account’s owner or admin can do this.'
          : /does not exist|function|schema/.test(m)
            ? 'The access tool isn’t set up in the database yet — the one-time SQL step still needs to be run.'
            : 'Something went wrong. Please try again.'
        setResult({ ok: false, msg })
      } else if (data?.ok) {
        setResult({ ok: true, msg: `✓ ${data.org_name || 'That account'} now has lifetime Business access. Ask them to refresh or log back in.` })
        setEmail('')
      } else if (data?.reason === 'no_user') {
        setResult({ ok: false, msg: 'No account found for that email. Ask them to sign up at h-que.com first, then try again.' })
      } else if (data?.reason === 'no_workspace') {
        setResult({ ok: false, msg: 'They’ve signed up but haven’t created a workspace yet. Ask them to finish setup, then try again.' })
      } else {
        setResult({ ok: false, msg: 'Couldn’t grant access. Please try again.' })
      }
    } catch (err) {
      setResult({ ok: false, msg: 'Couldn’t reach the server. Please try again.' })
    }
    setBusy(false)
  }

  const inputStyle = {
    flex: 1, minWidth: '240px', padding: '10px 12px', fontSize: '13px',
    background: dark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${border}`,
    borderRadius: '4px', color: text, outline: 'none',
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: subtle, marginBottom: '14px' }}>Grant lifetime access</div>
      <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '3px', padding: '20px 24px' }}>
        <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7, marginBottom: '14px', maxWidth: '580px' }}>
          Give someone free, permanent <strong style={{ color: text }}>Business</strong> access — no billing and no trial expiry, ever. Works for people already on a trial and for new people (they just need to sign up and create a workspace first).
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') grant() }}
            placeholder="person@example.com"
            style={inputStyle}
          />
          <button
            onClick={grant}
            disabled={busy || !email.trim()}
            style={{
              padding: '10px 18px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase',
              background: accent, border: 'none', color: '#fff', borderRadius: '4px', whiteSpace: 'nowrap',
              cursor: busy || !email.trim() ? 'default' : 'pointer', opacity: busy || !email.trim() ? 0.55 : 1,
            }}
          >{busy ? 'Granting…' : 'Grant Business access'}</button>
        </div>
        {result && (
          <div style={{ marginTop: '14px', fontSize: '12px', lineHeight: 1.6, color: result.ok ? '#5C9E52' : '#C77B5B' }}>{result.msg}</div>
        )}
      </div>
    </div>
  )
}
