import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import BrandDetail from './BrandDetail'
import { useClientLabel, PERSONALIZATION_NEW_UNTIL } from './useClientLabel'

// fullWidth: on mobile the brand list is its own full-screen step (you pick a
// brand, then the board takes the whole screen), so it fills the width instead
// of sitting in a 220px column next to the board.
// Normalize a brand name for comparison: lowercase, punctuation → space,
// collapse spaces. So "Dr. Brown's", "Dr Brown", "dr. browns" all converge.
function normalizeBrand(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}
// Edit distance (for catching near-duplicates like "Dr Brown" vs "Dr Browns").
function editDistance(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}
// Find the closest existing brand to `name`: exact (normalized) match, one name
// containing the other, or a small edit distance. Returns { brand, kind } or null.
function findBrandMatch(name, list) {
  const n = normalizeBrand(name)
  if (n.length < 2) return null
  let best = null
  for (const b of list) {
    const bn = normalizeBrand(b.name)
    if (!bn) continue
    if (bn === n) return { brand: b, kind: 'exact' }
    const d = editDistance(n, bn)
    const contained = (n.includes(bn) && bn.length >= 3) || (bn.includes(n) && n.length >= 3)
    const threshold = Math.max(1, Math.floor(Math.max(n.length, bn.length) * 0.18))
    if (contained || d <= threshold) {
      if (!best || d < best.d) best = { brand: b, kind: 'similar', d }
    }
  }
  return best
}

