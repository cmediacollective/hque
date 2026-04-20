import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import CampaignForm from './CampaignForm'
import CampaignDetail from './CampaignDetail'

const STATUSES = ['All', 'Pitch', 'Active', 'Completed']

export default function CampaignView({ dark = true, orgId }) {
  const isMobile = window.innerWidth < 768;
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
  const [statusFilter, setStatusFilter] = useState('All')
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
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('org_id', orgId)
      .eq('archived', showArchived)
      .order('created_at', { ascending: false })
    setCampaigns(data || [])
    if (data?.length) fetchCreatorCounts(data.map(c => c.id))
    setSelected(sel => sel ? (data || []).find(d => d.id === sel.id) || sel : null)
    setLoading(false)
  }

  async function fetchCreatorCounts(ids) {
    const { data } = await supabase.from('campaign_creators').select('campaign_id').in('campaign_id', ids)
    const counts = {}
    ;(data || []).forEach(r => { counts[r.campaign_id] = (counts[r.campaign_id] || 0) + 1 })
    setCreatorCounts(counts)
  }

  async function archiveCampaign(campaign, restore = false) {
    await supabase.from('campaigns').update({ archived: !restore }).eq('id', campaign.id)
    setArchiving(null)
    fetchCampaigns()
  }

  const filtered = campaigns
    .filter(c => statusFilter === 'All' || c.status === statusFilter)
    .filter(c => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return c.name?.toLowerCase().includes(q) || c.brand?.toLowerCase().includes(q)
    })

  const statusColor = (s) => s === 'Active' ? '#5b7c99' : s === 'Completed' ? '#5C9E52' : '#888'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : null

  const chip = (label, active, onClick) => (
    <button onClick={onClick} style={{
      padding: '4px 12px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
      border: `0.5px solid ${active ? '#5b7c99' : border2}`,
      borderRadius: '1px', cursor: 'pointer', color: active ? '#5b7c99' : muted,
      background: 'none', whiteSpace: 'nowrap', fontWeight: active ? '500' : '400'
    }}>{label}</button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {showForm && (
        <CampaignForm
          dark={!dark}
          orgId={orgId}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: dark ? '#222' : '#FFF', border: `0.5px solid ${border}`, padding: '32px', width: '380px', borderRadius: '2px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', marginBottom: '8px', color: text }}>
              {showArchived ? 'Restore campaign?' : 'Archive campaign?'}
            </div>
            <div style={{ fontSize: '11px', color: muted, lineHeight: 1.4, marginBottom: '24px' }}>
              {showArchived
                ? `"${archiving.name}" will be moved back to your active campaigns.`
                : `"${archiving.name}" will be hidden but can be restored anytime.`}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setArchiving(null)} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
              <button onClick={() => archiveCampaign(archiving, showArchived)} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
                {showArchived ? 'Restore' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '12px 28px', display: 'flex', gap: '6px', alignItems: 'center', borderBottom: `0.5px solid ${border}`, background: bg, flexShrink: 0 }}>
        {!showArchived && STATUSES.map(s => chip(s, statusFilter === s, () => setStatusFilter(s)))}
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: subtle, letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
          {filtered.length} campaigns
        </span>
        <button
          onClick={() => { setShowArchived(a => !a); setStatusFilter('All'); setSearch('') }}
          style={{ padding: '4px 12px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${showArchived ? '#5b7c99' : border2}`, borderRadius: '1px', cursor: 'pointer', color: showArchived ? '#5b7c99' : muted, background: 'none', whiteSpace: 'nowrap' }}>
          {showArchived ? '<- Active' : 'Archived'}
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

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: '1px', background: gridBg, flex: 1, overflowY: 'auto', alignContent: 'start' }}>
          {filtered.map(c => (
            <div key={c.id}
              style={{ background: hovering === c.id ? cardHover : card, padding: isMobile ? '14px' : '24px', cursor: 'pointer', position: 'relative' }}
              onMouseEnter={() => setHovering(c.id)}
              onMouseLeave={() => setHovering(null)}
              onClick={() => setSelected(c)}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                {c.brand_logo_url
                  ? <img src={c.brand_logo_url} alt={c.brand} style={{ width: '88px', height: '88px', objectFit: 'contain', borderRadius: '2px', border: `0.5px solid ${border}`, background: '#fff', padding: '6px' }} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ width: '88px', height: '88px', borderRadius: '2px', background: dark ? '#2A2A2A' : '#E0DCD6', border: `0.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: subtle }}>🏷</div>
                }
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span style={{ padding: '2px 8px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', border: `0.5px solid ${statusColor(c.status)}`, color: statusColor(c.status), borderRadius: '1px' }}>{c.status}</span>
                  {creatorCounts[c.id] > 0 && <span style={{ fontSize: '9px', color: subtle }}>{creatorCounts[c.id]} talent</span>}
                  {hovering === c.id && (
                    <button
                      onClick={e => { e.stopPropagation(); setArchiving(c) }}
                      style={{ padding: '2px 8px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>
                      {showArchived ? 'Restore' : 'Archive'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {c.brand || 'No brand'}
                {c.brand_website && (
                  <a href={c.brand_website.startsWith('http') ? c.brand_website : 'https://' + c.brand_website} target="_blank" rel="noreferrer" style={{ fontSize: '8px', color: '#5b7c99', opacity: 0.6, textDecoration: 'none', letterSpacing: '0.1em' }} title={c.brand_website}>↗</a>
                )}
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: text, marginBottom: '16px', lineHeight: 1.35 }}>{c.name}</div>

              <div style={{ display: 'flex', gap: '20px', paddingTop: '14px', borderTop: `0.5px solid ${border}` }}>
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
    </div>
  )
}
