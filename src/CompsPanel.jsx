import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Master-admin "Comps" panel (Settings → Comps). Grant someone free, permanent
// Business access, see everyone who currently has comped/lifetime access, and
// revoke it. All three actions go through SECURITY DEFINER RPCs that verify the
// caller is a platform admin:
//   grant_lifetime_business(p_email)  · list_comped_accounts()  · revoke_lifetime_access(p_org)
export default function CompsPanel({ dark = true }) {
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const inputBg = dark ? '#1A1A1A' : '#FFFFFF'
  const accent = '#5b7c99'

  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)      // { ok, msg }
  const [list, setList] = useState(null)          // array of comped accounts
  const [listError, setListError] = useState(null)
  const [revoking, setRevoking] = useState(null)  // org_id currently being revoked

  useEffect(() => { loadList() }, [])

  async function loadList() {
    setListError(null)
    const { data, error } = await supabase.rpc('list_comped_accounts')
    if (error) {
      setListError(/does not exist|function|schema/.test(error.message || '')
        ? 'The comps list isn’t set up in the database yet — the one-time SQL step still needs to be run.'
        : 'Couldn’t load the list.')
      setList([])
      return
    }
    setList(data || [])
  }

  const planLabel = (p) => p === 'agency' ? 'Business' : p === 'pro' ? 'Pro' : p === 'starter' ? 'Starter' : '—'

  async function grant() {
    const e = email.trim()
    if (!e) return
    if (!window.confirm(`Give ${e} free, permanent Business access? This removes any trial or billing for that account.`)) return
    setBusy(true); setResult(null)
    try {
      const { data, error } = await supabase.rpc('grant_lifetime_business', { p_email: e })
      if (error) {
        const m = error.message || ''
        setResult({ ok: false, msg: /not_authorized/.test(m)
          ? 'Only the master account’s owner or admin can do this.'
          : /does not exist|function|schema/.test(m)
            ? 'The access tool isn’t set up in the database yet — the one-time SQL step still needs to be run.'
            : 'Something went wrong. Please try again.' })
      } else if (data?.ok) {
        setResult({ ok: true, msg: `✓ ${data.org_name || 'That account'} now has lifetime Business access. Ask them to refresh or log back in.` })
        setEmail('')
        loadList()
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

  async function revoke(row) {
    const who = row.owner_email || row.org_name || 'this account'
    const warn = row.source === 'AppSumo'
      ? `⚠️ ${who} redeemed an AppSumo code — this is access they paid for. Revoking will lock them out. Are you absolutely sure?`
      : `Revoke free access for ${who}? They'll lose Business access and be moved to the upgrade screen until they subscribe.`
    if (!window.confirm(warn)) return
    setRevoking(row.org_id)
    try {
      const { data, error } = await supabase.rpc('revoke_lifetime_access', { p_org: row.org_id })
      if (error || !data?.ok) {
        window.alert('Couldn’t revoke access. Please try again.')
      } else {
        loadList()
      }
    } catch (err) {
      window.alert('Couldn’t reach the server. Please try again.')
    }
    setRevoking(null)
  }

  const badge = (label, tone) => (
    <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tone, border: `0.5px solid ${tone}`, padding: '2px 7px', borderRadius: '2px', whiteSpace: 'nowrap' }}>{label}</span>
  )

  return (
    <div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '20px' }}>Comps</div>

      {/* Grant */}
      <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '24px' }}>
        <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7, marginBottom: '14px', maxWidth: '580px' }}>
          Give someone free, permanent <strong style={{ color: text }}>Business</strong> access — no billing and no trial expiry, ever. Works for people already on a trial and for new people (they just need to sign up and create a workspace first).
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') grant() }}
            placeholder="person@example.com"
            style={{ flex: 1, minWidth: '240px', padding: '10px 12px', fontSize: '13px', background: inputBg, border: `1px solid ${border}`, borderRadius: '4px', color: text, outline: 'none' }}
          />
          <button onClick={grant} disabled={busy || !email.trim()} style={{
            padding: '10px 18px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase',
            background: accent, border: 'none', color: '#fff', borderRadius: '4px', whiteSpace: 'nowrap',
            cursor: busy || !email.trim() ? 'default' : 'pointer', opacity: busy || !email.trim() ? 0.55 : 1,
          }}>{busy ? 'Granting…' : 'Grant Business access'}</button>
        </div>
        {result && <div style={{ marginTop: '14px', fontSize: '12px', lineHeight: 1.6, color: result.ok ? '#5C9E52' : '#C77B5B' }}>{result.msg}</div>}
      </div>

      {/* List */}
      <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#5b7c99', margin: '32px 0 14px' }}>People with free access</div>
      <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 0' }}>
        {list === null && <div style={{ fontSize: '11px', color: subtle, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '16px 24px' }}>Loading…</div>}
        {list && listError && <div style={{ fontSize: '12px', color: '#C77B5B', padding: '16px 24px', lineHeight: 1.6 }}>{listError}</div>}
        {list && !listError && list.length === 0 && <div style={{ fontSize: '12px', color: muted, padding: '16px 24px' }}>No comped accounts yet. Grant one above and it’ll appear here.</div>}
        {list && !listError && list.map(row => (
          <div key={row.org_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderTop: `0.5px solid ${border}`, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontSize: '13px', color: text, marginBottom: '3px' }}>{row.org_name || 'Untitled workspace'}</div>
              <div style={{ fontSize: '11px', color: subtle }}>{row.owner_email || '—'}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {badge(planLabel(row.plan), accent)}
              {badge(row.source === 'AppSumo' ? 'AppSumo' : 'Comp', row.source === 'AppSumo' ? '#C7A15B' : '#5C9E52')}
            </div>
            <button onClick={() => revoke(row)} disabled={revoking === row.org_id} style={{
              padding: '7px 14px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase',
              background: 'none', border: `0.5px solid ${border}`, color: '#C77B5B', borderRadius: '3px',
              cursor: revoking === row.org_id ? 'default' : 'pointer', opacity: revoking === row.org_id ? 0.5 : 1, whiteSpace: 'nowrap',
            }}>{revoking === row.org_id ? 'Revoking…' : 'Revoke'}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
