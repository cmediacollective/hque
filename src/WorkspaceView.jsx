import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Review', 'Done']
const PRIORITIES = ['Low', 'Medium', 'High']

function TaskForm({ initial, onSave, onCancel, dark }) {
  const [form, setForm] = useState({ ...initial })
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
        <select value={form.priority || 'Medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: text, outline: 'none' }}>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <input type='date' value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: text, outline: 'none' }} />
      </div>
      <input
        value={form.assigned_to || ''}
        onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
        placeholder='Assigned to...'
        style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: text, outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => onSave(form)} style={{ padding: '5px 12px', fontSize: '9px', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Save</button>
        <button onClick={onCancel} style={{ padding: '5px 12px', fontSize: '9px', background: 'none', border: `0.5px solid ${border}`, color: dark ? '#777' : '#888', cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function WorkspaceView({ orgId, dark = true }) {
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

  const [boards, setBoards] = useState([])
  const [archivedBoards, setArchivedBoards] = useState([])
  const [activeBoard, setActiveBoard] = useState(null)
  const [columns, setColumns] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewBoard, setShowNewBoard] = useState(false)
  const [showNewTask, setShowNewTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [newBoardName, setNewBoardName] = useState('')
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [archiving, setArchiving] = useState(null)

  useEffect(() => { fetchBoards() }, [])
  useEffect(() => { if (activeBoard) { fetchColumns(); fetchTasks() } }, [activeBoard])

  async function fetchBoards() {
    const { data } = await supabase.from('boards').select('*').eq('org_id', orgId)
    const active = (data || []).filter(b => b.status !== 'archived')
    const archived = (data || []).filter(b => b.status === 'archived')
    setBoards(active)
    setArchivedBoards(archived)
    if (active?.length) setActiveBoard(active[0])
    else setLoading(false)
  }

  async function fetchColumns() {
    const { data } = await supabase.from('board_columns').select('*').eq('board_id', activeBoard.id).order('position')
    setColumns(data || [])
  }

  async function fetchTasks() {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').eq('org_id', orgId).order('position')
    setTasks(data || [])
    setLoading(false)
  }

  async function createBoard() {
    if (!newBoardName.trim()) return
    const { data } = await supabase.from('boards').insert([{ name: newBoardName, org_id: orgId, status: 'active' }]).select().single()
    if (data) {
      await supabase.from('board_columns').insert(DEFAULT_COLUMNS.map((name, i) => ({ board_id: data.id, name, position: i })))
      setNewBoardName('')
      setShowNewBoard(false)
      setBoards(b => [...b, data])
      setActiveBoard(data)
    }
  }

  async function archiveBoard(board, restore = false) {
    await supabase.from('boards').update({ status: restore ? 'active' : 'archived' }).eq('id', board.id)
    setArchiving(null)
    if (!restore && activeBoard?.id === board.id) setActiveBoard(null)
    fetchBoards()
  }

  async function createTask(columnId, form) {
    if (!form.title?.trim()) return
    await supabase.from('tasks').insert([{
      title: form.title, priority: form.priority || 'Medium',
      due_date: form.due_date || null, assigned_to: form.assigned_to || null,
      column_id: columnId, board_id: activeBoard.id, org_id: orgId,
      position: tasks.filter(t => t.column_id === columnId).length
    }])
    setShowNewTask(null)
    fetchTasks()
  }

  async function updateTask(form) {
    await supabase.from('tasks').update({ title: form.title, priority: form.priority, due_date: form.due_date || null, assigned_to: form.assigned_to || null }).eq('id', form.id)
    setEditingTask(null)
    fetchTasks()
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: bg }}>

      {archiving && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: card, border: `0.5px solid ${border}`, padding: '32px', width: '380px', borderRadius: '2px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', marginBottom: '8px', color: text }}>
              {archiving.restore ? 'Restore board?' : 'Archive board?'}
            </div>
            <div style={{ fontSize: '12px', color: muted, marginBottom: '24px' }}>
              {archiving.restore
                ? `"${archiving.board.name}" will be moved back to your active boards.`
                : `"${archiving.board.name}" will be hidden but can be restored anytime.`}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => setArchiving(null)} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
              <button onClick={() => archiveBoard(archiving.board, archiving.restore)} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
                {archiving.restore ? 'Restore' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '0 28px', display: 'flex', alignItems: 'center', borderBottom: `0.5px solid ${border}`, overflowX: 'auto', flexShrink: 0, background: bg }}>
        {!showArchived && boards.map(b => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', borderBottom: activeBoard?.id === b.id ? '1.5px solid #5b7c99' : '1.5px solid transparent' }}>
            <button onClick={() => setActiveBoard(b)} style={{
              padding: '12px 12px 12px 16px', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
              background: 'none', border: 'none',
              color: activeBoard?.id === b.id ? text : muted, cursor: 'pointer', whiteSpace: 'nowrap'
            }}>{b.name}</button>
            {activeBoard?.id === b.id && (
              <button onClick={() => setArchiving({ board: b, restore: false })} style={{ padding: '2px 6px', marginRight: '8px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: subtle, cursor: 'pointer', borderRadius: '1px' }}>Archive</button>
            )}
          </div>
        ))}

        {showArchived && archivedBoards.map(b => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px' }}>
            <span style={{ fontSize: '10px', color: muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{b.name}</span>
            <button onClick={() => setArchiving({ board: b, restore: true })} style={{ padding: '2px 8px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #5b7c99', color: '#5b7c99', cursor: 'pointer', borderRadius: '1px' }}>Restore</button>
          </div>
        ))}

        {showNewBoard && !showArchived ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 0 8px 12px' }}>
            <input
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createBoard(); if (e.key === 'Escape') setShowNewBoard(false) }}
              placeholder='Board name...'
              autoFocus
              style={{ background: card, border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '5px 10px', fontSize: '11px', color: text, outline: 'none', width: '160px' }}
            />
            <button onClick={createBoard} style={{ padding: '5px 10px', fontSize: '9px', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Add</button>
            <button onClick={() => setShowNewBoard(false)} style={{ padding: '5px 10px', fontSize: '9px', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
          </div>
        ) : !showArchived && (
          <button onClick={() => setShowNewBoard(true)} style={{ padding: '12px 16px', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: 'none', color: muted, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Board</button>
        )}

        <div style={{ marginLeft: 'auto', flexShrink: 0, padding: '8px 0' }}>
          <button
            onClick={() => { setShowArchived(a => !a); if (!showArchived) setActiveBoard(null) }}
            style={{ padding: '5px 12px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${showArchived ? '#5b7c99' : border2}`, color: showArchived ? '#5b7c99' : muted, cursor: 'pointer', borderRadius: '1px' }}>
            {showArchived ? '<- Active' : `Archived${archivedBoards.length ? ` (${archivedBoards.length})` : ''}`}
          </button>
        </div>
      </div>

      {!activeBoard && !showArchived && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>No boards yet</div>
          <div style={{ fontSize: '12px', color: muted }}>Click + Board to create your first board</div>
        </div>
      )}

      {showArchived && archivedBoards.length === 0 && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>No archived boards</div>
        </div>
      )}

      {activeBoard && !showArchived && (
        <div style={{ display: 'flex', gap: '1px', background: gridBg, flex: 1, overflow: 'hidden' }}>
          {columns.map(col => (
            <div key={col.id}
              style={{ flex: 1, minWidth: '220px', background: dragOver === col.id ? colHover : colBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => { e.preventDefault(); if (dragging) moveTask(dragging, col.id); setDragging(null); setDragOver(null) }}>

              <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.26em', textTransform: 'uppercase', color: muted }}>{col.name}</div>
                <div style={{ fontSize: '10px', color: subtle }}>{tasks.filter(t => t.column_id === col.id).length}</div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0' }}>
                {tasks.filter(t => t.column_id === col.id).map(task => (
                  editingTask?.id === task.id ? (
                    <TaskForm key={task.id} initial={editingTask} onSave={updateTask} onCancel={() => setEditingTask(null)} dark={dark} />
                  ) : (
                    <div key={task.id}
                      draggable
                      onDragStart={() => setDragging(task.id)}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => setEditingTask({ ...task })}
                      style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '12px', marginBottom: '6px', cursor: 'pointer' }}>
                      <div style={{ fontSize: '12px', color: text, lineHeight: 1.45, marginBottom: '8px' }}>{task.title}</div>
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
                  <TaskForm initial={{ title: '', priority: 'Medium', due_date: '', assigned_to: '' }} onSave={(form) => createTask(col.id, form)} onCancel={() => setShowNewTask(null)} dark={dark} />
                ) : (
                  <button onClick={() => setShowNewTask(col.id)} style={{ width: '100%', padding: '8px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: `0.5px dashed ${border}`, color: subtle, cursor: 'pointer', borderRadius: '1px', marginBottom: '10px', textAlign: 'left' }}>+ Add task</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
