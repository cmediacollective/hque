// Repeat rules for tasks.
//
// This is the mirror of next_repeat_date() in
// supabase/migrations/20260904_repeating_tasks.sql. The DATABASE decides the
// real date when a task is ticked off; this copy exists only to write the
// sentence under the Repeat picker, so you can see what you're setting up
// before you save it. If one changes, change the other.

export const REPEAT_OPTIONS = [
  ['', "Doesn't repeat"],
  ['daily', 'Every day'],
  ['weekdays', 'Every weekday'],
  ['weekly', 'Every week'],
  ['biweekly', 'Every 2 weeks'],
  ['monthly', 'Every month'],
  ['quarterly', 'Every 3 months'],
  ['yearly', 'Every year'],
]

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const NTH = ['first', 'second', 'third', 'fourth', 'fifth']

// Dates are handled as plain local Y-M-D, never UTC — a due date is a calendar
// day, and parsing '2026-09-04' as UTC lands on the 3rd for anyone west of London.
export function parseDay(str) {
  if (!str) return null
  const [y, m, d] = String(str).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function toDay(date) {
  if (!date) return null
  const p = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

// The next due date after `fromStr`, following the rule. Returns 'YYYY-MM-DD'.
export function nextRepeatDate(freq, weekdays, monthlyMode, fromStr) {
  if (!freq) return null
  const base = parseDay(fromStr) || new Date()
  base.setHours(0, 0, 0, 0)

  if (freq === 'daily') return toDay(addDays(base, 1))

  if (freq === 'weekdays') {
    let d = addDays(base, 1)
    while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1)
    return toDay(d)
  }

  if (freq === 'weekly') {
    const days = (weekdays || []).map(Number)
    if (days.length === 0) return toDay(addDays(base, 7))
    for (let i = 1; i <= 7; i++) {
      const d = addDays(base, i)
      if (days.includes(d.getDay())) return toDay(d)
    }
    return toDay(addDays(base, 7))
  }

  if (freq === 'biweekly') return toDay(addDays(base, 14))

  if (freq === 'monthly' && monthlyMode === 'weekday') {
    // Keep the position in the month ("the first Friday"), not the date.
    const nth = Math.ceil(base.getDate() / 7)
    const targetDow = base.getDay()
    const monthStart = new Date(base.getFullYear(), base.getMonth() + 1, 1)
    const first = addDays(monthStart, (targetDow - monthStart.getDay() + 7) % 7)
    let d = addDays(first, (nth - 1) * 7)
    // A fifth Friday doesn't exist every month — fall back to the last one.
    while (d.getMonth() !== monthStart.getMonth()) d = addDays(d, -7)
    return toDay(d)
  }

  if (freq === 'monthly' || freq === 'quarterly' || freq === 'yearly') {
    const step = freq === 'monthly' ? 1 : freq === 'quarterly' ? 3 : 12
    const target = new Date(base.getFullYear(), base.getMonth() + step, 1)
    // Clamp so the 31st doesn't skip February.
    const day = Math.min(base.getDate(), daysInMonth(target.getFullYear(), target.getMonth()))
    return toDay(new Date(target.getFullYear(), target.getMonth(), day))
  }

  return null
}

export function formatDay(str) {
  const d = parseDay(str)
  if (!d) return ''
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDayLong(str) {
  const d = parseDay(str)
  if (!d) return ''
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function listWords(words) {
  if (words.length <= 1) return words[0] || ''
  if (words.length === 2) return `${words[0]} and ${words[1]}`
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

// How often, in words: "every Friday", "on the first Monday of each month".
export function describePattern(freq, weekdays, monthlyMode, fromStr) {
  const base = parseDay(fromStr)
  switch (freq) {
    case 'daily': return 'every day'
    case 'weekdays': return 'every weekday, Monday to Friday'
    case 'weekly': {
      const days = (weekdays || []).map(Number).sort((a, b) => a - b)
      if (days.length === 0) return 'every week'
      return `every ${listWords(days.map(d => DAY_LONG[d]))}`
    }
    case 'biweekly': return 'every 2 weeks'
    case 'monthly':
      if (monthlyMode === 'weekday' && base) {
        return `on the ${NTH[Math.ceil(base.getDate() / 7) - 1] || 'last'} ${DAY_LONG[base.getDay()]} of each month`
      }
      return base ? `on day ${base.getDate()} of each month` : 'every month'
    case 'quarterly': return 'every 3 months'
    case 'yearly': return 'every year'
    default: return ''
  }
}

// The full sentence under the picker. Returns null when the task doesn't repeat.
export function describeRepeat({ freq, weekdays, monthlyMode, ends, until, times, done = 0, dueDate }) {
  if (!freq) return null

  const pattern = describePattern(freq, weekdays, monthlyMode, dueDate)
  const completedAfterThis = (done || 0) + 1

  if (ends === 'after' && times && completedAfterThis >= times) {
    return `Repeats ${pattern}, ${times} times in total. This is the last one — nothing new will be created after it.`
  }

  const next = nextRepeatDate(freq, weekdays, monthlyMode, dueDate)
  if (!next) return `Repeats ${pattern}.`

  if (ends === 'on' && (!until || next > until)) {
    return `Repeats ${pattern} until ${formatDayLong(until) || 'the end date'}. This is the last one — nothing new will be created after it.`
  }

  let sentence = `Repeats ${pattern}. When you mark this Done, the next one appears — due ${formatDay(next)}.`
  if (ends === 'on' && until) sentence += ` The series stops after ${formatDayLong(until)}.`
  if (ends === 'after' && times) sentence += ` ${times} in total, and ${times - completedAfterThis} will be left after this one.`
  return sentence
}
