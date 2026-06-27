import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import ExpandableTextarea from './ExpandableTextarea'

export default function BrandDetail({ brandId, onClose, onSaved, dark = true }) {
  const bg = dark ? '#1A1A1A' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const border2 = dark ? '#3A3A3A' : '#CCC7BF'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const inputBg = dark ? '#141414' : '#F8F7F3'
  const labelColor = dark ? '#777' : '#888'
  const cardBg = dark ? '#222' : '#F9F7F3'

  const [brand, setBrand] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [contacts, setContacts] = useState([])
  const [contactDraft, setContactDraft] = useState(null)
  const [savingContact, setSavingContact] = useState(false)
  const [contactError, setContactError] = useState('')

  useEffect(() => { fetchBrand() }, [brandId])

  async function fetchBrand() {
    if (!brandId) return
    setLoading(true)
    const { data } = await supabase.from('brands').select('*').eq('id', brandId).maybeSingle()
    if (data) {
      setBrand(data)
      setForm({ name: data.name || '', website: data.website || '', logo_url: data.logo_url || '' })
    }
    await fetchContacts()
    setLoading(false)
  }

  async function fetchContacts() {
    const { data } = await supabase.from('brand_contacts').select('*').eq('brand_id', brandId)
      .order('is_primary', { ascending: false }).order('created_at', { ascending: true })
    setContacts(data || [])
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
    const website = (form.website || '').trim()
    const { error: updErr } = await supabase.from('brands').update({ name: form.name.trim(), website: website || null }).eq('id', brandId)
    setSaving(false)
    if (updErr) { setError('Could not save: ' + (updErr.message || '')); return }
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

  async function saveContact() {
    if (!contactDraft) return
    const name = (contactDraft.name || '').trim()
    const email = (contactDraft.email || '').trim()
    if (!name && !email) { setContactError('Add at least a name or an email.'); return }
    setSavingContact(true)
    setContactError('')
    const row = {
      name: name || null,
      title: (contactDraft.title || '').trim() || null,
      email: email || null,
      phone: (contactDraft.phone || '').trim() || null,
      notes: (contactDraft.notes || '').trim() || null,
    }
    let err
    if (contactDraft.id) {
      ;({ error: err } = await supabase.from('brand_contacts').update(row).eq('id', contactDraft.id))
    } else {
      ;({ error: err } = await supabase.from('brand_contacts').insert([{
        ...row, brand_id: brandId, org_id: brand?.org_id, is_primary: contacts.length === 0
      }]))
    }
    setSavingContact(false)
    if (err) {
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('brand_contacts') && (msg.includes('does not exist') || msg.includes('schema cache') || err.code === '42P01' || err.code === 'PGRST205')) {
        setContactError("The contacts table isn't set up in Supabase yet. Run the SQL Claude sent, then try again.")
      } else {
        setContactError('Could not save: ' + (err.message || 'unknown error'))
      }
      return
    }
    setContactDraft(null)
    fetchContacts()
  }

  async function deleteContact(c) {
    if (!confirm(`Remove ${c.name || c.email || 'this contact'}?`)) return
    await supabase.from('brand_contacts').delete().eq('id', c.id)
    const remaining = contacts.filter(x => x.id !== c.id)
    if (c.is_primary && remaining.length > 0 && !remaining.some(x => x.is_primary)) {
      await supabase.from('brand_contacts').update({ is_primary: true }).eq('id', remaining[0].id)
    }
    fetchContacts()
  }

  async function makePrimary(c) {
    await supabase.from('brand_contacts').update({ is_primary: false }).eq('brand_id', brandId)
    await supabase.from('brand_contacts').update({ is_primary: true }).eq('id', c.id)
    fetchContacts()
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

  const miniInput = { width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }
  const smallBtn = { padding: '4px 9px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }

  const renderContactEditor = () => (
    <div style={{ padding: '12px', border: `0.5px solid ${border2}`, borderRadius: '1px', marginBottom: '8px', background: cardBg }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <input placeholder='Name' value={contactDraft.name} onChange={e => setContactDraft(d => ({ ...d, name: e.target.value }))} style={miniInput} autoFocus />
        <input placeholder='Title' value={contactDraft.title} onChange={e => setContactDraft(d => ({ ...d, title: e.target.value }))} style={miniInput} />
      </div>
      <input placeholder='Email' type='email' value={contactDraft.email} onChange={e => setContactDraft(d => ({ ...d, email: e.target.value }))} style={{ ...miniInput, marginBottom: '8px' }} />
      <input placeholder='Phone' value={contactDraft.phone} onChange={e => setContactDraft(d => ({ ...d, phone: e.target.value }))} style={{ ...miniInput, marginBottom: '8px' }} />
      <ExpandableTextarea dark={dark} placeholder='Notes (optional)' value={contactDraft.notes || ''} onChange={e => setContactDraft(d => ({ ...d, notes: e.target.value }))} style={{ ...miniInput, marginBottom: '8px', minHeight: '54px', resize: 'vertical', fontFamily: 'inherit' }} />
      {contactError && <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '8px' }}>{contactError}</div>}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={saveContact} disabled={savingContact} style={{ padding: '6px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: savingContact ? 0.6 : 1 }}>{savingContact ? 'Saving...' : 'Save contact'}</button>
        <button onClick={() => { setContactDraft(null); setContactError('') }} style={{ padding: '6px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
      </div>
    </div>
  )

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
                ? <img src={form.logo_url} alt={form.name} style={{ width: '66px', height: '66px', objectFit: 'contain', borderRadius: '2px', background: '#fff', padding: '4px', border: `0.5px solid ${border}`, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                : <div style={{ width: '66px', height: '66px', borderRadius: '2px', background: '#5b7c99', color: '#fff', fontFamily: 'Georgia, serif', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initial(form.name)}</div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99' }}>Contacts</div>
                <div style={{ fontSize: '10px', color: subtle }}>The people you work with at this brand. Campaigns pick one.</div>
              </div>

              {contacts.length === 0 && !contactDraft && (
                <div style={{ fontSize: '11px', color: subtle, fontStyle: 'italic', marginBottom: '10px' }}>No contacts yet. Add the people you work with here.</div>
              )}

              {contacts.map(c => (
                contactDraft && contactDraft.id === c.id ? (
                  <div key={c.id}>{renderContactEditor()}</div>
                ) : (
                  <div key={c.id} style={{ padding: '12px', border: `0.5px solid ${border}`, borderRadius: '1px', marginBottom: '8px', background: cardBg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: text, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {c.name || c.email || 'Unnamed contact'}
                          {c.is_primary && <span style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', border: '0.5px solid #5b7c99', padding: '2px 5px', borderRadius: '1px' }}>Primary</span>}
                        </div>
                        {c.title && <div style={{ fontSize: '10px', color: muted, marginTop: '3px' }}>{c.title}</div>}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '5px', flexWrap: 'wrap' }}>
                          {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: '11px', color: '#5b7c99', textDecoration: 'none' }}>{c.email}</a>}
                          {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize: '11px', color: muted, textDecoration: 'none' }}>{c.phone}</a>}
                        </div>
                        {c.notes && <div style={{ fontSize: '11px', color: subtle, marginTop: '6px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {!c.is_primary && <button onClick={() => makePrimary(c)} title='Make primary contact' style={{ ...smallBtn, color: subtle }}>★</button>}
                        <button onClick={() => { setContactError(''); setContactDraft({ id: c.id, name: c.name || '', title: c.title || '', email: c.email || '', phone: c.phone || '', notes: c.notes || '' }) }} style={smallBtn}>Edit</button>
                        <button onClick={() => deleteContact(c)} style={smallBtn}>Remove</button>
                      </div>
                    </div>
                  </div>
                )
              ))}

              {contactDraft && !contactDraft.id && renderContactEditor()}

              {!contactDraft && (
                <button onClick={() => { setContactError(''); setContactDraft({ name: '', title: '', email: '', phone: '', notes: '' }) }} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px dashed ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>
                  + Add contact
                </button>
              )}
            </div>

            {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginTop: '16px', padding: '8px 10px', background: 'rgba(231, 76, 60, 0.08)', border: '0.5px solid rgba(231, 76, 60, 0.3)', borderRadius: '1px' }}>{error}</div>}

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
