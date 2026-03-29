import { useState } from 'react'
import AddCreatorForm from './AddCreatorForm'

export default function CreatorDetail({ creator, onClose, onSaved }) {
  const [editing, setEditing] = useState(false)

  const displayType = (c) => {
    if (c.types?.length) return c.types.join(' · ')
    return c.type || 'Influencer'
  }

  const row = (label, value) => value ? (
    <div style={{ display: 'flex', padding: '12px 0', borderBottom: '0.5px solid #1A1A1A' }}>
      <div style={{ width: '160px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555', flexShrink: 0, paddingTop: '1px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#CCC9C3', flex: 1 }}>{value}</div>
    </div>
  ) : null

  const stat = (label, value) => (
    <div style={{ flex: 1, padding: '16px', background: '#111', borderRadius: '1px' }}>
      <div style={{ fontSize: '18px', color: '#F0ECE6', fontWeight: 500, marginBottom: '4px' }}>{value || '—'}</div>
      <div style={{ fontSize: '8px', color: '#555', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )

  const rateRow = (label, value) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #1A1A1A' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#5b7c99', fontWeight: 500 }}>${value.toLocaleString()}</div>
    </div>
  ) : null

  return (
    <>
      {editing && (
        <AddCreatorForm
          existing={creator}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onSaved(); }}
        />
      )}

      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ width: '560px', background: '#0A0A0A', height: '100vh', overflowY: 'auto', borderLeft: '0.5px solid #1E1E1E', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: '#0A0A0A', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {creator.photo_url
                ? <img src={creator.photo_url} alt={creator.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '0.5px solid #2A2A2A' }} onError={e => e.target.style.display = 'none'} />
                : <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1A1A1A', border: '0.5px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F2EEE8', flexShrink: 0 }}>
                    {creator.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
              }
              <div>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '4px' }}>{displayType(creator)}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#F0ECE6', marginBottom: '2px' }}>{creator.name}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>{creator.handles?.instagram ? `@${creator.handles.instagram}` : ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={() => setEditing(true)} style={{ padding: '6px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Edit</button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
          </div>

          <div style={{ padding: '28px', flex: 1 }}>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
              {stat('IG Followers', creator.ig_followers?.toLocaleString())}
              {stat('TikTok', creator.tiktok_followers?.toLocaleString())}
              {stat('YT Subs', creator.yt_subscribers?.toLocaleString())}
              {stat('Eng Rate', creator.engagement_rate ? `${creator.engagement_rate}%` : null)}
            </div>

            {/* Niches */}
            {creator.niches?.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '10px' }}>Niches</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {creator.niches.map(n => (
                    <span key={n} style={{ padding: '3px 10px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', border: '0.5px solid #2A2A2A', color: '#777', borderRadius: '1px' }}>{n}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Rates */}
            {(creator.rates?.feed || creator.rates?.reel || creator.rates?.story || creator.rates?.tiktok || creator.rates?.youtube) && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '10px' }}>Rates</div>
                {rateRow('IG Feed Post', creator.rates?.feed)}
                {rateRow('IG Story', creator.rates?.story)}
                {rateRow('IG Reel', creator.rates?.reel)}
                {rateRow('TikTok', creator.rates?.tiktok)}
                {rateRow('YouTube', creator.rates?.youtube)}
              </div>
            )}

            {/* Details */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '10px' }}>Details</div>
              {row('Tier', creator.tier)}
              {row('Primary Platform', creator.primary_platform)}
              {row('Location', creator.location)}
              {row('Handles', [
                creator.handles?.instagram && `IG: @${creator.handles.instagram}`,
                creator.handles?.tiktok && `TK: @${creator.handles.tiktok}`,
                creator.handles?.youtube && `YT: ${creator.handles.youtube}`
              ].filter(Boolean).join('  ·  '))}
            </div>

            {/* Contact */}
            {(creator.contact_email || creator.manager_name || creator.manager_email) && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '10px' }}>Contact</div>
                {row('Creator Email', creator.contact_email)}
                {row('Manager', creator.manager_name)}
                {row('Manager Email', creator.manager_email)}
              </div>
            )}

            {/* Notes */}
            {creator.notes && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '10px' }}>Internal Notes</div>
                <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.7, padding: '14px', background: '#111', borderRadius: '1px' }}>{creator.notes}</div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}