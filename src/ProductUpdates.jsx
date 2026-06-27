import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Public, read-only "Product Updates & Roadmap" page, reachable at /updates
// with no login. It pulls ONLY the curated subset (planned / in progress /
// shipped) via the get_public_updates() database function. Under-review and
// declined items never leave the admin manager in Settings.
export default function ProductUpdates() {
  const [state, setState] = useState('loading') // loading | ready | error
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.rpc('get_public_updates')
      if (cancelled) return
      if (error) { setState('error'); return }
      setItems(data || [])
      setState('ready')
    }
    load()
    return () => { cancelled = true }
  }, [])

  const bg = '#F8F7F3'
  const ink = '#1A1A1A'
  const muted = '#6B6B6B'
  const accent = '#5B7C99'
  const border = '#E0DCD4'
  const card = '#FFFFFF'

  const catColor = (c) => c === 'Fix' ? '#C77B5B' : c === 'Improvement' ? '#5C9E52' : accent

  const sections = [
    { key: 'in_progress', label: 'In Progress', blurb: 'Being built right now.' },
    { key: 'planned', label: 'Planned', blurb: 'Approved and coming soon.' },
    { key: 'shipped', label: 'Shipped', blurb: 'Live and ready to use.' },
  ]

  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

  const page = (children) => (
    <div style={{ minHeight: '100vh', background: bg, color: ink, fontFamily: '"Inter Tight", system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, width: '100%', maxWidth: '760px', margin: '0 auto', padding: '56px 24px 40px', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '40px' }}>
          <a href='https://h-que.com' style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, textDecoration: 'none' }}>HQue</a>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '34px', fontWeight: 'normal', margin: '14px 0 10px' }}>Product Updates</h1>
          <p style={{ fontSize: '14px', color: muted, lineHeight: 1.6, margin: 0, maxWidth: '540px' }}>
            What we're building, what's coming next, and what just shipped. Your feedback shapes this list.
          </p>
        </div>
        {children}
      </div>
      <div style={{ textAlign: 'center', padding: '24px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A8A39B' }}>
        <a href='https://h-que.com' style={{ color: '#A8A39B', textDecoration: 'none' }}>Powered by HQue</a>
      </div>
    </div>
  )

  if (state === 'loading') {
    return page(<div style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: muted }}>Loading…</div>)
  }
  if (state === 'error') {
    return page(<div style={{ fontSize: '13px', color: muted }}>We couldn't load updates right now. Please try again shortly.</div>)
  }

  return page(
    <div>
      {sections.map(sec => {
        const rows = items.filter(i => i.status === sec.key)
        if (rows.length === 0) return null
        return (
          <div key={sec.key} style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: accent, margin: 0 }}>{sec.label}</h2>
              <span style={{ fontSize: '11px', color: '#A8A39B' }}>{sec.blurb}</span>
            </div>
            <div style={{ marginTop: '14px' }}>
              {rows.map(item => (
                <div key={item.id} style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '6px', padding: '16px 18px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: item.description ? '6px' : 0, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: catColor(item.category), border: `0.5px solid ${catColor(item.category)}`, padding: '2px 6px', borderRadius: '2px' }}>{item.category}</span>
                    <span style={{ fontSize: '15px', fontWeight: 600 }}>{item.title}</span>
                    {sec.key === 'shipped' && item.shipped_at && (
                      <span style={{ fontSize: '11px', color: '#A8A39B', marginLeft: 'auto' }}>{fmtDate(item.shipped_at)}</span>
                    )}
                  </div>
                  {item.description && <div style={{ fontSize: '13px', color: muted, lineHeight: 1.6 }}>{item.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {items.length === 0 && (
        <div style={{ fontSize: '13px', color: muted }}>No updates to show yet — check back soon.</div>
      )}
    </div>
  )
}
