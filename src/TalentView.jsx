import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import AddCreatorForm from './AddCreatorForm'
import CreatorDetail from './CreatorDetail'
import CampaignDetail from './CampaignDetail'

const TYPES = ['All Types', 'Influencer', 'UGC', 'Model', 'Actor', 'Public Figure', 'Sports', 'Athlete', 'Podcast', 'Speaker/Host']
// Keep this list identical to NICHES in AddCreatorForm.jsx — the filter chips
// must match the categories a creator can actually be tagged with.
const NICHES = ['Wellness', 'Beauty', 'Lifestyle', 'Parenting', 'Fashion', 'Fitness', 'Food', 'Travel', 'Entertainment', 'Books', 'Specialty']


function totalFollowers(creator) {
  const ig = parseInt(creator.ig_followers) || 0
  const tt = parseInt(creator.tiktok_followers) || 0
  const yt = parseInt(creator.yt_subscribers) || 0
  const total = ig + tt + yt
  if (total === 0) return '—'
  if (total >= 1000000) return (total / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (total >= 1000) return (total / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return total.toLocaleString()
}
export default function TalentView({ dark = true, orgId, isMobile = false, showArchived = false, onToggleArchived, talentView = 'grid' }) {
  const [creators, setCreators] = useState([])
  const view = talentView
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [nicheFilter, setNicheFilter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [archiving, setArchiving] = useState(null)
  const [hovering, setHovering] = useState(null)
  const [search, setSearch] = useState('')

  const bg = dark ? '#1A1A1A' : '#F8F7F3'
  const card = dark ? '#1A1A1A' : '#FFFFFF'
  const cardHover = dark ? '#222' : '#F0EDE8'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const border2 = dark ? '#444' : '#CCC7BF'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const gridBg = dark ? '#2A2A2A' : '#DBD7D0'
  // Raised cards in the grid: a card surface lifted off the page, plus shadow.
  const cardBg = dark ? '#212121' : '#FFFFFF'
  const cardShadow = dark ? '0 1px 3px rgba(0,0,0,0.45)' : '0 1px 2px rgba(0,0,0,0.04), 0 3px 10px rgba(0,0,0,0.07)'
  const cardShadowHover = dark ? '0 8px 22px rgba(0,0,0,0.6)' : '0 4px 8px rgba(0,0,0,0.07), 0 12px 26px rgba(0,0,0,0.11)'

  useEffect(() => { fetchCreators() }, [showArchived])

  async function fetchCreators() {
    setLoading(true)
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('status', showArchived ? 'archived' : 'active')
      .order('name', { ascending: true })
    if (error) console.error(error)
    else setCreators(data || [])
    setLoading(false)
  }

  async function archiveCreator(id, restore = false) {
    const { error } = await supabase.from('creators').update({ status: restore ? 'active' : 'archived' }).eq('id', id)
    if (error) console.error(error)
    else { setArchiving(null); fetchCreators() }
  }

  const filtered = (typeFilter === 'All Types'
    ? creators
    : creators.filter(c => c.type === typeFilter || (Array.isArray(c.types) && c.types.includes(typeFilter)))
  )
  .filter(c => !nicheFilter || (Array.isArray(c.niches) && c.niches.includes(nicheFilter)))
  .filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.name?.toLowerCase().includes(q) || c.handles?.instagram?.toLowerCase().includes(q)
  })
  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const chip = (label, active, onClick) => (
    <button onClick={onClick} style={{
      padding: '5px 12px', fontSize: '9px', letterSpacing: '0.14em',
      textTransform: 'uppercase',
      border: `1px solid ${active ? '#5b7c99' : border2}`,
      borderRadius: '4px', cursor: 'pointer',
      color: active ? '#fff' : muted,
      background: active ? '#5b7c99' : (dark ? '#242424' : '#FFFFFF'),
      boxShadow: active ? '0 2px 6px rgba(91,124,153,0.35)' : (dark ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.04)'),
      whiteSpace: 'nowrap', fontWeight: active ? 500 : 400,
      flexShrink: 0,
      transition: 'background 0.15s, color 0.15s, box-shadow 0.15s'
    }}>{label}</button>
  )

  function Avatar({ creator, size, square }) {
    if (!creator) return null
    const r = square ? '2px' : '50%'
    if (creator.photo_url) {
      return <img src={creator.photo_url} alt={creator.name} style={{ width: size, height: size, borderRadius: r, objectFit: 'cover', border: `0.5px solid ${border2}`, flexShrink: 0, display: 'block' }} onError={e => e.target.style.display = 'none'} />
    }
    return (
      <div style={{ width: size, height: size, borderRadius: r, background: dark ? '#2A2A2A' : '#E0DCD6', border: `0.5px solid ${border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: Math.round(size * 0.28), color: text, flexShrink: 0 }}>
        {creator.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
    )
  }

  const displayType = (c) => {
    if (!c) return ''
    if (Array.isArray(c.types) && c.types.length) return c.types.join(' · ')
    return c.type || 'Influencer'
  }

  const cols = isMobile ? 'repeat(1, 1fr)' : 'repeat(auto-fill, minmax(280px, 1fr))'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {selected && (
        <CreatorDetail
          creator={selected}
          orgId={orgId}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); fetchCreators() }}
          dark={!dark}
          onOpenCampaign={(campaign) => setSelectedCampaign(campaign)}
        />
      )}

      {selectedCampaign && (
        <CampaignDetail
          campaign={selectedCampaign}
          dark={!dark}
          orgId={orgId}
          onClose={() => setSelectedCampaign(null)}
          onSaved={() => setSelectedCampaign(null)}
          backToLabel={selected?.name}
          onBack={selected ? () => setSelectedCampaign(null) : undefined}
        />
      )}

      {archiving && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: dark ? '#222' : '#FFF', border: `0.5px solid ${border}`, padding: '32px', width: '100%', maxWidth: '380px', borderRadius: '2px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', marginBottom: '8px', color: text }}>
              {showArchived ? 'Restore talent?' : 'Archive talent?'}
            </div>
            <div style={{ fontSize: '12px', color: muted, marginBottom: '24px' }}>
              {showArchived ? `${archiving.name} will be moved back to your active roster.` : `${archiving.name} will be hidden from your roster but can be restored anytime.`}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setArchiving(null)} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
              <button onClick={() => archiveCreator(archiving.id, showArchived)} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
                {showArchived ? 'Restore' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: isMobile ? '8px 12px' : '10px 28px', borderBottom: `0.5px solid ${border}`, background: bg }}>
        {!showArchived && (
          <div style={isMobile
            ? { display: 'flex', overflowX: 'auto', gap: '5px', alignItems: 'center', paddingBottom: '2px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }
            : { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }
          }>
            {TYPES.map(t => {
              // "All Types" is the "no filter" state — it should only look active
              // when no niche or specific type is applied, and clicking it clears both.
              if (t === 'All Types') {
                const allActive = typeFilter === 'All Types' && !nicheFilter
                return chip(t, allActive, () => { setTypeFilter('All Types'); setNicheFilter(null) })
              }
              return chip(t, typeFilter === t, () => setTypeFilter(typeFilter === t ? 'All Types' : t))
            })}
            <div style={{ width: '0.5px', height: '14px', background: border2, margin: '0 2px', flexShrink: 0 }} />
            {NICHES.map(n => chip(n, nicheFilter === n, () => setNicheFilter(nicheFilter === n ? null : n)))}
            {!isMobile && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                


              </div>
            )}
          </div>
        )}
        {showArchived && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            <button onClick={() => { onToggleArchived && onToggleArchived(false); setTypeFilter('All Types'); setNicheFilter(null); setSearch('') }} style={{ padding: '5px 14px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', border: '1px solid #5b7c99', borderRadius: '4px', cursor: 'pointer', color: '#fff', background: '#5b7c99', boxShadow: '0 2px 6px rgba(91,124,153,0.35)', fontWeight: 500 }}>← Active Roster</button>
          </div>
        )}
      </div>

      <div style={{ padding: isMobile ? '6px 12px' : '8px 28px', borderBottom: `0.5px solid ${border}`, background: bg, flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: subtle, pointerEvents: 'none' }}>
            <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search by name or @handle...'
            onFocus={e => { e.target.style.borderColor = '#5b7c99'; e.target.style.boxShadow = '0 0 0 2px rgba(91,124,153,0.18)' }}
            onBlur={e => { e.target.style.borderColor = border2; e.target.style.boxShadow = dark ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.04)' }}
            style={{ width: '100%', background: dark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${border2}`, borderRadius: '6px', padding: '8px 12px 8px 32px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box', boxShadow: dark ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.04)', transition: 'border-color 0.15s, box-shadow 0.15s' }} />
        </div>
      </div>

      {loading && <div style={{ padding: '40px 28px', color: subtle, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>
            {search ? 'No results' : showArchived ? 'No archived talent' : 'No talent yet'}
          </div>
          <div style={{ fontSize: '12px', color: muted, letterSpacing: '0.08em' }}>
            {search ? `Nothing matched "${search}"` : showArchived ? 'Archived talent will appear here' : 'Click + Talent to add your first one'}
          </div>
        </div>
      )}

      {!loading && (view === 'grid' || isMobile) && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: isMobile ? '12px' : '16px', flex: 1, overflowY: 'auto', padding: isMobile ? '14px 14px 100px' : '20px 20px 100px' }}>
          {filtered.map(c => (
            <div key={c.id}
              style={{ background: cardBg, padding: isMobile ? '16px' : '18px', cursor: 'pointer', position: 'relative', borderRadius: '6px', border: `0.5px solid ${border}`, boxShadow: hovering === c.id ? cardShadowHover : cardShadow, transform: hovering === c.id ? 'translateY(-2px)' : 'none', transition: 'box-shadow 0.16s ease, transform 0.16s ease' }}
              onMouseEnter={() => setHovering(c.id)}
              onMouseLeave={() => setHovering(null)}
              onClick={() => setSelected(c)}>



              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <Avatar creator={c} size={isMobile ? 88 : 96} square={true} />
                <div style={{ flex: 1, minWidth: 0, paddingTop: '4px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '4px' }}>{displayType(c)}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '15px' : '16px', color: text, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: muted, marginBottom: '6px' }}>{c.handles?.instagram ? <a href={`https://instagram.com/${c.handles.instagram}`} target='_blank' rel='noreferrer' onClick={e => e.stopPropagation()} style={{ color: muted, textDecoration: 'none' }}>@{c.handles.instagram}</a> : ''}</div>
                  <div style={{ fontSize: '9px', color: subtle, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.6, height: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{Array.isArray(c.niches) && c.niches.length > 0 ? c.niches.slice(0, 2).join(' · ') + (c.niches.length > 2 ? ' +' + (c.niches.length - 2) : '') : ''}</div>
                </div>
              </div>
              <div style={{ display: 'flex', paddingTop: '10px', borderTop: `0.5px solid ${border}`, alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: isMobile ? '12px' : '13px', color: text, fontWeight: 500 }}>{totalFollowers(c)}</div>
                  <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>Followers</div>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.location || '—'}</div>
                    <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>Location</div>
                  </div>
              {hovering === c.id && !isMobile && (
                <button onClick={e => { e.stopPropagation(); setArchiving(c) }} style={{ background: 'none', border: `0.5px solid ${border2}`, color: subtle, fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '5px 10px', cursor: 'pointer', borderRadius: '1px', flexShrink: 0 }}>
                  {showArchived ? 'Restore' : 'Archive'}
                </button>
              )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && view === 'list' && !isMobile && filtered.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', background: bg }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 80px', padding: '10px 28px', borderBottom: `0.5px solid ${border}`, position: 'sticky', top: 0, background: bg }}>
            {['Talent', 'Type', 'Followers', 'Eng Rate', 'Rate From', ''].map(h => (
              <div key={h} style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle }}>{h}</div>
            ))}
          </div>
          {filtered.map(c => (
            <div key={c.id}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 80px', padding: '14px 28px', borderBottom: `0.5px solid ${border}`, cursor: 'pointer', alignItems: 'center', background: hovering === c.id ? cardHover : 'transparent' }}
              onMouseEnter={() => setHovering(c.id)}
              onMouseLeave={() => setHovering(null)}
              onClick={() => setSelected(c)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar creator={c} size={40} square={true} />
                <div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: text }}>{c.name}</div>
                  <div style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>{c.handles?.instagram ? <a href={`https://instagram.com/${c.handles.instagram}`} target='_blank' rel='noreferrer' onClick={e => e.stopPropagation()} style={{ color: muted, textDecoration: 'none' }}>@{c.handles.instagram}</a> : ''}</div>
                </div>
              </div>
              <div style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5b7c99' }}>{displayType(c)}</div>
              <div style={{ fontSize: '13px', color: text }}>{totalFollowers(c)}</div>
              <div style={{ fontSize: '13px', color: muted }}>{c.engagement_rate ? `${c.engagement_rate}%` : '—'}</div>
              <div style={{ fontSize: '13px', color: '#5b7c99', fontWeight: 500 }}>{c.rates?.feed ? `$${c.rates.feed.toLocaleString()}` : '—'}</div>
              <button onClick={e => { e.stopPropagation(); setArchiving(c) }} style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: muted, padding: '3px 8px', cursor: 'pointer', borderRadius: '1px' }}>
                {showArchived ? 'Restore' : 'Archive'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
