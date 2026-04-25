import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function bucketFor(dueDate, todayMidnight) {
  if (!dueDate) return null
  const due = new Date(dueDate + 'T00:00:00')
  const msInDay = 24 * 60 * 60 * 1000
  const days = Math.round((due - todayMidnight) / msInDay)
  if (days < 0) return 'Today'
  if (days === 0) return 'Today'
  if (days <= 7) return 'This Week'
  if (days <= 14) return 'Next Week'
  return null
}

const DONE_COLUMN_NAMES = ['done', 'completed', 'complete', 'shipped', 'closed']
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 }
const MAX_PER_BUCKET = 5

export default function MyTasksDashboard({ userId, orgId, dark = true, brands = [], onSelectBrand, agencyTz = 'America/Los_Angeles' }) {
  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const outlinedBorder = dark ? '#3A3A3A' : '#B8B0A4'

  const [loading, setLoading] = useState(true)
  const [assignedTasks, setAssignedTasks] = useState([])
  const [watchedTasks, setWatchedTasks] = useState([])
  const [profileName, setProfileName] = useState('')
  const [expandedBuckets, setExpandedBuckets] = useState(() => new Set())

  function toggleBucket(key) {
    setExpandedBuckets(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleTaskClick(t) {
    if (!onSelectBrand) return
    if (t.brand_id) {
      const brand = brands.find(b => b.id === t.brand_id)
      if (brand) onSelectBrand(brand)
    } else {
      onSelectBrand({ id: '__internal', name: 'Internal' })
    }
  }

  useEffect(() => {
    fetchProfile()
    fetchTasks()
  }, [userId, orgId])

  async function fetchProfile() {
    if (!userId) return
    const { data } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single()
    if (data) setProfileName((data.full_name || data.email || '').split(' ')[0])
  }

  async function fetchTasks() {
    if (!userId || !orgId) return
    setLoading(true)

    const { data: boards } = await supabase.from('boards').select('id, brand_id').eq('org_id', orgId).neq('status', 'archived')
    const boardIds = (boards || []).map(b => b.id)
    if (boardIds.length === 0) { setLoading(false); return }

    const boardBrandMap = {}
    ;(boards || []).forEach(b => { boardBrandMap[b.id] = b.brand_id })

    const { data: cols } = await supabase.from('board_columns').select('id, name, board_id, position').in('board_id', boardIds)
    const doneColumnIds = new Set()
    const lastColumnPerBoard = {}
    ;(cols || []).forEach(c => {
      const nameLower = (c.name || '').trim().toLowerCase()
      if (DONE_COLUMN_NAMES.includes(nameLower)) doneColumnIds.add(c.id)
      if (!lastColumnPerBoard[c.board_id] || c.position > lastColumnPerBoard[c.board_id].position) {
        lastColumnPerBoard[c.board_id] = { id: c.id, position: c.position }
      }
    })
    Object.values(lastColumnPerBoard).forEach(c => doneColumnIds.add(c.id))

    const { data: assignedLinks } = await supabase.from('task_assignees').select('task_id').eq('user_id', userId)
    const assignedIds = [...new Set((assignedLinks || []).map(r => r.task_id))]

    const { data: watchedLinks } = await supabase.from('task_watchers').select('task_id').eq('user_id', userId)
    const watchedIdsRaw = [...new Set((watchedLinks || []).map(r => r.task_id))]
    const watchedIds = watchedIdsRaw.filter(id => !assignedIds.includes(id))

    const allIds = [...assignedIds, ...watchedIds]
    if (allIds.length === 0) { setAssignedTasks([]); setWatchedTasks([]); setLoading(false); return }

    const { data: tasks } = await supabase.from('tasks')
      .select('*, task_assignees(user_id), task_watchers(user_id)')
      .in('id', allIds)
      .in('board_id', boardIds)

    const openTasks = (tasks || []).filter(t => !doneColumnIds.has(t.column_id))

    const brandIds = [...new Set(openTasks.map(t => boardBrandMap[t.board_id]).filter(Boolean))]
    let brandMap = {}
    if (brandIds.length > 0) {
      const { data: bs } = await supabase.from('brands').select('id, name, logo_url').in('id', brandIds)
      ;(bs || []).forEach(b => { brandMap[b.id] = b })
    }

    const enrich = t => {
      const brand_id = boardBrandMap[t.board_id]
      const brand = brand_id ? brandMap[brand_id] : null
      return { ...t, brand_id, brand_name: brand?.name || (brand_id ? '' : 'Internal'), brand_logo_url: brand?.logo_url }
    }

    const assignedSet = new Set(assignedIds)
    setAssignedTasks(openTasks.filter(t => assignedSet.has(t.id)).map(enrich))
    setWatchedTasks(openTasks.filter(t => !assignedSet.has(t.id)).map(enrich))
    setLoading(false)
  }

  function todayInTz(tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
      const get = (type) => parts.find(p => p.type === type)?.value
      return get('year') + '-' + get('month') + '-' + get('day')
    } catch {
      const d = new Date()
      const pad = n => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    }
  }
  const todayStr = todayInTz(agencyTz)
  const todayMidnight = new Date(todayStr + 'T00:00:00')
  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    return dueDate < todayStr
  }

  function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
      const aOver = isOverdue(a.due_date) ? 0 : 1
      const bOver = isOverdue(b.due_date) ? 0 : 1
      if (aOver !== bOver) return aOver - bOver
      const pa = PRIORITY_RANK[a.priority] ?? 1
      const pb = PRIORITY_RANK[b.priority] ?? 1
      if (pa !== pb) return pa - pb
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    })
  }

  function bucketize(tasks) {
    const buckets = { Today: [], 'This Week': [], 'Next Week': [] }
    tasks.forEach(t => {
      const b = bucketFor(t.due_date, todayMidnight)
      if (b && buckets[b]) buckets[b].push(t)
    })
    Object.keys(buckets).forEach(k => buckets[k] = sortTasks(buckets[k]))
    return buckets
  }

  const assignedBuckets = bucketize(assignedTasks)
  const watchedBuckets = bucketize(watchedTasks)
  const overdueCount = assignedTasks.filter(t => isOverdue(t.due_date)).length

  const HOLIDAYS = {
    '1-1': { greeting: 'Happy New Year', note: "Did you know? The Babylonians made the first recorded New Year's resolutions — about 4,000 years ago." },
    '2-2': { greeting: 'Happy Groundhog Day', note: 'Fun fact: Punxsutawney Phil has a roughly 39% accuracy rate on winter predictions. Not great, not terrible.' },
    '2-9': { greeting: 'Happy National Pizza Day', note: 'Did you know? Americans eat about 350 slices of pizza per second. That is a lot of cheese.' },
    '2-14': { greeting: "Happy Valentine's Day", note: "Did you know? Over 145 million Valentine's cards are exchanged each year — second only to Christmas." },
    '3-14': { greeting: 'Happy Pi Day', note: 'Did you know? Pi has been calculated to over 100 trillion digits. For most things, 3.14 is more than enough.' },
    '3-17': { greeting: "Happy St. Patrick's Day", note: "Did you know? Corned beef and cabbage is actually American — in Ireland the classic is bacon and cabbage." },
    '4-1': { greeting: "Happy April Fool's", note: "Tip: today is a good day NOT to push risky things to prod. Or to send mass emails. Save the pranks for Slack." },
    '4-22': { greeting: 'Happy Earth Day', note: 'Did you know? The first Earth Day in 1970 brought 20 million Americans into the streets. One day can still move things — pick one small habit to change.' },
    '5-4': { greeting: 'May the 4th Be With You', note: "Fun fact: the phrase predates the movies. British supporters told Margaret Thatcher 'May the Fourth be with you, Maggie' on May 4, 1979, the day she became PM." },
    '5-5': { greeting: 'Happy Cinco de Mayo', note: 'Did you know? Cinco de Mayo commemorates the Battle of Puebla, not Mexican Independence Day (that is September 16).' },
    '5-15': { greeting: 'Happy Chocolate Chip Day', note: 'Did you know? The chocolate chip cookie was invented by accident in 1938 by Ruth Wakefield at the Toll House Inn in Massachusetts.' },
    '6-19': { greeting: 'Happy Juneteenth', note: 'Did you know? Juneteenth marks June 19, 1865 — when enslaved people in Galveston, Texas finally learned they were free, 2.5 years after the Emancipation Proclamation.' },
    '6-21': { greeting: 'Happy Summer Solstice', note: "Did you know? At the North Pole, the sun doesn't set at all today — it's one continuous day of sunlight for about six months." },
    '7-4': { greeting: 'Happy 4th of July', note: 'Did you know? Americans eat about 150 million hot dogs on July 4th. Enough to stretch from D.C. to L.A. more than five times.' },
    '7-17': { greeting: 'Happy World Emoji Day', note: 'Did you know? The 😂 face was named Oxford Dictionaries Word of the Year in 2015. An emoji. As the word.' },
    '9-19': { greeting: 'Ahoy, Captain', note: 'Fun fact: Blackbeard used to tie lit fuses in his beard before battle to look more terrifying. Marketing, 1700s style.' },
    '9-29': { greeting: 'Happy National Coffee Day', note: 'Did you know? Americans drink about 400 million cups of coffee a day. Second cup is allowed. Third too.' },
    '10-1': { greeting: 'Happy International Coffee Day', note: 'Did you know? Finland drinks the most coffee per capita — around 12kg per person per year. That is a lot of brew.' },
    '10-4': { greeting: 'Happy World Animal Day', note: 'Tip: foster a pet, donate to a rescue, or just give yours an extra treat today. They will not argue.' },
    '10-31': { greeting: 'Happy Halloween', note: 'Halloween joke: why did the skeleton skip the party? He had no body to go with. You are welcome.' },
    '11-11': { greeting: 'Thank you to our Veterans', note: "Did you know? Veterans Day was originally 'Armistice Day' — marking the end of WWI at 11am on the 11th day of the 11th month, 1918." },
    '12-21': { greeting: 'Happy Winter Solstice', note: 'Did you know? From today on, days start getting longer again. You officially survived the darkest day of the year.' },
    '12-24': { greeting: 'Happy Christmas Eve', note: "Did you know? NORAD has tracked Santa's flight every year since 1955, when a kid misdialed a number and reached a military hotline." },
    '12-25': { greeting: 'Merry Christmas', note: "Did you know? 'Jingle Bells' was originally written for Thanksgiving, not Christmas." },
    '12-26': { greeting: 'Happy First Day of Kwanzaa', note: "Did you know? Kwanzaa means 'first fruits' in Swahili. Seven days, seven principles. Today: Umoja — unity." },
    '12-31': { greeting: "Happy New Year's Eve", note: 'Did you know? The first Times Square ball drop was in 1907. The original ball was iron and wood, weighed 700 pounds, and held 100 lightbulbs.' }
  }

  // Holidays whose Gregorian date shifts each year (lunar, etc.) — add entries as needed
  const YEAR_HOLIDAYS = {
    2026: {
      '2-17': { greeting: 'Happy Lunar New Year', note: 'Did you know? Lunar New Year triggers the largest annual human migration on Earth — hundreds of millions of people traveling home. 2026 is the Year of the Horse.' },
      '11-8': { greeting: 'Happy Diwali', note: 'Did you know? Diwali celebrates the triumph of light over darkness and is observed across Hindu, Jain, Sikh, and Buddhist traditions worldwide.' },
      '12-4': { greeting: 'Happy Hanukkah', note: 'Did you know? Hanukkah commemorates a single day of temple oil that miraculously lasted eight nights. Latkes and sufganiyot all week.' }
    },
    2027: {
      '2-6': { greeting: 'Happy Lunar New Year', note: 'Did you know? Lunar New Year triggers the largest annual human migration on Earth. 2027 is the Year of the Goat.' },
      '10-29': { greeting: 'Happy Diwali', note: 'Did you know? Diwali celebrates the triumph of light over darkness and is observed across Hindu, Jain, Sikh, and Buddhist traditions worldwide.' },
      '12-24': { greeting: 'Happy Hanukkah', note: 'Did you know? Hanukkah commemorates a single day of temple oil that miraculously lasted eight nights. Latkes and sufganiyot all week.' }
    },
    2028: {
      '1-26': { greeting: 'Happy Lunar New Year', note: 'Did you know? Lunar New Year triggers the largest annual human migration on Earth. 2028 is the Year of the Monkey.' },
      '11-17': { greeting: 'Happy Diwali', note: 'Did you know? Diwali celebrates the triumph of light over darkness and is observed across Hindu, Jain, Sikh, and Buddhist traditions worldwide.' },
      '12-12': { greeting: 'Happy Hanukkah', note: 'Did you know? Hanukkah commemorates a single day of temple oil that miraculously lasted eight nights. Latkes and sufganiyot all week.' }
    },
    2029: {
      '2-13': { greeting: 'Happy Lunar New Year', note: 'Did you know? Lunar New Year triggers the largest annual human migration on Earth. 2029 is the Year of the Rooster.' },
      '11-5': { greeting: 'Happy Diwali', note: 'Did you know? Diwali celebrates the triumph of light over darkness and is observed across Hindu, Jain, Sikh, and Buddhist traditions worldwide.' },
      '12-1': { greeting: 'Happy Hanukkah', note: 'Did you know? Hanukkah commemorates a single day of temple oil that miraculously lasted eight nights. Latkes and sufganiyot all week.' }
    },
    2030: {
      '2-3': { greeting: 'Happy Lunar New Year', note: 'Did you know? Lunar New Year triggers the largest annual human migration on Earth. 2030 is the Year of the Dog.' },
      '10-26': { greeting: 'Happy Diwali', note: 'Did you know? Diwali celebrates the triumph of light over darkness and is observed across Hindu, Jain, Sikh, and Buddhist traditions worldwide.' },
      '12-20': { greeting: 'Happy Hanukkah', note: 'Did you know? Hanukkah commemorates a single day of temple oil that miraculously lasted eight nights. Latkes and sufganiyot all week.' }
    }
  }

  // Nth weekday of month (1-indexed day), month 0-indexed, weekday 0=Sun
  function nthDowOfMonth(year, monthZero, weekday, n) {
    const first = new Date(year, monthZero, 1)
    const offset = (weekday - first.getDay() + 7) % 7
    return 1 + offset + (n - 1) * 7
  }

  const FUN_NOTES = [
    'Octopuses have three hearts and blue blood.',
    'A group of flamingos is called a flamboyance.',
    'Honey never spoils. Neither do great creative briefs.',
    "The shortest war in history lasted 38 minutes.",
    "Sea otters hold hands while sleeping so they don't drift apart.",
    "Bananas are berries. Strawberries aren't.",
    'The Eiffel Tower grows ~15cm taller in the summer.',
    'A cloud can weigh more than a million pounds — talk about overhead.',
    'Wombats poop in cubes.',
    'The first domain ever registered was symbolics.com, in 1985.',
    'Cows have best friends and get stressed when separated.',
    'Honeybees can recognize human faces.',
    'The dot over the letter i is called a tittle.',
    'Oxford comma wars have been ongoing for 100+ years.',
    'Slugs have four noses.',
    'A day on Venus is longer than its year.',
    'Bubble wrap was originally invented as wallpaper.',
    "A shrimp's heart is in its head.",
    'Butterflies taste with their feet.',
    'There are more stars in the universe than grains of sand on Earth.',
    'Penguins propose with pebbles.',
    'Crows can recognize individual human faces and hold grudges.',
    'The inventor of the Frisbee was cremated and made into a Frisbee.',
    'Sloths can hold their breath longer than dolphins can.',
    'A snail can sleep for three years.',
    'Saturn would float if you could find a bathtub big enough.',
    "The Great Wall of China is not actually visible from space.",
    "Koalas have fingerprints nearly identical to humans'.",
    'A jellyfish is 95% water.',
    'Your stomach gets a new lining every 3–4 days.',
    "There's a species of jellyfish that is biologically immortal.",
    'Pineapples take two years to grow.',
    'Bees can do math. Really.',
    'Goats have rectangular pupils.',
    'Giraffes have the same number of neck vertebrae as humans: seven.',
    'Ketchup was once sold as medicine.',
    'The unicorn is Scotland’s national animal.',
    'Wasps invented paper 50 million years before humans.',
    'A blue whale’s heart is the size of a small car.',
    'A "jiffy" is a real unit of time: 1/100th of a second.',
    "You can't hum while holding your nose closed.",
    'Carrots were originally purple.',
    'The plastic tip on a shoelace is called an aglet.',
    "There's a word for the smell of rain: petrichor.",
    'Norway once knighted a penguin.',
    'A group of owls is called a parliament.',
    'Your nose can detect about one trillion smells.',
    'Apples, pears, cherries, and plums are all in the rose family.',
    'Mosquitoes have killed more humans than all wars combined.'
  ]

  function tzParts(now, tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false }).formatToParts(now)
      const get = t => parts.find(p => p.type === t)?.value
      return { month: parseInt(get('month') || '0'), day: parseInt(get('day') || '0'), hour: parseInt(get('hour') || '0') }
    } catch {
      return { month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours() }
    }
  }

  const dailyVibe = (() => {
    const now = new Date()
    const { month, day, hour } = tzParts(now, agencyTz)
    const year = now.getFullYear()
    const key = `${month}-${day}`

    // 1. Year-specific (Lunar New Year, Hanukkah, Diwali)
    const ySpecific = YEAR_HOLIDAYS[year]?.[key]
    if (ySpecific) return ySpecific

    // 2. Computed US holidays that shift each year
    if (month === 7 && day === nthDowOfMonth(year, 6, 0, 3)) {
      return { greeting: 'Happy National Ice Cream Day', note: 'Did you know? Americans eat an average of 20 pounds of ice cream per person per year. Today, add a little extra.' }
    }
    if (month === 11 && day === nthDowOfMonth(year, 10, 4, 4)) {
      return { greeting: 'Happy Thanksgiving', note: 'Did you know? The first Thanksgiving in 1621 lasted three days and was more of a harvest festival than a feast. Gratitude list beats to-do list today.' }
    }
    if (month === 5 && day === nthDowOfMonth(year, 4, 0, 2)) {
      return { greeting: "Happy Mother's Day", note: 'Did you know? Anna Jarvis founded Mother\'s Day in 1908 and later campaigned to abolish it, upset at how commercial it got. Call her anyway.' }
    }
    if (month === 6 && day === nthDowOfMonth(year, 5, 0, 3)) {
      return { greeting: "Happy Father's Day", note: "Did you know? Father's Day became an official US holiday in 1972 — 58 years after Mother's Day. Dads are patient." }
    }

    // 3. Fixed-date holidays
    const h = HOLIDAYS[key]
    if (h) return h

    // 4. Default: time-of-day greeting + rotating fun fact
    const g = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0))
    const dayOfYear = Math.floor((now - start) / 86400000)
    return { greeting: g, note: FUN_NOTES[dayOfYear % FUN_NOTES.length] }
  })()
  const dateLabel = (() => {
    try {
      return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: agencyTz })
    } catch {
      return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    }
  })()

  const BUCKETS = ['Today', 'This Week', 'Next Week']

  const TaskCard = ({ t, filled = true }) => {
    const overdue = isOverdue(t.due_date) && filled
    const brandPrefix = t.brand_name ? t.brand_name + ' · ' : ''
    const dueText = t.due_date ? new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'
    const brandLine = brandPrefix + (overdue ? 'Due ' + dueText : dueText)

    if (filled) {
      return (
        <div onClick={() => handleTaskClick(t)} style={{ background: '#5b7c99', color: '#fff', padding: '10px 12px', borderRadius: '2px', position: 'relative', cursor: 'pointer', marginBottom: '6px' }}>
          {overdue && <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '7px', letterSpacing: '0.14em', background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: '1px' }}>OVERDUE</div>}
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', marginBottom: '6px', paddingRight: overdue ? '48px' : '0', lineHeight: 1.3 }}>{t.title}</div>
          <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85 }}>{brandLine}</div>
        </div>
      )
    }
    return (
      <div onClick={() => handleTaskClick(t)} style={{ background: 'transparent', color: text, padding: '10px 12px', borderRadius: '2px', border: `0.5px solid ${outlinedBorder}`, cursor: 'pointer', marginBottom: '6px' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', marginBottom: '6px', lineHeight: 1.3 }}>{t.title}</div>
        <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: subtle }}>{brandLine}</div>
      </div>
    )
  }

  const renderBucketColumn = (bucketName, tasks, filled) => {
    const key = `${filled ? 'assigned' : 'watched'}-${bucketName}`
    const expanded = expandedBuckets.has(key)
    const visible = expanded ? tasks : tasks.slice(0, MAX_PER_BUCKET)
    const hidden = Math.max(0, tasks.length - MAX_PER_BUCKET)
    return (
      <div style={{ padding: '0 4px', minWidth: 0 }}>
        {visible.map(t => <TaskCard key={t.id} t={t} filled={filled} />)}
        {hidden > 0 && (
          <button
            onClick={() => toggleBucket(key)}
            style={{ background: 'none', border: 'none', padding: '6px 2px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5b7c99', cursor: 'pointer', textAlign: 'left' }}>
            {expanded ? 'Show less' : `+${hidden} more`}
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: subtle, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        Loading your tasks...
      </div>
    )
  }

  const totalAssigned = assignedTasks.length
  const totalWatching = watchedTasks.length
  const hasAnything = totalAssigned > 0 || totalWatching > 0

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px 0', background: bg }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', paddingBottom: '18px', borderBottom: `0.5px solid ${border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '32px' }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: subtle, marginBottom: '6px' }}>{dateLabel}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', lineHeight: 1.2, color: text }}>
                {dailyVibe.greeting}{profileName ? ', ' + profileName : ''}
              </div>
              <div style={{ fontSize: '12px', color: muted, marginTop: '4px' }}>
                {totalAssigned} assigned · {totalWatching} watching{overdueCount > 0 ? ' · ' + overdueCount + ' overdue' : ''}
              </div>
            </div>

            {dailyVibe.note && (() => {
              const m = dailyVibe.note.match(/^(Did you know\?|Fun fact:|Tip:|Halloween joke:)\s*/i)
              const intro = m ? m[1] : 'Did you know?'
              const body = m ? dailyVibe.note.slice(m[0].length) : dailyVibe.note
              return (
                <div style={{ borderLeft: '3px solid #5b7c99', padding: '4px 0 4px 18px', maxWidth: '480px', fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'italic', lineHeight: 1.55, color: text }}>
                  <span style={{ color: '#5b7c99' }}>{intro}</span> {body}
                </div>
              )
            })()}
          </div>

        </div>

        {!hasAnything && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>Nothing on your plate right now</div>
            <div style={{ fontSize: '12px', color: subtle, lineHeight: 1.7 }}>
              When tasks are assigned to you or you're watching one, they'll show up here.<br />
              Pick a brand from the sidebar to see its board.
            </div>
          </div>
        )}

        {hasAnything && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 0, marginBottom: '8px' }}>
              <div></div>
              {BUCKETS.map(b => {
                const isToday = b === 'Today'
                return (
                  <div key={b} style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: isToday ? '#5b7c99' : muted, fontWeight: isToday ? 500 : 400, padding: '0 4px' }}>{b}</div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 0, alignItems: 'start', marginBottom: '20px' }}>
              <div style={{ paddingTop: '8px', borderRight: `0.5px solid ${border}`, paddingRight: '12px' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: text, marginBottom: '2px' }}>Assigned</div>
                <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: subtle }}>To me</div>
              </div>
              {BUCKETS.map(b => (
                <div key={b}>{renderBucketColumn(b, assignedBuckets[b], true)}</div>
              ))}
            </div>

            {totalWatching > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 0, alignItems: 'start' }}>
                <div style={{ paddingTop: '8px', borderRight: `0.5px solid ${border}`, paddingRight: '12px' }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: text, marginBottom: '2px' }}>Watching</div>
                  <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: subtle }}>Keep tabs</div>
                </div>
                {BUCKETS.map(b => (
                  <div key={b}>{renderBucketColumn(b, watchedBuckets[b], false)}</div>
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ position: 'sticky', bottom: 0, marginTop: '32px', paddingTop: '14px', paddingBottom: '14px', background: bg, borderTop: `0.5px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: subtle }}>
            Pick a brand/client on the left for the full board
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: muted }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', background: '#5b7c99', borderRadius: '50%' }}></span>Assigned</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', border: `1px solid ${outlinedBorder}`, borderRadius: '50%' }}></span>Watching</span>
          </div>
        </div>
      </div>
    </div>
  )
}
