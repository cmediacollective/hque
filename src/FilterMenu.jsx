import { useState, useRef, useEffect, useMemo } from 'react'

// A single-select filter dropdown for label lists that can grow without limit.
//
// Agencies define their own Type/Niche labels, so a roster page can end up with
// 70+ chips wrapping over seven rows and pushing the actual list off screen.
// This keeps the filter bar one line tall no matter how many labels exist:
// the button shows the current pick, the panel searches the full list, and each
// row carries a count so unused labels are obvious.
//
//   options  – array of label strings
//   value    – the selected label, or null for "no filter"
//   onChange – called with the new label, or null when cleared
//   countFor – optional (label) => number, shown at the right of each row
export default function FilterMenu({ label, options, value, onChange, countFor, dark, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const border = dark ? '#3A3A3A' : '#DBD7D0'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#A5A099' : '#666'
  const subtle = dark ? '#777' : '#8C877D'
  const panelBg = dark ? '#1E1E1E' : '#FFFFFF'
  const accent = '#5b7c99'

  // Close on outside click or Escape, and reset the search so the next open
  // starts from the full list.
  useEffect(() => {
    if (!open) return
    const onDown = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); if (!open) setQuery('') }, [open])

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter(o => o.toLowerCase().includes(q)) : options
  }, [options, query])

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          padding: value ? '6px 6px 6px 13px' : '6px 12px 6px 13px',
          fontSize: '12px', lineHeight: 1, fontWeight: value ? 500 : 400,
          borderRadius: '999px', whiteSpace: 'nowrap', cursor: 'pointer',
          border: `1px solid ${value || open ? accent : border}`,
          background: value ? accent : (dark ? '#1E1E1E' : '#FFFFFF'),
          color: value ? '#fff' : (open ? text : muted),
          boxShadow: value ? '0 1px 3px rgba(91,124,153,0.30)' : (open ? `0 0 0 2px rgba(91,124,153,0.18)` : 'none'),
          transition: 'background 0.14s, border-color 0.14s, color 0.14s',
        }}>
        {value || label}
        {value
          ? (
            // Clears this filter without opening the menu.
            <span role='button' aria-label={`Clear ${label}`}
              onClick={e => { e.stopPropagation(); onChange(null); setOpen(false) }}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '15px', height: '15px', borderRadius: '50%', background: 'rgba(255,255,255,0.22)', fontSize: '11px', lineHeight: 1, cursor: 'pointer' }}>×</span>
          )
          : <span style={{ fontSize: '9px', opacity: 0.8 }}>▾</span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', [align]: 0, marginTop: '6px', zIndex: 60,
          width: '270px', maxWidth: 'calc(100vw - 32px)',
          background: panelBg, border: `1px solid ${border}`, borderRadius: '8px',
          boxShadow: dark ? '0 10px 30px rgba(0,0,0,0.55)' : '0 10px 30px rgba(0,0,0,0.16)',
          overflow: 'hidden',
        }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${label.replace(/^All /, '').toLowerCase()}...`}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: '12.5px', border: 'none', borderBottom: `1px solid ${dark ? '#2A2A2A' : '#E6E2DB'}`, background: 'transparent', color: text, outline: 'none' }} />

          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '5px' }}>
            {hits.length === 0 && (
              <div style={{ padding: '16px 12px', fontSize: '12px', color: subtle, textAlign: 'center' }}>No match</div>
            )}
            {hits.map(o => {
              const active = value === o
              const n = countFor ? countFor(o) : null
              return (
                <button key={o}
                  onClick={() => { onChange(active ? null : o); setOpen(false) }}
                  onMouseEnter={e => { e.currentTarget.style.background = dark ? '#262626' : '#F2F0EC' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', textAlign: 'left', padding: '7px 9px', fontSize: '12.5px', border: 'none', borderRadius: '6px', background: 'none', color: text, cursor: 'pointer' }}>
                  <span style={{ width: '14px', height: '14px', flexShrink: 0, borderRadius: '4px', border: `1px solid ${active ? accent : border}`, background: active ? accent : 'transparent', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{active ? '✓' : ''}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o}</span>
                  {n != null && <span style={{ marginLeft: 'auto', fontSize: '11px', color: subtle, flexShrink: 0 }}>{n}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
