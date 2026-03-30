import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import AddCreatorForm from './AddCreatorForm'
import CreatorDetail from './CreatorDetail'

const TYPES = ['All Types', 'Influencer', 'UGC', 'Public Figure', 'Sports', 'Athlete', 'Podcast', 'Speaker/Host']
const NICHES = ['Wellness', 'Beauty', 'Lifestyle', 'Parenting', 'Fashion', 'Fitness', 'Food', 'Books']

export default function TalentView({ dark = true }) {
  const [creators, setCreators] = useState([])
  const [view, setView] = useState('grid')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [archiving, setArchiving] = useState(null)
  const [hovering, setHovering] = useState(null)

  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const card = dark ? '#1A1A1A' : '#FFFFFF'
  const cardHover = dark ? '#222' : '#F0EDE8'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#444' : '#C4BFB8'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const gridBg = dark ? '#2A2A2A' : '#D4CFC8'

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
    const { error } = await supabase
      .from('creators')
      .update({ status: restore ? 'active' : 'archived' })
      .eq('id', id)
    if (error) console.error(error)
    else { setArchiving(null); fetchCreators() }
  }

  const filtered = (typeFilter === 'All Types'
    ? creators
    : creators.filter(c =>
        c.type === typeFilter || (Array.isArray(c.types) && c.types.includes(typeFilter))
      )
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const chip = (label, active, onClick) => (
    <button onClick={onClick} style={{
      padding: '4px 12px', fontSize: '9px', letterSpacing: '0.14em',
      textTransform: 'uppercase', border: `0.5px solid ${active ? '#5b7c99' : border2}`,
      borderRadius: '1px', cursor: 'pointer', color: active ? '#5b7c99' : muted,
      background: 'none', whiteSpace: 'nowrap', fontWeight: active ? '500' : '400'
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {selected && (
        <CreatorDetail
          creator={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); fetchCreators() }}
          dark={dark}
        />
      )}

      {archiving && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: dark ? '#222' : '#FFF', border: `0.5px solid ${border}`, padding: '32px', width: '380px', borderRadius: '2px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', marginBottom: '8px', color: text }}>
              {showArchived ? 'Restore creator?' : 'Archive creator?'}
            </div>
            <div style={{ fontSize: '12px', color: muted, marginBottom: '24px' }}>
              {showArchived
                ? `${archiving.name} will be moved back to your active roster.`
                : `${archiving.name} will be hidden from your roster but can be restored anytime.`}
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

      <div style={{ padding: '12px 28px', display: 'flex', gap: '6px', alignItems: 'center', borderBottom: `0.5px solid ${border}`, overflowX: 'auto', background: bg }}>
        {!showArchived && TYPES.map(t => chip(t, typeFilter === t, () => setTypeFilter(t)))}
        {!showArchived && <div style={{ width: '0.5px', height: '14px', background: border2, margin: '0 4px', flexShrink: 0 }} />}
        {!showArchived && NICHES.map(n => chip(n, false, () => {}))}
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: subtle, letterSpacing: '0.12em', paddingLeft: '12px', whiteSpace: 'nowrap' }}>
          {filtered.length} {showArchived ? 'archived' : 'creators'}
        </span>
        <button
          onClick={() => { setShowArchived(a => !a); setTypeFilter('All Types') }}
          style={{ padding: '4px 12px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${showArchived ? '#5b7c99' : border2}`, borderRadius: '1px', cursor: 'pointer', color: showArchived ? '#5b7c99' : muted, background: 'none', whiteSpace: 'nowrap', marginLeft: '8px', flexShrink: 0 }}>
          {showArchived ? '<- Active Roster' : 'Archived'}
        </button>
        <div style={{ display: 'flex', border: `0.5px solid ${border2}`, borderRadius: '2px', overflow: 'hidden', marginLeft: '8px', flexShrink: 0 }}>
          {['grid', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 12px', fontSize: '9px',
              background: view === v ? (dark ? '#2A2A2A' : '#E0DCD6') : 'none',
              border: 'none', color: view === v ? text : muted, cursor: 'pointer',
              borderRight: v === 'grid' ? `0.5px solid ${border2}` : 'none', letterSpacing: '0.1em'
            }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px 28px', color: subtle, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>
            {showArchived ? 'No archived creators' : 'No talent yet'}
          </div>
          <div style={{ fontSize: '12px', color: muted, letterSpacing: '0.08em' }}>
            {showArchived ? 'Archived creators will appear here' : 'Click + Talent to add your first creator'}
          </div>
        </div>
      )}

      {!loading && view === 'grid' && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1px', background: gridBg, flex: 1, overflowY: 'auto' }}>
          {filtered.map(c => (
            <div key={c.id}
              style={{ background: hovering === c.id ? cardHover : card, padding: '18px', cursor: 'pointer', position: 'relative' }}
              onMouseEnter={() => setHovering(c.id)}
              onMouseLeave={() => setHovering(null)}
              onClick={() => setSelected(c)}>

              {hovering === c.id && (
                <button
                  onClick={e => { e.stopPropagation(); setArchiving(c) }}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: `0.5px solid ${border2}`, color: muted, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '3px 8px', cursor: 'pointer', borderRadius: '1px' }}>
                  {showArchived ? 'Restore' : 'Archive'}
                </button>
              )}

              <div style={{ marginBottom: '14px' }}>
                <Avatar creator={c} size={80} square={true} />
              </div>
              <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '5px' }}>{displayType(c)}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: text, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              <div style={{ fontSize: '11px', color: muted, marginBottom: '10px' }}>{c.handles?.instagram ? `@${c.handles.instagram}` : ''}</div>
              <div style={{ fontSize: '10px', color: subtle, marginBottom: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.6 }}>{Array.isArray(c.niches) ? c.niches.join(' · ') : ''}</div>
              <div style={{ display: 'flex', paddingTop: '12px', borderTop: `0.5px solid ${border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: text, fontWeight: 500 }}>{c.ig_followers?.toLocaleString() || '—'}</div>
                  <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>Followers</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: text, fontWeight: 500 }}>{c.engagement_rate ? `${c.engagement_rate}%` : '—'}</div>
                  <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>Eng Rate</div>
                </div>
              </div>
              {c.rates?.feed && (
                <div style={{ fontSize: '10px', color: muted, marginTop: '10px' }}>From <span style={{ color: '#5b7c99', fontWeight: 500 }}>${c.rates.feed.toLocaleString()}</span></div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && view === 'list' && filtered.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', background: bg }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 80px', padding: '10px 28px', borderBottom: `0.5px solid ${border}`, position: 'sticky', top: 0, background: bg }}>
            {['Creator', 'Type', 'Followers', 'Eng Rate', 'Rate From', ''].map(h => (
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
                  <div style={{ fontSize: '10px', color: muted, marginTop: '2px' }}>{c.handles?.instagram ? `@${c.handles.instagram}` : ''}</div>
                </div>
              </div>
              <div style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', border: '0.5px solid #1A2A38', color: '#5b7c99', padding: '3px 8px', display: 'inline-block' }}>{displayType(c)}</div>
              <div style={{ fontSize: '13px', color: text }}>{c.ig_followers?.toLocaleString() || '—'}</div>
              <div style={{ fontSize: '13px', color: muted }}>{c.engagement_rate ? `${c.engagement_rate}%` : '—'}</div>
              <div style={{ fontSize: '13px', color: '#5b7c99', fontWeight: 500 }}>{c.rates?.feed ? `$${c.rates.feed.toLocaleString()}` : '—'}</div>
              <button
                onClick={e => { e.stopPropagation(); setArchiving(c) }}
                style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: muted, padding: '3px 8px', cursor: 'pointer', borderRadius: '1px' }}>
                {showArchived ? 'Restore' : 'Archive'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
