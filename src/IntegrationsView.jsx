import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { fieldLabelStyle } from './uiStyles'

// Settings → Integrations. Today this is one card (Slack), but it's built as a
// list so the next connection — Calendar, QuickBooks — sits beside it rather
// than needing its own tab.
//
// Slack is deliberately narrow: assignments and overdue tasks only, posted to
// one channel the company picks. Everything else stays in email and the bell,
// because a channel that repeats every comment gets muted within a week.
//
// The webhook URL is never readable from the browser (org_integrations has RLS
// on with no policies), so this screen talks to it only through the
// slack_* RPCs, and the test message goes out via a Netlify function.
export default function IntegrationsView({ dark = true, orgId, canManage, allowed, onUpgrade }) {
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const border2 = dark ? '#3A3A3A' : '#CCC7BF'
  const inputBg = dark ? '#141414' : '#FFFFFF'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const cardRadius = '6px'
  const cardShadow = dark
    ? '0 1px 3px rgba(0,0,0,0.45)'
    : '0 1px 2px rgba(0,0,0,0.04), 0 3px 10px rgba(0,0,0,0.07)'
  const labelStyle = fieldLabelStyle(dark)
  const panelStyle = { background: card, border: `0.5px solid ${border}`, borderRadius: cardRadius, boxShadow: cardShadow, padding: '24px', marginBottom: '20px' }

  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [webhook, setWebhook] = useState('')
  const [channel, setChannel] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)       // { type: 'error' | 'success', text }
  const [team, setTeam] = useState([])
  const [slackIds, setSlackIds] = useState({})
  const [idMsg, setIdMsg] = useState({})     // per-member save feedback
  const [editing, setEditing] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.rpc('slack_status', { p_org_id: orgId })
    const row = Array.isArray(data) ? data[0] : data
    setStatus(row || null)
    setChannel((row && row.channel_label) || '')
    if (canManage) {
      const { data: members } = await supabase.rpc('org_team_slack', { p_org_id: orgId })
      setTeam(members || [])
      const ids = {}
      ;(members || []).forEach(m => { ids[m.id] = m.slack_user_id || '' })
      setSlackIds(ids)
    }
    setLoading(false)
  }

  useEffect(() => { if (orgId) load() }, [orgId])

  const connected = !!(status && status.connected)

  async function connect() {
    setMsg(null)
    const url = webhook.trim()
    if (!url) return setMsg({ type: 'error', text: 'Paste the webhook URL from Slack first.' })
    setSaving(true)

    const { error } = await supabase.rpc('slack_connect', {
      p_org_id: orgId, p_webhook_url: url, p_channel_label: channel.trim(),
    })
    if (error) { setSaving(false); return setMsg({ type: 'error', text: error.message }) }

    // Prove it works right away rather than letting them find out days later
    // when an assignment quietly goes nowhere.
    const sent = await sendTest()
    setSaving(false)
    setWebhook('')
    setEditing(false)
    await load()
    if (sent === true) setMsg({ type: 'success', text: 'Connected — check Slack for the test message.' })
  }

  async function sendTest() {
    setMsg(null)
    const { data: sess } = await supabase.auth.getSession()
    const token = sess && sess.session && sess.session.access_token
    if (!token) { setMsg({ type: 'error', text: 'Please sign in again.' }); return false }
    try {
      const res = await fetch('/.netlify/functions/slack-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token, org_id: orgId }),
      })
      const out = await res.json()
      if (!out.ok) { setMsg({ type: 'error', text: out.error || 'Could not reach Slack.' }); return false }
      return true
    } catch {
      setMsg({ type: 'error', text: 'Could not reach Slack.' })
      return false
    }
  }

  async function testOnly() {
    const ok = await sendTest()
    if (ok) setMsg({ type: 'success', text: 'Test message sent to Slack.' })
  }

  async function setPref(patch) {
    const next = { ...status, ...patch }
    setStatus(next)  // optimistic: a toggle that lags feels broken
    const { error } = await supabase.rpc('slack_set_prefs', {
      p_org_id: orgId,
      p_enabled: next.enabled,
      p_assignments: next.notify_assignments,
      p_overdue: next.notify_overdue,
    })
    if (error) { setMsg({ type: 'error', text: error.message }); load() }
  }

  async function disconnect() {
    if (!confirm('Disconnect Slack? HQue will stop posting to your channel, and the webhook is deleted — reconnecting means pasting a new URL.')) return
    const { error } = await supabase.rpc('slack_disconnect', { p_org_id: orgId })
    if (error) return setMsg({ type: 'error', text: error.message })
    setMsg(null)
    load()
  }

  async function saveSlackId(memberId) {
    const value = (slackIds[memberId] || '').trim()
    const { error } = await supabase.rpc('set_slack_user_id', {
      p_org_id: orgId, p_user_id: memberId, p_slack_user_id: value,
    })
    setIdMsg(m => ({ ...m, [memberId]: error ? error.message : 'Saved' }))
    setTimeout(() => setIdMsg(m => ({ ...m, [memberId]: null })), error ? 6000 : 2000)
  }

  const toggle = (on, onClick) => (
    <div onClick={onClick} style={{ width: '36px', height: '20px', borderRadius: '10px', background: on ? '#5b7c99' : (dark ? '#333' : '#CFCAC2'), cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
      <div style={{ position: 'absolute', top: '2px', left: on ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </div>
  )

  const sectionTitle = (t) => (
    <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '20px' }}>{t}</div>
  )

  const btn = (label, onClick, { primary = false, disabled = false } = {}) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '9px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase',
      background: primary ? '#5b7c99' : 'none', border: primary ? 'none' : `0.5px solid ${border2}`,
      color: primary ? '#fff' : muted, cursor: disabled ? 'default' : 'pointer',
      borderRadius: primary ? '1px' : '3px', opacity: disabled ? 0.6 : 1,
    }}>{label}</button>
  )

  const slackMark = (
    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: dark ? '#1A1A1A' : '#F4F1EC', border: `0.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>
      <svg width='17' height='17' viewBox='0 0 122 122' aria-hidden='true'>
        <path fill='#E01E5A' d='M25.8 77c0 7.1-5.8 12.9-12.9 12.9S0 84.1 0 77s5.8-12.9 12.9-12.9h12.9V77zm6.5 0c0-7.1 5.8-12.9 12.9-12.9S58.1 69.9 58.1 77v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77z'/>
        <path fill='#36C5F0' d='M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z'/>
        <path fill='#2EB67D' d='M96.2 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H96.2V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9S63.9 52.3 63.9 45.2V12.9C63.9 5.8 69.7 0 76.8 0s12.9 5.8 12.9 12.9v32.3z'/>
        <path fill='#ECB22E' d='M76.8 96.2c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V96.2h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H76.8z'/>
      </svg>
    </div>
  )

  // ── Not on a plan that includes it ─────────────────────────────────────────
  if (!allowed) {
    return (
      <div>
        {sectionTitle('Integrations')}
        <div style={panelStyle}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            {slackMark}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: text, marginBottom: '6px' }}>
                Slack <span style={{ fontSize: '11px', fontWeight: 400, color: '#5b7c99', marginLeft: '4px' }}>Pro &amp; Business</span>
              </div>
              <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7, marginBottom: '18px' }}>
                Send task assignments and overdue tasks into a Slack channel, tagging the person they belong to — so work that's been handed over or has slipped shows up where your team already is.
              </div>
              {onUpgrade && btn('Upgrade to Pro', onUpgrade, { primary: true })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        {sectionTitle('Integrations')}
        <div style={{ ...panelStyle, color: subtle, fontSize: '12px' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div>
      {sectionTitle('Integrations')}

      <div style={panelStyle}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: connected || canManage ? '20px' : 0 }}>
          {slackMark}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: text }}>Slack</span>
              {connected && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 11px', borderRadius: '999px', fontSize: '11px', lineHeight: 1, border: `1px solid ${status.enabled ? 'rgba(92,158,82,0.5)' : border2}`, color: status.enabled ? '#5C9E52' : subtle, background: dark ? '#1E1E1E' : '#FFFFFF' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: status.enabled ? '#5C9E52' : subtle }} />
                  {status.enabled ? 'Connected' : 'Paused'}
                  {status.channel_label ? ` · ${status.channel_label}` : ''}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7 }}>
              Posts to one channel when a task is assigned to someone, and when a task goes overdue. Nothing else — no comments, no every-little-edit.
            </div>
          </div>
        </div>

        {!canManage && !connected && (
          <div style={{ fontSize: '12px', color: subtle, lineHeight: 1.7 }}>
            Your owner or an admin can connect Slack for this company.
          </div>
        )}

        {/* ── Connect form ─────────────────────────────────────────────── */}
        {canManage && (!connected || editing) && (
          <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '20px' }}>
            <div style={{ fontSize: '12px', color: muted, lineHeight: 1.8, marginBottom: '18px' }}>
              In Slack: <strong style={{ color: text }}>Apps → Incoming Webhooks → Add to Slack</strong>, choose the channel you want HQue to post in (we'd suggest something like <span style={{ color: text }}>#hq</span>), then copy the Webhook URL it gives you and paste it below.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...labelStyle, marginBottom: '6px' }}>Webhook URL</div>
              <input value={webhook} onChange={e => setWebhook(e.target.value)} placeholder='https://hooks.slack.com/services/...'
                style={{ width: '100%', background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '6px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ ...labelStyle, marginBottom: '6px' }}>Channel name</div>
              <input value={channel} onChange={e => setChannel(e.target.value)} placeholder='#hq'
                style={{ width: '100%', maxWidth: '260px', background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '6px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '11px', color: subtle, marginTop: '6px' }}>Just so this screen can remind you where it's posting.</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {btn(saving ? 'Connecting…' : 'Connect Slack', connect, { primary: true, disabled: saving })}
              {editing && btn('Cancel', () => { setEditing(false); setWebhook(''); setMsg(null) })}
            </div>
          </div>
        )}

        {/* ── Connected: what to send ──────────────────────────────────── */}
        {canManage && connected && !editing && (
          <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '20px' }}>
            {[
              ['enabled', 'Post to Slack', 'Turn everything off without disconnecting.'],
              ['notify_assignments', 'Task assigned', 'When a task is handed to someone, tag them in the channel.'],
              ['notify_overdue', 'Task overdue', "Once a day, flag anything that's gone past its due date."],
            ].map(([key, label, help]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px', opacity: key !== 'enabled' && !status.enabled ? 0.45 : 1 }}>
                {toggle(!!status[key], () => setPref({ [key]: !status[key] }))}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: text, marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: subtle, lineHeight: 1.6 }}>{help}</div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
              {btn('Send test message', testOnly)}
              {btn('Replace webhook', () => { setEditing(true); setMsg(null) })}
              {btn('Disconnect', disconnect)}
            </div>
            {status.url_hint && <div style={{ fontSize: '11px', color: subtle, marginTop: '12px' }}>Webhook ending {status.url_hint}</div>}
          </div>
        )}

        {msg && (
          <div style={{ fontSize: '11px', marginTop: '14px', color: msg.type === 'error' ? '#e74c3c' : '#5C9E52', lineHeight: 1.6 }}>{msg.text}</div>
        )}
      </div>

      {/* ── Who gets tagged ────────────────────────────────────────────── */}
      {canManage && connected && (
        <div style={panelStyle}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: text, marginBottom: '8px' }}>Who gets tagged</div>
          <div style={{ fontSize: '12px', color: muted, lineHeight: 1.8, marginBottom: '20px' }}>
            To make Slack actually notify someone, HQue needs their Slack member ID. In Slack, open their profile → the <strong style={{ color: text }}>⋯</strong> menu → <strong style={{ color: text }}>Copy member ID</strong>, and paste it here. Anyone without one still appears in the message by name — it just won't ping them.
          </div>

          {team.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderTop: `0.5px solid ${border}`, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
                <div style={{ fontSize: '13px', color: text }}>{m.full_name || m.email}</div>
                <div style={{ fontSize: '11px', color: subtle }}>{m.role === 'owner' ? 'Owner' : m.role === 'admin' ? 'Admin' : 'Member'}</div>
              </div>
              <input
                value={slackIds[m.id] || ''}
                onChange={e => setSlackIds(s => ({ ...s, [m.id]: e.target.value }))}
                onBlur={() => saveSlackId(m.id)}
                placeholder='U04AB12CD'
                style={{ width: '150px', background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '6px', padding: '7px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '11px', width: '150px', color: idMsg[m.id] === 'Saved' ? '#5C9E52' : '#e74c3c', lineHeight: 1.5 }}>{idMsg[m.id] || ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
