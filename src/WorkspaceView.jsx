import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Review', 'Done']
const PRIORITIES = ['Low', 'Medium', 'High']

function TaskForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...initial })
  return (
    <div style={{ background: '#222', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '12px', marginBottom: '6px' }}>
      <textarea
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder='Task title...'
        autoFocus
        style={{ width: '100%', background: 'none', border: 'none', color: '#F2EEE8', fontSize: '12px', outline: 'none', resize: 'none', height: '60px', fontFamily: 'inherit', marginBottom: '8px', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
        <select value={form.priority || 'Medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ background: '#1A1A1A', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: '#F2EEE8', outline: 'none' }}>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <input type='date' value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ background: '#1A1A1A', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: '#F2EEE8', outline: 'none' }} />
      </div>
      <input
        value={form.assigned_to || ''}
        onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
        placeholder='Assigned to...'
        style={{ width: '100%', background: '#1A1A1A', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: '#F2EEE8', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => onSave(form)} style={{ padding: '5px 12px', fontSize: '9px', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Save</button>
        <button onClick={onCancel} style={{ padding: '5px 12px', fontSize: '9px', background: 'none', border: '0.5px solid #3A3A3A', color: '#777', cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function WorkspaceView() {
  const [boards, setBoards] = useState([])
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

  useEffect(() => { fetchBoards() }, [])
  useEffect(() => { if (activeBoard) { fetchColumns(); fetchTasks() } }, [activeBoard])

  async function fetchBoards() {
    const { data } = await supabase.from('boards').select('*').eq('org_id', '00000000-0000-0000-0000-000000000001')
    setBoards(data || [])
    if (data?.length) setActiveBoard(data[0])
    else setLoading(false)
  }

  async function fetchColumns() {
    const { data } = await supabase.from('board_columns').select('*').eq('board_id', activeBoard.id).order('position')
    setColumns(data || [])
  }

  async function fetchTasks() {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').eq('org_id', '00000000-0000-0000-0000-000000000001').order('position')
    setTasks(data || [])
    setLoading(false)
  }

  async function createBoard() {
    if (!newBoardName.trim()) return
    const { data } = await supabase.from('boards').insert([{
      name: newBoardName,
      org_id: '00000000-0000-0000-0000-000000000001'
    }]).select().single()
    if (data) {
      await supabase.from('board_columns').insert(
        DEFAULT_COLUMNS.map((name, i) => ({ board_id: data.id, name, position: i }))
      )
      setNewBoardName('')
      setShowNewBoard(false)
      setBoards(b => [...b, data])
      setActiveBoard(data)
    }
  }

  async function createTask(columnId, form) {
    if (!form.title?.trim()) return
    const { error } = await supabase.from('tasks').insert([{
      title: form.title,
      priority: form.priority || 'Medium',
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
      column_id: columnId,
      board_id: activeBoard.id,
      org_id: '00000000-0000-0000-0000-000000000001',
      position: tasks.filter(t => t.column_id === columnId).length
    }])
    if (error) { console.error(error); return }
    setShowNewTask(null)
    fetchTasks()
  }

  async function updateTask(form) {
    const { error } = await supabase.from('tasks').update({
      title: form.title,
      priority: form.priority,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
    }).eq('id', form.id)
    if (error) console.error(error)
    else { setEditingTask(null); fetchTasks() }
  }

  async function moveTask(taskId, newColumnId) {
    await supabase.from('tasks').update({ column_id: newColumnId }).eq('id', taskId)
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, column_id: newColumnId } : t))
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(ts => ts.filter(t => t.id !== taskId))
  }

  const priorityColor = (p) => {
    if (p === 'High') return '#c0392b'
    if (p === 'Medium') return '#5b7c99'
    return '#777'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      <div style={{ padding: '0 28px', display: 'flex', alignItems: 'center', borderBottom: '0.5px solid #2A2A2A', overflowX: 'auto', flexShrink: 0, background: '#1A1A1A' }}>
        {boards.map(b => (
          <button key={b.id} onClick={() => setActiveBoard(b)} style={{
            padding: '12px 16px', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
            background: 'none', border: 'none', borderBottom: activeBoard?.id === b.id ? '1.5px solid #5b7c99' : '1.5px solid transparent',
            color: activeBoard?.id === b.id ? '#F2EEE8' : '#777', cursor: 'pointer', whiteSpace: 'nowrap'
          }}>{b.name}</button>
        ))}
        {showNewBoard ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 0 8px 12px' }}>
            <input
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createBoard(); if (e.key === 'Escape') setShowNewBoard(false) }}
              placeholder='Board name...'
              autoFocus
              style={{ background: '#222', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '5px 10px', fontSize: '11px', color: '#F2EEE8', outline: 'none', width: '160px' }}
            />
            <button onClick={createBoard} style={{ padding: '5px 10px', fontSize: '9px', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Add</button>
            <button onClick={() => setShowNewBoard(false)} style={{ padding: '5px 10px', fontSize: '9px', background: 'none', border: '0.5px solid #3A3A3A', color: '#777', cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowNewBoard(true)} style={{ padding: '12px 16px', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: 'none', color: '#666', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Board</button>
        )}
      </div>

      {!activeBoard && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#666', marginBottom: '10px' }}>No boards yet</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Click + Board to create your first board</div>
        </div>
      )}

      {activeBoard && (
        <div style={{ display: 'flex', gap: '1px', background: '#2A2A2A', flex: 1, overflow: 'hidden' }}>
          {columns.map(col => (
            <div key={col.id}
              style={{ flex: 1, minWidth: '220px', background: dragOver === col.id ? '#222' : '#1A1A1A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => { e.preventDefault(); if (dragging) moveTask(dragging, col.id); setDragging(null); setDragOver(null) }}>

              <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.26em', textTransform: 'uppercase', color: '#888' }}>{col.name}</div>
                <div style={{ fontSize: '10px', color: '#555' }}>{tasks.filter(t => t.column_id === col.id).length}</div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0' }}>
                {tasks.filter(t => t.column_id === col.id).map(task => (
                  editingTask?.id === task.id ? (
                    <TaskForm
                      key={task.id}
                      initial={editingTask}
                      onSave={updateTask}
                      onCancel={() => setEditingTask(null)}
                    />
                  ) : (
                    <div key={task.id}
                      draggable
                      onDragStart={() => setDragging(task.id)}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => setEditingTask({ ...task })}
                      style={{ background: '#222', border: '0.5px solid #2A2A2A', borderRadius: '1px', padding: '12px', marginBottom: '6px', cursor: 'pointer' }}>
                      <div style={{ fontSize: '12px', color: '#D8D4CC', lineHeight: 1.45, marginBottom: '8px' }}>{task.title}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: priorityColor(task.priority), border: `0.5px solid ${priorityColor(task.priority)}`, padding: '2px 6px' }}>{task.priority}</span>
                          {task.due_date && <span style={{ fontSize: '9px', color: '#777' }}>{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                          {task.assigned_to && <span style={{ fontSize: '9px', color: '#888', background: '#2A2A2A', padding: '2px 6px', borderRadius: '1px' }}>{task.assigned_to}</span>}
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteTask(task.id) }} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
                      </div>
                    </div>
                  )
                ))}

                {showNewTask === col.id ? (
                  <TaskForm
                    initial={{ title: '', priority: 'Medium', due_date: '', assigned_to: '' }}
                    onSave={(form) => createTask(col.id, form)}
                    onCancel={() => setShowNewTask(null)}
                  />
                ) : (
                  <button onClick={() => setShowNewTask(col.id)} style={{ width: '100%', padding: '8px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: '0.5px dashed #2A2A2A', color: '#555', cursor: 'pointer', borderRadius: '1px', marginBottom: '10px', textAlign: 'left' }}>+ Add task</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}