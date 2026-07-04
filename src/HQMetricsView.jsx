import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Date-range presets for the Google Analytics section.
const RANGE_ORDER = [
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['90d', 'Last 90 days'],
  ['tm', 'This month'],
  ['lm', 'Last month'],
]

// Turn a preset key into concrete YYYY-MM-DD start/end dates (computed now).
function rangeDates(key) {
  const today = new Date()
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const back = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d }
  const cy = today.getFullYear(), cm = today.getMonth()
  if (key === '7d') return { start: fmt(back(6)), end: fmt(today) }
  if (key === '90d') return { start: fmt(back(89)), end: fmt(today) }
  if (key === 'tm') return { start: fmt(new Date(cy, cm, 1)), end: fmt(today) }
  if (key === 'lm') return { start: fmt(new Date(cy, cm - 1, 1)), end: fmt(new Date(cy, cm, 0)) }
  return { start: fmt(back(29)), end: fmt(today) } // 30d default
}

// HQ Metrics — a master-admin-only marketing/business dashboard for the HQue team.
// Shows the numbers that live in OUR database (subscribers, plans, AppSumo
// redemptions, signups) and links out to Stripe + Google Analytics for the money
// and traffic detail that lives there. Data comes from the hq-metrics function,
// which double-checks the caller is a platform admin before returning anything.
export default function HQMetricsView({ dark = true }) {
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const accent = '#5b7c99'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ga, setGa] = useState(null)
  const [gaLoading, setGaLoading] = useState(true)
  const [range, setRange] = useState('30d')

  const rangeLabel = (RANGE_ORDER.find(([k]) => k === range) || [])[1] || ''

  useEffect(() => { load() }, [])
  useEffect(() => { loadGA(range) }, [range])

  async function loadGA(key) {
    setGaLoading(true)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (token) {
        const { start, end } = rangeDates(key)
        const res = await fetch(`/.netlify/functions/ga-metrics?start=${start}&end=${end}`, { headers: { Authorization: `Bearer ${token}` } })
        const body = await res.json().catch(() => ({}))
        if (res.ok && body.ok) setGa(body)
      }
    } catch (e) { /* GA is optional — never block the page */ }
    setGaLoading(false)
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) { setError('Please sign in again.'); setLoading(false); return }
      const res = await fetch('/.netlify/functions/hq-metrics', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.ok) {
        setError(res.status === 403 ? 'This dashboard is master-admin only.' : (body.reason || 'Could not load metrics.'))
        setLoading(false)
        return
      }
      setData(body)
    } catch (e) {
      setError('Could not reach the metrics service.')
    }
    setLoading(false)
  }

  const sectionLabel = (t) => (
    <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: subtle, marginBottom: '14px' }}>{t}</div>
  )

  const wrap = { flex: 1, overflow: 'auto', padding: '28px', maxWidth: '1100px', width: '100%' }

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div style={{ fontSize: '9px', color: subtle, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Loading…</div>
    </div>
  )

  if (error) return (
    <div style={wrap}>
      <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '3px', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '8px' }}>Couldn’t load metrics</div>
        <div style={{ fontSize: '12px', color: muted, marginBottom: '20px' }}>{error}</div>
        <button onClick={load} style={btn(accent)}>Try again</button>
      </div>
    </div>
  )

  const s = data.subscribers
  const a = data.appsumo
  const g = data.signups

  return (
    <div style={wrap}>
      <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7, marginBottom: '28px', maxWidth: '620px' }}>
        Live business numbers from inside HQue — subscribers, plans, and AppSumo redemptions.
        For exact revenue &amp; promo codes, and for website visitors &amp; traffic sources, use the two shortcuts at the bottom.
      </div>

      {/* Headline stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <Stat label="Paying subscribers" value={s.paying} sub={`${s.total} accounts total`} {...{ card, border, text, muted, subtle }} accent={accent} />
        <Stat label="Est. monthly revenue" value={`$${s.mrr.toLocaleString()}`} sub="from active plans" {...{ card, border, text, muted, subtle }} accent={accent} />
        <Stat label="Trials in progress" value={s.trialing} sub="not yet converted" {...{ card, border, text, muted, subtle }} accent={accent} />
        <Stat label="AppSumo redeemed" value={a.redeemed} sub={`${a.unused} codes left`} {...{ card, border, text, muted, subtle }} accent={accent} />
      </div>

      {/* Website traffic (Google Analytics) */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: subtle }}>Website traffic &amp; location · {rangeLabel}</div>
          <div style={{ display: 'flex', border: `1px solid ${border}`, borderRadius: '5px', overflow: 'hidden' }}>
            {RANGE_ORDER.map(([k, label], i) => (
              <button key={k} onClick={() => setRange(k)} style={{
                padding: '6px 10px', fontSize: '8px', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                background: range === k ? accent : (dark ? '#242424' : '#FFFFFF'), border: 'none',
                borderLeft: i === 0 ? 'none' : `0.5px solid ${border}`,
                color: range === k ? '#fff' : muted, cursor: 'pointer', fontWeight: range === k ? 500 : 400,
              }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '3px', padding: '20px 24px' }}>
          {gaLoading && (
            <div style={{ fontSize: '11px', color: subtle, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '8px 0' }}>Loading Google Analytics…</div>
          )}
          {!gaLoading && (!ga || ga.configured === false) && (
            <div>
              <div style={{ fontSize: '13px', color: text, marginBottom: '8px' }}>Google Analytics isn’t connected yet.</div>
              <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7, marginBottom: '14px' }}>
                Once it’s connected, visitor counts, traffic sources, and locations for the selected range will show right here. In the meantime, open the full dashboard:
              </div>
              <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: accent, fontWeight: 500, textDecoration: 'none' }}>Open Google Analytics →</a>
            </div>
          )}
          {!gaLoading && ga && ga.configured && ga.error && (
            <div>
              <div style={{ fontSize: '13px', color: text, marginBottom: '6px' }}>Couldn’t reach Google Analytics.</div>
              <div style={{ fontSize: '11px', color: subtle, lineHeight: 1.6 }}>Usually this means the service account hasn’t been given access to the property yet, or the property ID is wrong. ({ga.error})</div>
            </div>
          )}
          {!gaLoading && ga && ga.configured && !ga.error && (
            <div>
              <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '22px' }}>
                <div><div style={{ fontFamily: 'Georgia, serif', fontSize: '30px', color: text, lineHeight: 1 }}>{ga.totals.users.toLocaleString()}</div><div style={{ fontSize: '10px', color: muted, marginTop: '8px' }}>Visitors · {rangeLabel}</div></div>
                <div><div style={{ fontFamily: 'Georgia, serif', fontSize: '30px', color: text, lineHeight: 1 }}>{ga.totals.sessions.toLocaleString()}</div><div style={{ fontSize: '10px', color: muted, marginTop: '8px' }}>Sessions</div></div>
                <div><div style={{ fontFamily: 'Georgia, serif', fontSize: '30px', color: text, lineHeight: 1 }}>{ga.totals.views.toLocaleString()}</div><div style={{ fontSize: '10px', color: muted, marginTop: '8px' }}>Page views</div></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '28px' }}>
                <LocBlock title="Where traffic comes from" items={ga.channels} nameKey="source" valueKey="sessions" empty="No traffic in this range." {...{ dark, accent, border, text, muted, subtle }} />
                <LocBlock title="Top countries" items={ga.countries} nameKey="name" valueKey="users" empty="No location data in this range." {...{ dark, accent, border, text, muted, subtle }} />
                <LocBlock title="Top cities" items={ga.cities} nameKey="name" valueKey="users" empty="No city data in this range." {...{ dark, accent, border, text, muted, subtle }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscribers breakdown */}
      <div style={{ marginBottom: '32px' }}>
        {sectionLabel('Subscribers')}
        <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '3px', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '18px' }}>
            <Line label="Starter · $49" value={s.byPlan.starter} {...{ text, muted }} />
            <Line label="Pro · $99" value={s.byPlan.pro} {...{ text, muted }} />
            <Line label="Business · $199" value={s.byPlan.agency} {...{ text, muted }} />
            <Line label="Lifetime (AppSumo)" value={s.lifetime} {...{ text, muted }} />
            <Line label="Trialing" value={s.trialing} {...{ text, muted }} />
            <Line label="Trial expired" value={s.trialExpired} {...{ text, muted }} />
            <Line label="Past due" value={s.pastDue} {...{ text, muted }} />
            <Line label="Canceled" value={s.canceled} {...{ text, muted }} />
          </div>
        </div>
      </div>

      {/* Signups over time */}
      <div style={{ marginBottom: '32px' }}>
        {sectionLabel('New signups')}
        <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '3px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: '28px', marginBottom: '20px' }}>
            <div><span style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: text }}>{g.last7}</span><span style={{ fontSize: '10px', color: subtle, marginLeft: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>last 7 days</span></div>
            <div><span style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: text }}>{g.last30}</span><span style={{ fontSize: '10px', color: subtle, marginLeft: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>last 30 days</span></div>
          </div>
          <BarRow data={g.byMonth} accent={accent} {...{ border, subtle, text }} />
        </div>
      </div>

      {/* AppSumo */}
      <div style={{ marginBottom: '32px' }}>
        {sectionLabel('AppSumo codes')}
        <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '3px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: '28px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <Line label="Total codes" value={a.total} {...{ text, muted }} />
            <Line label="Redeemed" value={a.redeemed} {...{ text, muted }} />
            <Line label="Remaining" value={a.unused} {...{ text, muted }} />
            <Line label="Redemption rate" value={`${a.redemptionRate}%`} {...{ text, muted }} />
          </div>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, margin: '4px 0 12px' }}>Redemptions by month</div>
          <BarRow data={a.byMonth} accent="#A67C52" {...{ border, subtle, text }} />

          {a.recent.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '10px' }}>Recent redemptions</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {a.recent.map((r, i) => (
                  <div key={r.code + i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i === 0 ? 'none' : `0.5px solid ${border}` }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '13px', color: text }}>{r.orgName}</span>
                      <span style={{ fontSize: '10px', color: subtle, marginLeft: '10px', fontFamily: 'monospace' }}>{r.code}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: muted, whiteSpace: 'nowrap' }}>{fmtDate(r.redeemedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* External dashboards */}
      <div style={{ marginBottom: '20px' }}>
        {sectionLabel('Sales & traffic (external)')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <LinkCard
            href="https://dashboard.stripe.com/dashboard"
            title="Stripe →"
            body="Exact revenue, individual sales, refunds, and which promo codes were used at checkout."
            {...{ card, border, text, muted, subtle }} accent={accent}
          />
          <LinkCard
            href="https://analytics.google.com/"
            title="Google Analytics →"
            body="Website visitors, where traffic comes from (search, social, referrals), and top pages."
            {...{ card, border, text, muted, subtle }} accent={accent}
          />
        </div>
        <div style={{ fontSize: '11px', color: subtle, lineHeight: 1.7, marginTop: '12px' }}>
          Tip: add your marketing team directly in Stripe (Settings → Team) and Google Analytics (Admin → Access management) so they can see these without your login.
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, card, border, text, muted, subtle, accent }) {
  return (
    <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '3px', padding: '18px 20px' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '10px' }}>{label}</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '30px', color: text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', color: muted, marginTop: '8px' }}>{sub}</div>
    </div>
  )
}

