import { useState } from 'react'
import { supabase } from './supabase'

const TYPES = ['Influencer', 'UGC', 'Public Figure', 'Sports', 'Athlete', 'Podcast', 'Speaker/Host']
const NICHES = ['Wellness', 'Beauty', 'Lifestyle', 'Parenting', 'Fashion', 'Fitness', 'Food', 'Travel', 'Entertainment', 'Books']
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Pinterest', 'LinkedIn']
const TIERS = ['Nano', 'Micro', 'Mid', 'Macro', 'Mega']

const toggleChip = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

export default function AddCreatorForm({ onClose, onSaved, existing, t }) {
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
    location: '', notes: '', photo_url: '',
    handles: { instagram: '', tiktok: '', youtube: '' },
    rates: { feed: '', story: '', reel: '', tiktok: '', youtube: '' }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setHandle = (key, val) => setForm(f => ({ ...f, handles: { ...f.handles, [key]: val } }))
  const setRate = (key, val) => setForm(f => ({ ...f, rates: { ...f.rates, [key]: val } }))
  const toggleType = (tv) => setForm(f => ({ ...f, types: toggleChip(f.types, tv) }))
  const toggleNiche = (n) => setForm(f => ({ ...f, niches: toggleChip(f.niches, n) }))

  const field = (label, children) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: t.textMuted, marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )

  const inp = (props) => (
    <input {...props} style={{ width: '100%', background: t.bgInput, border: `0.5px solid ${t.borderInput}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: t.textPrimary, outline: 'none' }} />
  )

  const sel = (props, options) => (
    <select {...props} style={{ width: '100%', background: t.bgInput, border: `0.5px solid ${t.borderInput}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: t.textPrimary, outline: 'none' }}>
      <option value=''>Select...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  const sectionLabel = (text) => (
    <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#5b7c99', margin: '20px 0 16px' }}>{text}</div>
  )

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
      org_id: '00000000-0000-0000-0000-000000000001'
    }

    let error
    if (existing?.id) {
      ({ error } = await supabase.from('creators').update(payload).eq('id', existing.id))
    } else {
      ({ error } = await supabase.from('creators').insert([payload]))
    }

    setSaving(false)
    if (error) return setError(error.message)
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: t.bgModal, border: `0.5px solid ${t.borderInput}`, width: '580px', maxHeight: '88vh', overflowY: 'auto', borderRadius: '2px' }}>

        <div style={{ padding: '20px 24px', borderBottom: `0.5px solid ${t.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: t.bgModal, zIndex: 1 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: t.textPrimary }}>{existing ? 'Edit Creator' : 'Add Creator'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '24px' }}>
          {sectionLabel('Basic Info')}
          {field('Full Name *', inp({ value: form.name, onChange: e => set('name', e.target.value), placeholder: 'e.g. Michelle Young' }))}

          {field('Type * (select all that apply)',
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {TYPES.map(tv => (
                <button key={tv} onClick={() => toggleType(tv)} style={{
                  padding: '4px 10px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase',
                  border: `0.5px solid ${form.types.includes(tv) ? '#5b7c99' : t.borderInput}`,
                  color: form.types.includes(tv) ? '#5b7c99' : t.textSecondary,
                  background: 'none', cursor: 'pointer', borderRadius: '1px'
                }}>{tv}</button>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {field('Tier', sel({ value: form.tier, onChange: e => set('tier', e.target.value) }, TIERS))}
            {field('Primary Platform', sel({ value: form.primary_platform, onChange: e => set('primary_platform', e.target.value) }, PLATFORMS))}
          </div>

          {field('Location', inp({ value: form.location, onChange: e => set('location', e.target.value), placeholder: 'e.g. Los Angeles, CA' }))}

          {field('Photo URL', inp({ value: form.photo_url, onChange: e => set('photo_url', e.target.value), placeholder: 'https://... paste any image link' }))}
          {form.photo_url && (
            <div style={{ marginTop: '-8px', marginBottom: '16px' }}>
              <img src={form.photo_url} alt='preview' style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `0.5px solid ${t.borderInput}` }} onError={e => e.target.style.display = 'none'} />
            </div>
          )}

          {field('Niches',
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {NICHES.map(n => (
                <button key={n} onClick={() => toggleNiche(n)} style={{
                  padding: '4px 10px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase',
                  border: `0.5px solid ${form.niches.includes(n) ? '#5b7c99' : t.borderInput}`,
                  color: form.niches.includes(n) ? '#5b7c99' : t.textSecondary,
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
            {field('Creator Email', inp({ value: form.contact_email, onChange: e => set('contact_email', e.target.value), placeholder: 'email@example.com' }))}
            {field('Manager Name', inp({ value: form.manager_name, onChange: e => set('manager_name', e.target.value), placeholder: 'Manager name' }))}
          </div>
          {field('Manager Email', inp({ value: form.manager_email, onChange: e => set('manager_email', e.target.value), placeholder: 'manager@example.com' }))}

          {field('Internal Notes',
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder='Any notes about this creator...' style={{ width: '100%', background: t.bgInput, border: `0.5px solid ${t.borderInput}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: t.textPrimary, outline: 'none', height: '80px', resize: 'vertical', fontFamily: 'inherit' }} />
          )}

          {error && <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '12px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${t.borderInput}`, color: t.textSecondary, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '8px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : existing ? 'Save Changes' : 'Save Creator'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}