import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'

const BRAND_COLORS = ['#5b7c99', '#7A9B8E', '#A67C52', '#9B7A9B', '#8E7A5B', '#4A6B7A', '#7A5B6B', '#6B7A4A']
const brandColor = (name) => {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length]
}
const brandInitial = (name) => (name || '?').trim().charAt(0).toUpperCase()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Plain, customer-facing stages — internal statuses never surface as labels.
const STAGES = ['Pitched', 'Active', 'Closed']
const STAGE_COLOR = { Pitched: '#9CA3AF', Active: '#5b7c99', Closed: '#5C9E52', Stalled: '#B85A52' }
const stageOf = (status) => {
  if (status === 'Pitch') return 'Pitched'
  if (status === 'Completed') return 'Closed'
  if (status === 'Cancelled' || status === 'Dead') return 'Stalled'
  return 'Active' // Active, Contract Pending, Pending Payment
}

function campaignDate(c) {
  const d = c.start_date || c.created_at
  if (!d) return null
  return String(d).includes('T') ? new Date(d) : new Date(d + 'T00:00:00')
}

export default function ReportsView({ dark = true, orgId, focusVersion = 0, active = false, initialMonth, initialYear }) {
  const bg = dark ? '#1A1A1A' : '#F8F7F3'
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const border2 = dark ? '#3A3A3A' : '#CCC7BF'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'

  const [campaigns, setCampaigns] = useState([])
  const [links, setLinks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(initialYear || new Date().getFullYear())
  const [month, setMonth] = useState(initialMonth ?? 'all') // 'all' or 0..11
  const [view, setView] = useState('overview') // 'overview' | 'team'
  const [expandedMember, setExpandedMember] = useState(null)
  const [highlightMember, setHighlightMember] = useState(null)

  useEffect(() => { fetchAll() }, [orgId])
  useEffect(() => { if (focusVersion > 0) fetchAll() }, [focusVersion])

  // Each monthly snapshot has its own shareable URL: /reports/<month>-<year>.
  useEffect(() => {
    if (!active) {
      if (window.location.pathname.startsWith('/reports')) window.history.replaceState({}, '', '/')
      return
    }
    const path = month === 'all' ? '/reports' : `/reports/${MONTHS[month].toLowerCase()}-${year}`
    if (window.location.pathname !== path) window.history.replaceState({}, '', path)
  }, [month, year, active])

  async function fetchAll() {
    setLoading(true)
    const [{ data: camps }, { data: lnks }, { data: mems }] = await Promise.all([
      supabase.from('campaigns').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
      supabase.from('campaign_creators').select('campaign_id, creator_id'),
      supabase.from('profiles').select('id, full_name, email, avatar_url').eq('org_id', orgId)
    ])
    setCampaigns(camps || [])
    setLinks(lnks || [])
    setMembers(mems || [])
    setLoading(false)
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const availableYears = useMemo(() => {
    const ys = new Set([currentYear])
    campaigns.forEach(c => { const d = campaignDate(c); if (d) ys.add(d.getFullYear()) })
    return [...ys].sort((a, b) => b - a)
  }, [campaigns])

  const yearCampaigns = useMemo(() => campaigns.filter(c => {
    const d = campaignDate(c); return d && d.getFullYear() === year
  }), [campaigns, year])

  const scopedCampaigns = useMemo(() => {
    if (month === 'all') return yearCampaigns
    return yearCampaigns.filter(c => { const d = campaignDate(c); return d && d.getMonth() === month })
  }, [yearCampaigns, month])

  const scopedLinks = useMemo(() => {
    const ids = new Set(scopedCampaigns.map(c => c.id))
    return links.filter(l => ids.has(l.campaign_id))
  }, [scopedCampaigns, links])

  const primary = useMemo(() => {
    const pitchesSent = scopedCampaigns.length
    const dealsClosed = scopedCampaigns.filter(c => c.status === 'Completed').length
    const peopleInvolved = new Set(scopedLinks.map(l => l.creator_id)).size
    const rate = pitchesSent ? Math.round((dealsClosed / pitchesSent) * 100) : 0
    return { pitchesSent, dealsClosed, peopleInvolved, rate }
  }, [scopedCampaigns, scopedLinks])

  const secondary = useMemo(() => ({
    active: scopedCampaigns.filter(c => stageOf(c.status) === 'Active').length,
    stalled: scopedCampaigns.filter(c => stageOf(c.status) === 'Stalled').length,
  }), [scopedCampaigns])

  const monthlyByStage = useMemo(() => MONTHS.map((m, i) => {
    const inMonth = yearCampaigns.filter(c => { const d = campaignDate(c); return d && d.getMonth() === i })
    const counts = { Pitched: 0, Active: 0, Closed: 0, Stalled: 0 }
    inMonth.forEach(c => { counts[stageOf(c.status)]++ })
    return { month: m, counts, total: inMonth.length }
  }), [yearCampaigns])
  const maxStageCount = Math.max(1, ...monthlyByStage.flatMap(m => STAGES.map(s => m.counts[s])))

  const monthlyBudget = useMemo(() => MONTHS.map((m, i) => {
    const total = yearCampaigns
      .filter(c => { const d = campaignDate(c); return d && d.getMonth() === i })
      .reduce((sum, c) => sum + (Number(c.budget) || 0), 0)
    return { month: m, total }
  }), [yearCampaigns])
  const maxBudget = Math.max(...monthlyBudget.map(m => m.total), 1)
  const scopedBudget = scopedCampaigns.reduce((s, c) => s + (Number(c.budget) || 0), 0)

  const snap = useMemo(() => {
    if (month === 'all') return null
    const closed = scopedCampaigns.filter(c => c.status === 'Completed')
    const stalled = scopedCampaigns.filter(c => stageOf(c.status) === 'Stalled')
    return {
      pitched: scopedCampaigns.length,
      closed: closed.length,
      talent: new Set(scopedLinks.map(l => l.creator_id)).size,
      closedBudget: closed.reduce((s, c) => s + (Number(c.budget) || 0), 0),
      stalled,
    }
  }, [month, scopedCampaigns, scopedLinks])

  // Team members on a campaign = the union of who pitched / manages / closed it.
  const teamIdsOf = (c) => [...new Set([c.pitched_by, c.campaign_manager, c.closed_by].filter(Boolean))]
  const memberById = (id) => members.find(m => m.id === id)
  const memberName = (id) => { const m = memberById(id); return m?.full_name || m?.email || 'Unknown' }

  const daysSince = (iso) => {
    if (!iso) return null
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
  }

  // One card per team member: Pitches / Active / Closed for the period, plus their campaigns.
  const teamCards = useMemo(() => {
    const map = new Map()
    scopedCampaigns.forEach(c => {
      teamIdsOf(c).forEach(mid => {
        const e = map.get(mid) || { pitch: 0, active: 0, closed: 0, managing: 0, campaigns: [] }
        if (c.status === 'Pitch') e.pitch++
        else if (c.status === 'Active' || c.status === 'Contract Pending') e.active++
        else if (c.status === 'Completed') e.closed++
        if (c.campaign_manager === mid) e.managing++
        e.campaigns.push(c)
        map.set(mid, e)
      })
    })
    return [...map.entries()]
      .map(([id, e]) => ({ id, name: memberName(id), avatar: memberById(id)?.avatar_url, ...e }))
      .sort((a, b) => b.closed - a.closed || a.name.localeCompare(b.name))
  }, [scopedCampaigns, members])

  // Overview highlights — no long lists, just the few that matter.
  const closedCampaigns = useMemo(() => scopedCampaigns.filter(c => c.status === 'Completed'), [scopedCampaigns])
  const topClosed = useMemo(() => (
    [...closedCampaigns].sort((a, b) => (Number(b.budget) || 0) - (Number(a.budget) || 0)).slice(0, 3)
  ), [closedCampaigns])
  const longestSitting = useMemo(() => (
    scopedCampaigns
      .filter(c => c.status !== 'Completed')
      .map(c => ({ c, days: daysSince(c.updated_at || c.created_at) || 0 }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 3)
  ), [scopedCampaigns])

  const periodLabel = month === 'all' ? year : `${MONTHS[month]} ${year}`
  const periodWord = month === 'all' ? 'this year' : 'this month'

  const section = (label) => (
    <div style={{ marginTop: '32px', marginBottom: '14px', paddingTop: '16px', borderTop: `0.5px solid ${border}` }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.07em', color: text, opacity: 0.4 }}>{label}</div>
    </div>
  )

  const avatarEl = (url, name, size = 28) => url
    ? <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: '#5b7c99', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.4), fontWeight: 500, flexShrink: 0 }}>{(name || '?').trim().charAt(0).toUpperCase()}</div>

  const bigStat = (value, label, color) => (
    <div style={{ flex: '1 1 110px' }}>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '46px', lineHeight: 1, color: color || text }}>{value}</div>
      <div style={{ fontSize: '11px', color: muted, marginTop: '8px' }}>{label}</div>
    </div>
  )

  const RateRing = ({ percent }) => {
    const size = 132, sw = 9, r = (size - sw) / 2, circ = 2 * Math.PI * r
    const dash = (circ * Math.min(100, Math.max(0, percent))) / 100
    const track = dark ? '#2E2E2E' : '#E6E2DB'
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={sw} fill='none' />
          <circle cx={size / 2} cy={size / 2} r={r} stroke={STAGE_COLOR.Closed} strokeWidth={sw} fill='none' strokeDasharray={`${dash} ${circ}`} strokeLinecap='round' />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '34px', lineHeight: 1, color: text }}>{percent}%</div>
        </div>
      </div>
    )
  }

  // A single highlight row (brand logo + name + a right-hand value).
  const highlightRow = (c, rightTop, rightSub, i) => (
    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderTop: i === 0 ? 'none' : `0.5px solid ${border}` }}>
      {c.brand_logo_url
        ? <img src={c.brand_logo_url} alt={c.brand} style={{ width: '30px', height: '30px', objectFit: 'contain', borderRadius: '4px', border: `0.5px solid ${border2}`, background: '#fff', padding: '2px', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
        : <div style={{ width: '30px', height: '30px', borderRadius: '4px', background: brandColor(c.brand || c.name || '?'), color: '#fff', fontFamily: 'Georgia, serif', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{brandInitial(c.brand || c.name || '?')}</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '9px', color: muted, opacity: 0.7, marginBottom: '2px' }}>{c.brand || 'No brand'}</div>
        <div style={{ fontSize: '13px', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '13px', color: text, fontWeight: 500 }}>{rightTop}</div>
        <div style={{ fontSize: '10px', color: subtle, marginTop: '2px' }}>{rightSub}</div>
      </div>
    </div>
  )

  // Per-person bar graph: Pitched / Active / Closed (pipeline colours) + a distinct Managing bar.
  const MANAGING_COLOR = dark ? '#A88FC0' : '#8A6FB0'
  const trackBg = dark ? '#2A2A2A' : '#ECE9E3'
  const barRow = (label, count, total, color, prominent) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ width: '52px', fontSize: '9px', color: muted, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: prominent ? '9px' : '7px', background: trackBg, borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: total ? (count / total) * 100 + '%' : '0%', height: '100%', background: color, borderRadius: '4px' }} />
      </div>
      <span style={{ width: '14px', textAlign: 'right', fontSize: '11px', color: text, fontWeight: prominent ? 600 : 400, flexShrink: 0 }}>{count}</span>
    </div>
  )
  const miniBars = (p) => {
    const total = p.campaigns.length || 1
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {barRow('Pitched', p.pitch, total, STAGE_COLOR.Pitched, false)}
        {barRow('Active', p.active, total, STAGE_COLOR.Active, false)}
        {barRow('Closed', p.closed, total, STAGE_COLOR.Closed, true)}
        {barRow('Managing', p.managing, total, MANAGING_COLOR, false)}
      </div>
    )
  }

  if (loading) return (
    <div style={{ padding: '40px 28px', color: subtle, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: bg, padding: '28px' }}>

      {/* View tabs + year/month pickers */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[['overview', 'Overview'], ['team', 'Team']].map(([v, lbl]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '8px 18px', fontSize: '12px', cursor: 'pointer',
              background: view === v ? '#5b7c99' : 'transparent',
              color: view === v ? '#fff' : muted,
              border: `0.5px solid ${view === v ? '#5b7c99' : border2}`,
              borderRadius: '20px', fontWeight: view === v ? 500 : 400
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.2em', textTransform: 'uppercase', marginRight: '6px' }}>Year</div>
            {availableYears.map(y => (
              <button key={y} onClick={() => setYear(y)} style={{
                padding: '5px 12px', fontSize: '10px', letterSpacing: '0.14em',
                background: y === year ? '#5b7c99' : 'none', color: y === year ? '#fff' : muted,
                border: `0.5px solid ${y === year ? '#5b7c99' : border2}`, borderRadius: '4px', cursor: 'pointer'
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
              borderRadius: '4px', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='${month !== 'all' ? '%23ffffff' : encodeURIComponent(muted)}' stroke-width='3' stroke-linecap='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center'
            }}>
              <option value='all'>All months</option>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {view === 'overview' && (
        <>
          {/* Hero: performance ring + editorial-scale stats */}
          <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '4px', padding: '28px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <RateRing percent={primary.rate} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: text }}>Pitch-to-close rate</div>
                <div style={{ fontSize: '11px', color: subtle, marginTop: '2px' }}>{primary.dealsClosed} of {primary.pitchesSent}</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '240px', display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
              {bigStat(primary.pitchesSent, 'Pitches sent')}
              {bigStat(primary.dealsClosed === 0 ? '0' : primary.dealsClosed, primary.dealsClosed === 0 ? 'Deals closed — nothing yet' : 'Deals closed', primary.dealsClosed === 0 ? STAGE_COLOR.Stalled : undefined)}
              {bigStat(primary.peopleInvolved, 'People involved')}
            </div>
          </div>

          {/* Secondary stats */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', padding: '4px 2px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: muted }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: STAGE_COLOR.Active }} />
              <span style={{ color: text, fontWeight: 500 }}>{secondary.active}</span> active
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: muted }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: STAGE_COLOR.Stalled }} />
              <span style={{ color: text, fontWeight: 500 }}>{secondary.stalled}</span> stalled
            </div>
          </div>

          {/* Monthly snapshot */}
          {snap && (
            <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '4px', padding: '24px', marginTop: '20px' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: text, marginBottom: '18px' }}>How we did in {MONTHS_FULL[month]}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '20px' }}>
                {[
                  [snap.pitched, 'Campaigns pitched'],
                  [snap.closed, 'Deals closed'],
                  [snap.talent, 'Talent involved'],
                  ['$' + snap.closedBudget.toLocaleString(), 'Budget (closed deals)'],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: text, lineHeight: 1 }}>{v}</div>
                    <div style={{ fontSize: '11px', color: muted, marginTop: '5px' }}>{l}</div>
                  </div>
                ))}
              </div>
              {snap.stalled.length > 0 && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `0.5px solid ${border}` }}>
                  <div style={{ fontSize: '11px', color: muted, marginBottom: '8px' }}>Stalled this month</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {snap.stalled.map(c => (
                      <span key={c.id} style={{ fontSize: '11px', color: text, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${STAGE_COLOR.Stalled}55` }}>{c.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pipeline by month: Pitched → Active → Closed */}
          <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '4px', padding: '24px', marginTop: '20px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text }}>Pipeline by month</div>
              <div style={{ display: 'flex', gap: '14px' }}>
                {STAGES.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: muted }}>
                    <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: STAGE_COLOR[s] }} />{s}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: '10px', color: muted, marginBottom: '20px' }}>{year} — campaigns by start date</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '170px' }}>
              {monthlyByStage.map((m, i) => {
                const isSelected = month !== 'all' && i === month
                const isCurrent = i === currentMonth && year === currentYear
                const dim = month !== 'all' && !isSelected
                return (
                  <div key={m.month} onClick={() => setMonth(month === i ? 'all' : i)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '5px', opacity: dim ? 0.35 : 1, cursor: 'pointer', transition: 'opacity 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '130px', width: '100%', justifyContent: 'center' }}>
                      {STAGES.map(s => {
                        const v = m.counts[s]
                        const isClosed = s === 'Closed'
                        const barColor = isClosed
                          ? STAGE_COLOR.Closed
                          : s === 'Active'
                            ? (dark ? 'rgba(91,124,153,0.6)' : 'rgba(91,124,153,0.55)')
                            : (dark ? 'rgba(156,163,175,0.40)' : 'rgba(150,150,150,0.42)')
                        const zeroClosed = isClosed && v === 0 && m.total > 0
                        return (
                          <div key={s} title={`${s}: ${v}`} style={{ flex: 1, maxWidth: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '2px' }}>
                            {v > 0 && <div style={{ fontSize: '8px', color: isClosed ? STAGE_COLOR.Closed : muted, fontWeight: isClosed ? 600 : 400 }}>{v}</div>}
                            <div style={{
                              width: '100%',
                              height: v > 0 ? Math.max((v / maxStageCount) * 108, 5) + 'px' : (zeroClosed ? '6px' : '3px'),
                              background: v > 0 ? barColor : (zeroClosed ? (dark ? 'rgba(92,158,82,0.22)' : 'rgba(92,158,82,0.28)') : (dark ? '#1E1E1E' : '#E8E4DE')),
                              borderRadius: '2px 2px 0 0'
                            }} />
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: '9px', color: isSelected || isCurrent ? '#5b7c99' : muted, fontWeight: isSelected || isCurrent ? 600 : 400 }}>{m.month}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Budget by month — secondary chart */}
          <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '4px', padding: '24px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '2px' }}>Budget by month</div>
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
                    {m.total > 0 && <div style={{ fontSize: '8px', color: '#5b7c99', fontWeight: 500, whiteSpace: 'nowrap' }}>{'$' + (m.total >= 1000 ? (m.total / 1000).toFixed(0) + 'K' : m.total)}</div>}
                    <div style={{ width: '100%', background: m.total > 0 ? (isCurrent || isSelected ? '#5b7c99' : (dark ? '#2A3A4A' : '#C4D4E0')) : (dark ? '#1E1E1E' : '#E8E4DE'), borderRadius: '2px 2px 0 0', height: m.total > 0 ? Math.max((m.total / maxBudget) * 90, 6) + 'px' : '3px', transition: 'height 0.3s ease' }} />
                    <div style={{ fontSize: '8px', color: isSelected || isCurrent ? '#5b7c99' : muted, letterSpacing: '0.06em', fontWeight: isSelected || isCurrent ? 600 : 400 }}>{m.month}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Team snapshot — at-a-glance strip (full breakdown lives on the Team tab) */}
          {teamCards.length > 0 && (
            <>
              {section(`Team snapshot — ${periodLabel}`)}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                {teamCards.map(p => (
                  <div key={p.id} onClick={() => { setHighlightMember(p.id); setView('team') }}
                    title={`View ${p.name} on the Team tab`}
                    style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '6px', padding: '14px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = border2}
                    onMouseLeave={e => e.currentTarget.style.borderColor = border}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px', minWidth: 0 }}>
                      {avatarEl(p.avatar, p.name, 28)}
                      <span style={{ fontSize: '12px', color: text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    </div>
                    {miniBars(p)}
                    <div style={{ fontSize: '10px', color: muted, marginTop: '10px' }}>Managing {p.managing} campaign{p.managing === 1 ? '' : 's'}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Highlights — a short strip, no long lists */}
          {section(`Highlights — ${periodLabel}`)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderBottom: `0.5px solid ${border}` }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STAGE_COLOR.Closed }} />
                <span style={{ fontSize: '13px', color: text, fontWeight: 500 }}>Top closed deals</span>
              </div>
              {topClosed.length === 0
                ? <div style={{ padding: '26px 18px', fontSize: '12px', color: subtle, fontStyle: 'italic' }}>Nothing closed {periodWord}</div>
                : topClosed.map((c, i) => highlightRow(c, c.budget != null ? '$' + Number(c.budget).toLocaleString() : '—', 'deal value', i))
              }
            </div>
            <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderBottom: `0.5px solid ${border}` }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STAGE_COLOR.Stalled }} />
                <span style={{ fontSize: '13px', color: text, fontWeight: 500 }}>Longest sitting</span>
              </div>
              {longestSitting.length === 0
                ? <div style={{ padding: '26px 18px', fontSize: '12px', color: subtle, fontStyle: 'italic' }}>Nothing open {periodWord}</div>
                : longestSitting.map(({ c, days }, i) => highlightRow(c, `${days} ${days === 1 ? 'day' : 'days'}`, stageOf(c.status).toLowerCase(), i))
              }
            </div>
          </div>
        </>
      )}

      {view === 'team' && (
        teamCards.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>No team members assigned in {periodLabel}</div>
            <div style={{ fontSize: '12px', color: muted }}>Assign Pitched By / Campaign Manager / Deal Closed By on campaigns to see them here</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
            {teamCards.map((p, idx) => {
              const isTop = idx === 0 && p.closed > 0
              const expanded = expandedMember === p.id
              const shown = expanded ? p.campaigns : p.campaigns.slice(0, 3)
              return (
                <div key={p.id} style={{ background: card, border: `${highlightMember === p.id ? '1.5px' : '0.5px'} solid ${highlightMember === p.id ? '#5b7c99' : (isTop ? STAGE_COLOR.Closed + '88' : border)}`, borderRadius: '6px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {avatarEl(p.avatar, p.name, 38)}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 500, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      {isTop && <div style={{ fontSize: '9px', letterSpacing: '0.06em', color: STAGE_COLOR.Closed, marginTop: '2px' }}>Top closer</div>}
                    </div>
                  </div>

                  <div>
                    {miniBars(p)}
                    <div style={{ fontSize: '11px', color: muted, marginTop: '12px' }}>Managing {p.managing} campaign{p.managing === 1 ? '' : 's'}</div>
                  </div>

                  {p.campaigns.length > 0 && (
                    <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                      {shown.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', minWidth: 0 }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: STAGE_COLOR[stageOf(c.status)], flexShrink: 0 }} />
                          <span style={{ color: text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                          <span style={{ color: subtle, flexShrink: 0, maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.brand || ''}</span>
                        </div>
                      ))}
                      {p.campaigns.length > 3 && (
                        <button onClick={() => setExpandedMember(expanded ? null : p.id)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#5b7c99', cursor: 'pointer', fontSize: '11px', padding: '2px 0' }}>
                          {expanded ? 'Show less' : `See all ${p.campaigns.length}`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

    </div>
  )
}