function Line({ label, value, text, muted }) {
  return (
    <div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', color: muted, marginTop: '6px' }}>{label}</div>
    </div>
  )
}

// A titled horizontal bar list — used for traffic sources, countries, and cities.
function LocBlock({ title, items, nameKey, valueKey, empty, dark, accent, border, text, muted, subtle }) {
  const list = items || []
  const max = Math.max(1, ...list.map(i => i[valueKey] || 0))
  return (
    <div>
      <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '12px' }}>{title}</div>
      {list.length === 0 && <div style={{ fontSize: '11px', color: subtle }}>{empty}</div>}
      {list.map((i, idx) => (
        <div key={(i[nameKey] || '') + idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '96px', fontSize: '11px', color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i[nameKey] || '—'}</div>
          <div style={{ flex: 1, height: '10px', background: dark ? '#1A1A1A' : '#EFECE6', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ width: `${((i[valueKey] || 0) / max) * 100}%`, height: '100%', background: accent, borderRadius: '5px' }} />
          </div>
          <div style={{ width: '44px', textAlign: 'right', fontSize: '11px', color: muted }}>{(i[valueKey] || 0).toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}

function BarRow({ data, accent, border, subtle, text }) {
  const max = Math.max(1, ...data.map(d => d.count))
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', height: '110px' }}>
      {data.map((d) => (
        <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: '11px', color: text }}>{d.count}</div>
          <div style={{ width: '100%', maxWidth: '46px', height: `${(d.count / max) * 72}px`, minHeight: d.count > 0 ? '3px' : '0', background: accent, borderRadius: '2px 2px 0 0', opacity: d.count > 0 ? 1 : 0.15 }} />
          <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: subtle }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

function LinkCard({ href, title, body, card, border, text, muted, accent }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', background: card, border: `0.5px solid ${border}`, borderRadius: '3px', padding: '20px', display: 'block' }}>
      <div style={{ fontSize: '13px', letterSpacing: '0.06em', color: accent, marginBottom: '8px', fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: '12px', color: muted, lineHeight: 1.6 }}>{body}</div>
    </a>
  )
}

function btn(accent) {
  return { padding: '10px 24px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '2px' }
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}
