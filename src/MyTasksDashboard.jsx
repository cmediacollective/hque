import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function bucketFor(dueDate, todayMidnight) {
  if (!dueDate) return 'Later'
  const due = new Date(dueDate + 'T00:00:00')
  const msInDay = 24 * 60 * 60 * 1000
  const days = Math.round((due - todayMidnight) / msInDay)
  if (days < 0) return 'Today'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 6) return 'This Week'
  return 'Later'
}

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 }
const MAX_PER_BUCKET = 5

export default function MyTasksDashboard({ userId, orgId, dark = true, brands = [], onSelectBrand }) {
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
      .neq('status', 'archived')

    const brandIds = [...new Set((tasks || []).map(t => boardBrandMap[t.board_id]).filter(Boolean))]
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
    setAssignedTasks((tasks || []).filter(t => assignedSet.has(t.id)).map(enrich))
    setWatchedTasks((tasks || []).filter(t => !assignedSet.has(t.id)).map(enrich))
    setLoading(false)
  }

  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    const due = new Date(dueDate + 'T00:00:00')
    return due < todayMidnight
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
    const buckets = { Today: [], Tomorrow: [], 'This Week': [], Later: [] }
    tasks.forEach(t => buckets[bucketFor(t.due_date, todayMidnight)].push(t))
    Object.keys(buckets).forEach(k => buckets[k] = sortTasks(buckets[k]))
    return buckets
  }

  const assignedBuckets = bucketize(assignedTasks)
  const watchedBuckets = bucketize(watchedTasks)
  const overdueCount = assignedTasks.filter(t => isOverdue(t.due_date)).length

  const greet = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const BUCKETS = ['Today', 'Tomorrow', 'This Week', 'Later']

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
    const visible = tasks.slice(0, MAX_PER_BUCKET)
    const hidden = Math.max(0, tasks.length - MAX_PER_BUCKET)
    return (
      <div style={{ padding: '0 4px', minWidth: 0 }}>
        {visible.map(t => <TaskCard key={t.id} t={t} filled={filled} />)}
        {hidden > 0 && (
          <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5b7c99', padding: '6px 2px' }}>+{hidden} more</div>
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
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px', background: bg }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', paddingBottom: '18px', borderBottom: `0.5px solid ${border}` }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: subtle, marginBottom: '6px' }}>{dateLabel}</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', lineHeight: 1.2, color: text }}>
              {greet()}{profileName ? ', ' + profileName : ''}
            </div>
            <div style={{ fontSize: '12px', color: muted, marginTop: '4px' }}>
              {totalAssigned} assigned · {totalWatching} watching{overdueCount > 0 ? ' · ' + overdueCount + ' overdue' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: muted }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', background: '#5b7c99', borderRadius: '50%' }}></span>Assigned</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', border: `1px solid ${outlinedBorder}`, borderRadius: '50%' }}></span>Watching</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr', gap: 0, marginBottom: '8px' }}>
              <div></div>
              {BUCKETS.map(b => {
                const isToday = b === 'Today'
                return (
                  <div key={b} style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: isToday ? '#5b7c99' : muted, fontWeight: isToday ? 500 : 400, padding: '0 4px' }}>{b}</div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr', gap: 0, alignItems: 'start', marginBottom: '20px' }}>
              <div style={{ paddingTop: '8px', borderRight: `0.5px solid ${border}`, paddingRight: '12px' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: text, marginBottom: '2px' }}>Assigned</div>
                <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: subtle }}>To me</div>
              </div>
              {BUCKETS.map(b => (
                <div key={b}>{renderBucketColumn(b, assignedBuckets[b], true)}</div>
              ))}
            </div>

            {totalWatching > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr', gap: 0, alignItems: 'start' }}>
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

        <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: `0.5px solid ${border}`, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: subtle, textAlign: 'center' }}>
          Pick a brand/client on the left to see its board
        </div>
      </div>
    </div>
  )
}
