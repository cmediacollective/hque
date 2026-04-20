import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import BrandsSidebar from './BrandsSidebar'

async function createNotification(orgId, memberName, type, message, profiles) {
  const profile = profiles.find(p => (p.full_name || p.email) === memberName)
  if (!profile) return
  await supabase.from('notifications').insert([{ org_id: orgId, user_id: profile.id, type, message }])
  await fetch('/.netlify/functions/send-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: profile.id, type, message }) })
}

async function parseMentions(description, orgId, message, profiles) {
  if (!description) return
  const mentions = description.match(/@([\w. ]+)/g) || []
  for (const mention of mentions) {
    const name = mention.slice(1).trim()
    await createNotification(orgId, name, 'mention', message, profiles)
  }
}

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Review', 'Hold', 'Done']
const PRIORITIES = ['Low', 'Medium', 'High']

function TaskForm({ initial, onSave, onCancel, dark, members = [] }) {
  const [form, setForm] = useState({ ...initial })
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const inputBg = dark ? '#1A1A1A' : '#F5F3EF'
  const border = dark ? '#3A3A3A' : '#C4BFB8'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const cardBg = dark ? '#222' : '#FFFFFF'

  return (
    <div style={{ background: cardBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '12px', marginBottom: '6px' }}>
      <textarea
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder='Task title...'
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
            }} style={{ padding: "7px 10px", fontSize: "11px", color: text, cursor: "pointer", borderBottom: `0.5px solid ${border}` }}
            onMouseEnter={e => e.currentTarget.style.background = dark ? "#2A2A2A" : "#f5f5f5"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              @{m.full_name || m.email}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
        <select value={form.priority || 'Medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: text, outline: 'none' }}>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <input type='date' value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: text, outline: 'none' }} />
      </div>
      <select value={form.assigned_to || ''} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: text, outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}>
        <option value=''>Unassigned</option>
        {members.map(m => <option key={m.id} value={m.full_name || m.email}>{m.full_name || m.email}</option>)}
      </select>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => onSave(form)} style={{ padding: '5px 12px', fontSize: '9px', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Save</button>
        <button onClick={onCancel} style={{ padding: '5px 12px', fontSize: '9px', background: 'none', border: `0.5px solid ${border}`, color: dark ? '#777' : '#888', cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function WorkspaceView({ orgId, dark = true }) {
  const [members, setMembers] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('id, email, full_name').eq('org_id', orgId).then(({ data }) => setMembers(data || []))
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

  async function findOrCreateBoardForBrand(brand) {
    setLoading(true)
    const isInternal = brand.id === '__internal'

    let query = supabase.from('boards').select('*').eq('org_id', orgId).neq('status', 'archived').order('created_at', { ascending: true })
    query = isInternal ? query.is('brand_id', null) : query.eq('brand_id', brand.id)

    const { data: existing } = await query.limit(1).maybeSingle()

    if (existing) {
      setActiveBoard(existing)
      setLoading(false)
      return
    }

    const { data: newBoard } = await supabase.from('boards').insert([{
      name: brand.name,
      org_id: orgId,
      brand_id: isInternal ? null : brand.id,
      status: 'active'
    }]).select().single()

    if (newBoard) {
      await supabase.from('board_columns').insert(DEFAULT_COLUMNS.map((name, i) => ({ board_id: newBoard.id, name, position: i })))
      setActiveBoard(newBoard)
    }
    setLoading(false)
  }

  async function fetchColumns() {
    const { data } = await supabase.from('board_columns').select('*').eq('board_id', activeBoard.id).order('position')

    if (data && data.length > 0 && !data.some(c => c.name?.toLowerCase() === 'hold')) {
      const reviewIndex = data.findIndex(c => c.name?.toLowerCase() === 'review')
      const insertPos = reviewIndex >= 0 ? reviewIndex + 1 : data.length
      const { data: holdCol } = await supabase.from('board_columns').insert([{
        board_id: activeBoard.id,
        name: 'Hold',
        position: insertPos
      }]).select().single()
      if (holdCol) {
        const updated = [...data]
        updated.splice(insertPos, 0, holdCol)
        setColumns(updated)
        return
      }
    }

    setColumns(data || [])
  }

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*').eq('board_id', activeBoard.id).order('position')
    setTasks(data || [])
  }

  async function createTask(columnId, form) {
    if (!form.title?.trim()) return
    await supabase.from('tasks').insert([{
      title: form.title, description: form.description || null, priority: form.priority || 'Medium',
      due_date: form.due_date || null, assigned_to: form.assigned_to || null,
      column_id: columnId, board_id: activeBoard.id, org_id: orgId,
      position: tasks.filter(t => t.column_id === columnId).length
    }])
    setShowNewTask(null)
    fetchTasks()
    if (form.assigned_to) await createNotification(orgId, form.assigned_to, 'assignment', `You were assigned to: ${form.title}`, members)
    await parseMentions(form.description, orgId, `You were mentioned in: ${form.title}`, members)
  }

  async function updateTask(form) {
    await supabase.from('tasks').update({ title: form.title, description: form.description || null, priority: form.priority, due_date: form.due_date || null, assigned_to: form.assigned_to || null }).eq('id', form.id)
    setEditingTask(null)
    fetchTasks()
    await parseMentions(form.description, orgId, `You were mentioned in: ${form.title}`, members)
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

  const tasksInColumn = (colId) => {
    return tasks.filter(t => t.column_id === colId).sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    })
  }

  const colorFromName = (name) => {
    if (!name) return '#5b7c99'
    const colors = ['#5B7C99', '#B784A7', '#7A9B8E', '#A87575', '#8C6BAA', '#D4A574', '#6B8E7F']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: bg }}>

      <BrandsSidebar
        dark={dark}
        orgId={orgId}
        selectedBrandId={selectedBrand?.id}
        onSelectBrand={(b) => setSelectedBrand(b)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {!selectedBrand && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div style={{ textAlign: 'center', maxWidth: '360px' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: text, marginBottom: '10px' }}>Select a brand</div>
              <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7 }}>
                Choose a brand from the sidebar to see its Kanban board.
              </div>
            </div>
          </div>
        )}

        {selectedBrand && (
          <>
            <div style={{ padding: '18px 28px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: `0.5px solid ${border}`, flexShrink: 0 }}>
              {selectedBrand.id === '__internal' ? (
                <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: dark ? '#2A2A2A' : '#E0DCD6', color: muted, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `0.5px solid ${border}` }}>⚙</div>
              ) : selectedBrand.logo_url ? (
                <img src={selectedBrand.logo_url} alt={selectedBrand.name} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px', background: '#fff', padding: '3px', border: `0.5px solid ${border}`, flexShrink: 0 }} onError={e => { e.target.style.display = 'none' }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: colorFromName(selectedBrand.name), color: '#fff', fontSize: '15px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {(selectedBrand.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, lineHeight: 1.2 }}>{selectedBrand.name}</div>
                <div style={{ fontSize: '10px', color: subtle, letterSpacing: '0.14em', marginTop: '3px' }}>
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                  {selectedBrand.website && (
                    <> · <a href={selectedBrand.website} target='_blank' rel='noreferrer' style={{ color: '#5b7c99', textDecoration: 'none' }}>Website ↗</a></>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0', border: `0.5px solid ${border2}`, borderRadius: '1px', flexShrink: 0 }}>
                <button onClick={() => setViewMode('kanban')} style={{ padding: '5px 12px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: viewMode === 'kanban' ? '#5b7c99' : 'none', border: 'none', color: viewMode === 'kanban' ? '#fff' : muted, cursor: 'pointer' }}>Kanban</button>
                <button onClick={() => setViewMode('list')} style={{ padding: '5px 12px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: viewMode === 'list' ? '#5b7c99' : 'none', border: 'none', color: viewMode === 'list' ? '#fff' : muted, cursor: 'pointer', borderLeft: `0.5px solid ${border2}` }}>List</button>
              </div>
            </div>

            {loading && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '11px', color: subtle, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Loading...</div>
              </div>
            )}

            {!loading && activeBoard && viewMode === 'kanban' && (
              <div style={{ display: 'flex', gap: '1px', background: gridBg, flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
                {columns.map(col => (
                  <div key={col.id}
                    style={{ flex: '0 0 260px', minWidth: '260px', background: dragOver === col.id ? colHover : colBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                    onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => { e.preventDefault(); if (dragging) moveTask(dragging, col.id); setDragging(null); setDragOver(null) }}>

                    <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '8px', letterSpacing: '0.26em', textTransform: 'uppercase', color: muted }}>{col.name}</div>
                      <div style={{ fontSize: '10px', color: subtle }}>{tasksInColumn(col.id).length}</div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0' }}>
                      {tasksInColumn(col.id).map(task => (
                        editingTask?.id === task.id ? (
                          <TaskForm key={task.id} initial={editingTask} onSave={updateTask} onCancel={() => setEditingTask(null)} dark={dark} members={members} />
                        ) : (
                          <div key={task.id}
                            draggable
                            onDragStart={() => setDragging(task.id)}
                            onDragEnd={() => setDragging(null)}
                            onClick={() => setEditingTask({ ...task })}
                            style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '12px', marginBottom: '6px', cursor: 'pointer' }}>
                            <div style={{ fontSize: '12px', color: text, lineHeight: 1.45, marginBottom: '8px' }}>{task.title}</div>
                            {task.description && <div style={{ fontSize: "10px", color: muted, lineHeight: 1.5, marginBottom: "6px", whiteSpace: "pre-wrap" }}>{task.description}</div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: priorityColor(task.priority), border: `0.5px solid ${priorityColor(task.priority)}`, padding: '2px 6px' }}>{task.priority}</span>
                                {task.due_date && <span style={{ fontSize: '9px', color: muted }}>{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                                {task.assigned_to && <span style={{ fontSize: '9px', color: muted, background: dark ? '#2A2A2A' : '#E8E4DE', padding: '2px 6px', borderRadius: '1px' }}>{task.assigned_to}</span>}
                              </div>
                              <button onClick={e => { e.stopPropagation(); deleteTask(task.id) }} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
                            </div>
                          </div>
                        )
                      ))}

                      {showNewTask === col.id ? (
                        <TaskForm initial={{ title: '', priority: 'Medium', due_date: '', assigned_to: '', description: '' }} onSave={(form) => createTask(col.id, form)} onCancel={() => setShowNewTask(null)} dark={dark} members={members} />
                      ) : (
                        <button onClick={() => setShowNewTask(col.id)} style={{ width: '100%', padding: '8px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: `0.5px dashed ${border}`, color: subtle, cursor: 'pointer', borderRadius: '1px', marginBottom: '10px', textAlign: 'left' }}>+ Add task</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && activeBoard && viewMode === 'list' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>

                {tasks.length === 0 && (
                  <div style={{ padding: '60px 28px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: muted, marginBottom: '14px' }}>No tasks yet for {selectedBrand.name}</div>
                    <button onClick={() => { setViewMode('kanban'); setShowNewTask(columns[0]?.id) }} style={{ padding: '8px 18px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>+ Add task</button>
                  </div>
                )}

                {tasks.length > 0 && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 110px 110px 130px 110px 40px', padding: '10px 28px', borderBottom: `0.5px solid ${border}`, position: 'sticky', top: 0, background: bg, zIndex: 1 }}>
                      {['Task', 'Status', 'Priority', 'Assigned', 'Due', ''].map(h => (
                        <div key={h} style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle }}>{h}</div>
                      ))}
                    </div>
                    {columns.flatMap(col =>
                      tasksInColumn(col.id).map(task => (
                        <div key={task.id}
                          onClick={() => setEditingTask({ ...task })}
                          style={{ display: 'grid', gridTemplateColumns: '2fr 110px 110px 130px 110px 40px', padding: '12px 28px', borderBottom: `0.5px solid ${border}`, cursor: 'pointer', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = dark ? '#222' : '#EDEAE5'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ fontSize: '12px', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '10px' }}>{task.title}</div>
                          <div style={{ fontSize: '9px', color: muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{col.name}</div>
                          <div><span style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: priorityColor(task.priority), border: `0.5px solid ${priorityColor(task.priority)}`, padding: '2px 6px' }}>{task.priority}</span></div>
                          <div style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '10px' }}>{task.assigned_to || '—'}</div>
                          <div style={{ fontSize: '11px', color: muted }}>{task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</div>
                          <button onClick={e => { e.stopPropagation(); deleteTask(task.id) }} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0, justifySelf: 'start' }}>×</button>
                        </div>
                      ))
                    )}
                    <div style={{ padding: '16px 28px' }}>
                      <button onClick={() => { setViewMode('kanban'); setShowNewTask(columns[0]?.id) }} style={{ padding: '7px 16px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px dashed ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>+ Add task</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
