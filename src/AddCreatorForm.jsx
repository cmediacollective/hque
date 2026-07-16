import { useState } from 'react'
import { supabase } from './supabase'
import ExpandableTextarea from './ExpandableTextarea'
import { useTalentLabels } from './useTalentLabels'

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Pinterest', 'LinkedIn']
const TIERS = ['Nano', 'Micro', 'Mid', 'Macro', 'Mega']

const toggleChip = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

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
    niches: existing.niches || []
  } : {
    name: '', types: [], tier: '', primary_platform: '',
    niches: [], ig_followers: '', tiktok_followers: '', yt_subscribers: '',
    engagement_rate: '', contact_email: '', manager_name: '', manager_email: '',
    location: '', notes: '', bio: '', photo_url: '', media_kit_url: '',
    handles: { instagram: '', tiktok: '', youtube: '' },
    rates: { feed: '', story: '', reel: '', tiktok: '', youtube: '', misc: '' }
  })
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingKit, setUploadingKit] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setHandle = (key, val) => setForm(f => ({ ...f, handles: { ...f.handles, [key]: val } }))
  const setRate = (key, val) => setForm(f => ({ ...f, rates: { ...f.rates, [key]: val } }))
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

  async function save() {
    if (!form.name) return setError('Name is required')
    if (!form.types?.length) return setError('Select at least one type')
    setSaving(true)
    setError('')

    const payload = {
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
      org_id: orgId
    }

    let err
    if (existing?.id) {
      ({ error: err } = await supabase.from('creators').update(payload).eq('id', existing.id))
    } else {
      ({ error: err } = await supabase.from('creators').insert([payload]))
    }

    setSaving(false)
    if (err) return setError(err.message)
    onSaved()
    onClose()
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
          <button onClick={onClose} title='Close' style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '4px', opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>×</button>
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
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: muted, fontSize: '13px', cursor: 'pointer', padding: '4px' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 500, background: dark ? '#FFFFFF' : '#1A1A1A', color: dark ? '#111' : '#FFFFFF', border: 'none', cursor: 'pointer', borderRadius: '6px', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Save talent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