export default function BrandsSidebar({ dark = true, orgId, selectedBrandId, onSelectBrand, fullWidth = false, isAdmin = false, onOpenSettings }) {
  const bg = dark ? '#0D0D0D' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const border2 = dark ? '#3A3A3A' : '#CCC7BF'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const muted = dark ? '#AAA' : '#666'
  const subtle = dark ? '#666' : '#888'
  const cardHover = dark ? '#1A1A1A' : '#F0EDE7'
  const selectedBg = dark ? '#1A1A1A' : '#ECEAE4'

  const [brands, setBrands] = useState([])
  const [archivedBrands, setArchivedBrands] = useState([])
  const [boardCounts, setBoardCounts] = useState({})
  const [showArchived, setShowArchived] = useState(false)
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandWebsite, setNewBrandWebsite] = useState('')
  const [newBrandLogoFile, setNewBrandLogoFile] = useState(null)
  const [deletingBrand, setDeletingBrand] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [archiving, setArchiving] = useState(null)
  const [hovering, setHovering] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingBrandId, setEditingBrandId] = useState(null)
  const clientLabel = useClientLabel(orgId)

  // One-time nudge for owners/admins: you can now rename this section. Shown
  // until dismissed (per workspace, on this device).
  const nudgeKey = orgId ? `hque_rename_nudge_${orgId}` : null
  const [showRenameNudge, setShowRenameNudge] = useState(false)
  useEffect(() => {
    if (!isAdmin || !nudgeKey) return
    // Only within the two-week launch window, and only if not already dismissed.
    if (Date.now() >= PERSONALIZATION_NEW_UNTIL) return
    try { if (localStorage.getItem(nudgeKey) !== '1') setShowRenameNudge(true) } catch (e) {}
  }, [isAdmin, nudgeKey])
  function dismissNudge() {
    setShowRenameNudge(false)
    try { if (nudgeKey) localStorage.setItem(nudgeKey, '1') } catch (e) {}
  }

  useEffect(() => { if (orgId) { fetchBrands(); fetchBoardCounts() } }, [orgId])
  useEffect(() => { if (orgId) { fetchBoardCounts() } }, [selectedBrandId])

  async function fetchBrands() {
    const [brandsRes, pinsRes] = await Promise.all([
      supabase.from('brands').select('*').eq('org_id', orgId).order('name', { ascending: true }),
      supabase.from('user_brand_pins').select('brand_id, pinned_at')
    ])
    const brandsData = brandsRes.data
    const pinsData = pinsRes.data
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
    // Fetch boards (to map brand_id ↔ board_id) and all non-archived tasks
    const [boardsRes, tasksRes] = await Promise.all([
      supabase.from('boards').select('id, brand_id').eq('org_id', orgId).neq('status', 'archived'),
      supabase.from('tasks').select('board_id').eq('org_id', orgId)
    ])
    const boards = boardsRes.data
    const tasks = tasksRes.data

    // Build a map of board_id → brand_id (null brand_id = unassigned board)
    const boardToBrand = {}
    ;(boards || []).forEach(b => { boardToBrand[b.id] = b.brand_id })

    // Count tasks per brand
    const counts = {}
    let internal = 0
    ;(tasks || []).forEach(t => {
      const brandId = boardToBrand[t.board_id]
      if (brandId) counts[brandId] = (counts[brandId] || 0) + 1
      else if (t.board_id && boardToBrand[t.board_id] === null) internal += 1
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

  // Use the existing brand instead of creating a duplicate — restores it first
  // if it was archived, then selects it and closes the new-brand form.
  function useExistingBrand(brand) {
    setShowNewBrand(false)
    setNewBrandName('')
    setNewBrandWebsite('')
    setNewBrandLogoFile(null)
    setError('')
    if (brand.status === 'archived') archiveBrand(brand, true)
    onSelectBrand?.(brand.id)
  }

  // Permanent delete (archive-only). Requires the typed name to match, and
  // removes the brand plus everything attached to it via the delete_brand RPC.
  async function confirmDeleteBrand() {
    if (!deletingBrand) return
    if (deleteConfirmText.trim().toLowerCase() !== deletingBrand.name.trim().toLowerCase()) return
    setDeleting(true)
    setDeleteError('')
    const { error } = await supabase.rpc('delete_brand', { p_brand_id: deletingBrand.id })
    setDeleting(false)
    if (error) { setDeleteError(error.message || 'Could not delete this brand.'); return }
    if (selectedBrandId === deletingBrand.id) onSelectBrand?.(null)
    setDeletingBrand(null)
    setDeleteConfirmText('')
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
    <div style={{ width: fullWidth ? '100%' : '220px', background: bg, borderRight: fullWidth ? 'none' : `0.5px solid ${border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

      {archiving && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setArchiving(null)}>
          <div style={{ background: dark ? '#141414' : '#FFFFFF', border: `0.5px solid ${border}`, padding: '28px', width: '380px', borderRadius: '2px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: text, marginBottom: '10px' }}>
              {archiving.restore ? `Restore ${clientLabel.singular.toLowerCase()}?` : `Archive ${clientLabel.singular.toLowerCase()}?`}
            </div>
            <div style={{ fontSize: '12px', color: muted, lineHeight: 1.6, marginBottom: '22px' }}>
              {archiving.restore
                ? `"${archiving.brand.name}" will be moved back to your active ${clientLabel.plural.toLowerCase()}.`
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
        <div style={{ position: 'relative' }}>
          <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: subtle, pointerEvents: 'none' }}>
            <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${clientLabel.plural.toLowerCase()}...`}
            onFocus={e => { e.target.style.borderColor = '#5b7c99'; e.target.style.boxShadow = '0 0 0 2px rgba(91,124,153,0.18)' }}
            onBlur={e => { e.target.style.borderColor = border; e.target.style.boxShadow = dark ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.04)' }}
            style={{ width: '100%', padding: '8px 10px 8px 30px', fontSize: '12px', background: dark ? '#1A1A1A' : '#F5F3EF', border: `1px solid ${border}`, borderRadius: '6px', color: text, outline: 'none', boxSizing: 'border-box', boxShadow: dark ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.04)', transition: 'border-color 0.15s, box-shadow 0.15s' }}
          />
        </div>
      </div>

      <div style={{ position: 'relative', padding: '0 14px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ fontSize: '8.5px', letterSpacing: '0.22em', textTransform: 'uppercase', color: muted, fontWeight: 500 }}>
            {showArchived ? `Archived · ${archivedBrands.length}` : `${clientLabel.plural} · ${filtered.length}`}
          </div>
          {!showArchived && isAdmin && onOpenSettings && (
            <button title={`Rename "${clientLabel.plural}"`} onClick={() => { dismissNudge(); onOpenSettings('personalize') }}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', background: 'none', border: `0.5px solid ${border2}`, borderRadius: '3px', color: subtle, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
          )}
        </div>
        {archivedBrands.length > 0 && (
          <button onClick={() => setShowArchived(!showArchived)}
            style={{ background: showArchived ? '#5b7c99' : 'rgba(91,124,153,0.12)', border: 'none', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: showArchived ? '#fff' : '#5b7c99', cursor: 'pointer', padding: '3px 9px', borderRadius: '10px', fontWeight: 600 }}>
            {showArchived ? 'Active' : `+${archivedBrands.length} Archived`}
          </button>
        )}
        {showRenameNudge && !showArchived && (
          <div style={{ position: 'absolute', top: '24px', left: '14px', zIndex: 30, width: '236px', background: dark ? '#141414' : '#FFFFFF', border: '0.5px solid rgba(91,124,153,0.5)', borderRadius: '5px', padding: '11px 12px', boxShadow: '0 6px 18px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' }}>
              <span style={{ fontSize: '7.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', fontWeight: 600 }}>New</span>
              <span onClick={dismissNudge} style={{ cursor: 'pointer', color: subtle, fontSize: '14px', lineHeight: 1 }}>×</span>
            </div>
            <div style={{ fontSize: '11.5px', color: text, lineHeight: 1.5 }}>
              You can now rename this section to fit your team — call it Departments, Teams, whatever works.{' '}
              <span onClick={() => { dismissNudge(); onOpenSettings && onOpenSettings('personalize') }} style={{ color: '#5b7c99', cursor: 'pointer', fontWeight: 600 }}>Rename →</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', borderTop: `0.5px solid ${border}` }}>

        {!showArchived && filtered.length === 0 && !search && (
          <div style={{ padding: '20px 16px', fontSize: '11px', color: subtle, lineHeight: 1.6 }}>
            No {clientLabel.plural.toLowerCase()} yet. Click "+ New {clientLabel.singular}" below to add one.
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
              <img src={b.logo_url} alt={b.name} style={{ width: '34px', height: '34px', objectFit: 'contain', background: '#fff', borderRadius: '3px', padding: '2px', flexShrink: 0, border: `0.5px solid ${border}` }} onError={e => { e.target.style.display = 'none' }} />
            ) : (
              <div style={{ width: '34px', height: '34px', borderRadius: '3px', background: colorFromName(b.name), color: '#fff', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                    <div style={{ position: 'absolute', top: '22px', right: 0, background: dark ? '#141414' : '#FFFFFF', border: `0.5px solid ${border2}`, borderRadius: '2px', zIndex: 20, minWidth: '140px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenuId(null); setEditingBrandId(b.id) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '11px', background: 'none', border: 'none', color: muted, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = cardHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Edit {clientLabel.singular.toLowerCase()}</button>
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenuId(null); setArchiving({ brand: b, restore: false }) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '11px', background: 'none', border: 'none', color: muted, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = cardHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Archive {clientLabel.singular.toLowerCase()}</button>
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
              <div style={{ width: '34px', height: '34px', borderRadius: '3px', background: dark ? '#2A2A2A' : '#E0DCD6', color: muted, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `0.5px solid ${border}` }}>⚙</div>
              <span style={{ fontSize: '13px', color: selectedBrandId === '__internal' ? text : muted, flex: 1 }}>Unassigned</span>
              <span style={{ fontSize: '10px', color: subtle }}>{boardCounts.__internal || 0}</span>
            </div>
          </>
        )}

        {showArchived && archivedBrands.map(b => (
          <div key={b.id} style={{ padding: '10px 14px', borderBottom: `0.5px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              {b.logo_url ? (
                <img src={b.logo_url} alt={b.name} style={{ width: '30px', height: '30px', objectFit: 'contain', background: '#fff', borderRadius: '3px', padding: '2px', flexShrink: 0, border: `0.5px solid ${border}` }} onError={e => { e.target.style.display = 'none' }} />
              ) : (
                <div style={{ width: '30px', height: '30px', borderRadius: '3px', background: dark ? '#2A2A2A' : '#E0DCD6', color: muted, fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {initial(b.name)}
                </div>
              )}
              <span style={{ fontSize: '13px', color: text, flex: 1, minWidth: 0, wordBreak: 'break-word', lineHeight: 1.3 }}>{b.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', paddingLeft: '40px' }}>
              <button
                onClick={() => setArchiving({ brand: b, restore: true })}
                style={{ padding: '4px 12px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #5b7c99', color: '#5b7c99', cursor: 'pointer', borderRadius: '2px' }}>Restore</button>
              <button
                onClick={() => { setDeletingBrand(b); setDeleteConfirmText(''); setDeleteError('') }}
                style={{ padding: '4px 12px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #c0392b', color: '#c0392b', cursor: 'pointer', borderRadius: '2px' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {deletingBrand && (() => {
        const canDelete = deleteConfirmText.trim().toLowerCase() === deletingBrand.name.trim().toLowerCase()
        return (
          <div onClick={e => { if (e.target === e.currentTarget && !deleting) { setDeletingBrand(null); setDeleteConfirmText('') } }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(2px)' }}>
            <div style={{ background: dark ? '#1e1e1e' : '#FFFFFF', border: `0.5px solid ${border}`, borderRadius: '8px', padding: '26px', width: '380px', maxWidth: '100%' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '19px', color: text, marginBottom: '10px' }}>Delete “{deletingBrand.name}” permanently?</div>
              <div style={{ fontSize: '12px', color: muted, lineHeight: 1.65, marginBottom: '18px' }}>
                This permanently removes the brand and <b style={{ color: text }}>everything attached to it</b> — its boards, tasks, contacts, and notes. This cannot be undone.
              </div>
              <div style={{ fontSize: '11px', color: subtle, marginBottom: '6px' }}>Type <b style={{ color: text }}>{deletingBrand.name}</b> to confirm:</div>
              <input value={deleteConfirmText} autoFocus onChange={e => setDeleteConfirmText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canDelete) confirmDeleteBrand(); if (e.key === 'Escape' && !deleting) { setDeletingBrand(null); setDeleteConfirmText('') } }}
                placeholder={deletingBrand.name}
                style={{ width: '100%', padding: '9px 11px', fontSize: '13px', background: dark ? '#141414' : '#F5F3EF', border: `0.5px solid ${border}`, borderRadius: '3px', color: text, outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }} />
              {deleteError && <div style={{ fontSize: '11px', color: '#c0392b', marginBottom: '12px', lineHeight: 1.5 }}>{deleteError}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={confirmDeleteBrand} disabled={!canDelete || deleting}
                  style={{ flex: 1, padding: '10px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#c0392b', border: 'none', color: '#fff', cursor: canDelete && !deleting ? 'pointer' : 'default', borderRadius: '3px', opacity: canDelete && !deleting ? 1 : 0.4 }}>
                  {deleting ? 'Deleting…' : 'Delete permanently'}
                </button>
                <button onClick={() => { if (!deleting) { setDeletingBrand(null); setDeleteConfirmText('') } }}
                  style={{ padding: '10px 16px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '3px' }}>Cancel</button>
              </div>
            </div>
          </div>
        )
      })()}

      <div style={{ borderTop: `0.5px solid ${border}`, padding: '10px 14px' }}>
        {showNewBrand ? (() => {
          const dupMatch = newBrandName.trim() ? findBrandMatch(newBrandName, brands.concat(archivedBrands)) : null
          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              value={newBrandName}
              onChange={e => setNewBrandName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createBrand(); if (e.key === 'Escape') { setShowNewBrand(false); setError('') } }}
              placeholder={`${clientLabel.singular} name`}
              autoFocus
              style={{ width: '100%', padding: '7px 10px', fontSize: '12px', background: dark ? '#141414' : '#F5F3EF', border: `0.5px solid ${border}`, borderRadius: '1px', color: text, outline: 'none', boxSizing: 'border-box' }}
            />
            {dupMatch && (
              <div style={{ fontSize: '11px', color: text, background: dark ? 'rgba(184,121,27,0.14)' : '#FBF3E4', border: `0.5px solid ${dark ? '#5a4a2a' : '#EAD9B8'}`, borderRadius: '3px', padding: '8px 10px', lineHeight: 1.5 }}>
                <div style={{ marginBottom: '7px' }}>
                  {dupMatch.kind === 'exact' ? 'This brand already exists: ' : 'Possible duplicate of: '}
                  <b>{dupMatch.brand.name}</b>{dupMatch.brand.status === 'archived' ? <span style={{ color: muted }}> · archived</span> : ''}
                </div>
                <button onClick={() => useExistingBrand(dupMatch.brand)} style={{ padding: '5px 10px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
                  {dupMatch.brand.status === 'archived' ? 'Restore & open' : 'Open it'}
                </button>
              </div>
            )}
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
                {saving ? 'Saving...' : (dupMatch ? 'Add anyway' : 'Add')}
              </button>
              <button onClick={() => { setShowNewBrand(false); setError(''); setNewBrandName(''); setNewBrandWebsite(''); setNewBrandLogoFile(null) }} style={{ padding: '7px 10px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
            </div>
          </div>
          )
        })() : (
          <button onClick={() => setShowNewBrand(true)} style={{ width: '100%', padding: '8px 0', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px dashed ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>
            + New {clientLabel.singular}
          </button>
        )}
      </div>

      {editingBrandId && (
        <BrandDetail
          brandId={editingBrandId}
          dark={dark}
          clientLabel={clientLabel}
          onClose={() => setEditingBrandId(null)}
          onSaved={() => { fetchBrands(); fetchBoardCounts() }}
        />
      )}
    </div>
  )
}
