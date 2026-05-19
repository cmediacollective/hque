import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// A simple, view-only month calendar. Shows campaign start/end dates as markers.
export default function CalendarView({ dark = true, orgId }) {
  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const card = dark ? '#1A1A1A' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#444' : '#C4BFB8'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const gridBg = dark ? '#2A2A2A' : '#D4CFC8'
  const blue = '#5b7c99'

  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [campaigns, setCampaigns] = useState([])

  useEffect(() => {
    if (!orgId) return
    supabase.from('campaigns')
      .select('id, name, brand, start_date, end_date')
      .eq('org_id', orgId).eq('archived', false)
      .then(({ data }) => setCampaigns(data || []))
  }, [orgId])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const pad = n => String(n).padStart(2, '0')
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  // 6 weeks of cells; days outside the current month are dimmed.
  const cells = []
  for (let i = 0; i < 42; i++) {
    const dayNum = i - firstWeekday + 1
    cells.push({ date: new Date(year, month, dayNum), inMonth: dayNum >= 1 && dayNum <= daysInMonth })
  }

  const eventsFor = date => {
    const key = ymd(date)
    const out = []
    campaigns.forEach(c => {
      if (c.start_date === key) out.push({ id: c.id + '-s', label: c.name, brand: c.brand, kind: 'start' })
      if (c.end_date === key) out.push({ id: c.id + '-e', label: c.name, brand: c.brand, kind: 'end' })
    })
    return out
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const navBtn = { width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }
  const legendItem = { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: subtle }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      <div style={{ padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `0.5px solid ${border}`, background: bg, flexShrink: 0 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: blue, marginRight: 'auto' }}>
          {MONTHS[month]} <span style={{ color: dark ? '#7e9db5' : '#829bb0' }}>{year}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '6px' }}>
          <span style={legendItem}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: blue }} /> Starts</span>
          <span style={legendItem}><span style={{ width: '10px', height: '10px', borderRadius: '2px', border: `1px solid ${blue}` }} /> Ends</span>
        </div>

        {!isCurrentMonth && (
          <button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            style={{ padding: '6px 12px', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Today</button>
        )}
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={navBtn}>‹</button>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={navBtn}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: bg, flexShrink: 0, borderBottom: `0.5px solid ${border}` }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ padding: '9px 10px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: subtle }}>{d}</div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, minmax(92px, 1fr))', gap: '1px', background: gridBg, paddingBottom: '60px' }}>
        {cells.map((cell, i) => {
          const isToday = sameDay(cell.date, today)
          const events = cell.inMonth ? eventsFor(cell.date) : []
          return (
            <div key={i} style={{ background: card, padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: '3px', opacity: cell.inMonth ? 1 : 0.45 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ minWidth: '20px', height: '20px', padding: '0 5px', borderRadius: '10px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', background: isToday ? blue : 'none', color: isToday ? '#fff' : (cell.inMonth ? text : subtle), fontWeight: isToday ? 600 : 400 }}>
                  {cell.date.getDate()}
                </span>
              </div>
              {events.map(e => (
                <div key={e.id} title={`${e.brand ? e.brand + ' — ' : ''}${e.label} (${e.kind === 'start' ? 'starts' : 'ends'})`}
                  style={{ fontSize: '9px', lineHeight: 1.35, padding: '2px 5px', borderRadius: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    background: e.kind === 'start' ? blue : 'none', color: e.kind === 'start' ? '#fff' : blue, border: `0.5px solid ${blue}` }}>
                  {e.label}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
