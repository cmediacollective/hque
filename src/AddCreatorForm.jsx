import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import ExpandableTextarea from './ExpandableTextarea'
import { useTalentLabels } from './useTalentLabels'

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Pinterest', 'LinkedIn']
const TIERS = ['Nano', 'Micro', 'Mid', 'Macro', 'Mega']

const toggleChip = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

// Performance numbers a brand asks for. Most of these are only visible in the
// talent's own Instagram Insights — there's no way to look them up from a
// handle — so they're typed in from whatever the talent sends over.
const EMPTY_METRICS = {
  period: 'Last 30 days', avg_views: '', avg_engagement: '', avg_story_reach: '',
  avg_story_views: '', avg_link_clicks: '', reach_engagement_rate: ''
}
// Three age bands is what fits the one-pager; the reference sheets all show 2-3.
const EMPTY_AUDIENCE = {
  female: '', male: '',
  ages: [{ label: '', pct: '' }, { label: '', pct: '' }, { label: '', pct: '' }]
}
// Pad a saved age list back out to three editable rows.
const agesToForm = (ages) => {
  const rows = (Array.isArray(ages) ? ages : []).map(a => ({ label: a?.label || '', pct: a?.pct ?? '' }))
  while (rows.length < 3) rows.push({ label: '', pct: '' })
  return rows.slice(0, 3)
}
const numOrNull = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null }

