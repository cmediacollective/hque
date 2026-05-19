import { useState } from 'react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// "Today" according to the agency's time zone, not the viewer's browser.
function todayInTz(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
    const get = t => Number(parts.find(p => p.type === t).value)
    return new Date(get('year'), get('month') - 1, get('day'))
  } catch {
    return new Date()
  }
}

// A small, plain month calendar that lives inside the left sidebar.
// View-only — no campaigns, no booking. Arrows move between months.
export default function MiniCalendar({ dark = true, agencyTz }) {
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const subtle = dark ? '#777' : '#888'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const blue = '#5b7c99'

  // Track the displayed month as an offset from "this month" so the calendar
  // stays correct even if the agency time zone loads after the first render.
  const [monthOffset, setMonthOffset] = useState(0)
  const today = todayInTz(agencyTz)
  const cursor = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  const cells = []
  for (let i = 0; i < 42; i++) {
    const dayNum = i - firstWeekday + 1
    cells.push({ date: new Date(year, month, dayNum), inMonth: dayNum >= 1 && dayNum <= daysInMonth })
  }
  // Drop the trailing week when it holds no days of this month.
  const weeks = cells.slice(35).every(c => !c.inMonth) ? 5 : 6
  const shown = cells.slice(0, weeks * 7)

  const arrowBtn = { width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', background: 'none', border: 'none', color: subtle, cursor: 'pointer', padding: 0 }

  return (
    <div style={{ padding: '16px 16px 4px', marginTop: '24px', borderTop: `0.5px solid ${border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <button onClick={() => setMonthOffset(o => o - 1)} style={arrowBtn} title='Previous month'>‹</button>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '12px', color: blue }}>{MONTHS[month]} {year}</div>
        <button onClick={() => setMonthOffset(o => o + 1)} style={arrowBtn} title='Next month'>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '1px' }}>
        {WEEKDAY_INITIALS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '7px', color: subtle, paddingBottom: '3px' }}>{d}</div>
        ))}
        {shown.map((cell, i) => {
          const isToday = sameDay(cell.date, today)
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', borderRadius: '50%', background: isToday ? blue : 'none', color: isToday ? '#fff' : text, opacity: cell.inMonth ? 1 : 0.32 }}>
                {cell.date.getDate()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
