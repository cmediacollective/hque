import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'

const BRAND_COLORS = ['#5b7c99', '#7A9B8E', '#A67C52', '#9B7A9B', '#8E7A5B', '#4A6B7A', '#7A5B6B', '#6B7A4A']
const brandColor = (name) => {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length]
}
const brandInitial = (name) => (name || '?').trim().charAt(0).toUpperCase()

const STATUSES = ['Pitch', 'Contract Pending', 'Active', 'Pending Payment', 'Completed', 'Cancelled', 'Dead']
const STATUS_COLOR = {
  'Pitch': '#9CA3AF',
  'Contract Pending': '#A67C52',
  'Active': '#5b7c99',
  'Pending Payment': '#C4962E',
  'Completed': '#5C9E52',
  'Cancelled': '#B85A52',
  'Dead': '#5A5A5A'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function campaignDate(c) {
  const d = c.start_date || c.created_at
  if (!d) return null
  return String(d).includes('T') ? new Date(d) : new Date(d + 'T00:00:00')
}

export default function ReportsView({ dark = true, orgId, focusVersion = 0 }) {
  const bg = dark ? '#1A1A1A' : '#F8F7F3'
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const border2 = dark ? '#3A3A3A' : '#CCC7BF'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'

  const [campaigns, setCampaigns] = useState([])
  const [links, setLinks] = useState([])
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState('all') // 'all' or 0..11

  useEffect(() => { fetchAll() }, [orgId])
  // Refresh after the tab regains focus from a long absence.
  useEffect(() => { if (focusVersion > 0) fetchAll() }, [focusVersion])

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

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const availableYears = useMemo(() => {
    const ys = new Set([currentYear])
    campaigns.forEach(c => {
      const d = campaignDate(c)
      if (d) ys.add(d.getFullYear())
    })
    return [...ys].sort((a, b) => b - a)
  }, [campaigns])

  const yearCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const d = campaignDate(c)
      return d && d.getFullYear() === year
    })
  }, [campaigns, year])

  // Further filtered by month if a specific month is picked.
  const scopedCampaigns = useMemo(() => {
    if (month === 'all') return yearCampaigns
    return yearCampaigns.filter(c => {
      const d = campaignDate(c)
      return d && d.getMonth() === month
    })
  }, [yearCampaigns, month])

  const statusCounts = useMemo(() => {
    const counts = {}
    STATUSES.forEach(s => counts[s] = 0)
    scopedCampaigns.forEach(c => {
      if (counts[c.status] != null) counts[c.status]++
    })
    return counts
  }, [scopedCampaigns])

  const monthlyByStatus = useMemo(() => {
    return MONTHS.map((m, i) => {
      const inMonth = yearCampaigns.filter(c => {
        const d = campaignDate(c)
        return d && d.getMonth() === i
      })
      const byStatus = {}
      STATUSES.forEach(s => byStatus[s] = 0)
      inMonth.forEach(c => { if (byStatus[c.status] != null) byStatus[c.status]++ })
      return { month: m, total: inMonth.length, byStatus }
    })
  }, [yearCampaigns])

  const maxMonthlyCount = Math.max(...monthlyByStatus.map(m => m.total), 1)

  const monthlyBudget = useMemo(() => {
    return MONTHS.map((m, i) => {
      const total = yearCampaigns
        .filter(c => {
          const d = campaignDate(c)
          return d && d.getMonth() === i
        })
        .reduce((sum, c) => sum + (Number(c.budget) || 0), 0)
      return { month: m, total }
    })
  }, [yearCampaigns])

  const maxBudget = Math.max(...monthlyBudget.map(m => m.total), 1)
  const scopedBudget = scopedCampaigns.reduce((s, c) => s + (Number(c.budget) || 0), 0)

  const scopedLinks = useMemo(() => {
    const ids = new Set(scopedCampaigns.map(c => c.id))
    return links.filter(l => ids.has(l.campaign_id))
  }, [scopedCampaigns, links])
  const paidScoped = scopedLinks.filter(l => l.payment_status === 'Paid').length
  const pendingScoped = scopedLinks.filter(l => l.payment_status !== 'Paid').length

  const campaignLinks = (campaignId) => links.filter(l => l.campaign_id === campaignId)
  const getCreator = (id) => creators.find(c => c.id === id)
  const statusColor = (s) => STATUS_COLOR[s] || '#888'

  const section = (label) => (
    <div style={{ fontSize: '8px', letterSpacing: '0.24em', textTransform: 'uppercase', color: subtle, marginBottom: '12px', marginTop: '32px' }}>{label}</div>
  )

  if (loading) return (
    <div style={{ padding: '40px 28px', color: subtle, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: bg, padding: '28px' }}>

      {/* Year/month pickers */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.2em', textTransform: 'uppercase', marginRight: '6px' }}>Year</div>
            {availableYears.map(y => (
              <button key={y} onClick={() => setYear(y)} style={{
                padding: '5px 12px', fontSize: '10px', letterSpacing: '0.14em',
                background: y === year ? '#5b7c99' : 'none',
                color: y === year ? '#fff' : muted,
                border: `0.5px solid ${y === year ? '#5b7c99' : border2}`,
                borderRadius: '1px', cursor: 'pointer'
              }}>{y}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.2em', textTransform: 'uppercase', marginRight: '6px' }}>Month</div>
            <select value={month} onChange={e => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={{
              padding: '5px 22px 5px 10px', fontSize: '10px', letterSpacing: '0.14em',
              backgroundColor: month !== 'all' ? '#5b7c99' : (dark ? '#141414' : '#fff'),
              color: month !== 'all' ? '#fff' : muted,
              border: `0.5px solid ${month !== 'all' ? '#5b7c99' : border2}`,
              borderRadius: '1px', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='${month !== 'all' ? '%23ffffff' : encodeURIComponent(muted)}' stroke-width='3' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center'
            }}>
              <option value='all'>All months</option>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Status totals — one card per status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '20px' }}>
        {STATUSES.map(s => (
          <div key={s} style={{ padding: '14px 14px', background: card, border: `0.5px solid ${border}`, borderRadius: '1px' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: text, marginBottom: '4px' }}>{statusCounts[s]}</div>
            <div style={{ fontSize: '8px', color: STATUS_COLOR[s], letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600 }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Per-month stacked bar chart */}
      <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '24px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '2px' }}>Campaign Activity by Month</div>
            <div style={{ fontSize: '10px', color: muted }}>{year} — by start date, includes archived</div>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: text }}>{scopedCampaigns.length} <span style={{ fontSize: '11px', color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginLeft: '6px' }}>{month === 'all' ? 'campaigns' : MONTHS[month] + ' campaigns'}</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '180px' }}>
          {monthlyByStatus.map((m, i) => {
            const isCurrent = i === currentMonth && year === currentYear
            const isSelected = month !== 'all' && i === month
            const dim = month !== 'all' && !isSelected
            return (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end', opacity: dim ? 0.3 : 1, transition: 'opacity 0.15s' }}>
                {m.total > 0 && (
                  <div style={{ fontSize: '10px', color: text, fontWeight: 500 }}>{m.total}</div>
                )}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column-reverse', height: m.total > 0 ? Math.max((m.total / maxMonthlyCount) * 130, 8) + 'px' : '3px', overflow: 'hidden', borderRadius: '2px 2px 0 0', background: m.total === 0 ? (dark ? '#1E1E1E' : '#E8E4DE') : 'transparent' }}>
                  {STATUSES.map(s => {
                    const count = m.byStatus[s]
                    if (count === 0) return null
                    return <div key={s} title={`${s}: ${count}`} style={{ height: ((count / m.total) * 100) + '%', background: STATUS_COLOR[s] }} />
                  })}
                </div>
                <div style={{ fontSize: '9px', color: isSelected ? '#5b7c99' : (isCurrent ? '#5b7c99' : muted), letterSpacing: '0.06em', fontWeight: isSelected || isCurrent ? 600 : 400 }}>{m.month}</div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '20px', paddingTop: '16px', borderTop: `0.5px solid ${border}` }}>
          {STATUSES.map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: muted }}>
              <div style={{ width: '10px', height: '10px', background: STATUS_COLOR[s], borderRadius: '1px' }} />
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Budget Chart */}
      <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '24px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '2px' }}>Budget by Month</div>
            <div style={{ fontSize: '10px', color: muted }}>{year} — based on campaign start dates</div>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: text }}>${scopedBudget.toLocaleString()}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px' }}>
          {monthlyBudget.map((m, i) => {
            const isCurrent = i === currentMonth && year === currentYear
            const isSelected = month !== 'all' && i === month
            const dim = month !== 'all' && !isSelected
            return (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end', opacity: dim ? 0.3 : 1, transition: 'opacity 0.15s' }}>
                {m.total > 0 && <div style={{ fontSize: '8px', color: '#5b7c99', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {'$' + (m.total >= 1000 ? (m.total / 1000).toFixed(0) + 'K' : m.total)}
                </div>}
                <div style={{ width: '100%', background: m.total > 0 ? (isCurrent || isSelected ? '#5b7c99' : (dark ? '#2A3A4A' : '#C4D4E0')) : (dark ? '#1E1E1E' : '#E8E4DE'), borderRadius: '1px 1px 0 0', height: m.total > 0 ? Math.max((m.total / maxBudget) * 90, 6) + 'px' : '3px', transition: 'height 0.3s ease' }} />
                <div style={{ fontSize: '8px', color: isSelected || isCurrent ? '#5b7c99' : muted, letterSpacing: '0.06em', fontWeight: isSelected || isCurrent ? 600 : 400 }}>{m.month}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payments + Talent summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '8px' }}>
        <div style={{ padding: '20px', background: card, border: `0.5px solid ${border}`, borderRadius: '1px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: text, marginBottom: '4px' }}>{paidScoped} <span style={{ fontSize: '12px', color: muted }}>paid</span></div>
          <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Payments — {month === 'all' ? year : `${MONTHS[month]} ${year}`}</div>
          <div style={{ fontSize: '10px', color: muted, marginTop: '6px' }}>{pendingScoped} pending</div>
        </div>
        <div style={{ padding: '20px', background: card, border: `0.5px solid ${border}`, borderRadius: '1px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: text, marginBottom: '4px' }}>{creators.length}</div>
          <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Total Talent</div>
        </div>
      </div>

      {section(`Campaign Breakdown — ${month === 'all' ? year : `${MONTHS[month]} ${year}`}`)}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: border, borderRadius: '1px', overflow: 'hidden' }}>
        {scopedCampaigns.map(c => {
          const campLinks = campaignLinks(c.id)
          const paid = campLinks.filter(l => l.payment_status === 'Paid').length
          const pending = campLinks.filter(l => l.payment_status !== 'Paid').length
          const hasPerformance = campLinks.some(l => l.views || l.likes || l.reach)
          const totalViews = campLinks.reduce((sum, l) => sum + (l.views || 0), 0)
          const totalReach = campLinks.reduce((sum, l) => sum + (l.reach || 0), 0)

          return (
            <div key={c.id}>
              <div
                onClick={() => setSelectedCampaign(selectedCampaign === c.id ? null : c.id)}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 20px', background: card, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? '#282828' : '#F5F2EC'}
                onMouseLeave={e => e.currentTarget.style.background = card}>

                {c.brand_logo_url
                  ? <img src={c.brand_logo_url} alt={c.brand} style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '2px', border: `0.5px solid ${border2}`, background: '#fff', padding: '3px', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ width: '44px', height: '44px', borderRadius: '2px', background: brandColor(c.brand || c.name || '?'), color: '#fff', fontFamily: 'Georgia, serif', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{brandInitial(c.brand || c.name || '?')}</div>
                }

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '8px', color: '#5b7c99', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '3px' }}>{c.brand || 'No brand'}{c.archived && <span style={{ marginLeft: '8px', color: subtle }}>· archived</span>}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', paddingLeft: '48px' }}>
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
                    {['Talent', 'Role', 'Views', 'Likes', 'Reach', 'Payment'].map(h => (
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

      {scopedCampaigns.length === 0 && (
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>No campaigns in {month === 'all' ? year : `${MONTHS[month]} ${year}`}</div>
          <div style={{ fontSize: '12px', color: muted }}>Try a different month or year, or create a new campaign</div>
        </div>
      )}

    </div>
  )
}
