import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import BrandsSidebar from './BrandsSidebar'
import TaskDetail from './TaskDetail'
import MyTasksDashboard from './MyTasksDashboard'
import { createNotification, parseMentions } from './notify'

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Review', 'Hold', 'Done']
const DONE_COLUMN_NAMES = ['done', 'completed', 'complete', 'shipped', 'closed']
const PRIORITIES = ['Low', 'Medium', 'High']

function TaskForm({ initial, onSave, onCancel, dark, members = [] }) {
  const [form, setForm] = useState({ ...initial, assignee_ids: initial.assignee_ids || [] })
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [saving, setSaving] = useState(false)
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false)
  const inputBg = dark ? '#1A1A1A' : '#F5F3EF'
  const border = dark ? '#3A3A3A' : '#C4BFB8'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const subtle = dark ? '#666' : '#888'
  const cardBg = dark ? '#222' : '#FFFFFF'

  const doSave = async () => {
    if (saving || !form.title?.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const toggleAssignee = (uid) => {
    setForm(f => ({ ...f, assignee_ids: (f.assignee_ids || []).includes(uid) ? (f.assignee_ids || []).filter(id => id !== uid) : [...(f.assignee_ids || []), uid] }))
  }

  const selectedAssignees = members.filter(m => (form.assignee_ids || []).includes(m.id))

  return (
    <div style={{ background: cardBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '12px', marginBottom: '6px' }}>
      <textarea
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSave() } }}
        placeholder='Task title... (Enter to save)'
        autoFocus
        style={{ width: '100%', background: 'none', border: 'none', color: text, fontSize: '12px', outline: 'none', resize: 'none', height: '60px', fontFamily: 'inherit', marginBottom: '8px', boxSizing: 'border-box' }}
      />
      <textarea
        value={form.description || ""}
        onChange={e => {
          const val = e.target.value
          setForm(f => ({ ...f, description: val }))
          const lastWord = val.split(/\s/).pop()
          if (lastWord.startsWith("@")) { setShowMentions(true); setMentionQuery(lastWord.slice(1)) }
          else { setShowMentions(false); setMentionQuery("") }
        }}
        placeholder="Description... (use @ to mention a team member)"
        style={{ width: "100%", background: "none", border: `0.5px solid ${border}`, borderRadius: "1px", color: text, fontSize: "11px", outline: "none", resize: "vertical", height: "60px", fontFamily: "inherit", marginBottom: "6px", padding: "6px 8px", boxSizing: "border-box" }}
      />
      {showMentions && members.filter(m => (m.full_name || m.email).toLowerCase().includes(mentionQuery.toLowerCase())).length > 0 && (
        <div style={{ background: dark ? "#1E1E1E" : "#fff", border: `0.5px solid ${border}`, borderRadius: "1px", marginBottom: "6px", overflow: "hidden" }}>
          {members.filter(m => (m.full_name || m.email).toLowerCase().includes(mentionQuery.toLowerCase())).map(m => (
            <div key={m.id} onClick={() => {
              const name = m.full_name || m.email
              const val = form.description.replace(/@[\w.]*$/, `@${name} `)
              setForm(f => ({ ...f, description: val }))
              setShowMentions(false)
            }} style={{ padding: "6px 10px", cursor: "pointer", fontSize: "11px", color: text }}>
              @{m.full_name || m.email}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: text, outline: 'none' }}>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type='date' value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: text, outline: 'none' }} />
      </div>
      <div style={{ marginBottom: '8px', position: 'relative' }}>
        <div onClick={() => setAssigneeMenuOpen(o => !o)} style={{ minHeight: '28px', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '4px 6px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
          {selectedAssignees.length === 0 && <span style={{ fontSize: '10px', color: subtle }}>Assign team members</span>}
          {selectedAssignees.map(m => (
            <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: dark ? '#2A2A2A' : '#E8E4DE', padding: '2px 6px 2px 2px', borderRadius: '10px', fontSize: '10px', color: text }}>
              {m.avatar_url ? (
                <img src={m.avatar_url} alt='' style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#7A9B8E', color: '#fff', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>{(m.full_name || m.email).charAt(0).toUpperCase()}</span>
              )}
              <span>{(m.full_name || m.email).split(' ')[0]}</span>
              <button onClick={e => { e.stopPropagation(); toggleAssignee(m.id) }} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '11px', padding: '0 1px', lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
        {assigneeMenuOpen && (
          <>
            <div onClick={() => setAssigneeMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
            <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: dark ? '#141414' : '#fff', border: `0.5px solid ${border}`, borderRadius: '1px', zIndex: 20, maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
              {members.map(m => {
                const isSelected = (form.assignee_ids || []).includes(m.id)
                return (
                  <div key={m.id} onClick={e => { e.stopPropagation(); toggleAssignee(m.id) }}
                    style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: isSelected ? (dark ? '#1a1a1a' : '#F0EDE8') : 'transparent' }}>
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt='' style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#7A9B8E', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>{(m.full_name || m.email).charAt(0).toUpperCase()}</span>
                    )}
                    <span style={{ fontSize: '11px', color: text, flex: 1 }}>{m.full_name || m.email}</span>
                    {isSelected && <span style={{ fontSize: '10px', color: '#5b7c99' }}>✓</span>}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={doSave} disabled={saving} style={{ padding: '5px 12px', fontSize: '9px', background: saving ? '#3f5668' : '#5b7c99', border: 'none', color: '#fff', cursor: saving ? 'default' : 'pointer', borderRadius: '1px', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
        <button onClick={onCancel} style={{ padding: '5px 12px', fontSize: '9px', background: 'none', border: `0.5px solid ${border}`, color: dark ? '#777' : '#888', cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function WorkspaceView({ orgId, userId, agencyTz = 'America/Los_Angeles', dark = true, openTaskId = null, onOpenTaskHandled, isMobile = false }) {
  const [members, setMembers] = useState([])
  const [brands, setBrands] = useState([])
  const [campaigns, setCampaigns] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('id, email, full_name, avatar_url').eq('org_id', orgId).then(({ data }) => setMembers(data || []))
    supabase.from('brands').select('id, name, logo_url, website').eq('org_id', orgId).order('name').then(({ data }) => setBrands(data || []))
    supabase.from('campaigns').select('id, name').eq('org_id', orgId).eq('archived', false).order('created_at', { ascending: false }).then(({ data }) => setCampaigns(data || []))
  }, [orgId])

  const cleanedUpRef = useRef(false)
  useEffect(() => {
    if (!orgId || cleanedUpRef.current) return
    cleanedUpRef.current = true
    ;(async () => {
      const { data: linked } = await supabase
        .from('tasks')
        .select('id, title, description, campaign_id')
        .eq('org_id', orgId)
        .not('campaign_id', 'is', null)
      if (!linked || linked.length === 0) return
      const ids = [...new Set(linked.map(t => t.campaign_id))]
      const { data: camps } = await supabase.from('campaigns').select('id, name').in('id', ids)
      const nameMap = {}
      ;(camps || []).forEach(c => { nameMap[c.id] = c.name })
      const orphanIds = linked
        .filter(t => !t.description && t.title && t.title === nameMap[t.campaign_id])
        .map(t => t.id)
      if (orphanIds.length === 0) return
      await supabase.from('tasks').delete().in('id', orphanIds)
      setTasks(ts => ts.filter(t => !orphanIds.includes(t.id)))
    })()
  }, [orgId])

  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#3A3A3A' : '#C4BFB8'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const muted = dark ? '#888' : '#666'
  const subtle = dark ? '#555' : '#999'
  const gridBg = dark ? '#2A2A2A' : '#D4CFC8'
  const colBg = dark ? '#1A1A1A' : '#F5F3EF'
  const colHover = dark ? '#222' : '#EDEAE5'

  const [selectedBrand, setSelectedBrand] = useState(null)
  const [activeBoard, setActiveBoard] = useState(null)
  const [columns, setColumns] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('kanban')
  const [showNewTask, setShowNewTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  useEffect(() => {
    if (!selectedBrand) { setActiveBoard(null); setColumns([]); setTasks([]); return }
    findOrCreateBoardForBrand(selectedBrand)
  }, [selectedBrand?.id])

  useEffect(() => {
    if (activeBoard) { fetchColumns(); fetchTasks() }
  }, [activeBoard?.id])

  useEffect(() => {
    if (!openTaskId || !orgId) return
    ;(async () => {
      const { data: t } = await supabase.from('tasks').select('*, task_assignees(user_id), task_watchers(user_id), board:boards(brand_id)').eq('id', openTaskId).maybeSingle()
      if (!t) { onOpenTaskHandled && onOpenTaskHandled(); return }
      const brandId = t.board?.brand_id
      if (brandId) {
        const { data: b } = await supabase.from('brands').select('*').eq('id', brandId).maybeSingle()
        if (b) setSelectedBrand(b)
      } else {
        setSelectedBrand({ id: '__internal', name: 'Internal' })
      }
      setEditingTask({
        ...t,
        assignee_ids: (t.task_assignees || []).map(r => r.user_id),
        watcher_ids: (t.task_watchers || []).map(r => r.user_id)
      })
      onOpenTaskHandled && onOpenTaskHandled()
    })()
  }, [openTaskId, orgId])

  async function findOrCreateBoardForBrand(brand) {
    setLoading(true)
    const isInternal = brand.id === '__internal'
    let query = supabase.from('boards').select('*').eq('org_id', orgId).neq('status', 'archived').order('created_at', { ascending: true })
    query = isInternal ? query.is('brand_id', null) : query.eq('brand_id', brand.id)
    const { data } = await query.limit(1).maybeSingle()
    if (data) { setActiveBoard(data); setLoading(false); return }
    const { data: newBoard } = await supabase.from('boards').insert([{ name: brand.name, org_id: orgId, brand_id: isInternal ? null : brand.id, status: 'active' }]).select().single()
    if (newBoard) {
      await supabase.from('board_columns').insert(DEFAULT_COLUMNS.map((name, i) => ({ board_id: newBoard.id, name, position: i })))
      setActiveBoard(newBoard)
    }
    setLoading(false)
  }

  async function fetchColumns() {
    const { data } = await supabase.from('board_columns').select('*').eq('board_id', activeBoard.id).order('position')
    setColumns(data || [])
  }

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*, task_assignees(user_id), task_watchers(user_id)').eq('board_id', activeBoard.id).order('position')
    const enriched = (data || []).map(t => ({
      ...t,
      assignee_ids: (t.task_assignees || []).map(r => r.user_id),
      watcher_ids: (t.task_watchers || []).map(r => r.user_id)
    }))
    setTasks(enriched)
  }

  async function syncAssignees(taskId, newIds, taskTitle) {
    const { data: existing } = await supabase.from('task_assignees').select('user_id').eq('task_id', taskId)
    const existingIds = (existing || []).map(r => r.user_id)
    const toRemove = existingIds.filter(id => !newIds.includes(id))
    const toAdd = newIds.filter(id => !existingIds.includes(id))
    if (toRemove.length) await supabase.from('task_assignees').delete().eq('task_id', taskId).in('user_id', toRemove)
    if (toAdd.length) {
      await supabase.from('task_assignees').insert(toAdd.map(uid => ({ task_id: taskId, user_id: uid })))
      for (const uid of toAdd) {
        const m = members.find(p => p.id === uid)
        if (m) await createNotification(orgId, m.full_name || m.email, 'assignment', `You were assigned to: ${taskTitle}`, members, taskId)
      }
    }
  }

  async function syncWatchers(taskId, newIds, taskTitle) {
    const { data: existing } = await supabase.from('task_watchers').select('user_id').eq('task_id', taskId)
    const existingIds = (existing || []).map(r => r.user_id)
    const toRemove = existingIds.filter(id => !newIds.includes(id))
    const toAdd = newIds.filter(id => !existingIds.includes(id))
    if (toRemove.length) await supabase.from('task_watchers').delete().eq('task_id', taskId).in('user_id', toRemove)
    if (toAdd.length) {
      await supabase.from('task_watchers').insert(toAdd.map(uid => ({ task_id: taskId, user_id: uid })))
      for (const uid of toAdd) {
        const m = members.find(p => p.id === uid)
        if (m) await createNotification(orgId, m.full_name || m.email, 'watching', `You're watching: ${taskTitle}`, members, taskId)
      }
    }
  }

  async function createTask(columnId, form) {
    if (!form.title?.trim()) return
    const { data: inserted } = await supabase.from('tasks').insert([{
      title: form.title, description: form.description || null, priority: form.priority || 'Medium',
      due_date: form.due_date || null,
      column_id: columnId, board_id: activeBoard.id, org_id: orgId,
      position: tasks.filter(t => t.column_id === columnId).length
    }]).select().single()
    setShowNewTask(null)
    if (inserted) {
      if (form.assignee_ids?.length) await syncAssignees(inserted.id, form.assignee_ids, form.title)
      await parseMentions(form.description, orgId, `You were mentioned in: ${form.title}`, members, inserted.id)
    }
    fetchTasks()
  }

  async function updateTask(form) {
    await supabase.from('tasks').update({ title: form.title, description: form.description || null, priority: form.priority, due_date: form.due_date || null, column_id: form.column_id, campaign_id: form.campaign_id || null }).eq('id', form.id)
    if (form.assignee_ids) await syncAssignees(form.id, form.assignee_ids, form.title)
    if (form.watcher_ids) await syncWatchers(form.id, form.watcher_ids, form.title)
    fetchTasks()
    await parseMentions(form.description, orgId, `You were mentioned in: ${form.title}`, members, form.id)
  }

  async function moveTask(taskId, newColumnId) {
    await supabase.from('tasks').update({ column_id: newColumnId }).eq('id', taskId)
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, column_id: newColumnId } : t))
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(ts => ts.filter(t => t.id !== taskId))
  }

  const priorityColor = (p) => p === 'High' ? '#c0392b' : p === 'Medium' ? '#5b7c99' : '#777'

  const doneColumnIds = (() => {
    const ids = new Set()
    if (!columns || columns.length === 0) return ids
    let last = columns[0]
    columns.forEach(c => {
      const nameLower = (c.name || '').trim().toLowerCase()
      if (DONE_COLUMN_NAMES.includes(nameLower)) ids.add(c.id)
      if (c.position > last.position) last = c
    })
    ids.add(last.id)
    return ids
  })()

  const colorFromName = (name) => {
    if (!name) return '#5b7c99'
    const colors = ['#5B7C99', '#B784A7', '#7A9B8E', '#A87575', '#8C6BAA', '#D4A574', '#6B8E7F']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  const renderAvatars = (task) => {
    const ids = task.assignee_ids || []
    if (ids.length === 0) return null
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
        {ids.slice(0, 3).map((uid, i) => {
          const m = members.find(mem => mem.id === uid)
          if (!m) return null
          const initials = (m.full_name || m.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          const commonStyle = { marginLeft: i === 0 ? 0 : -4, width: '20px', height: '20px', borderRadius: '50%', border: `1.5px solid ${card}`, zIndex: 3 - i, flexShrink: 0 }
          if (m.avatar_url) {
            return <img key={uid} src={m.avatar_url} alt={m.full_name || m.email} title={m.full_name || m.email} style={{ ...commonStyle, objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none' }} />
          }
          return (
            <div key={uid} title={m.full_name || m.email} style={{ ...commonStyle, background: '#7A9B8E', color: '#fff', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>{initials}</div>
          )
        })}
        {ids.length > 3 && (
          <div style={{ marginLeft: -4, width: '20px', height: '20px', borderRadius: '50%', background: dark ? '#333' : '#E0DCD6', color: muted, fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, border: `1.5px solid ${card}` }}>+{ids.length - 3}</div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: bg }}>
      <BrandsSidebar dark={dark} orgId={orgId} selectedBrandId={selectedBrand?.id} onSelectBrand={setSelectedBrand} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedBrand && !isMobile && (
          <MyTasksDashboard userId={userId} orgId={orgId} dark={dark} brands={brands} onSelectBrand={setSelectedBrand} agencyTz={agencyTz} />
        )}
        {!selectedBrand && isMobile && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div style={{ textAlign: 'center', maxWidth: '360px' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: text, marginBottom: '10px' }}>Select a brand/client</div>
              <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7 }}>Choose a brand or client from the sidebar to see its Kanban board.</div>
            </div>
          </div>
        )}

        {selectedBrand && (
          <>
            <div style={{ padding: '18px 28px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: `0.5px solid ${border}`, flexShrink: 0 }}>
              <button onClick={() => setSelectedBrand(null)} title='Back to My Tasks dashboard' style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: '0.5px solid #5b7c99', color: '#fff', cursor: 'pointer', borderRadius: '1px', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', lineHeight: 1 }}>←</span>
                <span>My Tasks</span>
              </button>
              {selectedBrand.id === '__internal' ? (
                <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: dark ? '#2A2A2A' : '#E0DCD6', color: muted, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `0.5px solid ${border}` }}>⚙</div>
              ) : selectedBrand.logo_url ? (
                <img src={selectedBrand.logo_url} alt={selectedBrand.name} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px', background: '#fff', padding: '3px', border: `0.5px solid ${border}`, flexShrink: 0 }} onError={e => { e.target.style.display = 'none' }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: colorFromName(selectedBrand.name), color: '#fff', fontSize: '15px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{(selectedBrand.name || '?').charAt(0).toUpperCase()}</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, lineHeight: 1.2 }}>{selectedBrand.name}</div>
                <div style={{ fontSize: '10px', color: subtle, letterSpacing: '0.14em', marginTop: '3px' }}>
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                  {selectedBrand.website && (<> · <a href={selectedBrand.website} target='_blank' rel='noreferrer' style={{ color: '#5b7c99', textDecoration: 'none' }}>Website ↗</a></>)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0', border: `0.5px solid ${border2}`, borderRadius: '1px', flexShrink: 0 }}>
                <button onClick={() => setViewMode('kanban')} style={{ padding: '5px 12px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: viewMode === 'kanban' ? '#5b7c99' : 'none', border: 'none', color: viewMode === 'kanban' ? '#fff' : muted, cursor: 'pointer' }}>Kanban</button>
                <button onClick={() => setViewMode('list')} style={{ padding: '5px 12px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: viewMode === 'list' ? '#5b7c99' : 'none', border: 'none', color: viewMode === 'list' ? '#fff' : muted, cursor: 'pointer', borderLeft: `0.5px solid ${border2}` }}>List</button>
              </div>
            </div>

            {loading && (<div style={{ padding: '40px 28px', color: subtle, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</div>)}

            {!loading && viewMode === 'kanban' && (
              <div style={{ display: 'flex', gap: '1px', background: gridBg, flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
                {columns.map(col => (
                  <div key={col.id}
                    style={{ flex: '0 0 260px', minWidth: '260px', background: dragOver === col.id ? colHover : colBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => { e.preventDefault(); if (dragging) moveTask(dragging, col.id); setDragging(null); setDragOver(null) }}>

                    <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '8px', letterSpacing: '0.26em', textTransform: 'uppercase', color: muted }}>{col.name}</div>
                      <div style={{ fontSize: '10px', color: subtle }}>{tasks.filter(t => t.column_id === col.id).length}</div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0' }}>
                      {tasks.filter(t => t.column_id === col.id).map(task => (
                        <div key={task.id}
                          draggable
                          onDragStart={() => setDragging(task.id)}
                          onDragEnd={() => setDragging(null)}
                          onClick={() => setEditingTask({ ...task })}
                          style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '12px', marginBottom: '6px', cursor: 'pointer', opacity: doneColumnIds.has(task.column_id) ? 0.55 : 1 }}>
                          <div style={{ fontSize: '12px', color: text, lineHeight: 1.45, marginBottom: '8px', textDecoration: doneColumnIds.has(task.column_id) ? 'line-through' : 'none' }}>{task.title}</div>
                          {task.description && <div style={{ fontSize: "10px", color: muted, lineHeight: 1.5, marginBottom: "6px", whiteSpace: "pre-wrap", display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</div>}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: priorityColor(task.priority), border: `0.5px solid ${priorityColor(task.priority)}`, padding: '2px 6px' }}>{task.priority}</span>
                              {task.due_date && <span style={{ fontSize: '9px', color: muted }}>{new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                              {renderAvatars(task)}
                            </div>
                            <button onClick={e => { e.stopPropagation(); deleteTask(task.id) }} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
                          </div>
                        </div>
                      ))}

                      {showNewTask === col.id ? (
                        <TaskForm initial={{ title: '', priority: 'Medium', due_date: '', description: '', assignee_ids: [] }} onSave={(form) => createTask(col.id, form)} onCancel={() => setShowNewTask(null)} dark={dark} members={members} />
                      ) : (
                        <button onClick={() => setShowNewTask(col.id)} style={{ width: '100%', padding: '8px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: `0.5px dashed ${border}`, color: subtle, cursor: 'pointer', borderRadius: '1px', marginBottom: '10px', textAlign: 'left' }}>+ Add task</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && viewMode === 'list' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
                {columns.map(col => (
                  <div key={col.id} style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: muted, marginBottom: '8px', paddingBottom: '6px', borderBottom: `0.5px solid ${border}` }}>{col.name} ({tasks.filter(t => t.column_id === col.id).length})</div>
                    {tasks.filter(t => t.column_id === col.id).map(task => (
                      <div key={task.id}
                        onClick={() => setEditingTask({ ...task })}
                        style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '12px 14px', marginBottom: '6px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr 80px 90px auto 24px', gap: '12px', alignItems: 'center', opacity: doneColumnIds.has(task.column_id) ? 0.55 : 1 }}>
                        <div>
                          <div style={{ fontSize: '12px', color: text, marginBottom: '3px', textDecoration: doneColumnIds.has(task.column_id) ? 'line-through' : 'none' }}>{task.title}</div>
                          {task.description && <div style={{ fontSize: '10px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>}
                        </div>
                        <span style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: priorityColor(task.priority), border: `0.5px solid ${priorityColor(task.priority)}`, padding: '2px 6px', textAlign: 'center', borderRadius: '1px' }}>{task.priority}</span>
                        <div style={{ fontSize: '10px', color: muted }}>{task.due_date ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</div>
                        <div>{renderAvatars(task)}</div>
                        <button onClick={e => { e.stopPropagation(); deleteTask(task.id) }} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0, justifySelf: 'start' }}>×</button>
                      </div>
                    ))}
                    {tasks.filter(t => t.column_id === col.id).length === 0 && (
                      <div style={{ fontSize: '11px', color: subtle, padding: '6px 14px', fontStyle: 'italic' }}>No tasks in this column.</div>
                    )}
                  </div>
                ))}
                <div style={{ marginTop: '12px' }}>
                  <button onClick={() => { setViewMode('kanban'); setShowNewTask(columns[0]?.id) }} style={{ padding: '7px 16px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px dashed ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>+ Add task</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editingTask && (
        <TaskDetail
          task={editingTask}
          dark={dark}
          members={members}
          brands={[]}
          campaigns={campaigns}
          columns={columns}
          currentBrandId={selectedBrand?.id}
          orgId={orgId}
          onSave={updateTask}
          onClose={() => setEditingTask(null)}
          onDelete={deleteTask}
          createNotification={createNotification}
          parseMentions={parseMentions}
        />
      )}
    </div>
  )
}
