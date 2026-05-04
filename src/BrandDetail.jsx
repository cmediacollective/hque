import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Linkify from './Linkify'

export default function BrandDetail({ brandId, onClose, onSaved, dark = true }) {
  const bg = dark ? '#1A1A1A' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#3A3A3A' : '#C4BFB8'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const inputBg = dark ? '#141414' : '#F5F3EF'
  const labelColor = dark ? '#777' : '#888'

  const [brand, setBrand] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => { fetchBrand() }, [brandId])

  async function fetchBrand() {
    if (!brandId) return
    setLoading(true)
    const { data } = await supabase.from('brands').select('*').eq('id', brandId).maybeSingle()
    if (data) {
      setBrand(data)
      setForm({
        name: data.name || '',
        website: data.website || '',
        logo_url: data.logo_url || '',
        contact_name: data.contact_name || '',
        contact_title: data.contact_title || '',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        contact_notes: data.contact_notes || ''
      })
    }
    setLoading(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleLogoUpload(file) {
    if (!file || !brandId) return
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = 'brand-logos/' + Date.now() + '.' + ext
    const { error: upErr } = await supabase.storage.from('media-kits').upload(path, file, { upsert: true })
    if (upErr) { setUploadingLogo(false); alert('Logo upload failed: ' + upErr.message); return }
    const { data: { publicUrl } } = supabase.storage.from('media-kits').getPublicUrl(path)
    await supabase.from('brands').update({ logo_url: publicUrl }).eq('id', brandId)
    set('logo_url', publicUrl)
    setUploadingLogo(false)
  }

  async function handleLogoRemove() {
    if (!brandId || !form?.logo_url) return
    if (!confirm("Remove this brand's logo?")) return
    setUploadingLogo(true)
    await supabase.from('brands').update({ logo_url: null }).eq('id', brandId)
    set('logo_url', '')
    setUploadingLogo(false)
  }

  async function handleSave() {
    if (!form?.name?.trim()) { setError('Brand name is required'); return }
    setSaving(true)
    setError('')
    let website = (form.website || '').trim()
    const payload = {
      name: form.name.trim(),
      website: website || null,
      contact_name: form.contact_name?.trim() || null,
      contact_title: form.contact_title?.trim() || null,
      contact_email: form.contact_email?.trim() || null,
      contact_phone: form.contact_phone?.trim() || null,
      contact_notes: form.contact_notes?.trim() || null
    }
    const { error: updErr } = await supabase.from('brands').update(payload).eq('id', brandId)
    setSaving(false)
    if (updErr) {
      const msg = updErr.message || ''
      if (msg.toLowerCase().includes('contact_') && (msg.toLowerCase().includes('schema cache') || msg.toLowerCase().includes('does not exist'))) {
        setError("Contact columns aren't set up in Supabase yet. Run the SQL Claude sent, then try again.")
      } else {
        setError('Could not save: ' + msg)
      }
      return
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
    if (onSaved) onSaved()
  }

  async function handleArchive() {
    if (!brand) return
    const isArchived = brand.status === 'archived'
    const ok = confirm(isArchived ? `Restore "${brand.name}" to active brands?` : `Archive "${brand.name}"? You can restore it from the sidebar anytime.`)
    if (!ok) return
    await supabase.from('brands').update({ status: isArchived ? 'active' : 'archived' }).eq('id', brandId)
    if (onSaved) onSaved()
    if (onClose) onClose()
  }

  const inp = (props) => (
    <input {...props} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box' }} />
  )

  const field = (lbl, children) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: labelColor, marginBottom: '6px' }}>{lbl}</label>
      {children}
    </div>
  )

  const initial = (n) => (n || '?').trim().charAt(0).toUpperCase()

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 250, display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '480px', background: bg, height: '100vh', overflowY: 'auto', borderLeft: `0.5px solid ${border}`, display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '20px 24px', borderBottom: `0.5px solid ${border}`, position: 'sticky', top: 0, background: bg, zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '8px', letterSpacing: '0.24em', textTransform: 'uppercase', color: subtle }}>Brand / Client</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {savedFlash && <span style={{ fontSize: '10px', color: '#5C9E52', letterSpacing: '0.14em', textTransform: 'uppercase' }}>✓ Saved</span>}
              <button onClick={handleSave} disabled={saving} style={{ padding: '6px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
          </div>
        </div>

        {loading || !form ? (
          <div style={{ padding: '40px 24px', fontSize: '12px', color: muted }}>Loading...</div>
        ) : (
          <div style={{ padding: '24px', flex: 1 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              {form.logo_url
                ? <img src={form.logo_url} alt={form.name} style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '2px', background: '#fff', padding: '4px', border: `0.5px solid ${border}`, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                : <div style={{ width: '56px', height: '56px', borderRadius: '2px', background: '#5b7c99', color: '#fff', fontFamily: 'Georgia, serif', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initial(form.name)}</div>
              }
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <label style={{ padding: '5px 10px', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', border: `0.5px solid ${border2}`, color: muted, cursor: uploadingLogo ? 'wait' : 'pointer', borderRadius: '1px', opacity: uploadingLogo ? 0.6 : 1 }}>
                  {uploadingLogo ? '...' : (form.logo_url ? 'Change logo' : 'Add logo')}
                  <input type='file' accept='image/*' onChange={e => { handleLogoUpload(e.target.files?.[0]); e.target.value = '' }} style={{ display: 'none' }} disabled={uploadingLogo} />
                </label>
                {form.logo_url && (
                  <button type='button' onClick={handleLogoRemove} disabled={uploadingLogo} style={{ padding: '5px 10px', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: uploadingLogo ? 'wait' : 'pointer', borderRadius: '1px' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {field('Brand Name *', inp({ value: form.name, onChange: e => set('name', e.target.value) }))}
            {field('Website', inp({ value: form.website, onChange: e => set('website', e.target.value), placeholder: 'e.g. example.com' }))}

            <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '20px', marginTop: '8px' }}>
              <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '14px' }}>Contact</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {field('Name', inp({ value: form.contact_name, onChange: e => set('contact_name', e.target.value), placeholder: 'e.g. Sarah Lee' }))}
                {field('Title', inp({ value: form.contact_title, onChange: e => set('contact_title', e.target.value), placeholder: 'e.g. Marketing Manager' }))}
              </div>
              {field('Email', inp({ value: form.contact_email, onChange: e => set('contact_email', e.target.value), placeholder: 'e.g. sarah@brand.com', type: 'email' }))}
              {field('Phone', inp({ value: form.contact_phone, onChange: e => set('contact_phone', e.target.value), placeholder: 'e.g. (555) 123-4567' }))}
              {field('Notes',
                <textarea value={form.contact_notes} onChange={e => set('contact_notes', e.target.value)} placeholder='Anything to remember about this contact — preferred channel, last meeting, etc.' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} />
              )}
            </div>

            {form.contact_notes && (
              <div style={{ marginTop: '4px', fontSize: '11px', color: subtle, lineHeight: 1.6 }}>
                <Linkify text={form.contact_notes} />
              </div>
            )}

            {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginTop: '8px', padding: '8px 10px', background: 'rgba(231, 76, 60, 0.08)', border: '0.5px solid rgba(231, 76, 60, 0.3)', borderRadius: '1px' }}>{error}</div>}

            <div style={{ borderTop: `0.5px solid ${border}`, marginTop: '32px', paddingTop: '16px' }}>
              <button onClick={handleArchive} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>
                {brand?.status === 'archived' ? 'Restore brand' : 'Archive brand'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
