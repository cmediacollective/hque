import { useEffect, useState } from 'react'
import { formatNoteStamp, isLongNote } from './notes'
import { tokens, SERIF, UI } from './theme'

// Shared building blocks for the Outreach section: stats, pipeline bar, tabs,
// chips, notes log, likelihood gauge, modal shell. Tokens live in theme.js.

// ── Stats row: four big serif numbers ───────────────────────────────────────
export function StatsRow({ stats, dark, isMobile }) {
  const t = tokens(dark)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 20 : 32, marginBottom: 32 }}>
      {stats.map((stat) => (
        <div key={stat.label}>
          <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: isMobile ? 30 : 40, lineHeight: 1, color: t.ink, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
          <div style={t.uppLbl}>{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Pipeline bar: one segment per status, with a legend ─────────────────────
export function PipelineBar({ segments, label, dark }) {
  const t = tokens(dark)
  // Segments with nothing in them drop out of the bar but stay in the legend.
  const visible = segments.filter((s) => s.count > 0)
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ ...t.uppLbl, marginBottom: 12 }}>{label}</div>
      <div style={{ display: 'flex', height: 8, gap: 2, marginBottom: 12, background: visible.length ? 'transparent' : t.hair, borderRadius: 1 }}>
        {visible.map((s) => (
          <div key={s.label} title={`${s.label} — ${s.count}`} style={{ flex: s.count, background: s.bar, borderRadius: 1 }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: 1, background: s.bar, flex: 'none', display: 'inline-block' }} />
            <span style={{ ...t.uppLbl, color: t.body2 }}>{s.label}</span>
            <span style={{ ...t.uppLbl }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tabs: Active / Closed, or Open / Won / Lost ─────────────────────────────
export function ViewTabs({ view, tabs, onChange, dark, label }) {
  const t = tokens(dark)
  return (
    <div role="tablist" aria-label={label} style={{ display: 'flex', gap: 28, borderBottom: `1px solid ${t.hair2}`, marginBottom: 20 }}>
      {tabs.map((tab) => {
        const on = view === tab.key
        return (
          <button key={tab.key} type="button" role="tab" aria-selected={on} onClick={() => onChange(tab.key)}
            style={{ background: 'transparent', border: 'none', borderBottom: `1.5px solid ${on ? t.accent : 'transparent'}`, marginBottom: -1, padding: '0 0 10px', fontFamily: UI, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer', color: on ? t.ink : t.mut, fontWeight: on ? 500 : 400 }}>
            {tab.label}
            <span style={{ marginLeft: 8, color: on ? t.accent : t.mut2 }}>{tab.count}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Filter chip: rounded pill, normal case, count alongside ─────────────────
export function Chip({ label, count, isActive, onClick, dark, small }) {
  const t = tokens(dark)
  const empty = count === 0 && !isActive
  return (
    <button type="button" onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: UI, fontSize: small ? 11.5 : 12, fontWeight: isActive ? 500 : 400, lineHeight: 1, padding: small ? '6px 12px' : '7px 14px', borderRadius: 999, whiteSpace: 'nowrap', cursor: 'pointer', border: `1px solid ${isActive ? t.accent : empty ? t.hair : t.hair2}`, background: isActive ? t.accent : t.cardBg, color: isActive ? '#fff' : empty ? t.mut2 : t.body2, boxShadow: isActive ? '0 1px 3px rgba(91,124,153,0.30)' : 'none', transition: 'background 0.14s, border-color 0.14s, color 0.14s' }}>
      {label}
      <span style={{ opacity: isActive ? 0.8 : 0.7, fontSize: 11 }}>{count}</span>
    </button>
  )
}

// ── Notes log: newest note open, the rest folded away ───────────────────────
function Note({ entry, dark }) {
  const t = tokens(dark)
  const [open, setOpen] = useState(false)
  const long = isLongNote(entry.text)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...t.uppLbl, fontSize: '9px', marginBottom: 5 }}>{formatNoteStamp(entry.at)}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: t.body, maxWidth: 720, whiteSpace: 'pre-wrap', fontFamily: UI, ...(long && !open ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : null) }}>
        {entry.text}
      </div>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} style={{ ...t.btnText, marginTop: 6 }}>
          {open ? 'Show less' : 'Show full note'}
        </button>
      )}
    </div>
  )
}

export function NotesLog({ entries, dark, editLabel = 'Edit pitch' }) {
  const t = tokens(dark)
  const [showHistory, setShowHistory] = useState(false)
  if (entries.length === 0) {
    return <div style={{ fontSize: 13, color: t.mut, fontFamily: UI }}>No notes yet — use “{editLabel}” to add one.</div>
  }
  const [latest, ...earlier] = entries
  return (
    <div>
      <Note entry={latest} dark={dark} />
      {earlier.length > 0 && (
        <>
          {showHistory && earlier.map((entry) => <Note key={entry.id} entry={entry} dark={dark} />)}
          <button type="button" onClick={() => setShowHistory((v) => !v)} style={{ ...t.btnText, color: t.mut }}>
            {showHistory ? 'Hide earlier notes' : `Show ${earlier.length} earlier note${earlier.length === 1 ? '' : 's'}`}
          </button>
        </>
      )}
    </div>
  )
}

// Note history inside the edit modal: the whole log, scrollable.
export function NoteHistory({ entries, dark }) {
  const t = tokens(dark)
  if (entries.length === 0) return null
  return (
    <div>
      <div style={{ ...t.uppLbl, marginBottom: 8 }}>Note history · {entries.length}</div>
      <div style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${t.hair}`, borderRadius: 1, padding: '12px 14px' }}>
        {entries.map((entry) => (
          <div key={entry.id} style={{ marginBottom: 12 }}>
            <div style={{ ...t.uppLbl, fontSize: '9px', marginBottom: 4 }}>{formatNoteStamp(entry.at)}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: t.body, whiteSpace: 'pre-wrap', fontFamily: UI }}>{entry.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Likelihood gauge: four segments (25/50/75/100) filled to the value ──────
// Plain boxes, no gradients, so a printer that drops backgrounds still shows
// the outline. `tone` is 'dark' | 'light' on the board, 'print' on the report.
const SEGMENTS = [25, 50, 75, 100]

export function LikelihoodGauge({ value, stage, dark, print = false, width = 72 }) {
  const t = tokens(dark)
  const colors = print
    ? { filled: '#5b7c99', partial: 'rgba(91,124,153,0.45)', empty: 'rgba(0,0,0,0.12)', won: '#1a1a1a', lost: '#8a7068', label: '#1a1a1a' }
    : { filled: '#5b7c99', partial: 'rgba(91,124,153,0.45)', empty: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', won: t.ink, lost: dark ? '#4a3d38' : '#b9a59e', label: t.body }
  const percent = Math.max(0, Math.min(100, Number(value) || 0))
  const isWon = stage === 'Closed won'
  const isLost = stage === 'Closed lost'
  return (
    <div role="img" aria-label={`${percent}% likely to close`} title={`${percent}% likely to close`} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', gap: 2, width, flex: 'none' }}>
        {SEGMENTS.map((top) => {
          const bottom = top - 25
          // Full when the value clears the segment's top, half-toned when the
          // value lands inside it (10% lights the first segment softly).
          let fill = colors.empty
          if (isWon) fill = colors.won
          else if (isLost) fill = colors.lost
          else if (percent >= top) fill = colors.filled
          else if (percent > bottom) fill = colors.partial
          return <span key={top} style={{ flex: 1, height: 7, borderRadius: 1, background: fill, boxShadow: print ? 'inset 0 0 0 1px rgba(0,0,0,0.15)' : 'none' }} />
        })}
      </div>
      <span style={{ fontSize: 11, letterSpacing: '0.06em', color: isLost ? colors.lost : colors.label, fontVariantNumeric: 'tabular-nums', minWidth: 32, fontFamily: UI }}>{percent}%</span>
    </div>
  )
}

// ── Modal shell: click-outside and Escape both close ────────────────────────
export function Modal({ onClose, label, dark, width = 560, children }) {
  const t = tokens(dark)
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return (
    <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,15,0.55)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}
        style={{ background: t.cardBg, border: `1px solid ${t.hair2}`, borderRadius: 1, width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', padding: 26, fontFamily: UI }}>
        {children}
      </div>
    </div>
  )
}

// A small serif heading with an italic accent, the way the standalone board
// titled its dialogs ("Log *a pitch.*").
export function ModalTitle({ eyebrow, lead, accent: accentText, dark }) {
  const t = tokens(dark)
  return (
    <div style={{ marginBottom: 22 }}>
      {eyebrow && <div style={{ ...t.uppLbl, marginBottom: 6 }}>{eyebrow}</div>}
      <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 26, color: t.ink, lineHeight: 1.1 }}>
        {lead} <em style={{ fontStyle: 'italic', fontWeight: 300, color: t.accent }}>{accentText}</em>
      </div>
    </div>
  )
}

// A labelled form field.
export function Field({ label, children, span, hint, dark }) {
  const t = tokens(dark)
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: span ? '1 / -1' : undefined }}>
      <span style={t.uppLbl}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: t.mut, lineHeight: 1.5, fontFamily: UI }}>{hint}</span>}
    </label>
  )
}

// Chevron for expandable rows.
export function Chevron({ expanded, color }) {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', color, flex: 'none' }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d={expanded ? 'M1 3 L5 7 L9 3' : 'M3 1 L7 5 L3 9'} stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  )
}

// Two-step inline delete: no browser confirm, nothing destructive on one click.
export function DeleteControl({ onConfirm, label = 'Delete', confirmLabel = 'Confirm delete', dark }) {
  const t = tokens(dark)
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return (
      <>
        <button type="button" onClick={() => { setConfirming(false); onConfirm() }} style={{ ...t.btnText, color: t.copper }}>{confirmLabel}</button>
        <button type="button" onClick={() => setConfirming(false)} style={{ ...t.btnText, color: t.mut }}>Cancel</button>
      </>
    )
  }
  return <button type="button" onClick={() => setConfirming(true)} style={{ ...t.btnText, color: t.mut }}>{label}</button>
}
