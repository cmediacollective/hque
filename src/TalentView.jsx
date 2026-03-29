import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import AddCreatorForm from './AddCreatorForm'

const TYPES = ['All Types', 'Influencer', 'UGC', 'Public Figure', 'Sports', 'Athlete', 'Podcast', 'Speaker/Host']
const NICHES = ['Wellness', 'Beauty', 'Lifestyle', 'Parenting', 'Fashion', 'Fitness', 'Food', 'Books']

export default function TalentView() {
  const [creators, setCreators] = useState([])
  const [view, setView] = useState('grid')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  useEffect(() => { fetchCreators() }, [])

  async function fetchCreators() {
    setLoading(true)
    const { data, error } = await supabase.from('creators').select('*')
    if (error) console.error(error)
    else setCreators(data || [])
    setLoading(false)
  }

  const filtered = typeFilter === 'All Types' ? creators : creators.filter(c => 
    c.type === typeFilter || c.types?.includes(typeFilter)
  )

  const chip = (label, active, onClick) => (
    <button onClick={onClick} style={{
      padding: '4px 12px', fontSize: '9px', letterSpacing: '0.14em',
      textTransform: 'uppercase', border: `0.5px solid ${active ? '#5b7c99' : '#333'}`,
      borderRadius: '1px', cursor: 'pointer', color: active ? '#5b7c99' : '#888',
      background: 'none', whiteSpace: 'nowrap', fontWeight: active ? '500' : '400'
    }}>{label}</button>
  )

  const Avatar = ({ creator, size = 48 }) => (
    creator.photo_url
      ? <img src={creator.photo_url} alt={creator.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '0.5px solid #333', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
      : <div style={{ width: size, height: size, borderRadius: '50%', background: '#1A1A1A', border: '0.5px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: size * 0.28, color: '#F2EEE8', flexShrink: 0 }}>
          {creator.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
  )

  const displayType = (c) => {
    if (c.types?.length) return c.types.join(' · ')
    return c.type || 'Influencer'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {editing && (
        <AddCreatorForm
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchCreators(); }}
        />
      )}

      <div style={{ padding: '12px 28px', display: 'flex', gap: '6px', alignItems: 'center', borderBottom: '0.5px solid #222', overflowX: 'auto' }}>
        {TYPES.map(t => chip(t, typeFilter === t, () => setTypeFilter(t)))}
        <div style={{ width: '0.5px', height: '14px', background: '#333', margin: '0 4px', flexShrink: 0 }} />
        {NICHES.map(n => chip(n, false, () => {}))}
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#555', letterSpacing: '0.12em', paddingLeft: '12px', whiteSpace: 'nowrap' }}>
          {filtered.length} creators
        </span>
        <div style={{ display: 'flex', border: '0.5px solid #333', borderRadius: '2px', overflow: 'hidden', marginLeft: '8px', flexShrink: 0 }}>
          {['grid', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 12px', fontSize: '9px', background: view === v ? '#222' : 'none',
              border: 'none', color: view === v ? '#F2EEE8' : '#666', cursor: 'pointer',
              borderRight: v === 'grid' ? '0.5px solid #333' : 'none', letterSpacing: '0.1em'
            }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px 28px', color: '#555', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#444', marginBottom: '10px' }}>No creators yet</div>
          <div style={{ fontSize: '12px', color: '#444', letterSpacing: '0.08em' }}>Click + Creator to add your first creator</div>
        </div>
      )}

      {!loading && view === 'grid' && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1px', background: '#1A1A1A', flex: 1, overflowY: 'auto' }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => setEditing(c)}
              style={{ background: '#0D0D0D', padding: '18px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#131313'}
              onMouseLeave={e => e.currentTarget.style.background = '#0D0D0D'}>
              <div style={{ marginBottom: '14px' }}>
                <Avatar creator={c} size={52} />
              </div>
              <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '5px' }}>{displayType(c)}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#F0ECE6', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              <div style={{ fontSize: '11px', color: '#777', marginBottom: '10px' }}>{c.handles?.instagram ? `@${c.handles.instagram}` : ''}</div>
              <div style={{ fontSize: '10px', color: '#666', marginBottom: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.6 }}>{c.niches?.join(' · ')}</div>
              <div style={{ display: 'flex', paddingTop: '12px', borderTop: '0.5px solid #1E1E1E' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#E0DCD6', fontWeight: 500 }}>{c.ig_followers?.toLocaleString() || '—'}</div>
                  <div style={{ fontSize: '8px', color: '#666', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>Followers</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#E0DCD6', fontWeight: 500 }}>{c.engagement_rate ? `${c.engagement_rate}%` : '—'}</div>
                  <div style={{ fontSize: '8px', color: '#666', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>Eng Rate</div>
                </div>
              </div>
              {c.rates?.feed && (
                <div style={{ fontSize: '10px', color: '#888', marginTop: '10px' }}>From <span style={{ color: '#5b7c99', fontWeight: 500 }}>${c.rates.feed.toLocaleString()}</span></div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && view === 'list' && filtered.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '10px 28px', borderBottom: '0.5px solid #222', position: 'sticky', top: 0, background: '#0D0D0D' }}>
            {['Creator', 'Type', 'Followers', 'Eng Rate', 'Rate From'].map(h => (
              <div key={h} style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555' }}>{h}</div>
            ))}
          </div>
          {filtered.map(c => (
            <div key={c.id} onClick={() => setEditing(c)}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '14px 28px', borderBottom: '0.5px solid #1A1A1A', cursor: 'pointer', alignItems: 'center', background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = '#111'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar creator={c} size={34} />
                <div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#EAE6E0' }}>{c.name}</div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{c.handles?.instagram ? `@${c.handles.instagram}` : ''}</div>
                </div>
              </div>
              <div style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', border: '0.5px solid #1A2A38', color: '#5b7c99', padding: '3px 8px', display: 'inline-block' }}>{displayType(c)}</div>
              <div style={{ fontSize: '13px', color: '#C8C4BE' }}>{c.ig_followers?.toLocaleString() || '—'}</div>
              <div style={{ fontSize: '13px', color: '#999' }}>{c.engagement_rate ? `${c.engagement_rate}%` : '—'}</div>
              <div style={{ fontSize: '13px', color: '#5b7c99', textAlign: 'right', fontWeight: 500 }}>{c.rates?.feed ? `$${c.rates.feed.toLocaleString()}` : '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
