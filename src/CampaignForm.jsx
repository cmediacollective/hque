import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import BrandDetail from './BrandDetail'
import { useClientLabel } from './useClientLabel'

export default function CampaignForm({ orgId, existing, onClose, onSaved, onDeleted, dark }) {
  const clientLabel = useClientLabel(orgId)
  const cardBg = dark ? '#1A1A1A' : '#FFFFFF'
  const text = dark ? '#EDEAE4' : '#1A1A1A'
  const muted = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const labelColor = muted
  const fieldBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'
  const fieldBorder = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  const fieldBorderStrong = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)'
  const border = fieldBorder
  const inputBg = fieldBg
  const accent = '#5b7c99'
  const danger = dark ? '#d98b85' : '#c0392b'
  const fieldFocus = (e) => { e.target.style.borderColor = fieldBorderStrong }
  const fieldBlur = (e) => { e.target.style.borderColor = fieldBorder }
  const inputStyle = { width: '100%', background: fieldBg, border: `1px solid ${fieldBorder}`, borderRadius: '6px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease' }

  const [form, setForm] = useState(existing ? {
    name: existing.name || '',
    brand_id: existing.brand_id || '',
    brand: existing.brand || '',
    brand_logo_url: existing.brand_logo_url || '',
    brand_website: existing.brand_website || '',
    contact_id: existing.contact_id || '',
    campaign_type: existing.campaign_type || 'Paid',
    status: existing.status || 'Pitch',
    pitched_by: existing.pitched_by || '',
    campaign_manager: existing.campaign_manager || '',
    closed_by: existing.closed_by || '',
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
    name: '', brand_id: '', brand: '', brand_logo_url: '', brand_website: '', contact_id: '', campaign_type: 'Paid', status: 'Pitch',
    pitched_by: '', campaign_manager: '', closed_by: '', budget: '',
    start_date: '', end_date: '', deliverables: '', deliverables_link: '',
    timeline: '', brief_url: '', contract_url: '', notes: '', talent_ids: []
  })

  const [creators, setCreators] = useState([])
  const [brands, setBrands] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [brandContacts, setBrandContacts] = useState([])
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandWebsite, setNewBrandWebsite] = useState('')
  const [newBrandLogoFile, setNewBrandLogoFile] = useState(null)
  const [creatingBrand, setCreatingBrand] = useState(false)
  const [talentSearch, setTalentSearch] = useState("")
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [editingBrandId, setEditingBrandId] = useState(null)

  useEffect(() => {
    const fetchCreators = async () => {
      const { data } = await supabase.from('creators').select('id, name, photo_url, handles').eq('status', 'active').order('name')
      if (data) setCreators(data)
    }
    const fetchBrands = async () => {
      const { data } = await supabase.from('brands').select('*').eq('org_id', orgId).neq('status', 'archived').order('name', { ascending: true })
      setBrands(data || [])
    }
    const fetchTeam = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email').eq('org_id', orgId).order('full_name', { ascending: true })
      if (data) setTeamMembers(data)
    }
    fetchCreators()
    fetchBrands()
    fetchTeam()
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id || null))
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

  // Auto-link legacy campaigns: if existing has brand text but no brand_id, match by name
  useEffect(() => {
    if (!existing?.id || !brands.length || form.brand_id) return
    if (!existing.brand) return
    const matched = brands.find(b => (b.name || '').toLowerCase() === existing.brand.toLowerCase())
    if (matched) {
      setForm(f => ({
        ...f,
        brand_id: matched.id,
        brand: matched.name,
        brand_logo_url: f.brand_logo_url || matched.logo_url || '',
        brand_website: f.brand_website || matched.website || ''
      }))
    }
  }, [existing?.id, brands.length])

  // Load the selected brand's contacts; default the campaign to its primary contact.
  useEffect(() => {
    if (!form.brand_id) { setBrandContacts([]); return }
    let cancelled = false
    supabase.from('brand_contacts').select('*').eq('brand_id', form.brand_id)
      .order('is_primary', { ascending: false }).order('created_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        const list = data || []
        setBrandContacts(list)
        setForm(f => {
          if (f.contact_id && list.some(c => c.id === f.contact_id)) return f
          const primary = list.find(c => c.is_primary) || list[0]
          return { ...f, contact_id: primary?.id || '' }
        })
      })
    return () => { cancelled = true }
  }, [form.brand_id])

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
    const websiteClean = newBrandWebsite.trim()
    const { data, error: insertErr } = await supabase.from('brands').insert([{
      org_id: orgId,
      name: newBrandName.trim(),
      logo_url,
      website: websiteClean || null,
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
      setNewBrandWebsite('')
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

  async function handleBrandLogoUpload(file) {
    if (!file || !form.brand_id) return
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = 'brand-logos/' + Date.now() + '.' + ext
    const { error: uploadErr } = await supabase.storage.from('media-kits').upload(path, file, { upsert: true })
    if (uploadErr) { setUploadingLogo(false); alert('Logo upload failed: ' + uploadErr.message); return }
    const { data: { publicUrl } } = supabase.storage.from('media-kits').getPublicUrl(path)
    const { error: brandErr } = await supabase.from('brands').update({ logo_url: publicUrl }).eq('id', form.brand_id)
    if (brandErr) { setUploadingLogo(false); alert('Could not save logo to brand: ' + brandErr.message); return }
    setBrands(bs => bs.map(b => b.id === form.brand_id ? { ...b, logo_url: publicUrl } : b))
    setForm(f => ({ ...f, brand_logo_url: publicUrl }))
    setUploadingLogo(false)
  }

  async function handleBrandLogoRemove() {
    if (!form.brand_id || !form.brand_logo_url) return
    if (!confirm('Remove this brand\'s logo?')) return
    setUploadingLogo(true)
    const { error: brandErr } = await supabase.from('brands').update({ logo_url: null }).eq('id', form.brand_id)
    if (brandErr) { setUploadingLogo(false); alert('Could not remove logo: ' + brandErr.message); return }
    setBrands(bs => bs.map(b => b.id === form.brand_id ? { ...b, logo_url: null } : b))
    setForm(f => ({ ...f, brand_logo_url: '' }))
    setUploadingLogo(false)
  }

  async function handleDelete() {
    if (!existing?.id) return
    const ok = confirm(`Permanently delete "${existing.name}"?\n\nThis cannot be undone. All linked workspace tasks, talent assignments, and comments on this campaign will also be removed.\n\nIf you only want to hide it, use Archive instead.`)
    if (!ok) return
    setDeleting(true)
    try {
      await supabase.from('campaign_creators').delete().eq('campaign_id', existing.id)
      await supabase.from('campaign_comments').delete().eq('campaign_id', existing.id)
      await supabase.from('tasks').delete().eq('campaign_id', existing.id)
    } catch (_) {}
    const { error: delErr } = await supabase.from('campaigns').delete().eq('id', existing.id)
    setDeleting(false)
    if (delErr) { alert('Could not delete: ' + delErr.message); return }
    if (onDeleted) onDeleted()
    else { if (onSaved) onSaved(); if (onClose) onClose() }
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('Campaign name is required')
    if (!form.brand_id) return setError('Brand is required')
    setSaving(true)
    setError('')
    // Auto-capture who closed the deal the first time a campaign goes Active,
    // unless Closed By was already set (manually or on a prior Active).
    let closedBy = form.closed_by || null
    if (form.status === 'Active' && !closedBy && currentUserId) closedBy = currentUserId
    const linkedBrand = form.brand_id ? brands.find(b => b.id === form.brand_id) : null
    const resolvedBrandText = (form.brand && form.brand.trim()) || linkedBrand?.name || null
    const resolvedBrandLogo = form.brand_logo_url || linkedBrand?.logo_url || null
    const payload = {
      org_id: orgId,
      name: form.name,
      brand_id: form.brand_id || null,
      brand: resolvedBrandText,
      brand_logo_url: resolvedBrandLogo,
      brand_website: form.brand_website || null,
      contact_id: form.contact_id || null,
      campaign_type: form.campaign_type,
      status: form.status,
      pitched_by: form.pitched_by || null,
      campaign_manager: form.campaign_manager || null,
      closed_by: closedBy,
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
      const { error: updErr, data: updData } = await supabase.from('campaigns').update(payload).eq('id', existing.id).select()
      if (updErr) { setSaving(false); setError(`Could not save: ${updErr.message}`); return }
      if (!updData || updData.length === 0) { setSaving(false); setError('Save returned no rows — likely a Supabase row-level-security policy on the campaigns table is blocking the update. Let Claude know.'); return }
    } else {
      const { data, error: insErr } = await supabase.from('campaigns').insert(payload).select().single()
      if (insErr) { setSaving(false); setError(`Could not create: ${insErr.message}`); return }
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
    if (form.brand_id && form.brand_website !== undefined) {
      const newSite = (form.brand_website || '').trim() || null
      if (linkedBrand && (linkedBrand.website || null) !== newSite) {
        const { error: brandUpdErr } = await supabase.from('brands').update({ website: newSite }).eq('id', form.brand_id)
        if (brandUpdErr) {
          console.warn('brand website sync failed', brandUpdErr)
        } else {
          setBrands(bs => bs.map(b => b.id === form.brand_id ? { ...b, website: newSite } : b))
        }
      }
    }
    setSaving(false)
    onSaved()
  }

  const inp = (props) => (
    <input {...props} onFocus={fieldFocus} onBlur={fieldBlur} style={{ ...inputStyle, ...(props.style || {}) }} />
  )

  const txt = (props, minHeight = '80px') => (
    <textarea {...props} onFocus={fieldFocus} onBlur={fieldBlur} style={{ ...inputStyle, minHeight, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
  )

  // Label is sentence-case, medium weight, muted; a required field gets a coral asterisk.
  const field = (lbl, children) => {
    const required = lbl.endsWith(' *')
    const label = required ? lbl.slice(0, -2) : lbl
    return (
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: muted, marginBottom: '5px' }}>{label}{required && <span style={{ color: danger, marginLeft: '3px' }}>*</span>}</label>
        {children}
      </div>
    )
  }

  const selectStyle = { ...inputStyle, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', paddingRight: '30px', cursor: 'pointer' }

  // Native select with a custom low-opacity chevron — no browser-default arrow.
  const selectEl = (value, onChange, children, wrap = {}) => (
    <div style={{ position: 'relative', ...wrap }}>
      <select value={value} onChange={onChange} onFocus={fieldFocus} onBlur={fieldBlur} style={selectStyle}>{children}</select>
      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px', color: muted }}>▾</span>
    </div>
  )

  // Quiet section divider: a hairline rule + a short plain-language label. No numbers, no caps.
  const sectionHeader = (title) => (
    <div style={{ marginTop: '36px', marginBottom: '12px', paddingTop: '14px', borderTop: `1px solid ${fieldBorder}` }}>
      <div style={{ fontSize: '11px', letterSpacing: '0.07em', color: text, opacity: 0.4, fontWeight: 400 }}>{title}</div>
    </div>
  )

  // Dropdown of team members (profiles) for the ownership fields.
  const userSelect = (k) => selectEl(form[k] || '', e => set(k, e.target.value), (
    <>
      <option value=''>Unassigned</option>
      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email || 'Unnamed'}</option>)}
    </>
  ))

  return (
    <div style={{ position: 'fixed', inset: 0, background: dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      {editingBrandId && (
        <BrandDetail
          brandId={editingBrandId}
          dark={dark}
          clientLabel={clientLabel}
          onClose={() => setEditingBrandId(null)}
          onSaved={() => {
            supabase.from('brands').select('*').eq('org_id', orgId).neq('status', 'archived').order('name', { ascending: true }).then(({ data }) => setBrands(data || []))
          }}
        />
      )}
      <div className='cf-scroll' style={{ width: '580px', maxWidth: '94vw', maxHeight: '88vh', background: cardBg, border: `1px solid ${fieldBorder}`, borderRadius: '12px', overflowY: 'auto', padding: '28px 28px 36px' }}>
        <style>{`
          .cf-scroll::-webkit-scrollbar { width: 8px; }
          .cf-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
          .cf-scroll:hover::-webkit-scrollbar-thumb { background: ${dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)'}; }
          .cf-date::-webkit-calendar-picker-indicator { filter: invert(${dark ? '0.7' : '0.35'}); opacity: 0.55; cursor: pointer; }
        `}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div style={{ fontSize: '18px', fontWeight: 500, color: text, letterSpacing: '-0.01em', paddingTop: '2px' }}>{existing ? 'Edit Campaign' : 'New Campaign'}</div>
          <button onClick={onClose} title='Close' style={{ background: 'none', border: 'none', color: muted, fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '4px', opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>×</button>
        </div>

        {sectionHeader('Basics')}
        {field('Campaign Name *', inp({ value: form.name, onChange: e => set('name', e.target.value), placeholder: 'e.g. Summer Wellness Campaign' }))}
        {field('Brand *',
          <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {selectEl(form.brand_id || '', e => selectBrand(e.target.value), (
                <>
                  <option value=''>Select a {clientLabel.singular.toLowerCase()}…</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </>
              ), { flex: 1 })}
              <button
                type='button'
                onClick={() => setShowNewBrand(s => !s)}
                style={{ padding: '0 4px', fontSize: '11px', background: 'none', border: 'none', color: muted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {showNewBrand ? 'Cancel' : '+ New'}
              </button>
            </div>
            {form.brand_id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '8px 10px', background: fieldBg, border: `1px solid ${fieldBorder}`, borderRadius: '6px' }}>
                {form.brand_logo_url
                  ? <img src={form.brand_logo_url} alt={form.brand} style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px', background: '#fff', padding: '2px', border: `1px solid ${fieldBorder}` }} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '14px', flexShrink: 0 }}>{(form.brand || '?').charAt(0).toUpperCase()}</div>
                }
                <span style={{ fontSize: '12px', color: text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.brand}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0 }}>
                  <label title='Upload or change the logo for this brand' style={{ fontSize: '11px', color: muted, cursor: uploadingLogo ? 'wait' : 'pointer', opacity: uploadingLogo ? 0.6 : 1 }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                    {uploadingLogo ? '…' : (form.brand_logo_url ? 'Change logo' : 'Add logo')}
                    <input type='file' accept='image/*' onChange={e => { handleBrandLogoUpload(e.target.files?.[0]); e.target.value = '' }} style={{ display: 'none' }} disabled={uploadingLogo} />
                  </label>
                  {form.brand_logo_url && (<>
                    <span style={{ color: muted, opacity: 0.4 }}>·</span>
                    <button type='button' onClick={handleBrandLogoRemove} disabled={uploadingLogo} title="Remove this brand's logo" style={{ fontSize: '11px', background: 'none', border: 'none', color: muted, cursor: uploadingLogo ? 'wait' : 'pointer', padding: 0, opacity: uploadingLogo ? 0.6 : 1 }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>Remove</button>
                  </>)}
                  <span style={{ color: muted, opacity: 0.4 }}>·</span>
                  <button type='button' onClick={() => setEditingBrandId(form.brand_id)} title='View or edit brand contact' style={{ fontSize: '11px', background: 'none', border: 'none', color: accent, cursor: 'pointer', padding: 0 }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>Contact</button>
                </div>
              </div>
            )}
            {showNewBrand && (
              <div style={{ marginTop: '10px', padding: '12px', border: `1px dashed ${fieldBorder}`, borderRadius: '6px' }}>
                {inp({ value: newBrandName, onChange: e => setNewBrandName(e.target.value), onKeyDown: e => { if (e.key === 'Enter') createBrandInline() }, placeholder: `New ${clientLabel.singular.toLowerCase()} name`, autoFocus: true, style: { marginBottom: '8px' } })}
                {inp({ value: newBrandWebsite, onChange: e => setNewBrandWebsite(e.target.value), onKeyDown: e => { if (e.key === 'Enter') createBrandInline() }, placeholder: 'Website (optional, e.g. example.com)', style: { marginBottom: '10px' } })}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', color: muted, cursor: 'pointer', flex: 1 }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                    {newBrandLogoFile ? newBrandLogoFile.name.slice(0, 24) : '↑ Upload logo (optional)'}
                    <input type='file' accept='image/*' onChange={e => setNewBrandLogoFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  </label>
                  <button onClick={createBrandInline} disabled={creatingBrand || !newBrandName.trim()} style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 500, background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', opacity: creatingBrand || !newBrandName.trim() ? 0.5 : 1 }}>
                    {creatingBrand ? 'Adding…' : 'Add brand'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {form.brand_id && !showNewBrand && field('Brand Website', inp({ value: form.brand_website || '', onChange: e => set('brand_website', e.target.value), placeholder: 'e.g. example.com' }))}

        {form.brand_id && field('Campaign Contact',
          <div>
            {selectEl(form.contact_id || '', e => set('contact_id', e.target.value), (
              <>
                <option value=''>No contact</option>
                {brandContacts.map(c => (
                  <option key={c.id} value={c.id}>{(c.name || c.email || 'Unnamed') + (c.title ? ` · ${c.title}` : '') + (c.is_primary ? ' (primary)' : '')}</option>
                ))}
              </>
            ))}
            {brandContacts.length === 0 && (
              <div style={{ fontSize: '11px', color: muted, marginTop: '6px', opacity: 0.8 }}>No contacts for this {clientLabel.singular.toLowerCase()} yet — use “Contact” above to add people.</div>
            )}
          </div>
        )}

        {field('Campaign Type *',
          selectEl(form.campaign_type || 'Paid', e => set('campaign_type', e.target.value),
            ['Paid', 'Non-paid', 'Gifting', 'Seeding', 'Media'].map(ty => <option key={ty} value={ty}>{ty}</option>)
          )
        )}

        {field('Status *',
          selectEl(form.status || 'Pitch', e => set('status', e.target.value),
            ['Pitch', 'Contract Pending', 'Active', 'Pending Payment', 'Completed', 'Cancelled', 'Dead'].map(s => <option key={s} value={s}>{s}</option>)
          )
        )}

        {sectionHeader('Ownership')}
        {field('Pitched By', userSelect('pitched_by'))}
        {field('Deal Closed By', userSelect('closed_by'))}
        {field('Campaign Manager', userSelect('campaign_manager'))}

        {sectionHeader('Timeline & Budget')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {field('Start Date', inp({ value: form.start_date, onChange: e => set('start_date', e.target.value), type: 'date', className: 'cf-date' }))}
          {field('End Date', inp({ value: form.end_date, onChange: e => set('end_date', e.target.value), type: 'date', className: 'cf-date' }))}
        </div>
        {field('Budget', (
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: muted, pointerEvents: 'none' }}>$</span>
            {inp({ value: form.budget, onChange: e => set('budget', e.target.value), placeholder: '0', type: 'number', style: { paddingLeft: '24px' } })}
          </div>
        ))}

        {sectionHeader('Deliverables')}
        {field('Deliverables',
          txt({ value: form.deliverables, onChange: e => set('deliverables', e.target.value), placeholder: 'e.g. 1 Reel, 3 Stories' })
        )}
        {field('Deliverables Link', inp({ value: form.deliverables_link, onChange: e => set('deliverables_link', e.target.value), placeholder: 'https://drive.google.com/...' }))}

        {sectionHeader('Documents')}
        {field('Brief URL', inp({ value: form.brief_url, onChange: e => set('brief_url', e.target.value), placeholder: 'https://drive.google.com/file/d/...' }))}
        {field('Contract URL', inp({ value: form.contract_url, onChange: e => set('contract_url', e.target.value), placeholder: 'https://drive.google.com/file/d/...' }))}

        {sectionHeader('Notes')}
        {field('Key Milestones',
          txt({ value: form.timeline, onChange: e => set('timeline', e.target.value), placeholder: 'e.g. Content due Apr 15, go live Apr 20' }, '60px')
        )}
        {field('Internal Notes',
          txt({ value: form.notes, onChange: e => set('notes', e.target.value), placeholder: 'Any internal notes…' })
        )}

        {sectionHeader('Talent')}
        {field('Add Talent',
          <div>
            {inp({ value: talentSearch, onChange: e => setTalentSearch(e.target.value), placeholder: 'Search by name or handle…', style: { marginBottom: '6px' } })}
            {talentSearch.trim() && (
              <div style={{ border: `1px solid ${fieldBorder}`, borderRadius: '6px', maxHeight: '180px', overflowY: 'auto', overflow: 'hidden' }}>
                {creators.filter(cr => cr.name?.toLowerCase().includes(talentSearch.toLowerCase()) || cr.handles?.instagram?.toLowerCase().includes(talentSearch.toLowerCase())).map((cr, i) => (
                  <div key={cr.id} onClick={() => { toggleTalent(cr.id); setTalentSearch('') }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', background: form.talent_ids.includes(cr.id) ? (dark ? 'rgba(91,124,153,0.15)' : 'rgba(91,124,153,0.10)') : 'transparent', borderTop: i === 0 ? 'none' : `1px solid ${fieldBorder}` }}>
                    {cr.photo_url ? <img src={cr.photo_url} alt={cr.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} /> : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontFamily: 'Georgia, serif', flexShrink: 0 }}>{cr.name?.charAt(0)}</div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: text }}>{cr.name}</div>
                      {cr.handles?.instagram && <a href={`https://instagram.com/${cr.handles.instagram}`} target='_blank' rel='noreferrer' onClick={e => e.stopPropagation()} style={{ fontSize: '11px', color: muted, textDecoration: 'none' }}>@{cr.handles.instagram}</a>}
                    </div>
                    {form.talent_ids.includes(cr.id) && <span style={{ fontSize: '11px', color: accent }}>✓ Added</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {form.talent_ids.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {form.talent_ids.map(id => {
                const cr = creators.find(x => x.id === id)
                return cr ? (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 6px 4px 10px', borderRadius: '20px', border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}` }}>
                    <span style={{ fontSize: '12px', color: text }}>{cr.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); toggleTalent(id) }} title='Remove' style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0, opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>×</button>
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}

        {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginTop: '20px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '32px' }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 500, letterSpacing: '0.02em', background: dark ? '#FFFFFF' : '#1A1A1A', color: dark ? '#111' : '#FFFFFF', border: 'none', cursor: 'pointer', borderRadius: '6px', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Create campaign'}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: muted, fontSize: '13px', cursor: 'pointer', padding: '4px' }}>Cancel</button>
        </div>

        {existing && (
          <div style={{ marginTop: '40px', paddingTop: '18px', borderTop: `1px solid ${fieldBorder}` }}>
            <div style={{ fontSize: '11px', color: muted, fontStyle: 'italic', opacity: 0.5, marginBottom: '8px', lineHeight: 1.5 }}>Deleting this campaign is permanent and cannot be undone — its tasks, talent assignments, and comments go with it. To hide it instead, use Archive.</div>
            <button onClick={handleDelete} disabled={deleting} style={{ background: 'none', border: 'none', color: danger, fontSize: '12px', cursor: 'pointer', padding: 0, opacity: deleting ? 0.6 : 0.85 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}>
              {deleting ? 'Deleting…' : 'Delete campaign'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
