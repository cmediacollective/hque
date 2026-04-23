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

export default function CampaignView({ dark = true, orgId, campaignView = 'grid' }) {
  const isMobile = window.innerWidth < 768;
  const view = campaignView
  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const card = dark ? '#1A1A1A' : '#FFFFFF'
  const cardHover = dark ? '#222' : '#F0EDE8'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#444' : '#C4BFB8'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const gridBg = dark ? '#2A2A2A' : '#D4CFC8'

  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [hovering, setHovering] = useState(null)
  const [creatorCounts, setCreatorCounts] = useState({})
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [archiving, setArchiving] = useState(null)

  useEffect(() => { fetchCampaigns() }, [showArchived, orgId])

  async function fetchCampaigns() {
    setLoading(true)
    const { data } = await supabase.from('campaigns')
      .select('*')
      .eq('org_id', orgId)
      .eq('archived', showArchived)
      .order('created_at', { ascending: false })
    setCampaigns(data || [])
    if (data?.length) fetchCreatorCounts(data.map(c => c.id))
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

  async function archiveCampaign(campaign, restore = false) {
    await supabase.from('campaigns').update({ archived: !restore }).eq('id', campaign.id)
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
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
    })

  const statusColor = (s) => s === 'Active' ? '#5b7c99' : s === 'Completed' ? '#5C9E52' : s === 'Pending Payment' ? '#C4962E' : '#888'
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
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); fetchCampaigns() }}
        />
      )}

      {archiving && (
        <div onClick={() => setArchiving(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: dark ? '#141414' : '#FFFFFF', border: `0.5px solid ${border}`, padding: '32px', maxWidth: '400px', width: '100%', borderRadius: '2px' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: text, marginBottom: '12px' }}>
              {showArchived ? 'Restore campaign?' : 'Archive campaign?'}
            </div>
            <div style={{ fontSize: '13px', color: muted, lineHeight: 1.6, marginBottom: '24px' }}>
              {showArchived
                ? `"${archiving.name}" will be moved back to your active campaigns.`
                : `"${archiving.name}" will be hidden from your active campaigns. You can restore it anytime.`}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => archiveCampaign(archiving, showArchived)} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
                {showArchived ? 'Restore' : 'Archive'}
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
        <button
          onClick={() => { setShowArchived(a => !a); setSearch('') }}
          style={{ padding: '4px 12px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${showArchived ? '#5b7c99' : border2}`, borderRadius: '1px', cursor: 'pointer', color: showArchived ? '#5b7c99' : muted, background: 'none', whiteSpace: 'nowrap' }}>
          {showArchived ? '← Active' : 'Archived'}
        </button>
        {!showArchived && <button onClick={() => setShowForm(true)} style={{ padding: '4px 14px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>+ Campaign</button>}
      </div>

      <div style={{ padding: '8px 28px', borderBottom: `0.5px solid ${border}`, background: bg, flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={showArchived ? 'Search archived campaigns...' : 'Search by campaign name or brand...'}
          style={{ width: '100%', background: dark ? '#141414' : '#F0EDE8', border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '7px 12px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {loading && (
        <div style={{ padding: '40px 28px', color: subtle, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>
            {search ? 'No results' : showArchived ? 'No archived campaigns' : 'No campaigns yet'}
          </div>
          <div style={{ fontSize: '12px', color: muted }}>
            {search ? `Nothing matched "${search}"` : showArchived ? 'Archived campaigns will appear here' : 'Click + Campaign to create your first one'}
          </div>
        </div>
      )}

      {!loading && (view === 'grid' || isMobile) && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1px', background: gridBg, flex: 1, overflowY: 'auto', alignContent: 'start', paddingBottom: '100px' }}>
          {filtered.map(c => (
            <div key={c.id}
              style={{ background: hovering === c.id ? cardHover : card, padding: isMobile ? '14px' : '24px', cursor: 'pointer', position: 'relative' }}
              onMouseEnter={() => setHovering(c.id)}
              onMouseLeave={() => setHovering(null)}
              onClick={() => setSelected(c)}>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
                {c.brand_logo_url
                  ? <img src={c.brand_logo_url} alt={c.brand} style={{ width: '96px', height: '96px', objectFit: 'contain', borderRadius: '2px', border: `0.5px solid ${border}`, background: '#fff', padding: '6px', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ width: '96px', height: '96px', borderRadius: '2px', background: brandColor(c.brand || c.name || '?'), color: '#fff', fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{brandInitial(c.brand || c.name || '?')}</div>
                }
                <div style={{ flex: 1, minWidth: 0, paddingTop: '4px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <select
                      value={c.campaign_type || 'Paid'}
                      onChange={e => { e.stopPropagation(); updateCampaignField(c.id, 'campaign_type', e.target.value) }}
                      onClick={e => e.stopPropagation()}
                      title='Campaign type'
                      style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', background: 'none', border: 'none', outline: 'none', cursor: 'pointer', padding: '0 14px 0 0', flex: 1, minWidth: 0, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%235b7c99' stroke-width='3' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}>
                      {['Paid', 'Non-paid', 'Gifting', 'Seeding'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                      value={c.status || 'Pitch'}
                      onChange={e => { e.stopPropagation(); updateCampaignField(c.id, 'status', e.target.value) }}
                      onClick={e => e.stopPropagation()}
                      title='Status'
                      style={{ padding: '2px 18px 2px 8px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', border: `0.5px solid ${statusColor(c.status)}`, color: statusColor(c.status), borderRadius: '1px', flexShrink: 0, background: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(statusColor(c.status))}' stroke-width='3' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 5px center' }}>
                      {['Pitch', 'Active', 'Pending Payment', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '15px' : '16px', color: text, marginBottom: '3px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: muted, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {c.brand || 'No brand'}
                    {c.brand_website && (
                      <a href={c.brand_website.startsWith('http') ? c.brand_website : 'https://' + c.brand_website} target="_blank" rel="noreferrer" style={{ fontSize: '9px', color: '#5b7c99', opacity: 0.7, textDecoration: 'none' }} title={c.brand_website} onClick={e => e.stopPropagation()}>↗</a>
                    )}
                  </div>
                  {hovering === c.id && (
                    <button
                      onClick={e => { e.stopPropagation(); setArchiving(c) }}
                      style={{ padding: '2px 8px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px', alignSelf: 'flex-start', marginTop: 'auto' }}>
                      {showArchived ? 'Restore' : 'Archive'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', paddingTop: '14px', borderTop: `0.5px solid ${border}`, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  {c.budget != null && (
                    <div>
                      <div style={{ fontSize: '13px', color: text, fontWeight: 500 }}>${Number(c.budget).toLocaleString()}</div>
                      <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>Budget</div>
                    </div>
                  )}
                  {(c.start_date || c.end_date) && (
                    <div>
                      <div style={{ fontSize: '12px', color: muted }}>{[formatDate(c.start_date), formatDate(c.end_date)].filter(Boolean).join(' – ')}</div>
                      <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>Dates</div>
                    </div>
                  )}
                </div>

                {(campaignTalent[c.id] || []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {(campaignTalent[c.id] || []).slice(0, 4).map((t, i) => (
                        <div key={t.id} title={t.name} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i }}>
                          {t.photo_url ? (
                            <img src={t.photo_url} alt={t.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${card}`, display: 'block' }} />
                          ) : (
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#5b7c99', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, border: `2px solid ${card}` }}>
                              {(t.name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      ))}
                      {campaignTalent[c.id].length > 4 && (
                        <div style={{ marginLeft: -8, width: '28px', height: '28px', borderRadius: '50%', background: dark ? '#333' : '#E0DCD6', color: muted, fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, border: `2px solid ${card}` }}>
                          +{campaignTalent[c.id].length - 4}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                      {campaignTalent[c.id].length} Talent
                    </div>
                  </div>
                )}
              </div>

              {(c.brief_url || c.contract_url) && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                  {c.brief_url && <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: subtle, border: `0.5px solid ${border}`, padding: '2px 6px', borderRadius: '1px' }}>Brief</span>}
                  {c.contract_url && <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: subtle, border: `0.5px solid ${border}`, padding: '2px 6px', borderRadius: '1px' }}>Contract</span>}
                </div>
              )}

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

              <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              <div style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.brand || '—'}</div>

              <select
                value={c.campaign_type || 'Paid'}
                onChange={e => { e.stopPropagation(); updateCampaignField(c.id, 'campaign_type', e.target.value) }}
                onClick={e => e.stopPropagation()}
                style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', background: 'none', border: 'none', outline: 'none', cursor: 'pointer', padding: '0 14px 0 0', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%235b7c99' stroke-width='3' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', width: 'fit-content' }}>
                {['Paid', 'Non-paid', 'Gifting', 'Seeding'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <select
                value={c.status || 'Pitch'}
                onChange={e => { e.stopPropagation(); updateCampaignField(c.id, 'status', e.target.value) }}
                onClick={e => e.stopPropagation()}
                style={{ padding: '3px 16px 3px 8px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${statusColor(c.status)}`, color: statusColor(c.status), borderRadius: '1px', background: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(statusColor(c.status))}' stroke-width='3' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', width: 'fit-content' }}>
                {['Pitch', 'Active', 'Pending Payment', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
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
    </div>
  )
}
