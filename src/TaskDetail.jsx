import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

export default function TaskDetail({ task, dark, members = [], brands = [], columns = [], currentBrandId, orgId, onSave, onClose, onDelete, createNotification, parseMentions }) {
  const bg = dark ? '#0D0D0D' : '#FFFFFF'
  const panelBg = dark ? '#141414' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#3A3A3A' : '#C4BFB8'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const muted = dark ? '#AAA' : '#666'
  const subtle = dark ? '#666' : '#888'
  const inputBg = dark ? '#1A1A1A' : '#F5F3EF'
  const cardBg = dark ? '#1A1A1A' : '#F9F7F3'

  const [form, setForm] = useState({
    ...task,
    target_brand_id: task.target_brand_id ?? (currentBrandId === '__internal' ? '' : currentBrandId ?? ''),
    assignee_ids: task.assignee_ids ?? [],
    watcher_ids: task.watcher_ids ?? []
  })
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false)
  const [watcherMenuOpen, setWatcherMenuOpen] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')

  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingBody, setEditingBody] = useState('')

  useEffect(() => { fetchComments(); fetchCurrentUser() }, [task.id])

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  async function fetchComments() {
    setLoadingComments(true)
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoadingComments(false)
  }

  async function postComment() {
    if (!newComment.trim()) return
    setPostingComment(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setPostingComment(false); return }
    const { error } = await supabase.from('task_comments').insert([{
      task_id: task.id,
      user_id: user.id,
      body: newComment.trim()
    }])
    setPostingComment(false)
    if (!error) {
      const commentBody = newComment.trim()
      setNewComment('')
      fetchComments()

      const toNotify = new Set([...(task.watcher_ids || []), ...(task.assignee_ids || [])])
      toNotify.delete(user.id)
      const commenterName = members.find(m => m.id === user.id)?.full_name || members.find(m => m.id === user.id)?.email || 'Someone'
      for (const uid of toNotify) {
        const member = members.find(m => m.id === uid)
        if (member && createNotification) {
          await createNotification(orgId, member.full_name || member.email, 'comment', `${commenterName} commented on: ${task.title}`, members)
        }
      }
      if (parseMentions) {
        await parseMentions(commentBody, orgId, `You were mentioned in a comment on: ${task.title}`, members)
      }
    }
  }

  async function saveCommentEdit(id) {
    if (!editingBody.trim()) return
    await supabase.from('task_comments').update({ body: editingBody.trim(), edited_at: new Date().toISOString() }).eq('id', id)
    setEditingCommentId(null)
    setEditingBody('')
    fetchComments()
  }

  async function deleteComment(id) {
    if (!confirm('Delete this comment?')) return
    await supabase.from('task_comments').delete().eq('id', id)
    fetchComments()
  }

  const toggleAssignee = (id) => setForm(f => ({
    ...f,
    assignee_ids: f.assignee_ids.includes(id) ? f.assignee_ids.filter(x => x !== id) : [...f.assignee_ids, id]
  }))

  const toggleWatcher = (id) => setForm(f => ({
    ...f,
    watcher_ids: f.watcher_ids.includes(id) ? f.watcher_ids.filter(x => x !== id) : [...f.watcher_ids, id]
  }))

  const selectedAssignees = members.filter(m => form.assignee_ids.includes(m.id))
  const selectedWatchers = members.filter(m => form.watcher_ids.includes(m.id))
  const initialFromName = (n) => (n || '?').trim().charAt(0).toUpperCase()
  const priorityColor = (p) => p === 'High' ? '#c0392b' : p === 'Medium' ? '#5b7c99' : '#777'

  function timeAgo(iso) {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const s = Math.floor(diff / 1000)
    if (s < 60) return 'just now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d}d ago`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function fullTime(iso) {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    setSaving(false)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const sectionLabel = (txt) => (
    <div style={{ fontSize: '8px', letterSpacing: '0.24em', textTransform: 'uppercase', color: subtle, marginBottom: '8px' }}>{txt}</div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '560px', maxWidth: '100vw', height: '100vh', background: panelBg, borderLeft: `0.5px solid ${border}`, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '18px 24px', borderBottom: `0.5px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: panelBg, zIndex: 2 }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.24em', textTransform: 'uppercase', color: subtle }}>Task</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {savedFlash && <span style={{ fontSize: '10px', color: '#5C9E52', letterSpacing: '0.14em', textTransform: 'uppercase' }}>✓ Saved</span>}
            <button onClick={handleSave} disabled={saving} style={{ padding: '6px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
        </div>

        <div style={{ padding: '24px', flex: 1 }}>

          <textarea
            value={form.title || ''}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder='Task title'
            style={{ width: '100%', background: 'none', border: 'none', color: text, fontFamily: 'Georgia, serif', fontSize: '22px', lineHeight: 1.3, outline: 'none', resize: 'none', height: '62px', boxSizing: 'border-box', marginBottom: '20px' }}
          />

          {sectionLabel('Task Description')}
          <textarea
            value={form.description || ''}
            onChange={e => {
              const val = e.target.value
              setForm(f => ({ ...f, description: val }))
              const lastWord = val.split(/\s/).pop()
              if (lastWord.startsWith('@')) { setShowMentions(true); setMentionQuery(lastWord.slice(1)) }
              else { setShowMentions(false); setMentionQuery('') }
            }}
            placeholder='Add more detail... (use @ to mention a team member)'
            style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', color: text, fontSize: '13px', lineHeight: 1.6, outline: 'none', resize: 'vertical', height: '100px', padding: '10px 12px', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '4px' }}
          />
          {showMentions && members.filter(m => (m.full_name || m.email).toLowerCase().includes(mentionQuery.toLowerCase())).length > 0 && (
            <div style={{ background: panelBg, border: `0.5px solid ${border}`, borderRadius: '1px', marginBottom: '10px', overflow: 'hidden' }}>
              {members.filter(m => (m.full_name || m.email).toLowerCase().includes(mentionQuery.toLowerCase())).map(m => (
                <div key={m.id} onClick={() => {
                  const name = m.full_name || m.email
                  const val = form.description.replace(/@[\w.]*$/, `@${name} `)
                  setForm(f => ({ ...f, description: val }))
                  setShowMentions(false)
                }} style={{ padding: '7px 10px', fontSize: '11px', color: text, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? '#2A2A2A' : '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  @{m.full_name || m.email}
                </div>
              ))}
            </div>
          )}

          <div style={{ height: '24px' }} />

          {columns.length > 0 && (
            <>
              {sectionLabel('Status')}
              <select
                value={form.column_id || ''}
                onChange={e => setForm(f => ({ ...f, column_id: e.target.value }))}
                style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', marginBottom: '20px', boxSizing: 'border-box' }}>
                {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              {sectionLabel('Priority')}
              <select value={form.priority || 'Medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none' }}>
                {['Low', 'Medium', 'High'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              {sectionLabel('Due Date')}
              <input type='date' value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          {sectionLabel('Assigned to')}
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <div onClick={() => setAssigneeMenuOpen(o => !o)} style={{ minHeight: '36px', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '5px 8px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
              {selectedAssignees.length === 0 && <span style={{ fontSize: '11px', color: subtle }}>Click to assign...</span>}
              {selectedAssignees.map(m => (
                <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: dark ? '#2A2A2A' : '#E8E4DE', padding: '3px 8px 3px 3px', borderRadius: '12px', fontSize: '11px', color: text }}>
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt='' style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#5b7c99', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>{initialFromName(m.full_name || m.email)}</span>
                  )}
                  <span>{(m.full_name || m.email).split(' ')[0]}</span>
                  <button onClick={e => { e.stopPropagation(); toggleAssignee(m.id) }} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '13px', padding: '0 2px', lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            {assigneeMenuOpen && (
              <>
                <div onClick={() => setAssigneeMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: panelBg, border: `0.5px solid ${border}`, borderRadius: '1px', zIndex: 20, maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
                  {members.map(m => {
                    const isSelected = form.assignee_ids.includes(m.id)
                    return (
                      <div key={m.id} onClick={e => { e.stopPropagation(); toggleAssignee(m.id) }}
                        style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: isSelected ? (dark ? '#1a1a1a' : '#F0EDE8') : 'transparent' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = dark ? '#1a1a1a' : '#F5F3EF' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt='' style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#5b7c99', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>{initialFromName(m.full_name || m.email)}</span>
                        )}
                        <span style={{ fontSize: '12px', color: text, flex: 1 }}>{m.full_name || m.email}</span>
                        {isSelected && <span style={{ fontSize: '11px', color: '#5b7c99' }}>✓</span>}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <div style={{ fontSize: '8px', letterSpacing: '0.24em', textTransform: 'uppercase', color: subtle, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/></svg>
            Watchers
          </div>
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <div onClick={() => setWatcherMenuOpen(o => !o)} style={{ minHeight: '36px', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '5px 8px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
              {selectedWatchers.length === 0 && <span style={{ fontSize: '11px', color: subtle }}>Add watchers</span>}
              {selectedWatchers.map(m => (
                <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: dark ? '#2A2A2A' : '#E8E4DE', padding: '3px 8px 3px 3px', borderRadius: '12px', fontSize: '11px', color: text }}>
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt='' style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#7A9B8E', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>{initialFromName(m.full_name || m.email)}</span>
                  )}
                  <span>{(m.full_name || m.email).split(' ')[0]}</span>
                  <button onClick={e => { e.stopPropagation(); toggleWatcher(m.id) }} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '13px', padding: '0 2px', lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            {watcherMenuOpen && (
              <>
                <div onClick={() => setWatcherMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: panelBg, border: `0.5px solid ${border}`, borderRadius: '1px', zIndex: 20, maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
                  {members.map(m => {
                    const isSelected = form.watcher_ids.includes(m.id)
                    return (
                      <div key={m.id} onClick={e => { e.stopPropagation(); toggleWatcher(m.id) }}
                        style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: isSelected ? (dark ? '#1a1a1a' : '#F0EDE8') : 'transparent' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = dark ? '#1a1a1a' : '#F5F3EF' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt='' style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#7A9B8E', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>{initialFromName(m.full_name || m.email)}</span>
                        )}
                        <span style={{ fontSize: '12px', color: text, flex: 1 }}>{m.full_name || m.email}</span>
                        {isSelected && <span style={{ fontSize: '11px', color: '#5b7c99' }}>✓</span>}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {brands.length > 0 && (
            <>
              {sectionLabel('Brand / Client')}
              <select value={form.target_brand_id || ''} onChange={e => setForm(f => ({ ...f, target_brand_id: e.target.value }))} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', marginBottom: '24px', boxSizing: 'border-box' }}>
                <option value=''>Unassigned</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </>
          )}

          <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '24px', marginTop: '8px' }}>
            {sectionLabel(`Comments${comments.length > 0 ? ` (${comments.length})` : ''}`)}

            {loadingComments && (
              <div style={{ fontSize: '11px', color: subtle, padding: '10px 0' }}>Loading...</div>
            )}

            {!loadingComments && comments.length === 0 && (
              <div style={{ fontSize: '11px', color: subtle, padding: '10px 0', marginBottom: '8px' }}>No comments yet. Be the first.</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
              {comments.map(c => {
                const author = members.find(m => m.id === c.user_id)
                const authorName = author?.full_name || author?.email || 'Unknown'
                const isMine = c.user_id === currentUserId
                const isEditing = editingCommentId === c.id
                return (
                  <div key={c.id} style={{ display: 'flex', gap: '10px' }}>
                    {author?.avatar_url ? (
                      <img src={author.avatar_url} alt='' style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#5b7c99', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, flexShrink: 0 }}>{initialFromName(authorName)}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: text, fontWeight: 500 }}>{authorName}</span>
                        <span title={fullTime(c.created_at)} style={{ fontSize: '10px', color: subtle }}>{timeAgo(c.created_at)}{c.edited_at ? ' · edited' : ''}</span>
                        {isMine && !isEditing && (
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setEditingCommentId(c.id); setEditingBody(c.body) }} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '10px', padding: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Edit</button>
                            <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '10px', padding: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Delete</button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div>
                          <textarea value={editingBody} onChange={e => setEditingBody(e.target.value)} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                            <button onClick={() => saveCommentEdit(c.id)} style={{ padding: '5px 12px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Save</button>
                            <button onClick={() => { setEditingCommentId(null); setEditingBody('') }} style={{ padding: '5px 12px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: subtle, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: text, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '14px' }}>
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment() }}
                placeholder='Add a comment... (Cmd+Enter to post)'
                style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '10px 12px', fontSize: '12px', color: text, outline: 'none', resize: 'vertical', minHeight: '70px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px' }}
              />
              <button onClick={postComment} disabled={postingComment || !newComment.trim()} style={{ padding: '7px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: newComment.trim() ? '#5b7c99' : 'transparent', border: newComment.trim() ? 'none' : `0.5px solid ${border2}`, color: newComment.trim() ? '#fff' : subtle, cursor: newComment.trim() ? 'pointer' : 'default', borderRadius: '1px', opacity: postingComment ? 0.6 : 1 }}>
                {postingComment ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>

          <div style={{ borderTop: `0.5px solid ${border}`, marginTop: '32px', paddingTop: '16px' }}>
            <button onClick={() => { if (confirm('Delete this task?')) { onDelete(task.id); onClose() } }} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: '#c0392b', cursor: 'pointer', borderRadius: '1px' }}>
              Delete task
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
