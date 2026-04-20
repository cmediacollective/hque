import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function BrandsSidebar({ dark = true, orgId, selectedBrandId, onSelectBrand }) {
  const bg = dark ? '#0D0D0D' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#3A3A3A' : '#C4BFB8'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const muted = dark ? '#AAA' : '#666'
  const subtle = dark ? '#666' : '#888'
  const cardHover = dark ? '#1A1A1A' : '#F5F3EF'
  const selectedBg = dark ? '#1A1A1A' : '#EEEAE3'

  const [brands, setBrands] = useState([])
  const [archivedBrands, setArchivedBrands] = useState([])
  const [boardCounts, setBoardCounts] = useState({})
  const [showArchived, setShowArchived] = useState(false)
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandWebsite, setNewBrandWebsite] = useState('')
  const [newBrandLogoFile, setNewBrandLogoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [archiving, setArchiving] = useState(null)
  const [hovering, setHovering] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)

  useEffect(() => { if (orgId) { fetchBrands(); fetchBoardCounts() } }, [orgId])

  async function fetchBrands() {
    const { data: brandsData } = await supabase.from('brands').select('*').eq('org_id', orgId).order('name', { ascending: true })
    const { data: pinsData } = await supabase.from('user_brand_pins').select('brand_id, pinned_at')
    const pinMap = {}
    ;(pinsData || []).forEach(p => { pinMap[p.brand_id] = p.pinned_at })

    const enriched = (brandsData || []).map(b => ({ ...b, pinned_at: pinMap[b.id] || null }))
    const active = enriched.filter(b => b.status !== 'archived')
    const archived = enriched.filter(b => b.status === 'archived')
    active.sort((a, b) => {
      if (a.pinned_at && !b.pinned_at) return -1
      if (!a.pinned_at && b.pinned_at) return 1
      if (a.pinned_at && b.pinned_at) return new Date(b.pinned_at) - new Date(a.pinned_at)
      return a.name.localeCompare(b.name)
    })
    setBrands(active)
    setArchivedBrands(archived)
  }

  async function togglePin(brand) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (brand.pinned_at) {
      await supabase.from('user_brand_pins').delete().eq('user_id', user.id).eq('brand_id', brand.id)
    } else {
      await supabase.from('user_brand_pins').insert([{ user_id: user.id, brand_id: brand.id }])
    }
    fetchBrands()
  }

  async function fetchBoardCounts() {
    const { data } = await supabase.from('boards').select('brand_id').eq('org_id', orgId).neq('status', 'archived')
    const counts = {}
    let internal = 0
    ;(data || []).forEach(b => {
      if (b.brand_id) counts[b.brand_id] = (counts[b.brand_id] || 0) + 1
      else internal += 1
    })
    counts.__internal = internal
    setBoardCounts(counts)
  }

  async function uploadLogo(file) {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = 'brand-logos/' + Date.now() + '.' + ext
    const { error: uploadErr } = await supabase.storage.from('media-kits').upload(path, file, { upsert: true })
    if (uploadErr) return null
    const { data: { publicUrl } } = supabase.storage.from('media-kits').getPublicUrl(path)
    return publicUrl
  }

  async function createBrand() {
    if (!newBrandName.trim()) return setError('Brand name is required')
    setSaving(true)
    setError('')

    let logo_url = null
    if (newBrandLogoFile) {
      logo_url = await uploadLogo(newBrandLogoFile)
    }

    let website = newBrandWebsite.trim()
    if (website && !website.startsWith('http')) website = 'https://' + website

    const { error: insertErr } = await supabase.from('brands').insert([{
      org_id: orgId,
      name: newBrandName.trim(),
      logo_url,
      website: website || null,
      status: 'active'
    }])

    setSaving(false)
    if (insertErr) {
      if (insertErr.message?.includes('unique') || insertErr.code === '23505') {
        return setError('A brand with this name already exists')
      }
      return setError(insertErr.message || 'Failed to create brand')
    }

    setNewBrandName('')
    setNewBrandWebsite('')
    setNewBrandLogoFile(null)
    setShowNewBrand(false)
    fetchBrands()
  }

  async function archiveBrand(brand, restore = false) {
    await supabase.from('brands').update({ status: restore ? 'active' : 'archived' }).eq('id', brand.id)
    setArchiving(null)
    fetchBrands()
    if (!restore && selectedBrandId === brand.id) onSelectBrand?.(null)
  }

  const filtered = search
    ? brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : brands

  const initial = (name) => (name || '?').trim().charAt(0).toUpperCase()

  const colorFromName = (name) => {
    if (!name) return '#5b7c99'
    const colors = ['#5B7C99', '#B784A7', '#7A9B8E', '#A87575', '#8C6BAA', '#D4A574', '#6B8E7F']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div style={{ width: '220px', background: bg, borderRight: `0.5px solid ${border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

      {archiving && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setArchiving(null)}>
          <div style={{ background: dark ? '#141414' : '#FFFFFF', border: `0.5px solid ${border}`, padding: '28px', width: '380px', borderRadius: '2px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: text, marginBottom: '10px' }}>
              {archiving.restore ? 'Restore brand?' : 'Archive brand?'}
            </div>
            <div style={{ fontSize: '12px', color: muted, lineHeight: 1.6, marginBottom: '22px' }}>
              {archiving.restore
                ? `"${archiving.brand.name}" will be moved back to your active brands.`
                : `"${archiving.brand.name}" will be hidden from your sidebar. Boards assigned to this brand will still exist and be shown under Internal.`}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setArchiving(null)} style={{ padding: '8px 18px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
              <button onClick={() => archiveBrand(archiving.brand, archiving.restore)} style={{ padding: '8px 18px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
                {archiving.restore ? 'Restore' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '14px 14px 10px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Search brands...'
          style={{ width: '100%', padding: '7px 10px', fontSize: '12px', background: dark ? '#141414' : '#F5F3EF', border: `0.5px solid ${border}`, borderRadius: '1px', color: text, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ padding: '0 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: subtle }}>
          {showArchived ? `Archived · ${archivedBrands.length}` : `Brands · ${filtered.length}`}
        </div>
        {archivedBrands.length > 0 && (
          <button onClick={() => setShowArchived(!showArchived)} style={{ background: 'none', border: 'none', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5b7c99', cursor: 'pointer', padding: 0 }}>
            {showArchived ? 'Active' : `+${archivedBrands.length} archived`}
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', borderTop: `0.5px solid ${border}` }}>

        {!showArchived && filtered.length === 0 && !search && (
          <div style={{ padding: '20px 16px', fontSize: '11px', color: subtle, lineHeight: 1.6 }}>
            No brands yet. Click "+ New brand" below to add one.
          </div>
        )}

        {!showArchived && filtered.length === 0 && search && (
          <div style={{ padding: '20px 16px', fontSize: '11px', color: subtle, lineHeight: 1.6 }}>
            No matches for "{search}"
          </div>
        )}

        {!showArchived && filtered.map(b => (
          <div
            key={b.id}
            onClick={() => onSelectBrand?.(b)}
            onMouseEnter={() => setHovering(b.id)}
            onMouseLeave={() => setHovering(null)}
            style={{
              padding: '11px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              background: selectedBrandId === b.id ? selectedBg : hovering === b.id ? cardHover : 'transparent',
              borderLeft: selectedBrandId === b.id ? '2px solid #5b7c99' : '2px solid transparent',
              position: 'relative'
            }}>
            {b.logo_url ? (
              <img src={b.logo_url} alt={b.name} style={{ width: '28px', height: '28px', objectFit: 'contain', background: '#fff', borderRadius: '3px', padding: '2px', flexShrink: 0, border: `0.5px solid ${border}` }} onError={e => { e.target.style.display = 'none' }} />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '3px', background: colorFromName(b.name), color: '#fff', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initial(b.name)}
              </div>
            )}
            <span style={{ fontSize: '13px', color: selectedBrandId === b.id ? text : muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>

            {hovering === b.id || openMenuId === b.id ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', position: 'relative' }}>
                <button
                  onClick={e => { e.stopPropagation(); togglePin(b) }}
                  title={b.pinned_at ? 'Unpin' : 'Pin to top'}
                  style={{ background: 'none', border: 'none', color: b.pinned_at ? '#5b7c99' : subtle, cursor: 'pointer', fontSize: '13px', padding: 0, lineHeight: 1 }}>
                  {b.pinned_at ? '★' : '☆'}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === b.id ? null : b.id) }}
                  title='More'
                  style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '14px', padding: '0 3px', lineHeight: 1, letterSpacing: '1px' }}>⋯</button>
                {openMenuId === b.id && (
                  <>
                    <div onClick={e => { e.stopPropagation(); setOpenMenuId(null) }} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                    <div style={{ position: 'absolute', top: '22px', right: 0, background: dark ? '#141414' : '#FFFFFF', border: `0.5px solid ${border2}`, borderRadius: '2px', zIndex: 20, minWidth: '120px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenuId(null); setArchiving({ brand: b, restore: false }) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '11px', background: 'none', border: 'none', color: muted, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = cardHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Archive brand</button>
                    </div>
                  </>
                )}
              </div>
            ) : b.pinned_at ? (
              <span style={{ fontSize: '11px', color: '#5b7c99', flexShrink: 0 }}>★</span>
            ) : (
              <span style={{ fontSize: '10px', color: subtle, flexShrink: 0 }}>{boardCounts[b.id] || 0}</span>
            )}
          </div>
        ))}

        {!showArchived && boardCounts.__internal > 0 && (
          <>
            <div style={{ padding: '16px 14px 4px', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: subtle }}>Unassigned</div>
            <div
              onClick={() => onSelectBrand?.({ id: '__internal', name: 'Unassigned' })}
              style={{
                padding: '11px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                background: selectedBrandId === '__internal' ? selectedBg : 'transparent',
                borderLeft: selectedBrandId === '__internal' ? '2px solid #5b7c99' : '2px solid transparent'
              }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '3px', background: dark ? '#2A2A2A' : '#E0DCD6', color: muted, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `0.5px solid ${border}` }}>⚙</div>
              <span style={{ fontSize: '13px', color: selectedBrandId === '__internal' ? text : muted, flex: 1 }}>Unassigned</span>
              <span style={{ fontSize: '10px', color: subtle }}>{boardCounts.__internal || 0}</span>
            </div>
          </>
        )}

        {showArchived && archivedBrands.map(b => (
          <div key={b.id} style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '3px', background: dark ? '#2A2A2A' : '#E0DCD6', color: subtle, fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {initial(b.name)}
            </div>
            <span style={{ fontSize: '13px', color: subtle, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
            <button
              onClick={() => setArchiving({ brand: b, restore: true })}
              style={{ padding: '2px 8px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #5b7c99', color: '#5b7c99', cursor: 'pointer', borderRadius: '1px' }}>Restore</button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `0.5px solid ${border}`, padding: '10px 14px' }}>
        {showNewBrand ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              value={newBrandName}
              onChange={e => setNewBrandName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createBrand(); if (e.key === 'Escape') { setShowNewBrand(false); setError('') } }}
              placeholder='Brand name'
              autoFocus
              style={{ width: '100%', padding: '7px 10px', fontSize: '12px', background: dark ? '#141414' : '#F5F3EF', border: `0.5px solid ${border}`, borderRadius: '1px', color: text, outline: 'none', boxSizing: 'border-box' }}
            />
            <input
              value={newBrandWebsite}
              onChange={e => setNewBrandWebsite(e.target.value)}
              placeholder='Website (optional)'
              style={{ width: '100%', padding: '7px 10px', fontSize: '12px', background: dark ? '#141414' : '#F5F3EF', border: `0.5px solid ${border}`, borderRadius: '1px', color: text, outline: 'none', boxSizing: 'border-box' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${border}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>
              {newBrandLogoFile ? newBrandLogoFile.name.slice(0, 18) + (newBrandLogoFile.name.length > 18 ? '...' : '') : 'Upload logo'}
              <input type='file' accept='image/*' onChange={e => setNewBrandLogoFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            </label>
            {error && <div style={{ fontSize: '10px', color: '#e74c3c' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={createBrand} disabled={saving} style={{ flex: 1, padding: '7px 10px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Add'}
              </button>
              <button onClick={() => { setShowNewBrand(false); setError(''); setNewBrandName(''); setNewBrandWebsite(''); setNewBrandLogoFile(null) }} style={{ padding: '7px 10px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewBrand(true)} style={{ width: '100%', padding: '8px 0', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px dashed ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>
            + New Brand
          </button>
        )}
      </div>
    </div>
  )
}
