import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const TYPES = [['Feature', 'New feature'], ['Improvement', 'Improve something existing'], ['Fix', 'Report an issue']]
const AREAS = ['Workspace', 'Campaigns', 'Talent', 'Reports', 'Account & Settings', 'Other']
// Same Google Apps Script web app the chat/blog email capture uses; the `list`
// field lets the sheet separate captures into different lists/tabs.
const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyvyIlOEgMAP_UOT4O07lUzQpB6MPJ5pipONT7Fem1IynGiDolHRfTQMQxWDtfIDk7e/exec'

// Public, read-only "Product Updates & Roadmap" page, reachable at /updates
// with no login. It pulls ONLY the curated subset (planned / in progress /
// shipped) via the get_public_updates() database function. Under-review and
// declined items never leave the admin manager in Settings.
export default function ProductUpdates() {
  const [state, setState] = useState('loading') // loading | ready | error
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')   // all | in_progress | planned | shipped
  const [expanded, setExpanded] = useState({})  // per-section "show all" toggles
  const [voted, setVoted] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('hque_roadmap_votes') || '[]')) } catch { return new Set() }
  })

  async function handleVote(item) {
    const has = voted.has(item.id)
    const delta = has ? -1 : 1
    const next = new Set(voted)
    if (has) next.delete(item.id); else next.add(item.id)
    setVoted(next)
    try { localStorage.setItem('hque_roadmap_votes', JSON.stringify([...next])) } catch (_) { /* ignore */ }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, vote_count: Math.max(0, (i.vote_count || 0) + delta) } : i))
    try { await supabase.rpc('vote_for_update', { p_id: item.id, p_delta: delta }) } catch (_) { /* best-effort */ }
  }

  const [showSubmit, setShowSubmit] = useState(false)
  const [sForm, setSForm] = useState({ title: '', description: '', firstName: '', lastName: '', email: '', category: 'Feature', area: '' })
  const [shot, setShot] = useState({ url: '', name: '', uploading: false, error: '' })
  const [sState, setSState] = useState('idle')  // idle | saving | done | error

  async function uploadShot(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setShot({ url: '', name: '', uploading: false, error: 'Image must be under 5MB' }); return }
    setShot({ url: '', name: file.name, uploading: true, error: '' })
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('feedback-screenshots').upload(path, file)
    if (error) { setShot({ url: '', name: '', uploading: false, error: 'Upload failed — try again' }); return }
    const { data: { publicUrl } } = supabase.storage.from('feedback-screenshots').getPublicUrl(path)
    setShot({ url: publicUrl, name: file.name, uploading: false, error: '' })
  }

  const emailValid = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((v || '').trim())

  async function submitRequest() {
    if (sState === 'saving' || shot.uploading || !sForm.title.trim() || !sForm.firstName.trim() || !sForm.lastName.trim() || !emailValid(sForm.email)) return
    setSState('saving')
    const fullName = `${sForm.firstName.trim()} ${sForm.lastName.trim()}`.trim()
    const { error } = await supabase.rpc('submit_feature_request', {
      p_title: sForm.title, p_description: sForm.description, p_name: fullName, p_email: sForm.email,
      p_category: sForm.category, p_area: sForm.area, p_screenshot_url: shot.url || null,
    })
    if (error) { setSState('error'); return }
    // Best-effort: alert the master admin(s) — in-app bell + email to support.
    // The request is already saved, so any failure here is non-fatal.
    try {
      await fetch('/.netlify/functions/notify-feature-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sForm.title.trim(), description: sForm.description, name: fullName,
          email: sForm.email.trim(), category: sForm.category, area: sForm.area,
          screenshotUrl: shot.url || null,
        }),
      })
    } catch (_) { /* ignore */ }
    // Best-effort: capture the email to our Google Sheet under the "feedback"
    // list. The request is already saved, so a capture failure is non-fatal.
    try {
      await fetch(GOOGLE_SHEETS_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ email: sForm.email.trim(), firstName: sForm.firstName.trim(), lastName: sForm.lastName.trim(), list: 'feedback', note: sForm.title.trim() }),
      })
      // Note: feedback submitters are NOT auto-added to Klaviyo — submitting a
      // feature request isn't a marketing opt-in. They enter the funnel only via
      // a real opt-in (footer/chat/blog) or by starting a trial.
    } catch (_) { /* ignore */ }
    setSState('done')
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.rpc('get_public_updates')
      if (cancelled) return
      if (error) { setState('error'); return }
      setItems(data || [])
      setState('ready')
    }
    load()
    return () => { cancelled = true }
  }, [])

  const bg = '#F8F7F3'
  const ink = '#1A1A1A'
  const muted = '#6B6B6B'
  const accent = '#5B7C99'
  const border = '#E0DCD4'
  const card = '#FFFFFF'

  const catColor = (c) => c === 'Fix' ? '#C77B5B' : c === 'Improvement' ? '#5C9E52' : accent

  const sections = [
    { key: 'in_progress', label: 'In Progress', blurb: 'Being built right now.' },
    { key: 'planned', label: 'Planned', blurb: 'Approved and coming soon.' },
    { key: 'shipped', label: 'Shipped', blurb: 'Live and ready to use.' },
  ]

  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

  const page = (children) => (
    <div style={{ minHeight: '100vh', background: bg, color: ink, fontFamily: '"Inter Tight", system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, width: '100%', maxWidth: '760px', margin: '0 auto', padding: '56px 24px 40px', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '40px' }}>
          <a href='https://h-que.com' style={{ display: 'inline-block' }}><img src='/logo.svg' alt='HQue' style={{ width: '140px', height: 'auto', display: 'block', filter: 'invert(1)' }} /></a>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '34px', fontWeight: 'normal', margin: '14px 0 10px' }}>Product Updates</h1>
          <p style={{ fontSize: '14px', color: muted, lineHeight: 1.6, margin: 0, maxWidth: '540px' }}>
            What we're building, what's coming next, and what just shipped. Your feedback shapes this list.
          </p>
        </div>
        {children}
      </div>
      <div style={{ textAlign: 'center', padding: '24px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A8A39B' }}>
        <a href='https://h-que.com' style={{ color: '#A8A39B', textDecoration: 'none' }}>Powered by HQue</a>
      </div>
    </div>
  )

  if (state === 'loading') {
    return page(<div style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: muted }}>Loading…</div>)
  }
  if (state === 'error') {
    return page(<div style={{ fontSize: '13px', color: muted }}>We couldn't load updates right now. Please try again shortly.</div>)
  }

  const CAP = 6
  const counts = {
    in_progress: items.filter(i => i.status === 'in_progress').length,
    planned: items.filter(i => i.status === 'planned').length,
    shipped: items.filter(i => i.status === 'shipped').length,
  }
  const filterTabs = [{ key: 'all', label: 'All' }, ...sections.map(s => ({ key: s.key, label: s.label }))]

  const sInput = { width: '100%', background: '#fff', border: `0.5px solid ${border}`, borderRadius: '4px', padding: '10px 12px', fontSize: '13px', color: ink, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '10px' }
  const sSelect = { width: '100%', background: '#fff', border: `0.5px solid ${border}`, borderRadius: '4px', padding: '9px 10px', fontSize: '13px', color: ink, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const sLabel = { fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: muted, marginBottom: '5px' }

  return page(
    <div>
      <div style={{ marginBottom: '28px' }}>
        {sState === 'done' ? (
          <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '8px', padding: '20px 22px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '5px' }}>Thanks — we got it! 🙌</div>
            <div style={{ fontSize: '13px', color: muted, lineHeight: 1.6 }}>We read every request. If it's approved, you'll see it appear on this page.</div>
          </div>
        ) : !showSubmit ? (
          <button onClick={() => setShowSubmit(true)} style={{ padding: '11px 20px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 600 }}>+ Submit a request</button>
        ) : (
          <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '8px', padding: '20px 22px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Have an idea or an issue?</div>
            <div style={{ fontSize: '12px', color: muted, marginBottom: '16px', lineHeight: 1.6 }}>Tell us what would make HQue better. We review every submission.</div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={sLabel}>What is this?</div>
                <select value={sForm.category} onChange={e => setSForm({ ...sForm, category: e.target.value })} style={sSelect}>
                  {TYPES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={sLabel}>Which area?</div>
                <select value={sForm.area} onChange={e => setSForm({ ...sForm, area: e.target.value })} style={sSelect}>
                  <option value=''>Select a section…</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <input value={sForm.title} onChange={e => setSForm({ ...sForm, title: e.target.value })} placeholder="What's your request?" style={sInput} autoFocus />
            <textarea value={sForm.description} onChange={e => setSForm({ ...sForm, description: e.target.value })} placeholder='Add any details' rows={3} style={{ ...sInput, resize: 'vertical' }} />

            <div style={{ marginBottom: '10px' }}>
              <div style={sLabel}>Screenshot {sForm.category === 'Fix' ? '(really helps us)' : '(optional)'}</div>
              {shot.url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={shot.url} alt='screenshot' style={{ height: '46px', borderRadius: '4px', border: `0.5px solid ${border}`, objectFit: 'cover' }} />
                  <span style={{ fontSize: '12px', color: muted }}>{shot.name}</span>
                  <button onClick={() => setShot({ url: '', name: '', uploading: false, error: '' })} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '12px' }}>Remove</button>
                </div>
              ) : (
                <label style={{ display: 'inline-block', padding: '8px 14px', fontSize: '11px', border: `0.5px dashed ${border}`, borderRadius: '4px', color: muted, cursor: 'pointer', background: '#fff' }}>
                  {shot.uploading ? 'Uploading…' : '+ Attach an image'}
                  <input type='file' accept='image/*' onChange={uploadShot} style={{ display: 'none' }} />
                </label>
              )}
              {shot.error && <div style={{ fontSize: '11px', color: '#C0392B', marginTop: '6px' }}>{shot.error}</div>}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <input value={sForm.firstName} onChange={e => setSForm({ ...sForm, firstName: e.target.value })} placeholder='First name *' style={{ ...sInput, flex: 1, minWidth: '140px', marginBottom: 0 }} />
              <input value={sForm.lastName} onChange={e => setSForm({ ...sForm, lastName: e.target.value })} placeholder='Last name *' style={{ ...sInput, flex: 1, minWidth: '140px', marginBottom: 0 }} />
            </div>
            <input type='email' value={sForm.email} onChange={e => setSForm({ ...sForm, email: e.target.value })} placeholder='Email *' style={{ ...sInput, marginBottom: '4px', borderColor: sForm.email && !emailValid(sForm.email) ? '#C0392B' : border }} />
            <div style={{ fontSize: '11px', color: muted, margin: '8px 0 14px', lineHeight: 1.5 }}>Your name and email are required — we'll follow up on your request and send you product updates.</div>
            {sState === 'error' && <div style={{ fontSize: '12px', color: '#C0392B', marginBottom: '10px' }}>Something went wrong. Please add a bit more detail and try again.</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {(() => { const canSend = !!sForm.title.trim() && !!sForm.firstName.trim() && !!sForm.lastName.trim() && emailValid(sForm.email) && sState !== 'saving' && !shot.uploading; return (
              <button onClick={submitRequest} disabled={!canSend} style={{ padding: '10px 18px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: canSend ? 'pointer' : 'not-allowed', borderRadius: '4px', fontWeight: 600, opacity: canSend ? 1 : 0.5 }}>{sState === 'saving' ? 'Sending…' : 'Send request'}</button>
              ) })()}
              <button onClick={() => setShowSubmit(false)} style={{ padding: '10px 18px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: muted, cursor: 'pointer', borderRadius: '4px' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'sticky', top: 0, background: bg, zIndex: 5, display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px 0 14px', marginBottom: '14px', borderBottom: `0.5px solid ${border}` }}>
        {filterTabs.map(t => {
          const active = filter === t.key
          const count = t.key === 'all' ? items.length : counts[t.key]
          return (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{ padding: '6px 13px', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', borderRadius: '20px', cursor: 'pointer', border: `0.5px solid ${active ? ink : border}`, background: active ? ink : 'transparent', color: active ? '#fff' : muted, fontWeight: active ? 700 : 500 }}>
              {t.label}{count > 0 && <span style={{ opacity: 0.55, marginLeft: '5px' }}>{count}</span>}
            </button>
          )
        })}
      </div>

      {sections.map(sec => {
        if (filter !== 'all' && filter !== sec.key) return null
        const rows = items.filter(i => i.status === sec.key)
        if (rows.length === 0) return null
        const showAll = filter === sec.key || expanded[sec.key]
        const visible = showAll ? rows : rows.slice(0, CAP)
        return (
          <div key={sec.key} style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '14px', letterSpacing: '0.16em', textTransform: 'uppercase', color: ink, fontWeight: 800, margin: 0 }}>{sec.label}</h2>
              <span style={{ fontSize: '11px', color: '#A8A39B' }}>{sec.blurb}</span>
            </div>
            <div style={{ marginTop: '14px' }}>
              {visible.map(item => {
                const canVote = item.status !== 'shipped'
                const hasVoted = voted.has(item.id)
                return (
                <div key={item.id} style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '6px', padding: '16px 18px', marginBottom: '10px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {canVote && (
                    <button onClick={() => handleVote(item)} title={hasVoted ? 'Remove your vote' : 'Vote for this'} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', minWidth: '46px', padding: '8px 6px', border: `1px solid ${hasVoted ? accent : border}`, background: hasVoted ? accent : '#fff', color: hasVoted ? '#fff' : ink, borderRadius: '6px', cursor: 'pointer' }}>
                      <span style={{ fontSize: '11px', lineHeight: 1 }}>▲</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.1 }}>{item.vote_count || 0}</span>
                    </button>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: '7px' }}>
                      <span style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: catColor(item.category), border: `0.5px solid ${catColor(item.category)}`, padding: '2px 6px', borderRadius: '2px', whiteSpace: 'nowrap' }}>{item.category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: item.description ? '6px' : 0 }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, flex: 1, minWidth: 0 }}>{item.title}</span>
                      {sec.key === 'shipped' && item.shipped_at && (
                        <span style={{ fontSize: '11px', color: '#A8A39B', flexShrink: 0, whiteSpace: 'nowrap' }}>{fmtDate(item.shipped_at)}</span>
                      )}
                    </div>
                    {item.description && <div style={{ fontSize: '13px', color: muted, lineHeight: 1.6 }}>{item.description}</div>}
                  </div>
                </div>
                )
              })}
            </div>
            {filter === 'all' && rows.length > CAP && (
              <button onClick={() => setExpanded(e => ({ ...e, [sec.key]: !showAll }))} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 0' }}>
                {showAll ? 'Show less' : `Show all ${rows.length}`}
              </button>
            )}
          </div>
        )
      })}
      {items.length === 0 && (
        <div style={{ fontSize: '13px', color: muted }}>No updates to show yet — check back soon.</div>
      )}
    </div>
  )
}
