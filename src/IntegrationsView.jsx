import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { fieldLabelStyle } from './uiStyles'

// Settings → Integrations. A list of collapsible rows, one per connection.
// Slack is the only one today; the next — Calendar, QuickBooks — is a second
// row rather than a redesign, which is why each row collapses to a single line
// showing its name and whether it's on. A page of permanently-open cards stops
// being scannable at about three.
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
  // Which row is open. Null = all collapsed, which is where everyone starts:
  // the point of the list is to see what exists before opening one.
  const [open, setOpen] = useState(null)

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

  // Link out to Slack's own app page — the one place all the webhook steps
  // start. New tab, so nobody loses the form they're half-way through filling in.
  const slackLink = (label, extra = {}) => (
    <a href='https://api.slack.com/apps' target='_blank' rel='noopener noreferrer' style={{
      display: 'inline-flex', alignItems: 'center', gap: '7px',
      padding: '9px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase',
      border: `0.5px solid ${border2}`, borderRadius: '3px', color: muted, textDecoration: 'none',
      ...extra,
    }}>
      {label}
      <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
        <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' /><polyline points='15 3 21 3 21 9' /><line x1='10' y1='14' x2='21' y2='3' />
      </svg>
    </a>
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

  // ── One collapsible row ────────────────────────────────────────────────────
  // Header is always visible and carries the status, so a connected Slack reads
  // correctly without anyone having to open it.
  const row = ({ key, title, mark, blurb, pill, body }) => {
    const isOpen = open === key
    return (
      <div key={key} style={{ background: card, border: `0.5px solid ${border}`, borderRadius: cardRadius, boxShadow: cardShadow, marginBottom: '14px', overflow: 'hidden' }}>
        <div
          onClick={() => setOpen(isOpen ? null : key)}
          role='button'
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(isOpen ? null : key) } }}
          style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '18px 20px', cursor: 'pointer', userSelect: 'none' }}>
          {mark}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '3px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: text }}>{title}</span>
              {pill}
            </div>
            <div style={{ fontSize: '12px', color: muted, lineHeight: 1.6 }}>{blurb}</div>
          </div>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'
            style={{ color: subtle, flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} aria-hidden='true'>
            <polyline points='6 9 12 15 18 9' />
          </svg>
        </div>
        {isOpen && (
          <div style={{ padding: '0 20px 22px', borderTop: `0.5px solid ${border}` }}>
            <div style={{ paddingTop: '20px' }}>{body}</div>
          </div>
        )}
      </div>
    )
  }

  const proPill = (
    <span style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '11px', lineHeight: 1, border: `1px solid ${border2}`, color: '#5b7c99', background: dark ? '#1E1E1E' : '#FFFFFF' }}>Pro &amp; Business</span>
  )

  const statusPill = connected ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 11px', borderRadius: '999px', fontSize: '11px', lineHeight: 1, border: `1px solid ${status.enabled ? 'rgba(92,158,82,0.5)' : border2}`, color: status.enabled ? '#5C9E52' : subtle, background: dark ? '#1E1E1E' : '#FFFFFF' }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: status.enabled ? '#5C9E52' : subtle }} />
      {status.enabled ? 'Connected' : 'Paused'}{status.channel_label ? ` · ${status.channel_label}` : ''}
    </span>
  ) : (
    <span style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '11px', lineHeight: 1, border: `1px solid ${border2}`, color: subtle, background: dark ? '#1E1E1E' : '#FFFFFF' }}>Not connected</span>
  )

  const blurb = "Posts to one channel when a task is assigned to someone, and when a task goes overdue. Nothing else — no comments, no every-little-edit."

  // ── Not on a plan that includes it ─────────────────────────────────────────
  if (!allowed) {
    return (
      <div>
        {sectionTitle('Integrations')}
        {row({
          key: 'slack', title: 'Slack', mark: slackMark, pill: proPill,
          blurb: 'Send task assignments and overdue tasks into a Slack channel.',
          body: (
            <div>
              <div style={{ fontSize: '12px', color: muted, lineHeight: 1.8, marginBottom: '18px' }}>
                {blurb} Each message tags the person it belongs to, so work that's been handed over — or has slipped — shows up where your team already is.
              </div>
              {onUpgrade && btn('Upgrade to Pro', onUpgrade, { primary: true })}
            </div>
          ),
        })}
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

  // ── The five steps for getting a webhook out of Slack ──────────────────────
  // Only shown before they've connected. Once Slack is live these are just
  // clutter above the settings they actually came back for — someone replacing
  // a webhook gets the one-line link instead.
  const instructions = (
    <div style={{ background: dark ? '#1A1A1A' : '#F4F1EC', border: `0.5px solid ${border}`, borderRadius: '6px', padding: '18px 20px', marginBottom: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: text, marginBottom: '4px' }}>Getting your webhook URL from Slack</div>
      <div style={{ fontSize: '11px', color: subtle, lineHeight: 1.6, marginBottom: '16px' }}>
        A webhook is the private address HQue posts to. It takes about two minutes, and you only do it once.
      </div>
      <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: muted, lineHeight: 1.9 }}>
        <li>Open Slack's app page and choose <strong style={{ color: text }}>Create New App</strong> → <strong style={{ color: text }}>From scratch</strong>.</li>
        <li>Name it <strong style={{ color: text }}>HQue</strong>, pick your workspace, then <strong style={{ color: text }}>Create App</strong>.</li>
        <li>In the left-hand menu click <strong style={{ color: text }}>Incoming Webhooks</strong>, and switch <strong style={{ color: text }}>Activate Incoming Webhooks</strong> on.</li>
        <li>Scroll down to <strong style={{ color: text }}>Add New Webhook to Workspace</strong>, pick the channel HQue should post in — something like <strong style={{ color: text }}>#hq</strong> — and click <strong style={{ color: text }}>Allow</strong>.</li>
        <li>Copy the <strong style={{ color: text }}>Webhook URL</strong> it gives you and paste it below.</li>
      </ol>
      {slackLink('Open Slack app page', { marginTop: '16px' })}
      <div style={{ fontSize: '11px', color: subtle, lineHeight: 1.7, marginTop: '14px' }}>
        Opens in a new tab. Some workspaces only let admins create apps — if you don't see the option, ask whoever runs your Slack to do steps 1–5 and send you the URL.
      </div>
    </div>
  )

  const connectForm = (
    <div>
      {/* Replacing a webhook means they've done this before — a one-line link
          back to Slack is enough, the full five steps would be nagging. */}
      {editing ? (
        <div style={{ fontSize: '12px', color: muted, lineHeight: 1.8, marginBottom: '18px' }}>
          Paste a new webhook URL to point HQue at a different channel, or to replace one that's been revoked. {slackLink('Slack app page', { display: 'inline-flex', marginTop: 0, padding: '5px 11px' })}
        </div>
      ) : instructions}

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
  )

  const connectedSettings = (
    <div>
      {[
        ['enabled', 'Post to Slack', 'Turn everything off without disconnecting.'],
        ['notify_assignments', 'Task assigned', 'When a task is handed to someone, tag them in the channel.'],
        ['notify_overdue', 'Task overdue', "Once a day, flag anything that's gone past its due date."],
      ].map(([k, label, help]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px', opacity: k !== 'enabled' && !status.enabled ? 0.45 : 1 }}>
          {toggle(!!status[k], () => setPref({ [k]: !status[k] }))}
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

      {/* Who gets tagged — only useful once Slack is actually connected. */}
      <div style={{ borderTop: `0.5px solid ${border}`, marginTop: '24px', paddingTop: '22px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: text, marginBottom: '8px' }}>Who gets tagged</div>
        <div style={{ fontSize: '12px', color: muted, lineHeight: 1.8, marginBottom: '18px' }}>
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
              onChange={e => setSlackIds(x => ({ ...x, [m.id]: e.target.value }))}
              onBlur={() => saveSlackId(m.id)}
              placeholder='U04AB12CD'
              style={{ width: '150px', background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '6px', padding: '7px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ fontSize: '11px', width: '150px', color: idMsg[m.id] === 'Saved' ? '#5C9E52' : '#e74c3c', lineHeight: 1.5 }}>{idMsg[m.id] || ''}</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      {sectionTitle('Integrations')}

      {row({
        key: 'slack', title: 'Slack', mark: slackMark, pill: statusPill, blurb,
        body: (
          <div>
            {!canManage ? (
              <div style={{ fontSize: '12px', color: subtle, lineHeight: 1.7 }}>
                {connected
                  ? `Slack is connected${status.channel_label ? ` and posting to ${status.channel_label}` : ''}. Ask your owner or an admin to change it, or to add your Slack member ID so you get tagged by name.`
                  : 'Your owner or an admin can connect Slack for this company.'}
              </div>
            ) : (!connected || editing) ? connectForm : connectedSettings}

            {msg && (
              <div style={{ fontSize: '11px', marginTop: '14px', color: msg.type === 'error' ? '#e74c3c' : '#5C9E52', lineHeight: 1.6 }}>{msg.text}</div>
            )}
          </div>
        ),
      })}
    </div>
  )
}
