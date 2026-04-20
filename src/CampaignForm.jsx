import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function CampaignForm({ orgId, existing, onClose, onSaved, dark }) {
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const cardBg = dark ? '#111' : '#fff'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const labelColor = dark ? '#888' : '#666'
  const inputBg = dark ? '#141414' : '#fff'

  const [form, setForm] = useState(existing ? {
    name: existing.name || '',
    brand_id: existing.brand_id || '',
    brand: existing.brand || '',
    brand_logo_url: existing.brand_logo_url || '',
    brand_website: existing.brand_website || '',
    campaign_type: existing.campaign_type || 'Paid',
    status: existing.status || 'Pitch',
    budget: existing.budget || '',
    start_date: existing.start_date || '',
    end_date: existing.end_date || '',
    deliverables: existing.deliverables || '',
    deliverables_link: existing.deliverables_link || '',
    timeline: existing.timeline || '',
    brief_url: existing.brief_url || '',
    contract_url: existing.contract_url || '',
    notes: existing.notes || '',
    talent_ids: existing.campaign_creators?.map(ct => ct.creator_id) || [],
  } : {
    name: '', brand_id: '', brand: '', brand_logo_url: '', brand_website: '', campaign_type: 'Paid', status: 'Pitch', budget: '',
    start_date: '', end_date: '', deliverables: '', deliverables_link: '',
    timeline: '', brief_url: '', contract_url: '', notes: '', talent_ids: []
  })

  const [creators, setCreators] = useState([])
  const [brands, setBrands] = useState([])
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandLogoFile, setNewBrandLogoFile] = useState(null)
  const [creatingBrand, setCreatingBrand] = useState(false)
  const [talentSearch, setTalentSearch] = useState("")
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    const fetchCreators = async () => {
      const { data } = await supabase.from('creators').select('id, name, photo_url, handles').eq('status', 'active').order('name')
      if (data) setCreators(data)
    }
    const fetchBrands = async () => {
      const { data } = await supabase.from('brands').select('*').eq('org_id', orgId).neq('status', 'archived').order('name', { ascending: true })
      setBrands(data || [])
    }
    fetchCreators()
    fetchBrands()
  }, [orgId])

  // When editing an existing campaign, fetch its linked talent
  useEffect(() => {
    if (!existing?.id) return
    const fetchLinkedTalent = async () => {
      const { data } = await supabase.from('campaign_creators').select('creator_id').eq('campaign_id', existing.id)
      if (data) setForm(f => ({ ...f, talent_ids: data.map(d => d.creator_id) }))
    }
    fetchLinkedTalent()
  }, [existing?.id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const selectBrand = (brandId) => {
    if (!brandId) {
      setForm(f => ({ ...f, brand_id: '', brand: '', brand_logo_url: '', brand_website: '' }))
      return
    }
    const b = brands.find(x => x.id === brandId)
    if (!b) return
    setForm(f => ({
      ...f,
      brand_id: b.id,
      brand: b.name,
      brand_logo_url: b.logo_url || '',
      brand_website: b.website || ''
    }))
  }

  async function createBrandInline() {
    if (!newBrandName.trim()) return
    setCreatingBrand(true)
    let logo_url = null
    if (newBrandLogoFile) {
      const ext = newBrandLogoFile.name.split('.').pop()
      const path = 'brand-logos/' + Date.now() + '.' + ext
      const { error: uploadErr } = await supabase.storage.from('media-kits').upload(path, newBrandLogoFile, { upsert: true })
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from('media-kits').getPublicUrl(path)
        logo_url = publicUrl
      }
    }
    const { data, error: insertErr } = await supabase.from('brands').insert([{
      org_id: orgId,
      name: newBrandName.trim(),
      logo_url,
      status: 'active'
    }]).select().single()
    setCreatingBrand(false)
    if (insertErr) {
      setError(insertErr.message?.includes('unique') || insertErr.code === '23505' ? 'A brand with this name already exists' : (insertErr.message || 'Failed to create brand'))
      return
    }
    if (data) {
      const updated = [...brands, data].sort((a, b) => a.name.localeCompare(b.name))
      setBrands(updated)
      setForm(f => ({
        ...f,
        brand_id: data.id,
        brand: data.name,
        brand_logo_url: data.logo_url || '',
        brand_website: data.website || ''
      }))
      setNewBrandName('')
      setNewBrandLogoFile(null)
      setShowNewBrand(false)
      setError('')
    }
  }

  const toggleTalent = (id) => setForm(f => ({
    ...f,
    talent_ids: f.talent_ids.includes(id) ? f.talent_ids.filter(t => t !== id) : [...f.talent_ids, id]
  }))

  async function handleLogoUpload(file) {
    if (!file) return
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('campaign-logos').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('campaign-logos').getPublicUrl(path)
      set('brand_logo_url', publicUrl)
    }
    setUploadingLogo(false)
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('Campaign name is required')
    setSaving(true)
    setError('')
    const payload = {
      org_id: orgId,
      name: form.name,
      brand_id: form.brand_id || null,
      brand: form.brand || null,
      brand_logo_url: form.brand_logo_url || null,
      brand_website: form.brand_website || null,
      campaign_type: form.campaign_type,
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
    }
    let campaignId = existing?.id
    if (existing) {
      await supabase.from('campaigns').update(payload).eq('id', existing.id)
    } else {
      const { data } = await supabase.from('campaigns').insert(payload).select().single()
      campaignId = data?.id
    }
    if (campaignId) {
      const { error: delErr } = await supabase.from('campaign_creators').delete().eq('campaign_id', campaignId)
      if (delErr) { setSaving(false); alert(`Error clearing talent: ${delErr.message}`); return }
      if (form.talent_ids.length > 0) {
        const { error: insErr } = await supabase.from('campaign_creators').insert(form.talent_ids.map(tid => ({ campaign_id: campaignId, creator_id: tid })))
        if (insErr) { setSaving(false); alert(`Error saving talent: ${insErr.message}`); return }
      }
    }
    setSaving(false)
    onSaved()
  }

  const inp = (props) => (
    <input {...props} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box' }} />
  )

  const field = (lbl, children) => (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display: 'block', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: labelColor, marginBottom: '6px' }}>{lbl}</label>
      {children}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
      <div style={{ width: '480px', height: '100vh', background: cardBg, borderLeft: `0.5px solid ${border}`, overflowY: 'auto', padding: '32px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: text }}>{existing ? 'Edit Campaign' : 'New Campaign'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: labelColor, fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {field('Campaign Name *', inp({ value: form.name, onChange: e => set('name', e.target.value), placeholder: 'e.g. Summer Wellness Campaign' }))}
        {field('Brand',
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={form.brand_id || ''}
                onChange={e => selectBrand(e.target.value)}
                style={{ flex: 1, background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box' }}>
                <option value=''>No brand (internal)</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <button
                type='button'
                onClick={() => setShowNewBrand(s => !s)}
                style={{ padding: '9px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: labelColor, cursor: 'pointer', borderRadius: '1px', whiteSpace: 'nowrap' }}>
                {showNewBrand ? 'Cancel' : '+ New'}
              </button>
            </div>
            {form.brand_id && form.brand_logo_url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '8px 12px', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px' }}>
                <img src={form.brand_logo_url} alt={form.brand} style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '2px', background: '#fff', padding: '2px', border: `0.5px solid ${border}` }} onError={e => e.target.style.display = 'none'} />
                <span style={{ fontSize: '12px', color: text, flex: 1 }}>{form.brand}</span>
                {form.brand_website && <a href={form.brand_website} target='_blank' rel='noreferrer' style={{ fontSize: '10px', color: '#5b7c99', textDecoration: 'none' }}>{form.brand_website.replace(/^https?:\/\//, '').slice(0, 30)} ↗</a>}
              </div>
            )}
            {showNewBrand && (
              <div style={{ marginTop: '10px', padding: '12px', border: `0.5px dashed ${border}`, borderRadius: '1px' }}>
                <input
                  value={newBrandName}
                  onChange={e => setNewBrandName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createBrandInline() }}
                  placeholder='New brand name'
                  autoFocus
                  style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ padding: '6px 10px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${border}`, color: labelColor, cursor: 'pointer', borderRadius: '1px', flex: 1 }}>
                    {newBrandLogoFile ? newBrandLogoFile.name.slice(0, 20) : 'Upload logo (optional)'}
                    <input type='file' accept='image/*' onChange={e => setNewBrandLogoFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  </label>
                  <button onClick={createBrandInline} disabled={creatingBrand || !newBrandName.trim()} style={{ padding: '6px 14px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: creatingBrand || !newBrandName.trim() ? 0.5 : 1 }}>
                    {creatingBrand ? 'Adding...' : 'Add brand'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {field('Campaign Type',
          <div style={{ display: 'flex', gap: '6px' }}>
            {['Paid', 'Non-paid', 'Gifting', 'Seeding'].map(t => (
              <button key={t} onClick={() => set('campaign_type', t)} style={{
                padding: '6px 14px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
                border: `0.5px solid ${form.campaign_type === t ? '#5b7c99' : border}`,
                color: form.campaign_type === t ? '#5b7c99' : labelColor,
                background: 'none', cursor: 'pointer', borderRadius: '1px'
              }}>{t}</button>
            ))}
          </div>
        )}

        {field('Status',
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['Pitch', 'Active', 'Completed', 'Cancelled'].map(s => (
              <button key={s} onClick={() => set('status', s)} style={{
                padding: '6px 12px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
                border: `0.5px solid ${form.status === s ? '#5b7c99' : border}`,
                color: form.status === s ? '#5b7c99' : labelColor,
                background: 'none', cursor: 'pointer', borderRadius: '1px'
              }}>{s}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {field('Budget (USD)', inp({ value: form.budget, onChange: e => set('budget', e.target.value), placeholder: '0', type: 'number' }))}
          {field('Start Date', inp({ value: form.start_date, onChange: e => set('start_date', e.target.value), type: 'date' }))}
          {field('End Date', inp({ value: form.end_date, onChange: e => set('end_date', e.target.value), type: 'date' }))}
        </div>

        {field('Deliverables',
          <textarea value={form.deliverables} onChange={e => set('deliverables', e.target.value)} placeholder='e.g. 1 Reel, 3 Stories' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} />
        )}
        {field('Deliverables Link', inp({ value: form.deliverables_link, onChange: e => set('deliverables_link', e.target.value), placeholder: 'https://drive.google.com/...' }))}

        {field('Timeline',
          <textarea value={form.timeline} onChange={e => set('timeline', e.target.value)} placeholder='e.g. Content due Apr 15, go live Apr 20' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} />
        )}

        {field('Brief URL', inp({ value: form.brief_url, onChange: e => set('brief_url', e.target.value), placeholder: 'https://drive.google.com/file/d/...' }))}
        {field('Contract URL', inp({ value: form.contract_url, onChange: e => set('contract_url', e.target.value), placeholder: 'https://drive.google.com/file/d/...' }))}

        {field('Internal Notes',
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder='Any internal notes...' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} />
        )}

        {field('Talent',
          <div>
            <input value={talentSearch} onChange={e => setTalentSearch(e.target.value)} placeholder='Search by name or handle...' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box', marginBottom: '6px' }} />
            {talentSearch.trim() && (
              <div style={{ border: `0.5px solid ${border}`, borderRadius: '1px', maxHeight: '180px', overflowY: 'auto' }}>
                {creators.filter(cr => cr.name?.toLowerCase().includes(talentSearch.toLowerCase()) || cr.handles?.instagram?.toLowerCase().includes(talentSearch.toLowerCase())).map(cr => (
                  <div key={cr.id} onClick={() => { toggleTalent(cr.id); setTalentSearch('') }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', background: form.talent_ids.includes(cr.id) ? (dark ? '#1a2530' : '#EEF3F7') : inputBg, borderBottom: `0.5px solid ${border}` }}>
                    {cr.photo_url ? <img src={cr.photo_url} alt={cr.name} style={{ width: '28px', height: '28px', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: '28px', height: '28px', borderRadius: '2px', background: '#5b7c99', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontFamily: 'Georgia, serif', flexShrink: 0 }}>{cr.name?.charAt(0)}</div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: text }}>{cr.name}</div>
                      {cr.handles?.instagram && <div style={{ fontSize: '10px', color: labelColor }}>@{cr.handles.instagram}</div>}
                    </div>
                    {form.talent_ids.includes(cr.id) && <span style={{ fontSize: '10px', color: '#5b7c99' }}>✓ Added</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {form.talent_ids.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: labelColor, marginBottom: '8px' }}>Selected Talent</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {form.talent_ids.map(id => {
                const cr = creators.find(x => x.id === id)
                return cr ? (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: dark ? '#1a2530' : '#EEF3F7', borderRadius: '1px', border: '0.5px solid #5b7c99' }}>
                    {cr.photo_url
                      ? <img src={cr.photo_url} alt={cr.name} style={{ width: '28px', height: '28px', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                      : <div style={{ width: '28px', height: '28px', borderRadius: '2px', background: '#5b7c99', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontFamily: 'Georgia, serif', flexShrink: 0 }}>{cr.name?.charAt(0)}</div>
                    }
                    <span style={{ fontSize: '11px', color: text }}>{cr.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); toggleTalent(id) }} style={{ background: 'none', border: 'none', color: labelColor, cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}>×</button>
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}

        {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '12px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '11px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : existing ? 'Save Changes' : 'Create Campaign'}
          </button>
          <button onClick={onClose} style={{ padding: '11px 20px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: labelColor, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
