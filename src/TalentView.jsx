import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import AddCreatorForm from './AddCreatorForm'
import CreatorDetail from './CreatorDetail'

const TYPES = ['All Types', 'Influencer', 'UGC', 'Public Figure', 'Sports', 'Athlete', 'Podcast', 'Speaker/Host']
const NICHES = ['Wellness', 'Beauty', 'Lifestyle', 'Parenting', 'Fashion', 'Fitness', 'Food', 'Books']

export default function TalentView({ t }) {
  const [creators, setCreators] = useState([])
  const [view, setView] = useState('grid')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [archiving, setArchiving] = useState(null)
  const [hovering, setHovering] = useState(null)

  useEffect(() => { fetchCreators() }, [showArchived])

  async function fetchCreators() {
    setLoading(true)
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('status', showArchived ? 'archived' : 'active')
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

  const filtered = typeFilter === 'All Types' ? creators : creators.filter(c =>
    c.type === typeFilter || c.types?.includes(typeFilter)
  )

  const chip = (label, active, onClick) => (
    <button onClick={onClick} style={{
      padding: '4px 12px', fontSize: '9px', letterSpacing: '0.14em',
      textTransform: 'uppercase', border: `0.5px solid ${active ? '#5b7c99' : t.borderChip}`,
      borderRadius: '1px', cursor: 'pointer', color: active ? '#5b7c99' : t.textSecondary,
      background: 'none', whiteSpace: 'nowrap', fontWeight: active ? '500' : '400'
    }}>{label}</button>
  )

  const Avatar = ({ creator, size = 48 }) => (
    creator.photo_url
      ? <img src={creator.photo_url} alt={creator.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `0.5px solid ${t.borderChip}`, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
      : <div style={{ width: size, height: size, borderRadius: '50%', background: t.bgStat, border: `0.5px solid ${t.borderChip}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: size * 0.28, color: t.textPrimary, flexShrink: 0 }}>
          {creator.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
  )

  const displayType = (c) => {
    if (c.types?.length) return c.types.join(' · ')
    return c.type || 'Influencer'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {selected && (
        <CreatorDetail
          t={t}
          creator={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); fetchCreators(); }}
        />
      )}

      {archiving && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: t.bgModal, border: `0.5px solid ${t.borderInput}`, padding: '32px', width: '380px', borderRadius: '2px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: t.textPrimary, marginBottom: '8px' }}>
              {showArchived ? 'Restore creator?' : 'Archive creator?'}
            </div>
            <div style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '24px' }}>
              {showArchived
                ? `${archiving.name} will be moved back to your active roster.`
                : `${archiving.name} will be hidden from your roster but can be restored anytime.`}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setArchiving(null)} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${t.borderInput}`, color: t.textSecondary, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
              <button onClick={() => archiveCreator(archiving.id, showArchived)} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
                {showArchived ? 'Restore' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '12px 28px', display: 'flex', gap: '6px', alignItems: 'center', borderBottom: `0.5px solid ${t.border}`, overflowX: 'auto', background: t.bg }}>
        {!showArchived && TYPES.map(t2 => chip(t2, typeFilter === t2, () => setTypeFilter(t2)))}
        {!showArchived && <div style={{ width: '0.5px', height: '14px', background: t.borderChip, margin: '0 4px', flexShrink: 0 }} />}
        {!showArchived && NICHES.map(n => chip(n, false, () => {}))}
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: t.textMuted, letterSpacing: '0.12em', paddingLeft: '12px', whiteSpace: 'nowrap' }}>
          {filtered.length} {showArchived ? 'archived' : 'creators'}
        </span>
        <button
          onClick={() => { setShowArchived(a => !a); setTypeFilter('All Types'); }}
          style={{ padding: '4px 12px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${showArchived ? '#5b7c99' : t.borderChip}`, borderRadius: '1px', cursor: 'pointer', color: showArchived ? '#5b7c99' : t.textSecondary, background: 'none', whiteSpace: 'nowrap', marginLeft: '8px', flexShrink: 0 }}>
          {showArchived ? '← Active Roster' : 'Archived'}
        </button>
        <div style={{ display: 'flex', border: `0.5px solid ${t.borderChip}`, borderRadius: '2px', overflow: 'hidden', marginLeft: '8px', flexShrink: 0 }}>
          {['grid', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 12px', fontSize: '9px', background: view === v ? t.bgStat : 'none',
              border: 'none', color: view === v ? t.textPrimary : t.textSecondary, cursor: 'pointer',
              borderRight: v === 'grid' ? `0.5px solid ${t.borderChip}` : 'none', letterSpacing: '0.1em'
            }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px 28px', color: t.textMuted, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: t.textMuted, marginBottom: '10px' }}>
            {showArchived ? 'No archived creators' : 'No creators yet'}
          </div>
          <div style={{ fontSize: '12px', color: t.textMuted, letterSpacing: '0.08em' }}>
            {showArchived ? 'Archived creators will appear here' : 'Click + Creator to add your first creator'}
          </div>
        </div>
      )}

      {!loading && view === 'grid' && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1px', background: t.gridGap, flex: 1, overflowY: 'auto' }}>
          {filtered.map(c => (
            <div key={c.id}
              style={{ background: hovering === c.id ? t.bgCardHover : t.bgCard, padding: '18px', cursor: 'pointer', position: 'relative' }}
              onMouseEnter={() => setHovering(c.id)}
              onMouseLeave={() => setHovering(null)}
              onClick={() => setSelected(c)}>

              {hovering === c.id && (
                <button
                  onClick={e => { e.stopPropagation(); setArchiving(c); }}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: `0.5px solid ${t.borderChip}`, color: t.textSecondary, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '3px 8px', cursor: 'pointer', borderRadius: '1px' }}>
                  {showArchived ? 'Restore' : 'Archive'}
                </button>
              )}

              <div style={{ marginBottom: '14px' }}>
                <Avatar creator={c} size={52} />
              </div>
              <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '5px' }}>{displayType(c)}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: t.textName, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              <div style={{ fontSize: '11px', color: t.textHandle, marginBottom: '10px' }}>{c.handles?.instagram ? `@${c.handles.instagram}` : ''}</div>
              <div style={{ fontSize: '10px', color: t.textNiche, marginBottom: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.6 }}>{c.niches?.join(' · ')}</div>
              <div style={{ display: 'flex', paddingTop: '12px', borderTop: `0.5px solid ${t.borderLight}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: t.textStat, fontWeight: 500 }}>{c.ig_followers?.toLocaleString() || '—'}</div>
                  <div style={{ fontSize: '8px', color: t.textStatLabel, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>Followers</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: t.textStat, fontWeight: 500 }}>{c.engagement_rate ? `${c.engagement_rate}%` : '—'}</div>
                  <div style={{ fontSize: '8px', color: t.textStatLabel, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>Eng Rate</div>
                </div>
              </div>
              {c.rates?.feed && (
                <div style={{ fontSize: '10px', color: t.textRate, marginTop: '10px' }}>From <span style={{ color: '#5b7c99', fontWeight: 500 }}>${c.rates.feed.toLocaleString()}</span></div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && view === 'list' && filtered.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 80px', padding: '10px 28px', borderBottom: `0.5px solid ${t.border}`, position: 'sticky', top: 0, background: t.bg }}>
            {['Creator', 'Type', 'Followers', 'Eng Rate', 'Rate From', ''].map(h => (
              <div key={h} style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: t.textMuted }}>{h}</div>
            ))}
          </div>
          {filtered.map(c => (
            <div key={c.id}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 80px', padding: '14px 28px', borderBottom: `0.5px solid ${t.borderLight}`, cursor: 'pointer', alignItems: 'center', background: hovering === c.id ? t.bgCardHover : t.bgCard }}
              onMouseEnter={() => setHovering(c.id)}
              onMouseLeave={() => setHovering(null)}
              onClick={() => setSelected(c)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar creator={c} size={34} />
                <div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: t.textName }}>{c.name}</div>
                  <div style={{ fontSize: '10px', color: t.textHandle, marginTop: '2px' }}>{c.handles?.instagram ? `@${c.handles.instagram}` : ''}</div>
                </div>
              </div>
              <div style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', border: '0.5px solid #1A2A38', color: '#5b7c99', padding: '3px 8px', display: 'inline-block' }}>{displayType(c)}</div>
              <div style={{ fontSize: '13px', color: t.textStat }}>{c.ig_followers?.toLocaleString() || '—'}</div>
              <div style={{ fontSize: '13px', color: t.textSecondary }}>{c.engagement_rate ? `${c.engagement_rate}%` : '—'}</div>
              <div style={{ fontSize: '13px', color: '#5b7c99', fontWeight: 500 }}>{c.rates?.feed ? `$${c.rates.feed.toLocaleString()}` : '—'}</div>
              <button
                onClick={e => { e.stopPropagation(); setArchiving(c); }}
                style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${t.borderInput}`, color: t.textSecondary, padding: '3px 8px', cursor: 'pointer', borderRadius: '1px' }}>
                {showArchived ? 'Restore' : 'Archive'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}