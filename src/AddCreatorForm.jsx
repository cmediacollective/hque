import { useState } from 'react'
import { supabase } from './supabase'

const TYPES = ['Influencer', 'UGC', 'Actor', 'Public Figure', 'Sports', 'Athlete', 'Podcast', 'Speaker/Host']
const NICHES = ['Wellness', 'Beauty', 'Lifestyle', 'Parenting', 'Fashion', 'Fitness', 'Food', 'Travel', 'Entertainment', 'Books', 'Specialty']
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Pinterest', 'LinkedIn']
const TIERS = ['Nano', 'Micro', 'Mid', 'Macro', 'Mega']

const toggleChip = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

export default function AddCreatorForm({ onClose, onSaved, existing, dark = true, orgId }) {
  const bg = dark ? '#0D0D0D' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const inputBg = dark ? '#141414' : '#F5F3EF'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const label = dark ? '#666' : '#888'
  const overlay = dark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)'

  const [form, setForm] = useState(existing ? {
    ...existing,
    types: existing.types || (existing.type ? [existing.type] : []),
    rates: existing.rates || { feed: '', story: '', reel: '', tiktok: '', youtube: '' },
    handles: existing.handles || { instagram: '', tiktok: '', youtube: '' },
    niches: existing.niches || []
  } : {
    name: '', types: [], tier: '', primary_platform: '',
    niches: [], ig_followers: '', tiktok_followers: '', yt_subscribers: '',
    engagement_rate: '', contact_email: '', manager_name: '', manager_email: '',
    location: '', notes: '', photo_url: '', media_kit_url: '',
    handles: { instagram: '', tiktok: '', youtube: '' },
    rates: { feed: '', story: '', reel: '', tiktok: '', youtube: '' }
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

  const field = (lbl, children) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: label, marginBottom: '6px' }}>{lbl}</div>
      {children}
    </div>
  )

  const inp = (props) => (
    <input {...props} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }} />
  )

  const sel = (props, options) => (
    <select {...props} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none' }}>
      <option value=''>Select...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  const sectionLabel = (t) => (
    <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#5b7c99', margin: '20px 0 16px' }}>{t}</div>
  )

  async function handleKitUpload(file) {
    if (!file) return
    setUploadingKit(true)
    const ext = file.name.split('.').pop()
    const path = 'kits/' + Date.now() + '.' + ext
    console.log('Uploading to media-kits:', path, file.type, file.size)
    const { data, error } = await supabase.storage.from('media-kits').upload(path, file, { upsert: true })
    console.log('Upload result:', data, error)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('media-kits').getPublicUrl(path)
      console.log('Public URL:', publicUrl)
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
      <div style={{ background: bg, border: `0.5px solid ${border}`, width: '580px', maxHeight: '88vh', overflowY: 'auto', borderRadius: '2px' }}>

        <div style={{ padding: '20px 24px', borderBottom: `0.5px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: bg, zIndex: 1 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text }}>{existing ? 'Edit Talent' : 'Add Talent'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: label, cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>x</button>
        </div>

        <div style={{ padding: '24px' }}>
          {sectionLabel('Basic Info')}
          {field('Full Name *', inp({ value: form.name, onChange: e => set('name', e.target.value), placeholder: 'e.g. Michelle Young' }))}

          {field('Type * (select all that apply)',
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {TYPES.map(t => (
                <button key={t} onClick={() => toggleType(t)} style={{
                  padding: '4px 10px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase',
                  border: `0.5px solid ${form.types.includes(t) ? '#5b7c99' : border}`,
                  color: form.types.includes(t) ? '#5b7c99' : label,
                  background: 'none', cursor: 'pointer', borderRadius: '1px'
                }}>{t}</button>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {field('Tier', sel({ value: form.tier, onChange: e => set('tier', e.target.value) }, TIERS))}
            {field('Primary Platform', sel({ value: form.primary_platform, onChange: e => set('primary_platform', e.target.value) }, PLATFORMS))}
          </div>

          {field('Location', inp({ value: form.location, onChange: e => set('location', e.target.value), placeholder: 'e.g. Los Angeles, CA' }))}
          {field('Photo',
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {form.photo_url && (
              <img src={form.photo_url} alt='preview' style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '2px', border: `0.5px solid ${border}`, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
            )}
            <label style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', border: `0.5px solid ${border}`, color: '#888', cursor: 'pointer', borderRadius: '1px', display: 'inline-block' }}>
              {uploadingPhoto ? 'Uploading...' : form.photo_url ? 'Change Photo' : 'Upload Photo'}
              <input type='file' accept='image/*' onChange={e => handlePhotoUpload(e.target.files[0])} style={{ display: 'none' }} />
            </label>
            {form.photo_url && (
              <button onClick={() => set('photo_url', '')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', padding: 0 }}>Remove</button>
            )}
          </div>
        )}

          {form.photo_url && (
            <div style={{ marginTop: '-8px', marginBottom: '16px' }}>
              <img src={form.photo_url} alt='preview' style={{ width: '56px', height: '56px', borderRadius: '2px', objectFit: 'cover', border: `0.5px solid ${border}` }} onError={e => e.target.style.display = 'none'} />
            </div>
          )}

          {field('Niches',
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {NICHES.map(n => (
                <button key={n} onClick={() => toggleNiche(n)} style={{
                  padding: '4px 10px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase',
                  border: `0.5px solid ${form.niches.includes(n) ? '#5b7c99' : border}`,
                  color: form.niches.includes(n) ? '#5b7c99' : label,
                  background: 'none', cursor: 'pointer', borderRadius: '1px'
                }}>{n}</button>
              ))}
            </div>
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

          {sectionLabel('Rates (USD)')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
            {field('IG Feed', inp({ value: form.rates.feed, onChange: e => setRate('feed', e.target.value), placeholder: '0', type: 'number' }))}
            {field('IG Story', inp({ value: form.rates.story, onChange: e => setRate('story', e.target.value), placeholder: '0', type: 'number' }))}
            {field('IG Reel', inp({ value: form.rates.reel, onChange: e => setRate('reel', e.target.value), placeholder: '0', type: 'number' }))}
            {field('TikTok', inp({ value: form.rates.tiktok, onChange: e => setRate('tiktok', e.target.value), placeholder: '0', type: 'number' }))}
            {field('YouTube', inp({ value: form.rates.youtube, onChange: e => setRate('youtube', e.target.value), placeholder: '0', type: 'number' }))}
          </div>

          {sectionLabel('Contact')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {field('Talent Email', inp({ value: form.contact_email, onChange: e => set('contact_email', e.target.value), placeholder: 'email@example.com' }))}
            {field('Manager Name', inp({ value: form.manager_name, onChange: e => set('manager_name', e.target.value), placeholder: 'Manager name' }))}
          </div>
          {field('Manager Email', inp({ value: form.manager_email, onChange: e => set('manager_email', e.target.value), placeholder: 'manager@example.com' }))}

          {field('Media Kit',
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {form.media_kit_url && (
                <a href={form.media_kit_url} target='_blank' rel='noreferrer' style={{ fontSize: '11px', color: '#5b7c99', textDecoration: 'none', letterSpacing: '0.1em' }}>View File ↗</a>
              )}
              <label style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', border: `0.5px solid ${border}`, color: '#888', cursor: 'pointer', borderRadius: '1px', display: 'inline-block' }}>
                {uploadingKit ? 'Uploading...' : form.media_kit_url ? 'Replace File' : 'Upload Media Kit'}
                <input type='file' accept='application/pdf,image/jpeg,image/png' onChange={e => { if (e.target.files[0]) handleKitUpload(e.target.files[0]); e.target.value = '' }} style={{ display: 'none' }} />
              </label>
              {form.media_kit_url && (
                <button onClick={() => set('media_kit_url', '')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', padding: 0 }}>Remove</button>
              )}
            </div>
          )}

          {field('Internal Notes',
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder='Any notes...' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', height: '80px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          )}

          {error && <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '12px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: label, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '8px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : existing ? 'Save Changes' : 'Save Creator'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
