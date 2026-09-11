import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LOST_STAGE, WON_STAGE, formatMoney, isOpenStage, weightedValue } from './constants'
import { LikelihoodGauge } from './ui'
import { SERIF, UI } from './theme'

// The lead list as a client sees it: a light, print-ready page for one client
// (or the whole book), with the likelihood gauge on every open lead. Replaces
// the board while open; Cmd+P / "Save as PDF" produces the hand-over.
//
// Kept free of anything internal — no owner, no contact email, no notes. The
// client gets brand, campaign, value, stage, likelihood, timing and next step.

const INK = '#1a1a1a'
const MUTED = 'rgba(0,0,0,0.5)'
const RULE = 'rgba(0,0,0,0.12)'

const eyebrow = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: MUTED, fontFamily: UI }
const th = { ...eyebrow, textAlign: 'left', padding: '10px 12px 10px 0', borderBottom: `1px solid ${INK}`, fontWeight: 400, whiteSpace: 'nowrap' }
const td = { padding: '12px 12px 12px 0', borderBottom: `1px solid ${RULE}`, fontSize: 13, color: INK, verticalAlign: 'top', lineHeight: 1.45, fontFamily: UI }
const money = { ...td, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
const toolbarButton = { background: 'transparent', border: `1px solid ${RULE}`, borderRadius: 1, padding: '10px 18px', fontFamily: UI, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.13em', color: INK, cursor: 'pointer' }

const todayLong = () => new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const todayStamp = () => new Date().toISOString().slice(0, 10)

// Open leads most-likely first, then by value, so the page reads top-down as
// "what's closest to closing".
const byLikelihoodThenValue = (a, b) => (b.likelihood || 0) - (a.likelihood || 0) || (Number(b.amount) || 0) - (Number(a.amount) || 0)
const byValue = (a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)

function csvFor(leads, memberName) {
  const header = ['Client', 'Brand', 'Campaign', 'Value (USD)', 'Stage', 'Likelihood %', 'Weighted (USD)', 'Timing', 'Next step', 'Lost reason', 'Owner', 'Contact', 'Contact email', 'Updated']
  const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = leads.map((l) => [
    l.client_name, l.brand, l.campaign, l.amount ?? '', l.stage, l.likelihood ?? '', weightedValue(l) || '',
    l.timing, l.next_step, l.lost_reason, memberName(l.pitched_by), l.contact, l.contact_email, (l.updated_at || '').slice(0, 10),
  ])
  return [header, ...rows].map((r) => r.map(quote).join(',')).join('\r\n')
}

function Section({ title, count, children }) {
  if (count === 0) return null
  return (
    <section style={{ marginBottom: 44, breakInside: 'avoid' }}>
      <div style={{ ...eyebrow, marginBottom: 6 }}>{title} <span style={{ color: 'rgba(0,0,0,0.3)' }}>· {count}</span></div>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </section>
  )
}

export default function LeadReport({ scope, leads, agencyName, memberName, onClose }) {
  const open = leads.filter((l) => isOpenStage(l.stage)).sort(byLikelihoodThenValue)
  const won = leads.filter((l) => l.stage === WON_STAGE).sort(byValue)
  const lost = leads.filter((l) => l.stage === LOST_STAGE).sort(byValue)
  const allClients = scope === 'All clients'

  const pipeline = open.reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const weighted = open.reduce((s, l) => s + weightedValue(l), 0)
  const wonTotal = won.reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const fileSlug = scope.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const downloadCsv = () => {
    const blob = new Blob([csvFor([...open, ...won, ...lost], memberName)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileSlug}-leads-${todayStamp()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const stats = [
    { value: String(open.length), label: 'Open leads' },
    { value: formatMoney(pipeline), label: 'Pipeline value' },
    { value: formatMoney(weighted), label: 'Weighted by likelihood' },
    { value: formatMoney(wonTotal), label: `Closed won · ${won.length}` },
  ]

  // Portalled onto <body> so print CSS can hide the app and keep the report.
  return createPortal(
    <div className="lead-report" style={{ position: 'fixed', inset: 0, zIndex: 80, overflow: 'auto', background: '#f5f4f1', color: INK, fontFamily: UI }}>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 40px', borderBottom: `1px solid ${RULE}`, background: '#ffffff', position: 'sticky', top: 0, flexWrap: 'wrap' }}>
        <button type="button" onClick={onClose} style={toolbarButton}>← Back to leads</button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={downloadCsv} style={toolbarButton}>Download CSV</button>
        <button type="button" onClick={() => window.print()} style={{ ...toolbarButton, background: INK, color: '#fff', borderColor: INK }}>Print / Save as PDF</button>
      </div>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '44px 40px 80px' }}>
        <div style={{ ...eyebrow, marginBottom: 14 }}>{agencyName} · Partnership leads</div>
        <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 40, lineHeight: 1.05, margin: '0 0 10px' }}>{scope}</h1>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 40 }}>Paid partnerships in progress as of {todayLong()}. Likelihood is our read on each deal closing.</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 28, marginBottom: 48, paddingBottom: 32, borderBottom: `1px solid ${INK}` }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 34, lineHeight: 1, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              <div style={eyebrow}>{s.label}</div>
            </div>
          ))}
        </div>

        {leads.length === 0 && <div style={{ fontSize: 13, color: MUTED }}>No leads for {scope} yet.</div>}

        <Section title="In progress" count={open.length}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr>
                {allClients && <th style={th}>Client</th>}
                <th style={th}>Brand</th><th style={th}>Campaign</th><th style={th}>Value</th><th style={th}>Stage</th><th style={th}>Likelihood</th><th style={th}>Timing</th><th style={{ ...th, width: '26%' }}>Next step</th>
              </tr>
            </thead>
            <tbody>
              {open.map((l) => (
                <tr key={l.id} style={{ breakInside: 'avoid' }}>
                  {allClients && <td style={td}>{l.client_name}</td>}
                  <td style={{ ...td, fontWeight: 500 }}>{l.brand}</td>
                  <td style={td}>{l.campaign || '—'}</td>
                  <td style={money}>{formatMoney(l.amount)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{l.stage}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}><LikelihoodGauge value={l.likelihood} stage={l.stage} print /></td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{l.timing || '—'}</td>
                  <td style={{ ...td, color: 'rgba(0,0,0,0.7)' }}>{l.next_step || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Closed won" count={won.length}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead><tr>{allClients && <th style={th}>Client</th>}<th style={th}>Brand</th><th style={th}>Campaign</th><th style={th}>Value</th><th style={th}>Timing</th></tr></thead>
            <tbody>
              {won.map((l) => (
                <tr key={l.id}>
                  {allClients && <td style={td}>{l.client_name}</td>}
                  <td style={{ ...td, fontWeight: 500 }}>{l.brand}</td><td style={td}>{l.campaign || '—'}</td><td style={money}>{formatMoney(l.amount)}</td><td style={td}>{l.timing || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Closed lost" count={lost.length}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead><tr>{allClients && <th style={th}>Client</th>}<th style={th}>Brand</th><th style={th}>Campaign</th><th style={th}>Value</th><th style={th}>Reason</th></tr></thead>
            <tbody>
              {lost.map((l) => (
                <tr key={l.id}>
                  {allClients && <td style={td}>{l.client_name}</td>}
                  <td style={{ ...td, fontWeight: 500 }}>{l.brand}</td><td style={td}>{l.campaign || '—'}</td><td style={money}>{formatMoney(l.amount)}</td><td style={{ ...td, color: MUTED }}>{l.lost_reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div style={{ ...eyebrow, marginTop: 24, fontSize: 9 }}>Prepared by {agencyName} · {todayLong()}</div>
      </div>
    </div>,
    document.body,
  )
}
