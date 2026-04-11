import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const STATUSES = ['Pitch', 'Active', 'Completed']

export default function CampaignForm({ onClose, onSaved, existing, dark = true, orgId }) {
  const bg = dark ? '#0D0D0D' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const inputBg = dark ? '#141414' : '#F5F3EF'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const labelColor = dark ? '#666' : '#888'
  const dropBg = dark ? '#1A1A1A' : '#FFFFFF'
  const dropHover = dark ? '#2A2A2A' : '#F5F3EF'

  const [form, setForm] = useState(existing ? {
    name: existing.name || '',
    brand: existing.brand || '',
    brand_logo_url: existing.brand_logo_url || '',
    brand_website: existing.brand_website || '',
    status: existing.status || 'Pitch',
    budget: existing.budget || '',
    start_date: existing.start_date || '',
    end_date: existing.end_date || '',
    deliverables: existing.deliverables || '',
    deliverables_link: existing.deliverables_link || '',
    timeline: existing.timeline || '',
    brief_url: existing.brief_url || '',
    contract_url: existing.contract_url || '',
    notes: existing.notes || ''
  } : {
    name: '', brand: '', brand_logo_url: '', brand_website: '', status: 'Pitch', budget: '',
    start_date: '', end_date: '', deliverables: '', deliverables_link: '',
    timeline: '', brief_url: '', contract_url: '', notes: ''
  })

  const [creators, setCreators] = useState([])
  const [selectedCreators, setSelectedCreators] = useState([])
  const [talentSearch, setTalentSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCreators()
    if (existing?.id) fetchAssigned()
  }, [])

  async function fetchCreators() {
    const { data } = await supabase.from('creators').select('id, name, photo_url, handles').eq('status', 'active').order('name')
    setCreators(data || [])
  }

  async function fetchAssigned() {
    const { data } = await supabase.from('campaign_creators').select('creator_id').eq('campaign_id', existing.id)
    setSelectedCreators((data || []).map(d => d.creator_id))
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const addCreator = (id) => {
    if (!selectedCreators.includes(id)) setSelectedCreators(s => [...s, id])
    setTalentSearch('')
    setShowDropdown(false)
  }

  const removeCreator = (id) => setSelectedCreators(s => s.filter(x => x !== id))

  const searchResults = talentSearch.trim()
    ? creators.filter(c =>
        !selectedCreators.includes(c.id) &&
        (c.name?.toLowerCase().includes(talentSearch.toLowerCase()) ||
         c.handles?.instagram?.toLowerCase().includes(talentSearch.toLowerCase()))
      )
    : []

  const selectedCreatorObjects = creators.filter(c => selectedCreators.includes(c.id))

  const field = (lbl, children) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: labelColor, marginBottom: '6px' }}>{lbl}</div>
      {children}
    </div>
  )

  const inp = (props) => (
    <input {...props} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }} />
  )

  const sectionLabel = (t) => (
    <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#5b7c99', margin: '20px 0 16px' }}>{t}</div>
  )

  async function save() {
    if (!form.name.trim()) return setError('Campaign name is required')
    setSaving(true)
    setError('')

    const payload = {
      name: form.name,
      brand: form.brand || null,
      brand_logo_url: form.brand_logo_url || null,
      brand_website: form.brand_website || null,
      status: form.status,
      budget: form.budget ? parseFloat(form.budget) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      deliverables: form.deliverables || null,
      deliverables_link: form.deliverables_link || null,
      timeline: form.timeline || null,
      brief_url: form.brief_url || null,
      contract_url: form.contract_url || null,
      notes: form.notes || null,
      org_id: orgId
    }

    let campaignId = existing?.id
    let err

    if (existing?.id) {
      ;({ error: err } = await supabase.from('campaigns').update(payload).eq('id', existing.id))
    } else {
      const { data, error: insertErr } = await supabase.from('campaigns').insert([payload]).select().single()
      err = insertErr
      campaignId = data?.id
    }

    if (err) { setSaving(false); return setError(err.message) }

    await supabase.from('campaign_creators').delete().eq('campaign_id', campaignId)
    if (selectedCreators.length) {
      await supabase.from('campaign_creators').insert(
        selectedCreators.map(creator_id => ({ campaign_id: campaignId, creator_id }))
      )
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: bg, border: `0.5px solid ${border}`, width: '600px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '2px' }}>

        <div style={{ padding: '20px 24px', borderBottom: `0.5px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: bg, zIndex: 1 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text }}>{existing ? 'Edit Campaign' : 'New Campaign'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: labelColor, cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '24px' }}>

          {sectionLabel('Campaign Info')}
          {field('Campaign Name *', inp({ value: form.name, onChange: e => set('name', e.target.value), placeholder: 'e.g. Summer Wellness Campaign' }))}
          {field('Brand', inp({ value: form.brand, onChange: e => set('brand', e.target.value), placeholder: 'e.g. Lululemon' }))}
          {field('Brand Logo URL', inp({ value: form.brand_logo_url, onChange: e => set('brand_logo_url', e.target.value), placeholder: 'https://...' }))}
          {field('Brand Website', inp({ value: form.brand_website, onChange: e => set('brand_website', e.target.value), placeholder: 'https://brand.com' }))}

          {form.brand_logo_url && (
            <div style={{ marginTop: '-8px', marginBottom: '16px' }}>
              <img src={form.brand_logo_url} alt='brand logo preview' style={{ width: '56px', height: '56px', borderRadius: '2px', objectFit: 'contain', border: `0.5px solid ${border}`, background: '#fff', padding: '4px' }} onError={e => e.target.style.display = 'none'} />
            </div>
          )}

          {field('Status',
            <div style={{ display: 'flex', gap: '6px' }}>
              {STATUSES.map(s => (
                <button key={s} onClick={() => set('status', s)} style={{
                  padding: '5px 14px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
                  border: `0.5px solid ${form.status === s ? '#5b7c99' : border}`,
                  color: form.status === s ? '#5b7c99' : labelColor,
                  background: 'none', cursor: 'pointer', borderRadius: '1px'
                }}>{s}</button>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {field('Budget (USD)', inp({ value: form.budget, onChange: e => set('budget', e.target.value), placeholder: '0', type: 'number' }))}
            {field('Start Date', inp({ value: form.start_date, onChange: e => set('start_date', e.target.value), type: 'date' }))}
            {field('End Date', inp({ value: form.end_date, onChange: e => set('end_date', e.target.value), type: 'date' }))}
          </div>

          {field('Deliverables',
            <textarea value={form.deliverables} onChange={e => set('deliverables', e.target.value)} placeholder='e.g. 2x IG Reels, 4x Stories, 1x TikTok...' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', height: '80px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          )}

          {field('Deliverables Link', inp({ value: form.deliverables_link, onChange: e => set('deliverables_link', e.target.value), placeholder: 'https://drive.google.com/...' }))}

          {field('Timeline',
            <textarea value={form.timeline} onChange={e => set('timeline', e.target.value)} placeholder='e.g. Content due May 1, go live May 7–14...' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', height: '80px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          )}

          {sectionLabel('Documents')}
          <div style={{ fontSize: '10px', color: labelColor, marginBottom: '12px', lineHeight: 1.6 }}>Paste a Google Drive share link. Make sure sharing is set to "Anyone with the link can view."</div>
          {field('Brief URL', inp({ value: form.brief_url, onChange: e => set('brief_url', e.target.value), placeholder: 'https://drive.google.com/file/d/...' }))}
          {field('Contract URL', inp({ value: form.contract_url, onChange: e => set('contract_url', e.target.value), placeholder: 'https://drive.google.com/file/d/...' }))}

          {sectionLabel('Notes')}
          {field('Internal Notes',
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder='Any internal notes about this campaign...' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', height: '100px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          )}

          {sectionLabel('Assign Talent')}

          {selectedCreatorObjects.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {selectedCreatorObjects.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px 4px 6px', border: `0.5px solid #5b7c99`, borderRadius: '1px', background: 'none' }}>
                  {c.photo_url && <img src={c.photo_url} alt={c.name} style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />}
                  <span style={{ fontSize: '11px', color: '#5b7c99' }}>{c.name}</span>
                  <button onClick={() => removeCreator(c.id)} style={{ background: 'none', border: 'none', color: '#5b7c99', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <input
              value={talentSearch}
              onChange={e => { setTalentSearch(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder='Search talent by name or @handle...'
              style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }}
            />
            {showDropdown && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: dropBg, border: `0.5px solid ${border}`, borderTop: 'none', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                {searchResults.map(c => (
                  <div
                    key={c.id}
                    onMouseDown={() => addCreator(c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = dropHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {c.photo_url
                      ? <img src={c.photo_url} alt={c.name} style={{ width: '28px', height: '28px', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                      : <div style={{ width: '28px', height: '28px', borderRadius: '2px', background: dark ? '#2A2A2A' : '#E0DCD6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '10px', color: text, flexShrink: 0 }}>{c.name?.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
                    }
                    <div>
                      <div style={{ fontSize: '12px', color: text }}>{c.name}</div>
                      {c.handles?.instagram && <div style={{ fontSize: '10px', color: labelColor }}>@{c.handles.instagram}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showDropdown && talentSearch.trim() && searchResults.length === 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: dropBg, border: `0.5px solid ${border}`, borderTop: 'none', zIndex: 10, padding: '12px', fontSize: '11px', color: labelColor }}>
                No talent found matching "{talentSearch}"
              </div>
            )}
          </div>

          {error && <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '12px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: labelColor, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '8px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : existing ? 'Save Changes' : 'Save Campaign'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
