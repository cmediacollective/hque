import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import CampaignForm from './CampaignForm'
import CampaignDetail from './CampaignDetail'

const BRAND_COLORS = ['#5b7c99', '#7A9B8E', '#A67C52', '#9B7A9B', '#8E7A5B', '#4A6B7A', '#7A5B6B', '#6B7A4A']
const brandColor = (name) => {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length]
}
const brandInitial = (name) => (name || '?').trim().charAt(0).toUpperCase()

const BOARD_COLUMNS = [
  { key: 'Pitch', label: 'Pitch' },
  { key: 'Active', label: 'Active' },
  { key: 'Pending Payment', label: 'Pending Payment' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Cancelled', label: 'Cancelled' },
  { key: '__archived', label: 'Archived' }
]

export default function CampaignView({ dark = true, orgId, campaignView = 'grid', openCampaignId, onOpenCampaignHandled }) {
  const isMobile = window.innerWidth < 768;
  const view = campaignView
  const bg = dark ? '#1A1A1A' : '#F8F7F3'
  const card = dark ? '#1A1A1A' : '#FFFFFF'
  const cardHover = dark ? '#222' : '#F0EDE8'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const border2 = dark ? '#444' : '#CCC7BF'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const gridBg = dark ? '#2A2A2A' : '#DBD7D0'
  // Raised brand cards in the grid: a card surface lifted off the page, plus shadow.
  const cardBg = dark ? '#212121' : '#FFFFFF'
  const cardShadow = dark ? '0 1px 3px rgba(0,0,0,0.45)' : '0 1px 2px rgba(0,0,0,0.04), 0 3px 10px rgba(0,0,0,0.07)'
  const cardShadowHover = dark ? '0 8px 22px rgba(0,0,0,0.6)' : '0 4px 8px rgba(0,0,0,0.07), 0 12px 26px rgba(0,0,0,0.11)'

  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [hovering, setHovering] = useState(null)
  const [creatorCounts, setCreatorCounts] = useState({})
  const [contactMap, setContactMap] = useState({})
  const [search, setSearch] = useState('')
  const [archiving, setArchiving] = useState(null)
  const [members, setMembers] = useState([])
  const [dragging, setDragging] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [archivedExpanded, setArchivedExpanded] = useState(false)
  const [hoveringCard, setHoveringCard] = useState(null)

  useEffect(() => { fetchCampaigns() }, [orgId, view])

  useEffect(() => {
    if (!orgId) return
    supabase.from('profiles').select('id, email, full_name, avatar_url').eq('org_id', orgId).then(({ data }) => setMembers(data || []))
  }, [orgId])

  // Open a campaign passed in via deep link (?campaign=<id>)
  useEffect(() => {
    if (!openCampaignId || !orgId) return
    let cancelled = false
    supabase.from('campaigns').select('*').eq('id', openCampaignId).eq('org_id', orgId).maybeSingle().then(({ data }) => {
      if (cancelled) return
      if (data) setSelected(data)
      onOpenCampaignHandled && onOpenCampaignHandled()
    })
    return () => { cancelled = true }
  }, [openCampaignId, orgId])

  async function fetchCampaigns() {
    setLoading(true)
    let q = supabase.from('campaigns').select('*').eq('org_id', orgId)
    if (view === 'archived') q = q.eq('archived', true)
    else if (view !== 'board') q = q.eq('archived', false)
    const { data } = await q.order('created_at', { ascending: false })
    setCampaigns(data || [])
    if (data?.length) {
      fetchCreatorCounts(data.map(c => c.id))
      fetchContacts(data)
    }
    setSelected(sel => sel ? (data || []).find(d => d.id === sel.id) || sel : null)
    setLoading(false)
  }

  const [campaignTalent, setCampaignTalent] = useState({})

  async function fetchCreatorCounts(ids) {
    const { data } = await supabase.from('campaign_creators').select('campaign_id, creator_id').in('campaign_id', ids)
    const counts = {}
    const byCampaign = {}
    const creatorIds = new Set()
    ;(data || []).forEach(r => {
      counts[r.campaign_id] = (counts[r.campaign_id] || 0) + 1
      if (!byCampaign[r.campaign_id]) byCampaign[r.campaign_id] = []
      byCampaign[r.campaign_id].push(r.creator_id)
      creatorIds.add(r.creator_id)
    })
    setCreatorCounts(counts)

    if (creatorIds.size > 0) {
      const { data: creators } = await supabase.from('creators').select('id, name, photo_url').in('id', Array.from(creatorIds))
      const creatorMap = {}
      ;(creators || []).forEach(c => { creatorMap[c.id] = c })
      const perCampaign = {}
      Object.entries(byCampaign).forEach(([cid, cids]) => {
        perCampaign[cid] = cids.map(id => creatorMap[id]).filter(Boolean)
      })
      setCampaignTalent(perCampaign)
    }
  }

  async function fetchContacts(campaignRows) {
    const ids = [...new Set(campaignRows.map(c => c.contact_id).filter(Boolean))]
    if (ids.length === 0) { setContactMap({}); return }
    const { data } = await supabase.from('brand_contacts').select('id, name, title, email').in('id', ids)
    const m = {}
    ;(data || []).forEach(c => { m[c.id] = c })
    setContactMap(m)
  }

  async function deleteLinkedTasks(campaignId) {
    try { await supabase.from('tasks').delete().eq('campaign_id', campaignId) } catch (_) {}
  }

  async function archiveCampaign(campaign, restore = false) {
    await supabase.from('campaigns').update({ archived: !restore }).eq('id', campaign.id)
    if (!restore) await deleteLinkedTasks(campaign.id)
    setArchiving(null)
    fetchCampaigns()
  }

  async function updateCampaignField(id, field, value) {
    setCampaigns(cs => cs.map(c => c.id === id ? { ...c, [field]: value } : c))
    const { error } = await supabase.from('campaigns').update({ [field]: value }).eq('id', id)
    if (error) {
      alert(`Could not update: ${error.message}`)
      fetchCampaigns()
    }
  }

  async function moveToColumn(campaignId, columnKey) {
    const c = campaigns.find(x => x.id === campaignId)
    if (!c) return
    if (columnKey === '__archived') {
      if (c.archived) return
      setCampaigns(cs => cs.map(x => x.id === campaignId ? { ...x, archived: true } : x))
      const { error } = await supabase.from('campaigns').update({ archived: true }).eq('id', campaignId)
      if (error) { alert(`Could not archive: ${error.message}`); fetchCampaigns(); return }
      await deleteLinkedTasks(campaignId)
      return
    }
    const updates = { status: columnKey }
    if (c.archived) updates.archived = false
    setCampaigns(cs => cs.map(x => x.id === campaignId ? { ...x, ...updates } : x))
    const { error } = await supabase.from('campaigns').update(updates).eq('id', campaignId)
    if (error) { alert(`Could not move: ${error.message}`); fetchCampaigns() }
  }

  const filtered = campaigns
    .filter(c => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return c.name?.toLowerCase().includes(q) || c.brand?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const aBrand = (a.brand || '').trim().toLowerCase()
      const bBrand = (b.brand || '').trim().toLowerCase()
      if (!aBrand && bBrand) return 1
      if (aBrand && !bBrand) return -1
      if (aBrand !== bBrand) return aBrand.localeCompare(bBrand)
      const ad = a.start_date || a.created_at || ''
      const bd = b.start_date || b.created_at || ''
      if (ad !== bd) return bd.localeCompare(ad)
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
    })

  // Group the filtered campaigns by brand for the sectioned layout.
  const brandGroups = []
  filtered.forEach(c => {
    const key = (c.brand || '').trim().toLowerCase()
    let g = brandGroups.find(x => x.key === key)
    if (!g) { g = { key, name: c.brand || 'No brand / Internal', logo: null, website: null, campaigns: [], count: 0, budget: 0 }; brandGroups.push(g) }
    g.campaigns.push(c)
    g.count++
    g.budget += Number(c.budget) || 0
    if (!g.logo && c.brand_logo_url) g.logo = c.brand_logo_url
    if (!g.website && c.brand_website) g.website = c.brand_website
  })

  const statusColor = (s) => s === 'Active' ? '#5b7c99' : s === 'Completed' ? '#5C9E52' : s === 'Pending Payment' ? '#C4962E' : s === 'Contract Pending' ? '#A67C52' : s === 'Dead' ? '#5A5A5A' : '#888'
  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {showForm && (
        <CampaignForm
          orgId={orgId}
          dark={dark}
          existing={null}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchCampaigns() }}
        />
      )}

      {selected && (
        <CampaignDetail
          campaign={selected}
          dark={!dark}
          orgId={orgId}
          members={members}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); fetchCampaigns() }}
        />
      )}

      {archiving && (
        <div onClick={() => setArchiving(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: dark ? '#141414' : '#FFFFFF', border: `0.5px solid ${border}`, padding: '32px', maxWidth: '400px', width: '100%', borderRadius: '2px' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: text, marginBottom: '12px' }}>
              {archiving.archived ? 'Restore campaign?' : 'Archive campaign?'}
            </div>
            <div style={{ fontSize: '13px', color: muted, lineHeight: 1.6, marginBottom: '24px' }}>
              {archiving.archived
                ? `"${archiving.name}" will be moved back to your active campaigns.`
                : `"${archiving.name}" will be hidden from your active campaigns. Any workspace tasks linked to it will be removed. You can restore it anytime.`}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => archiveCampaign(archiving, archiving.archived)} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
                {archiving.archived ? 'Restore' : 'Archive'}
              </button>
              <button onClick={() => setArchiving(null)} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '12px 28px', display: 'flex', gap: '6px', alignItems: 'center', borderBottom: `0.5px solid ${border}`, background: bg, flexShrink: 0 }}>
        <span style={{ marginRight: 'auto', fontSize: '9px', color: subtle, letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
          {filtered.length} {filtered.length === 1 ? 'campaign' : 'campaigns'}
        </span>
        {view !== 'archived' && (
          <button onClick={() => setShowForm(true)} style={{ padding: '8px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', boxShadow: '0 2px 8px rgba(91,124,153,0.45)' }}>+ Campaign</button>
        )}
      </div>

      <div style={{ padding: '8px 28px', borderBottom: `0.5px solid ${border}`, background: bg, flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Search by campaign name or brand...'
          style={{ width: '100%', background: dark ? '#141414' : '#F0EDE8', border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '7px 12px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {loading && (
        <div style={{ padding: '40px 28px', color: subtle, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>
            {search ? 'No results' : view === 'archived' ? 'No archived campaigns' : 'No campaigns yet'}
          </div>
          <div style={{ fontSize: '12px', color: muted }}>
            {search ? `Nothing matched "${search}"` : view === 'archived' ? 'Campaigns you archive will appear here.' : 'Click + Campaign to create your first one'}
          </div>
        </div>
      )}

      {!loading && (view === 'grid' || view === 'archived' || isMobile) && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: isMobile ? '12px' : '16px', flex: 1, overflowY: 'auto', alignContent: 'start', padding: isMobile ? '14px 14px 100px' : '20px 20px 100px' }}>
          {brandGroups.map(group => (
            <div key={group.key}
              onClick={() => setSelected(group.campaigns[0])}
              onMouseEnter={() => setHoveringCard(group.key)}
              onMouseLeave={() => setHoveringCard(null)}
              style={{ background: cardBg, padding: isMobile ? '16px' : '20px', borderRadius: '6px', border: `0.5px solid ${border}`, boxShadow: hoveringCard === group.key ? cardShadowHover : cardShadow, transform: hoveringCard === group.key ? 'translateY(-2px)' : 'none', transition: 'box-shadow 0.16s ease, transform 0.16s ease', cursor: 'pointer' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                {(() => {
                  const href = group.website ? (group.website.startsWith('http') ? group.website : 'https://' + group.website) : null
                  const logoEl = group.logo
                    ? <img src={group.logo} alt={group.name} style={{ width: '52px', height: '52px', objectFit: 'contain', borderRadius: '2px', border: `0.5px solid ${border}`, background: '#fff', padding: '4px', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                    : <div style={{ width: '52px', height: '52px', borderRadius: '2px', background: brandColor(group.name), color: '#fff', fontFamily: 'Georgia, serif', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{brandInitial(group.name)}</div>
                  const nameEl = <div style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: text, lineHeight: 1.25 }}>{group.name}</div>
                  if (!href) {
                    return (
                      <>
                        {logoEl}
                        <div style={{ minWidth: 0 }}>
                          {nameEl}
                          <div style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: subtle, marginTop: '4px' }}>
                            {group.count} {group.count === 1 ? 'campaign' : 'campaigns'}{group.budget > 0 ? ` · $${group.budget.toLocaleString()}` : ''}
                          </div>
                        </div>
                      </>
                    )
                  }
                  return (
                    <>
                      <a href={href} target='_blank' rel='noreferrer' title={`Visit ${group.name} website`} onClick={e => e.stopPropagation()} style={{ display: 'flex', flexShrink: 0, textDecoration: 'none' }}>{logoEl}</a>
                      <div style={{ minWidth: 0 }}>
                        <a href={href} target='_blank' rel='noreferrer' title={`Visit ${group.name} website`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}>{nameEl}</a>
                        <div style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: subtle, marginTop: '4px' }}>
                          {group.count} {group.count === 1 ? 'campaign' : 'campaigns'}{group.budget > 0 ? ` · $${group.budget.toLocaleString()}` : ''}
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>

              <div>
                {group.campaigns.map((c, idx) => (
                  <div key={c.id}
                    onClick={e => { e.stopPropagation(); setSelected(c) }}
                    onMouseEnter={() => setHovering(c.id)}
                    onMouseLeave={() => setHovering(null)}
                    style={{ padding: '10px 4px', borderTop: idx === 0 ? 'none' : `0.5px solid ${border}`, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: text, lineHeight: 1.3, textDecoration: c.archived ? 'line-through' : 'none', opacity: c.archived ? 0.6 : 1 }}>{c.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px 12px', flexWrap: 'wrap', marginTop: '6px' }}>
                          <select
                            value={c.campaign_type || 'Paid'}
                            onChange={e => { e.stopPropagation(); updateCampaignField(c.id, 'campaign_type', e.target.value) }}
                            onClick={e => e.stopPropagation()}
                            title='Campaign type'
                            style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', background: 'none', border: 'none', outline: 'none', cursor: 'pointer', padding: '0 14px 0 0', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%235b7c99' stroke-width='3' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}>
                            {['Paid', 'Non-paid', 'Gifting', 'Seeding', 'Media'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <select
                            value={c.status || 'Pitch'}
                            onChange={e => { e.stopPropagation(); updateCampaignField(c.id, 'status', e.target.value) }}
                            onClick={e => e.stopPropagation()}
                            title='Status'
                            style={{ padding: '2px 18px 2px 8px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', border: `0.5px solid ${statusColor(c.status)}`, color: statusColor(c.status), borderRadius: '1px', background: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(statusColor(c.status))}' stroke-width='3' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 5px center' }}>
                            {['Pitch', 'Contract Pending', 'Active', 'Pending Payment', 'Completed', 'Cancelled', 'Dead'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {c.budget != null && <span style={{ fontSize: '11px', color: text, fontWeight: 500 }}>${Number(c.budget).toLocaleString()}</span>}
                          {(c.start_date || c.end_date) && <span style={{ fontSize: '11px', color: muted }}>{[formatDate(c.start_date), formatDate(c.end_date)].filter(Boolean).join(' – ')}</span>}
                          {c.contact_id && contactMap[c.contact_id] && <span style={{ fontSize: '11px', color: muted }}>{contactMap[c.contact_id].name || contactMap[c.contact_id].email}</span>}
                          {c.brief_url && <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: subtle, border: `0.5px solid ${border}`, padding: '2px 6px', borderRadius: '1px' }}>Brief</span>}
                          {c.contract_url && <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: subtle, border: `0.5px solid ${border}`, padding: '2px 6px', borderRadius: '1px' }}>Contract</span>}
                        </div>
                      </div>
                      {(campaignTalent[c.id] || []).length > 0 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                          {(campaignTalent[c.id] || []).slice(0, 3).map((t, i) => (
                            <div key={t.id} title={t.name} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }}>
                              {t.photo_url
                                ? <img src={t.photo_url} alt={t.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${cardBg}`, display: 'block' }} />
                                : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#5b7c99', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, border: `2px solid ${cardBg}` }}>{(t.name || '?').charAt(0).toUpperCase()}</div>
                              }
                            </div>
                          ))}
                          {campaignTalent[c.id].length > 3 && (
                            <div style={{ marginLeft: -8, width: '28px', height: '28px', borderRadius: '50%', background: dark ? '#333' : '#E0DCD6', color: muted, fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, border: `2px solid ${cardBg}` }}>+{campaignTalent[c.id].length - 3}</div>
                          )}
                        </div>
                      )}
                      {hovering === c.id && (
                        <button onClick={e => { e.stopPropagation(); setArchiving(c) }} style={{ flexShrink: 0, padding: '3px 8px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>
                          {c.archived ? 'Restore' : 'Archive'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      )}

      {!loading && view === 'list' && !isMobile && filtered.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 2fr 1fr 120px 120px 140px 120px 80px', padding: '10px 28px', borderBottom: `0.5px solid ${border}`, position: 'sticky', top: 0, background: bg, zIndex: 1, gap: '10px' }}>
            {['', 'Campaign', 'Brand', 'Type', 'Status', 'Dates', 'Talent', 'Budget'].map((h, i) => (
              <div key={i} style={{ fontSize: '8px', color: subtle, letterSpacing: '0.22em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {filtered.map(c => (
            <div key={c.id}
              onClick={() => setSelected(c)}
              onMouseEnter={() => setHovering(c.id)}
              onMouseLeave={() => setHovering(null)}
              style={{ display: 'grid', gridTemplateColumns: '48px 2fr 1fr 120px 120px 140px 120px 80px', padding: '12px 28px', borderBottom: `0.5px solid ${border}`, cursor: 'pointer', alignItems: 'center', background: hovering === c.id ? cardHover : 'transparent', gap: '10px' }}>

              {c.brand_logo_url
                ? <img src={c.brand_logo_url} alt={c.brand} style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '2px', border: `0.5px solid ${border}`, background: '#fff', padding: '3px' }} onError={e => e.target.style.display = 'none'} />
                : <div style={{ width: '32px', height: '32px', borderRadius: '2px', background: brandColor(c.brand || c.name || '?'), color: '#fff', fontFamily: 'Georgia, serif', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{brandInitial(c.brand || c.name || '?')}</div>
              }

              <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: c.archived ? 'line-through' : 'none', opacity: c.archived ? 0.6 : 1 }}>{c.name}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.brand || '—'}</div>
                {c.contact_id && contactMap[c.contact_id] && (
                  <div style={{ fontSize: '9px', color: subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{contactMap[c.contact_id].name || contactMap[c.contact_id].email}</div>
                )}
              </div>

              <select
                value={c.campaign_type || 'Paid'}
                onChange={e => { e.stopPropagation(); updateCampaignField(c.id, 'campaign_type', e.target.value) }}
                onClick={e => e.stopPropagation()}
                style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', background: 'none', border: 'none', outline: 'none', cursor: 'pointer', padding: '0 14px 0 0', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%235b7c99' stroke-width='3' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', width: 'fit-content' }}>
                {['Paid', 'Non-paid', 'Gifting', 'Seeding', 'Media'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <select
                value={c.status || 'Pitch'}
                onChange={e => { e.stopPropagation(); updateCampaignField(c.id, 'status', e.target.value) }}
                onClick={e => e.stopPropagation()}
                style={{ padding: '3px 16px 3px 8px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${statusColor(c.status)}`, color: statusColor(c.status), borderRadius: '1px', background: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(statusColor(c.status))}' stroke-width='3' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', width: 'fit-content' }}>
                {['Pitch', 'Contract Pending', 'Active', 'Pending Payment', 'Completed', 'Cancelled', 'Dead'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <div style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(c.start_date || c.end_date) ? [formatDate(c.start_date), formatDate(c.end_date)].filter(Boolean).join(' – ') : '—'}
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                {(campaignTalent[c.id] || []).slice(0, 3).map((t, i) => (
                  <div key={t.id} title={t.name} style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 3 - i }}>
                    {t.photo_url ? (
                      <img src={t.photo_url} alt={t.name} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${bg}` }} />
                    ) : (
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#5b7c99', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, border: `2px solid ${bg}` }}>
                        {(t.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
                {(campaignTalent[c.id] || []).length > 3 && (
                  <div style={{ marginLeft: -6, width: '22px', height: '22px', borderRadius: '50%', background: dark ? '#333' : '#E0DCD6', color: muted, fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, border: `2px solid ${bg}` }}>
                    +{campaignTalent[c.id].length - 3}
                  </div>
                )}
                {(campaignTalent[c.id] || []).length === 0 && <span style={{ fontSize: '11px', color: subtle }}>—</span>}
              </div>

              <div style={{ fontSize: '12px', color: text, fontWeight: 500 }}>{c.budget != null ? `$${Number(c.budget).toLocaleString()}` : '—'}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && view === 'board' && !isMobile && (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px 100px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          {BOARD_COLUMNS.map(col => {
            const isArchivedCol = col.key === '__archived'
            const colCampaigns = isArchivedCol
              ? filtered.filter(c => c.archived)
              : filtered.filter(c => !c.archived && (c.status || 'Pitch') === col.key)
            const collapsed = isArchivedCol && !archivedExpanded
            const colWidth = collapsed ? 56 : 280
            const isOver = dragOverCol === col.key
            return (
              <div key={col.key}
                onDragOver={e => { e.preventDefault(); setDragOverCol(col.key) }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={e => { e.preventDefault(); if (dragging) moveToColumn(dragging, col.key); setDragging(null); setDragOverCol(null) }}
                style={{ width: colWidth, flexShrink: 0, background: isOver ? (dark ? '#1f2a35' : '#EEF3F7') : (dark ? '#141414' : '#EFEBE3'), border: `0.5px solid ${isOver ? '#5b7c99' : border}`, borderRadius: '2px', padding: collapsed ? '12px 8px' : '12px', minHeight: '200px', maxHeight: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', transition: 'width 0.2s' }}>
                <div onClick={isArchivedCol ? () => setArchivedExpanded(e => !e) : undefined}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsed ? 0 : '10px', cursor: isArchivedCol ? 'pointer' : 'default', writingMode: collapsed ? 'vertical-rl' : 'horizontal-tb', transform: collapsed ? 'rotate(180deg)' : 'none' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {col.label}
                    <span style={{ fontSize: '9px', color: subtle, fontWeight: 400 }}>{colCampaigns.length}</span>
                  </div>
                  {isArchivedCol && !collapsed && (
                    <button onClick={e => { e.stopPropagation(); setArchivedExpanded(false) }} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}>×</button>
                  )}
                </div>
                {!collapsed && (
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {colCampaigns.length === 0 && (
                      <div style={{ fontSize: '10px', color: subtle, padding: '12px 4px', fontStyle: 'italic' }}>{isArchivedCol ? 'Nothing archived.' : 'Drop a campaign here.'}</div>
                    )}
                    {colCampaigns.map(c => (
                      <div key={c.id}
                        draggable
                        onDragStart={() => setDragging(c.id)}
                        onDragEnd={() => { setDragging(null); setDragOverCol(null) }}
                        onClick={() => setSelected(c)}
                        style={{ background: dark ? '#1A1A1A' : '#FFFFFF', border: `0.5px solid ${border}`, borderRadius: '2px', padding: '10px', cursor: 'pointer', opacity: dragging === c.id ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          {c.brand_logo_url
                            ? <img src={c.brand_logo_url} alt={c.brand} style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '2px', border: `0.5px solid ${border}`, background: '#fff', padding: '3px', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                            : <div style={{ width: '32px', height: '32px', borderRadius: '2px', background: brandColor(c.brand || c.name || '?'), color: '#fff', fontFamily: 'Georgia, serif', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{brandInitial(c.brand || c.name || '?')}</div>
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: text, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '3px', textDecoration: c.archived ? 'line-through' : 'none', opacity: c.archived ? 0.6 : 1 }}>{c.name}</div>
                            <div style={{ fontSize: '10px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.brand || 'No brand'}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', justifyContent: 'space-between' }}>
                          {c.campaign_type && <span style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99' }}>{c.campaign_type}</span>}
                          {(campaignTalent[c.id] || []).length > 0 && (
                            <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                              {(campaignTalent[c.id] || []).slice(0, 3).map((t, i) => (
                                <div key={t.id} title={t.name} style={{ marginLeft: i === 0 ? 0 : -5, zIndex: 3 - i }}>
                                  {t.photo_url
                                    ? <img src={t.photo_url} alt={t.name} style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${dark ? '#1A1A1A' : '#FFFFFF'}` }} />
                                    : <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#5b7c99', color: '#fff', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, border: `1.5px solid ${dark ? '#1A1A1A' : '#FFFFFF'}` }}>{(t.name || '?').charAt(0).toUpperCase()}</div>
                                  }
                                </div>
                              ))}
                              {(campaignTalent[c.id] || []).length > 3 && (
                                <div style={{ marginLeft: -5, fontSize: '8px', color: subtle, paddingLeft: '6px' }}>+{(campaignTalent[c.id] || []).length - 3}</div>
                              )}
                            </div>
                          )}
                          {c.budget != null && <div style={{ fontSize: '10px', color: text, fontWeight: 500, marginLeft: 'auto' }}>${Number(c.budget).toLocaleString()}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
