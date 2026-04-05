import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function ReportsView({ dark = true, orgId }) {
  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#3A3A3A' : '#C4BFB8'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'

  const [campaigns, setCampaigns] = useState([])
  const [links, setLinks] = useState([])
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: camps }, { data: lnks }, { data: crs }] = await Promise.all([
      supabase.from('campaigns').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
      supabase.from('campaign_creators').select('*'),
      supabase.from('creators').select('id, name, photo_url, handles')
    ])
    setCampaigns(camps || [])
    setLinks(lnks || [])
    setCreators(crs || [])
    setLoading(false)
  }

  const totalBudget = campaigns.reduce((sum, c) => sum + (Number(c.budget) || 0), 0)
  const activeCampaigns = campaigns.filter(c => c.status === 'Active').length
  const completedCampaigns = campaigns.filter(c => c.status === 'Completed').length
  const pitchCampaigns = campaigns.filter(c => c.status === 'Pitch').length
  const totalPaid = links.filter(l => l.payment_status === 'Paid').length
  const totalPending = links.filter(l => l.payment_status !== 'Paid').length

  const campaignLinks = (campaignId) => links.filter(l => l.campaign_id === campaignId)
  const getCreator = (id) => creators.find(c => c.id === id)

  const statusColor = (s) => s === 'Active' ? '#5b7c99' : s === 'Completed' ? '#5C9E52' : '#888'

  const stat = (label, value, sub) => (
    <div style={{ flex: 1, padding: '20px', background: card, border: `0.5px solid ${border}`, borderRadius: '1px' }}>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: text, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</div>
      {sub && <div style={{ fontSize: '10px', color: muted, marginTop: '6px' }}>{sub}</div>}
    </div>
  )

  const section = (label) => (
    <div style={{ fontSize: '8px', letterSpacing: '0.24em', textTransform: 'uppercase', color: subtle, marginBottom: '12px', marginTop: '32px' }}>{label}</div>
  )

  if (loading) return (
    <div style={{ padding: '40px 28px', color: subtle, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: bg, padding: '28px' }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {stat('Total Budget', `$${totalBudget.toLocaleString()}`)}
        {stat('Campaigns', campaigns.length, `${activeCampaigns} active · ${completedCampaigns} completed · ${pitchCampaigns} pitch`)}
        {stat('Payments', `${totalPaid} paid`, `${totalPending} pending`)}
        {stat('Total Talent', creators.length)}
      </div>

      {section('Campaign Breakdown')}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: border, borderRadius: '1px', overflow: 'hidden' }}>
        {campaigns.map(c => {
          const campLinks = campaignLinks(c.id)
          const paid = campLinks.filter(l => l.payment_status === 'Paid').length
          const pending = campLinks.filter(l => l.payment_status !== 'Paid').length
          const hasPerformance = campLinks.some(l => l.views || l.likes || l.reach)
          const totalViews = campLinks.reduce((sum, l) => sum + (l.views || 0), 0)
          const totalLikes = campLinks.reduce((sum, l) => sum + (l.likes || 0), 0)
          const totalReach = campLinks.reduce((sum, l) => sum + (l.reach || 0), 0)

          return (
            <div key={c.id}>
              <div
                onClick={() => setSelectedCampaign(selectedCampaign === c.id ? null : c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: card, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? '#282828' : '#F5F2EC'}
                onMouseLeave={e => e.currentTarget.style.background = card}>

                {c.brand_logo_url
                  ? <img src={c.brand_logo_url} alt={c.brand} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '2px', border: `0.5px solid ${border2}`, background: '#fff', padding: '3px', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ width: '36px', height: '36px', borderRadius: '2px', background: dark ? '#2A2A2A' : '#E0DCD6', border: `0.5px solid ${border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🏷</div>
                }

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '8px', color: '#5b7c99', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '3px' }}>{c.brand || 'No brand'}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                </div>

                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexShrink: 0 }}>
                  {c.budget != null && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', color: text, fontWeight: 500 }}>${Number(c.budget).toLocaleString()}</div>
                      <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '2px' }}>Budget</div>
                    </div>
                  )}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: text }}>{paid} paid · {pending} pending</div>
                    <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '2px' }}>Payments</div>
                  </div>
                  {hasPerformance && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', color: text }}>{totalViews.toLocaleString()} views</div>
                      <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '2px' }}>{totalReach.toLocaleString()} reach</div>
                    </div>
                  )}
                  <span style={{ padding: '2px 8px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${statusColor(c.status)}`, color: statusColor(c.status), borderRadius: '1px' }}>{c.status}</span>
                  <span style={{ fontSize: '14px', color: subtle, transform: selectedCampaign === c.id ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>›</span>
                </div>
              </div>

              {selectedCampaign === c.id && campLinks.length > 0 && (
                <div style={{ background: dark ? '#1A1A1A' : '#F8F6F2', borderTop: `0.5px solid ${border}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 2fr) repeat(5, minmax(80px, 1fr))', padding: '8px 20px', borderBottom: `0.5px solid ${border}` }}>
                    {['Creator', 'Role', 'Views', 'Likes', 'Reach', 'Payment'].map(h => (
                      <div key={h} style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle }}>{h}</div>
                    ))}
                  </div>
                  {campLinks.map(link => {
                    const creator = getCreator(link.creator_id)
                    if (!creator) return null
                    return (
                      <div key={link.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 2fr) repeat(5, minmax(80px, 1fr))', padding: '12px 20px', borderBottom: `0.5px solid ${border}`, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {creator.photo_url
                            ? <img src={creator.photo_url} alt={creator.name} style={{ width: '28px', height: '28px', borderRadius: '2px', objectFit: 'cover', border: `0.5px solid ${border2}`, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                            : <div style={{ width: '28px', height: '28px', borderRadius: '2px', background: dark ? '#2A2A2A' : '#E0DCD6', border: `0.5px solid ${border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '10px', color: text, flexShrink: 0 }}>{creator.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                          }
                          <div>
                            <div style={{ fontSize: '12px', color: text }}>{creator.name}</div>
                            {creator.handles?.instagram && <div style={{ fontSize: '9px', color: muted }}>@{creator.handles.instagram}</div>}
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: muted }}>{link.role || '—'}</div>
                        <div style={{ fontSize: '12px', color: text }}>{link.views?.toLocaleString() || '—'}</div>
                        <div style={{ fontSize: '12px', color: text }}>{link.likes?.toLocaleString() || '—'}</div>
                        <div style={{ fontSize: '12px', color: text }}>{link.reach?.toLocaleString() || '—'}</div>
                        <div>
                          <span style={{ padding: '2px 6px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', border: `0.5px solid ${link.payment_status === 'Paid' ? '#5C9E52' : '#888'}`, color: link.payment_status === 'Paid' ? '#5C9E52' : '#888', borderRadius: '1px' }}>{link.payment_status || 'Pending'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedCampaign === c.id && campLinks.length === 0 && (
                <div style={{ padding: '16px 20px', background: dark ? '#1A1A1A' : '#F8F6F2', borderTop: `0.5px solid ${border}`, fontSize: '12px', color: subtle }}>No talent assigned to this campaign yet.</div>
              )}
            </div>
          )
        })}
      </div>

      {campaigns.length === 0 && (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>No campaigns yet</div>
          <div style={{ fontSize: '12px', color: muted }}>Create your first campaign to see reports here</div>
        </div>
      )}

    </div>
  )
}
