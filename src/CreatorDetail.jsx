import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import AddCreatorForm from './AddCreatorForm'
import CampaignDetail from './CampaignDetail'

export default function CreatorDetail({ creator, onClose, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(null)

  useEffect(() => { fetchCampaigns() }, [creator.id])

  async function fetchCampaigns() {
    const { data } = await supabase
      .from('campaign_creators')
      .select('campaign_id, campaigns(id, name, brand, status, budget, start_date, end_date, deliverables, deliverables_link, timeline, brief_url, contract_url, notes)')
      .eq('creator_id', creator.id)
    setCampaigns((data || []).map(d => d.campaigns).filter(Boolean))
  }

  const displayType = (c) => {
    if (Array.isArray(c.types) && c.types.length) return c.types.join(' · ')
    return c.type || 'Influencer'
  }

  const statusColor = (s) => s === 'Active' ? '#5b7c99' : s === 'Completed' ? '#5C9E52' : '#888'

  const row = (label, value) => value ? (
    <div style={{ display: 'flex', padding: '12px 0', borderBottom: '0.5px solid #2A2A2A' }}>
      <div style={{ width: '160px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#777', flexShrink: 0, paddingTop: '1px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#CCC9C3', flex: 1 }}>{value}</div>
    </div>
  ) : null

  const stat = (label, value) => (
    <div style={{ flex: 1, padding: '14px', background: '#222', borderRadius: '1px' }}>
      <div style={{ fontSize: '18px', color: '#F0ECE6', fontWeight: 500, marginBottom: '4px' }}>{value || '—'}</div>
      <div style={{ fontSize: '8px', color: '#777', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )

  const rateRow = (label, value) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #2A2A2A' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#777' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#5b7c99', fontWeight: 500 }}>${value.toLocaleString()}</div>
    </div>
  ) : null

  return (
    <>
      {editing && (
        <AddCreatorForm
          existing={creator}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onSaved() }}
        />
      )}

      {selectedCampaign && (
        <CampaignDetail
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          onSaved={() => { setSelectedCampaign(null); fetchCampaigns() }}
        />
      )}

      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ width: '560px', background: '#1A1A1A', height: '100vh', overflowY: 'auto', borderLeft: '0.5px solid #2A2A2A', display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: '#1A1A1A', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {creator.photo_url
                ? <img src={creator.photo_url} alt={creator.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '0.5px solid #3A3A3A' }} onError={e => e.target.style.display = 'none'} />
                : <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#2A2A2A', border: '0.5px solid #3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F2EEE8', flexShrink: 0 }}>
                    {creator.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
              }
              <div>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '4px' }}>{displayType(creator)}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#F0ECE6', marginBottom: '2px' }}>{creator.name}</div>
                <div style={{ fontSize: '12px', color: '#777' }}>{creator.handles?.instagram ? `@${creator.handles.instagram}` : ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={() => setEditing(true)} style={{ padding: '6px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Edit</button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
          </div>

          <div style={{ padding: '28px', flex: 1 }}>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
              {stat('IG Followers', creator.ig_followers?.toLocaleString())}
              {stat('TikTok', creator.tiktok_followers?.toLocaleString())}
              {stat('YT Subs', creator.yt_subscribers?.toLocaleString())}
              {stat('Eng Rate', creator.engagement_rate ? `${creator.engagement_rate}%` : null)}
            </div>

            {Array.isArray(creator.niches) && creator.niches.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Niches</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {creator.niches.map(n => (
                    <span key={n} style={{ padding: '3px 10px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', border: '0.5px solid #3A3A3A', color: '#999', borderRadius: '1px' }}>{n}</span>
                  ))}
                </div>
              </div>
            )}

            {(creator.rates?.feed || creator.rates?.reel || creator.rates?.story || creator.rates?.tiktok || creator.rates?.youtube) && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Rates</div>
                {rateRow('IG Feed Post', creator.rates?.feed)}
                {rateRow('IG Story', creator.rates?.story)}
                {rateRow('IG Reel', creator.rates?.reel)}
                {rateRow('TikTok', creator.rates?.tiktok)}
                {rateRow('YouTube', creator.rates?.youtube)}
              </div>
            )}

            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Details</div>
              {row('Tier', creator.tier)}
              {row('Primary Platform', creator.primary_platform)}
              {row('Location', creator.location)}
              {row('Handles', [
                creator.handles?.instagram && `IG: @${creator.handles.instagram}`,
                creator.handles?.tiktok && `TK: @${creator.handles.tiktok}`,
                creator.handles?.youtube && `YT: ${creator.handles.youtube}`
              ].filter(Boolean).join('  ·  '))}
            </div>

            {(creator.contact_email || creator.manager_name || creator.manager_email) && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Contact</div>
                {row('Creator Email', creator.contact_email)}
                {row('Manager', creator.manager_name)}
                {row('Manager Email', creator.manager_email)}
              </div>
            )}

            {creator.notes && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Internal Notes</div>
                <div style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.7, padding: '14px', background: '#222', borderRadius: '1px' }}>{creator.notes}</div>
              </div>
            )}

            {campaigns.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Campaigns</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#2A2A2A', borderRadius: '1px', overflow: 'hidden' }}>
                  {campaigns.map(c => (
                    <div key={c.id}
                      onClick={() => setSelectedCampaign(c)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#1A1A1A', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#222'}
                      onMouseLeave={e => e.currentTarget.style.background = '#1A1A1A'}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#CCC9C3' }}>{c.name}</div>
                        {c.brand && <div style={{ fontSize: '10px', color: '#777', marginTop: '2px' }}>{c.brand}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ padding: '2px 8px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${statusColor(c.status)}`, color: statusColor(c.status), borderRadius: '1px', flexShrink: 0 }}>{c.status}</span>
                        <span style={{ fontSize: '16px', color: '#444' }}>›</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