export default function AddCreatorForm({ onClose, onSaved, existing, dark = true, orgId }) {
  // This company's own label lists. Falls back to the talent's org when editing
  // from the detail panel (which doesn't pass orgId). Chips always include any
  // tag the talent already has, even if that label was later removed.
  const { types: orgTypes, niches: orgNiches } = useTalentLabels(orgId || existing?.org_id)
  const typeOptions = [...orgTypes, ...(existing?.types || []).filter(t => !orgTypes.includes(t))]
  const nicheOptions = [...orgNiches, ...(existing?.niches || []).filter(n => !orgNiches.includes(n))]
  const bg = dark ? '#1A1A1A' : '#FFFFFF'
  const text = dark ? '#EDEAE4' : '#1A1A1A'
  const muted = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const label = muted
  const fieldBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'
  const fieldBorder = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  const fieldBorderStrong = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'
  const border = fieldBorder
  const inputBg = fieldBg
  const accent = '#5b7c99'
  const danger = dark ? '#d98b85' : '#c0392b'
  const overlay = dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)'
  const fieldFocus = (e) => { e.target.style.borderColor = fieldBorderStrong }
  const fieldBlur = (e) => { e.target.style.borderColor = fieldBorder }
  const inputStyle = { width: '100%', background: fieldBg, border: `1px solid ${fieldBorder}`, borderRadius: '6px', padding: '9px 11px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease' }

  const [form, setForm] = useState(existing ? {
    ...existing,
    types: existing.types || (existing.type ? [existing.type] : []),
    rates: existing.rates || { feed: '', story: '', reel: '', tiktok: '', youtube: '', misc: '' },
    handles: existing.handles || { instagram: '', tiktok: '', youtube: '' },
    metrics: { ...EMPTY_METRICS, ...(existing.metrics || {}) },
    audience: { ...EMPTY_AUDIENCE, ...(existing.audience || {}), ages: agesToForm(existing.audience?.ages) },
    niches: existing.niches || []
  } : {
    name: '', types: [], tier: '', primary_platform: '',
    niches: [], ig_followers: '', tiktok_followers: '', yt_subscribers: '',
    engagement_rate: '', contact_email: '', manager_name: '', manager_email: '',
    manager_user_id: null,
    location: '', notes: '', bio: '', photo_url: '', media_kit_url: '',
    handles: { instagram: '', tiktok: '', youtube: '' },
    rates: { feed: '', story: '', reel: '', tiktok: '', youtube: '', misc: '' },
    metrics: { ...EMPTY_METRICS },
    audience: { ...EMPTY_AUDIENCE }
  })
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingKit, setUploadingKit] = useState(false)
  const [error, setError] = useState('')
  // Permanent-delete flow: a confirm dialog that only unlocks once the
  // talent's exact name is typed, so a stray click can never wipe a profile.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Team members, for the "Talent manager" picker (who gets this talent's
  // booking inquiries). Membership list so any real member is selectable.
  const [teamMembers, setTeamMembers] = useState([])
  useEffect(() => {
    const oid = orgId || existing?.org_id
    if (!oid) return
    supabase.rpc('org_team', { p_org_id: oid }).then(({ data }) => setTeamMembers(data || []))
  }, [orgId, existing?.org_id])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setHandle = (key, val) => setForm(f => ({ ...f, handles: { ...f.handles, [key]: val } }))
  const setRate = (key, val) => setForm(f => ({ ...f, rates: { ...f.rates, [key]: val } }))
  const setMetric = (key, val) => setForm(f => ({ ...f, metrics: { ...f.metrics, [key]: val } }))
  const setAudience = (key, val) => setForm(f => ({ ...f, audience: { ...f.audience, [key]: val } }))
  const setAge = (i, key, val) => setForm(f => ({
    ...f,
    audience: { ...f.audience, ages: f.audience.ages.map((a, j) => j === i ? { ...a, [key]: val } : a) }
  }))

  // "Pull from Instagram" — fills the numbers Instagram will tell us from the
  // handle alone (followers, avg engagement, avg views where available, and a
  // follower-based engagement rate). Everything else on this form stays manual
  // because it only exists in the creator's own Insights; see the note under
  // the Performance heading.
  const [pulling, setPulling] = useState(false)
  const [pullResult, setPullResult] = useState(null)

  async function pullFromInstagram() {
    const handle = (form.handles.instagram || '').trim().replace(/^@/, '')
    if (!handle) return setPullResult({ error: 'Add their Instagram handle above first.' })
    setPulling(true)
    setPullResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/.netlify/functions/instagram-metrics?handle=${encodeURIComponent(handle)}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      })
      const body = await res.json()
      if (body.configured === false) {
        setPullResult({ error: body.reason === 'not_permitted'
          ? 'Pulling from Instagram isn’t switched on for this account yet.'
          : 'Instagram isn’t connected yet — see docs/instagram-metrics-setup.md for the one-time setup.' })
      } else if (!body.ok) {
        setPullResult({ error: body.error || 'Couldn’t reach Instagram.' })
      } else {
        // Only overwrite what actually came back — a null from the API means
        // "not available", which must not wipe a number typed in by hand.
        const m = body.metrics || {}
        setForm(f => ({
          ...f,
          ig_followers: body.followers || f.ig_followers,
          engagement_rate: m.engagement_rate ?? f.engagement_rate,
          metrics: {
            ...f.metrics,
            avg_engagement: m.avg_engagement ?? f.metrics.avg_engagement,
            avg_views: m.avg_views ?? f.metrics.avg_views,
          },
        }))
        const got = ['followers', m.avg_engagement != null && 'avg engagement', m.avg_views != null && 'avg views', m.engagement_rate != null && 'engagement rate'].filter(Boolean)
        setPullResult({ ok: `Filled ${got.join(', ')} from ${body.posts_sampled} recent posts. Story reach, story views, link clicks and the audience split can’t be pulled — those are still yours to fill in.` })
      }
    } catch (e) {
      setPullResult({ error: e.message })
    }
    setPulling(false)
  }
  const toggleType = (t) => setForm(f => ({ ...f, types: toggleChip(f.types, t) }))
  const toggleNiche = (n) => setForm(f => ({ ...f, niches: toggleChip(f.niches, n) }))

  const field = (lbl, children) => {
    const required = lbl.endsWith(' *')
    const base = required ? lbl.slice(0, -2) : lbl
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: muted, marginBottom: '5px' }}>{base}{required && <span style={{ color: danger, marginLeft: '3px' }}>*</span>}</div>
        {children}
      </div>
    )
  }

  const inp = (props) => (
    <input {...props} onFocus={fieldFocus} onBlur={fieldBlur} style={{ ...inputStyle, ...(props.style || {}) }} />
  )

  const txt = (props, height = '90px') => (
    <textarea {...props} onFocus={fieldFocus} onBlur={fieldBlur} style={{ ...inputStyle, height, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
  )

  // $-prefixed numeric input for rate fields.
  const money = (props) => (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: muted, pointerEvents: 'none' }}>$</span>
      {inp({ ...props, type: 'number', style: { paddingLeft: '22px' } })}
    </div>
  )

  // Native select with a custom low-opacity chevron — no browser-default arrow.
  const selectStyle = { ...inputStyle, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', paddingRight: '28px', cursor: 'pointer' }
  const sel = (props, options) => (
    <div style={{ position: 'relative' }}>
      <select {...props} onFocus={fieldFocus} onBlur={fieldBlur} style={selectStyle}>
        <option value=''>Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px', color: muted }}>▾</span>
    </div>
  )

  // Sentence-case pill chip for Type / Niche toggles.
  const chip = (lbl, selected, onClick) => (
    <button key={lbl} onClick={onClick} style={{
      padding: '4px 12px', fontSize: '11px', fontWeight: 400, borderRadius: '20px', cursor: 'pointer',
      border: `1px solid ${selected ? (dark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)') : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)')}`,
      background: selected ? (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)') : 'transparent',
      color: selected ? text : muted, whiteSpace: 'nowrap', transition: 'background 0.15s, border-color 0.15s, color 0.15s'
    }}>{lbl}</button>
  )

  // Quiet section divider: a hairline rule + a small plain label. No caps, no numbers.
  const sectionLabel = (t, first = false) => (
    <div style={{ marginTop: first ? '6px' : '36px', marginBottom: '12px', paddingTop: first ? '0' : '14px', borderTop: first ? 'none' : `1px solid ${fieldBorder}` }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.07em', color: text, opacity: 0.4, fontWeight: 400 }}>{t}</div>
    </div>
  )

  async function handleKitUpload(file) {
    if (!file) return
    setUploadingKit(true)
    const ext = file.name.split('.').pop()
    const path = 'kits/' + Date.now() + '.' + ext
    const { error } = await supabase.storage.from('media-kits').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('media-kits').getPublicUrl(path)
      set('media_kit_url', publicUrl)
    }
    setUploadingKit(false)
  }

  async function handlePhotoUpload(file) {
    if (!file) return
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const path = 'talent/' + Date.now() + '.' + ext
    const { error } = await supabase.storage.from('media-kits').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('media-kits').getPublicUrl(path)
      set('photo_url', publicUrl)
    }
    setUploadingPhoto(false)
  }

  // Blank metric fields are stored as null so the one-pager can tell "not
  // measured" from a real zero and leave the block off the sheet. The date
  // stamp only moves when a number actually changed — editing the bio shouldn't
  // make month-old Insights look freshly checked.
  function buildMetrics() {
    const next = {
      period: form.metrics.period || 'Last 30 days',
      avg_views: numOrNull(form.metrics.avg_views),
      avg_engagement: numOrNull(form.metrics.avg_engagement),
      avg_story_reach: numOrNull(form.metrics.avg_story_reach),
      avg_story_views: numOrNull(form.metrics.avg_story_views),
      avg_link_clicks: numOrNull(form.metrics.avg_link_clicks),
      reach_engagement_rate: numOrNull(form.metrics.reach_engagement_rate),
    }
    const prev = existing?.metrics || {}
    const unchanged = Object.keys(next).every(k => (prev[k] ?? null) === next[k])
    return {
      ...next,
      source: prev.source || 'manual',
      updated_at: (unchanged && prev.updated_at) ? prev.updated_at : new Date().toISOString().slice(0, 10),
    }
  }

  function buildPayload() {
    return {
      ...form,
      type: form.types[0],
      ig_followers: form.ig_followers ? parseInt(form.ig_followers) : null,
      tiktok_followers: form.tiktok_followers ? parseInt(form.tiktok_followers) : null,
      yt_subscribers: form.yt_subscribers ? parseInt(form.yt_subscribers) : null,
      engagement_rate: form.engagement_rate ? parseFloat(form.engagement_rate) : null,
      rates: {
        feed: form.rates.feed ? parseInt(form.rates.feed) : null,
        story: form.rates.story ? parseInt(form.rates.story) : null,
        reel: form.rates.reel ? parseInt(form.rates.reel) : null,
        tiktok: form.rates.tiktok ? parseInt(form.rates.tiktok) : null,
        youtube: form.rates.youtube ? parseInt(form.rates.youtube) : null,
        misc: form.rates.misc ? parseInt(form.rates.misc) : null,
      },
      handles: {
        instagram: form.handles.instagram?.replace('@', ''),
        tiktok: form.handles.tiktok?.replace('@', ''),
        youtube: form.handles.youtube?.replace('@', ''),
      },
      metrics: buildMetrics(),
      audience: {
        female: numOrNull(form.audience.female),
        male: numOrNull(form.audience.male),
        ages: form.audience.ages
          .filter(a => a.label?.trim() && numOrNull(a.pct) !== null)
          .map(a => ({ label: a.label.trim(), pct: numOrNull(a.pct) })),
      },
      org_id: orgId
    }
  }

  // Manual save — used when ADDING a new talent (there's no row to auto-save to
  // yet). Editing an existing talent auto-saves (see the effect below).
  async function save() {
    if (!form.name) return setError('Name is required')
    if (!form.types?.length) return setError('Select at least one type')
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('creators').insert([buildPayload()])
    setSaving(false)
    if (err) return setError(err.message)
    onSaved()
    onClose()
  }

  // Auto-save while editing: debounce form changes and quietly persist them.
  // Skips the first render and any invalid state (name + at least one type).
  const editing = !!existing?.id
  const firstRun = useRef(true)
  const [autoSaving, setAutoSaving] = useState(false)
  const [autoSaved, setAutoSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (!editing) return
    if (firstRun.current) { firstRun.current = false; return }
    if (!form.name || !form.types?.length) return
    setDirty(true)
    const t = setTimeout(async () => {
      setAutoSaving(true)
      setError('')
      const { error: err } = await supabase.from('creators').update(buildPayload()).eq('id', existing.id)
      setAutoSaving(false)
      if (err) setError(err.message)
      else { setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2200) }
    }, 800)
    return () => clearTimeout(t)
  }, [form])

  // Closing after editing: refresh the roster once so it reflects the auto-saved
  // changes (auto-save itself doesn't refetch, to avoid churn on every keystroke).
  function handleClose() {
    if (editing && dirty) onSaved()
    onClose()
  }

  const nameMatches = deleteText.trim().toLowerCase() === (existing?.name || '').trim().toLowerCase()

  // Permanent delete. Clear the talent's campaign links and outreach history
  // first so a foreign-key reference can't block the delete, then remove the
  // talent row. onSaved() closes the panel and refreshes the roster.
  async function deleteTalent() {
    if (!existing?.id || !nameMatches) return
    setDeleting(true)
    setError('')
    const id = existing.id
    await supabase.from('campaign_creators').delete().eq('creator_id', id)
    await supabase.from('outreach_logs').delete().eq('creator_id', id)
    const { error: delErr } = await supabase.from('creators').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { setError(delErr.message); return }
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: overlay, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className='atf-modal atf-scroll' style={{ background: bg, border: `1px solid ${fieldBorder}`, width: '580px', maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', borderRadius: '12px' }}>
        <style>{`
          .atf-scroll::-webkit-scrollbar { width: 8px; }
          .atf-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
          .atf-scroll:hover::-webkit-scrollbar-thumb { background: ${dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)'}; }
          .atf-modal input::placeholder, .atf-modal textarea::placeholder { color: ${text}; opacity: 0.3; }
        `}</style>

        <div style={{ padding: '24px 28px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: bg, zIndex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 500, color: text, letterSpacing: '-0.01em', paddingTop: '2px' }}>{existing ? 'Edit Talent' : 'Add Talent'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {editing && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: autoSaved ? '#5C9E52' : muted, whiteSpace: 'nowrap' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: autoSaving ? '#E0A93C' : '#5C9E52', flexShrink: 0 }} />
                {autoSaving ? 'Auto-saving…' : autoSaved ? 'Auto-saved' : 'Auto-save on'}
              </span>
            )}
            <button onClick={handleClose} title='Close' style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '4px', opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>×</button>
          </div>
        </div>

        <div style={{ padding: '8px 28px 28px' }}>
          {sectionLabel('Basic info', true)}
          {field('Full Name *', inp({ value: form.name, onChange: e => set('name', e.target.value), placeholder: 'e.g. Michelle Young' }))}

          {field('Type *',
            <>
              <div style={{ fontSize: '11px', color: muted, opacity: 0.7, marginTop: '-1px', marginBottom: '8px' }}>Select all that apply</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {typeOptions.map(t => chip(t, form.types.includes(t), () => toggleType(t)))}
              </div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {field('Tier', sel({ value: form.tier, onChange: e => set('tier', e.target.value) }, TIERS))}
            {field('Primary Platform', sel({ value: form.primary_platform, onChange: e => set('primary_platform', e.target.value) }, PLATFORMS))}
          </div>

          {field('Location', inp({ value: form.location, onChange: e => set('location', e.target.value), placeholder: 'e.g. Los Angeles, CA' }))}

          {field('Talent Manager',
            <>
              <select value={form.manager_user_id || ''} onChange={e => set('manager_user_id', e.target.value || null)} onFocus={fieldFocus} onBlur={fieldBlur} style={inputStyle}>
                <option value=''>Unassigned — inquiries go to the admin team</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
              </select>
              <div style={{ fontSize: '11px', color: muted, opacity: 0.7, marginTop: '6px' }}>Who gets booking inquiries from this talent's public profile.</div>
            </>
          )}
          {field('Photo',
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {form.photo_url && (
                <img src={form.photo_url} alt='preview' style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: `1px solid ${fieldBorder}`, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
              )}
              <label style={{ padding: '6px 14px', fontSize: '12px', border: `1px solid ${fieldBorder}`, color: muted, cursor: 'pointer', borderRadius: '6px', display: 'inline-block' }}>
                {uploadingPhoto ? 'Uploading…' : form.photo_url ? 'Change photo' : 'Upload photo'}
                <input type='file' accept='image/*' onChange={e => handlePhotoUpload(e.target.files[0])} style={{ display: 'none' }} />
              </label>
              {form.photo_url && (
                <button onClick={() => set('photo_url', '')} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '12px', padding: 0 }}>Remove</button>
              )}
            </div>
          )}

          {field('Niches',
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {nicheOptions.map(n => chip(n, form.niches.includes(n), () => toggleNiche(n)))}
            </div>
          )}

          {field('Public Bio',
            <>
              {txt({ value: form.bio || '', onChange: e => set('bio', e.target.value), placeholder: 'A short, brand-facing description shown on this talent’s public profile page.' })}
              <div style={{ fontSize: '11px', color: muted, opacity: 0.8, marginTop: '6px' }}>Shown publicly when you publish this talent&rsquo;s shareable link. Leave the rest private.</div>
            </>
          )}

          {sectionLabel('Handles')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {field('Instagram', inp({ value: form.handles.instagram, onChange: e => setHandle('instagram', e.target.value), placeholder: 'username' }))}
            {field('TikTok', inp({ value: form.handles.tiktok, onChange: e => setHandle('tiktok', e.target.value), placeholder: 'username' }))}
            {field('YouTube', inp({ value: form.handles.youtube, onChange: e => setHandle('youtube', e.target.value), placeholder: 'channel' }))}
          </div>

          {sectionLabel('Audience')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
            {field('IG Followers', inp({ value: form.ig_followers, onChange: e => set('ig_followers', e.target.value), placeholder: '0', type: 'number' }))}
            {field('TikTok Followers', inp({ value: form.tiktok_followers, onChange: e => set('tiktok_followers', e.target.value), placeholder: '0', type: 'number' }))}
            {field('YT Subscribers', inp({ value: form.yt_subscribers, onChange: e => set('yt_subscribers', e.target.value), placeholder: '0', type: 'number' }))}
            {field('Eng Rate %', inp({ value: form.engagement_rate, onChange: e => set('engagement_rate', e.target.value), placeholder: '0.0', type: 'number' }))}
          </div>

          {sectionLabel('Performance')}
          <div style={{ fontSize: '11px', color: muted, opacity: 0.8, marginBottom: '12px', lineHeight: 1.6 }}>
            Pull what Instagram makes public, then fill in the rest by hand. Story reach, story views, link clicks and the audience split exist only in the creator&rsquo;s own Insights &mdash; no tool can fetch those from a handle. Anything left blank is left off the one-pager.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <button onClick={pullFromInstagram} disabled={pulling} style={{
              padding: '7px 14px', fontSize: '12px', borderRadius: '6px', cursor: pulling ? 'default' : 'pointer',
              border: `1px solid ${fieldBorder}`, background: fieldBg, color: text, opacity: pulling ? 0.6 : 1
            }}>{pulling ? 'Pulling…' : 'Pull from Instagram'}</button>
            <span style={{ fontSize: '11px', color: muted, opacity: 0.7 }}>Fills followers, avg engagement and engagement rate.</span>
          </div>
          {pullResult && (
            <div style={{
              fontSize: '11.5px', lineHeight: 1.6, marginBottom: '14px', padding: '10px 12px', borderRadius: '6px',
              color: pullResult.error ? '#c9a14a' : muted,
              background: pullResult.error ? 'rgba(201,161,74,0.09)' : fieldBg,
              border: `1px solid ${pullResult.error ? 'rgba(201,161,74,0.25)' : fieldBorder}`
            }}>{pullResult.error || pullResult.ok}</div>
          )}
          {field('Period', inp({ value: form.metrics.period, onChange: e => setMetric('period', e.target.value), placeholder: 'Last 30 days' }))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {field('Avg views', inp({ value: form.metrics.avg_views, onChange: e => setMetric('avg_views', e.target.value), placeholder: '0', type: 'number' }))}
            {field('Avg engagement', inp({ value: form.metrics.avg_engagement, onChange: e => setMetric('avg_engagement', e.target.value), placeholder: '0', type: 'number' }))}
            {field('Reach eng rate %', inp({ value: form.metrics.reach_engagement_rate, onChange: e => setMetric('reach_engagement_rate', e.target.value), placeholder: '0.0', type: 'number' }))}
            {field('Avg story reach', inp({ value: form.metrics.avg_story_reach, onChange: e => setMetric('avg_story_reach', e.target.value), placeholder: '0', type: 'number' }))}
            {field('Avg story views', inp({ value: form.metrics.avg_story_views, onChange: e => setMetric('avg_story_views', e.target.value), placeholder: '0', type: 'number' }))}
            {field('Avg link clicks', inp({ value: form.metrics.avg_link_clicks, onChange: e => setMetric('avg_link_clicks', e.target.value), placeholder: '0', type: 'number' }))}
          </div>

          {sectionLabel('Audience breakdown')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {field('Female %', inp({ value: form.audience.female, onChange: e => setAudience('female', e.target.value), placeholder: '0.0', type: 'number' }))}
            {field('Male %', inp({ value: form.audience.male, onChange: e => setAudience('male', e.target.value), placeholder: '0.0', type: 'number' }))}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: muted, marginBottom: '8px' }}>Top age groups</div>
          {form.audience.ages.map((a, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '12px', marginBottom: '10px' }}>
              {inp({ value: a.label, onChange: e => setAge(i, 'label', e.target.value), placeholder: i === 0 ? '35\u201344' : 'Age range' })}
              {inp({ value: a.pct, onChange: e => setAge(i, 'pct', e.target.value), placeholder: '%', type: 'number' })}
            </div>
          ))}

          {sectionLabel('Rates')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            {field('IG Feed', money({ value: form.rates.feed, onChange: e => setRate('feed', e.target.value), placeholder: '0' }))}
            {field('IG Story', money({ value: form.rates.story, onChange: e => setRate('story', e.target.value), placeholder: '0' }))}
            {field('IG Reel', money({ value: form.rates.reel, onChange: e => setRate('reel', e.target.value), placeholder: '0' }))}
            {field('TikTok', money({ value: form.rates.tiktok, onChange: e => setRate('tiktok', e.target.value), placeholder: '0' }))}
            {field('YouTube', money({ value: form.rates.youtube, onChange: e => setRate('youtube', e.target.value), placeholder: '0' }))}
            {field('Other', money({ value: form.rates.misc, onChange: e => setRate('misc', e.target.value), placeholder: '0' }))}
          </div>

          {sectionLabel('Contact')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {field('Talent Email', inp({ value: form.contact_email, onChange: e => set('contact_email', e.target.value), placeholder: 'email@example.com' }))}
            {field('Manager Name', inp({ value: form.manager_name, onChange: e => set('manager_name', e.target.value), placeholder: 'Manager name' }))}
          </div>
          {field('Manager Email', inp({ value: form.manager_email, onChange: e => set('manager_email', e.target.value), placeholder: 'manager@example.com' }))}

          {field('Media Kit',
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {form.media_kit_url && (
                <a href={form.media_kit_url} target='_blank' rel='noreferrer' style={{ fontSize: '12px', color: accent, textDecoration: 'none' }}>View file ↗</a>
              )}
              <label style={{ padding: '6px 14px', fontSize: '12px', border: `1px solid ${fieldBorder}`, color: muted, cursor: 'pointer', borderRadius: '6px', display: 'inline-block' }}>
                {uploadingKit ? 'Uploading…' : form.media_kit_url ? 'Replace file' : 'Upload media kit'}
                <input type='file' accept='application/pdf,image/jpeg,image/png' onChange={e => { if (e.target.files[0]) handleKitUpload(e.target.files[0]); e.target.value = '' }} style={{ display: 'none' }} />
              </label>
              {form.media_kit_url && (
                <button onClick={() => set('media_kit_url', '')} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '12px', padding: 0 }}>Remove</button>
              )}
            </div>
          )}

          {field('Internal Notes',
            txt({ value: form.notes, onChange: e => set('notes', e.target.value), placeholder: 'Any notes…' }, '80px')
          )}

          {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginTop: '18px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-end', marginTop: '28px' }}>
            {editing ? (
              <>
                <button onClick={() => { setDeleteText(''); setConfirmingDelete(true) }} style={{ marginRight: 'auto', background: 'none', border: 'none', color: danger, fontSize: '12px', cursor: 'pointer', padding: '4px' }}>Delete talent</button>
                <button onClick={handleClose} style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 500, background: dark ? '#FFFFFF' : '#1A1A1A', color: dark ? '#111' : '#FFFFFF', border: 'none', cursor: 'pointer', borderRadius: '6px' }}>Done</button>
              </>
            ) : (
              <>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: muted, fontSize: '13px', cursor: 'pointer', padding: '4px' }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 500, background: dark ? '#FFFFFF' : '#1A1A1A', color: dark ? '#111' : '#FFFFFF', border: 'none', cursor: 'pointer', borderRadius: '6px', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save talent'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {confirmingDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: bg, border: `1px solid ${fieldBorder}`, padding: '32px', width: '100%', maxWidth: '400px', borderRadius: '12px' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', marginBottom: '8px', color: text }}>
              Delete {existing?.name} forever?
            </div>
            <div style={{ fontSize: '12px', color: muted, marginBottom: '20px', lineHeight: 1.5 }}>
              This permanently removes {existing?.name || 'this talent'} and their campaign links and outreach history. This cannot be undone.
            </div>
            <div style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: muted, marginBottom: '8px' }}>
              Type <span style={{ color: text, fontWeight: 600 }}>{existing?.name}</span> to confirm
            </div>
            <input
              value={deleteText}
              onChange={e => setDeleteText(e.target.value)}
              placeholder={existing?.name || ''}
              autoFocus
              style={{ ...inputStyle, marginBottom: '20px' }}
              onFocus={fieldFocus}
              onBlur={fieldBlur}
            />
            {error && <div style={{ fontSize: '12px', color: danger, marginBottom: '14px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setConfirmingDelete(false); setDeleteText(''); setError('') }} style={{ background: 'none', border: 'none', color: muted, fontSize: '13px', cursor: 'pointer', padding: '8px 12px' }}>Cancel</button>
              <button onClick={deleteTalent} disabled={!nameMatches || deleting} style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 500, background: danger, color: '#fff', border: 'none', borderRadius: '6px', cursor: nameMatches && !deleting ? 'pointer' : 'not-allowed', opacity: nameMatches && !deleting ? 1 : 0.45 }}>
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
