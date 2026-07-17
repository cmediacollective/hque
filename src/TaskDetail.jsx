import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { addTaskWatchers } from './notify'
import Linkify from './Linkify'

const DONE_COLUMN_NAMES = ['done', 'completed', 'complete', 'shipped', 'closed']
const MAX_COMMENT_FILE_BYTES = 5 * 1024 * 1024 // 5 MB per attached file

export default function TaskDetail({ task, dark, members = [], brands = [], campaigns = [], columns = [], currentBrandId, orgId, onSave, onClose, onDelete, createNotification, parseMentions }) {
  const bg = dark ? '#0D0D0D' : '#FFFFFF'
  const panelBg = dark ? '#141414' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const border2 = dark ? '#3A3A3A' : '#CCC7BF'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const muted = dark ? '#AAA' : '#666'
  const subtle = dark ? '#666' : '#888'
  const inputBg = dark ? '#1A1A1A' : '#F8F7F3'
  const cardBg = dark ? '#1A1A1A' : '#F9F7F3'

  const [form, setForm] = useState({
    ...task,
    target_brand_id: task.target_brand_id ?? (currentBrandId === '__internal' ? '' : currentBrandId ?? ''),
    assignee_ids: task.assignee_ids ?? [],
    watcher_ids: task.watcher_ids ?? [],
    campaign_id: task.campaign_id ?? ''
  })
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [copiedFlash, setCopiedFlash] = useState(false)
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false)
  const [watcherMenuOpen, setWatcherMenuOpen] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [editingDescription, setEditingDescription] = useState(false)
  const [showCommentMentions, setShowCommentMentions] = useState(false)
  const [commentMentionQuery, setCommentMentionQuery] = useState('')

  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(true)
  // Persist the comment draft per task in the browser, so an unsent comment
  // survives closing the task, navigating away, or a refresh (cleared on post).
  const draftKey = `hque_comment_draft_${task.id}`
  const [newComment, setNewComment] = useState(() => {
    try { return localStorage.getItem(draftKey) || '' } catch { return '' }
  })
  const [postingComment, setPostingComment] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingBody, setEditingBody] = useState('')
  const [recentlySaved, setRecentlySaved] = useState(false)

  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  // Files staged to attach to the comment currently being written.
  const [commentFiles, setCommentFiles] = useState([])
  const [commentDragOver, setCommentDragOver] = useState(false)
  const [commentAttachError, setCommentAttachError] = useState('')
  // Expand the comment box for writing/reviewing longer comments.
  const [commentExpanded, setCommentExpanded] = useState(false)

  useEffect(() => { fetchComments(); fetchCurrentUser(); fetchAttachments() }, [task.id])

  // Save the draft as it changes; remove it once the box is empty (e.g. posted).
  useEffect(() => {
    try {
      if (newComment) localStorage.setItem(draftKey, newComment)
      else localStorage.removeItem(draftKey)
    } catch { /* localStorage unavailable — non-fatal */ }
  }, [newComment, draftKey])

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
    // A comment may be text, attachments, or both.
    if (!newComment.trim() && commentFiles.length === 0) return
    setPostingComment(true)
    if (onSave) {
      try {
        await onSave(form)
        setRecentlySaved(true)
        setTimeout(() => setRecentlySaved(false), 2500)
      } catch (_) { /* non-blocking */ }
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setPostingComment(false); return }
    const { data: inserted, error } = await supabase.from('task_comments').insert([{
      task_id: task.id,
      user_id: user.id,
      body: newComment.trim()
    }]).select().single()
    if (error || !inserted) { setPostingComment(false); return }

    // Upload any staged files and link them to this comment.
    const fileCount = commentFiles.length
    if (fileCount) {
      for (const file of commentFiles) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${task.id}/comments/${inserted.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`
        const { error: upErr } = await supabase.storage.from('task-attachments').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
        if (upErr) { console.error('comment attachment upload failed', upErr); continue }
        await supabase.from('task_attachments').insert([{
          task_id: task.id,
          org_id: orgId,
          user_id: user.id,
          comment_id: inserted.id,
          filename: file.name,
          storage_path: path,
          size_bytes: file.size,
          mime_type: file.type || null
        }])
      }
      setCommentFiles([])
      fetchAttachments()
    }

    {
      const commentBody = newComment.trim()
      setNewComment('')
      setCommentAttachError('')
      setPostingComment(false)
      fetchComments()

      const toNotify = new Set([...(form.watcher_ids || []), ...(form.assignee_ids || [])])
      toNotify.delete(user.id) // never email the commenter about their own comment
      const commenterName = members.find(m => m.id === user.id)?.full_name || members.find(m => m.id === user.id)?.email || 'Someone'
      const baseSnippet = commentBody || (fileCount ? `(${fileCount} file${fileCount > 1 ? 's' : ''} attached)` : '')
      const snippet = baseSnippet.length > 300 ? baseSnippet.slice(0, 300) + '…' : baseSnippet
      const commentMessage = `${commenterName} commented on "${task.title}":\n\n"${snippet}"`
      for (const uid of toNotify) {
        const member = members.find(m => m.id === uid)
        if (member && createNotification) {
          await createNotification(orgId, member.full_name || member.email, 'comment', commentMessage, members, task.id)
        }
      }
      if (parseMentions) {
        const mentionMessage = `${commenterName} mentioned you in a comment on "${task.title}":\n\n"${snippet}"`
        const mentioned = await parseMentions(commentBody, orgId, mentionMessage, members, task.id)
        if (mentioned && mentioned.length) {
          await addTaskWatchers(task.id, mentioned)
          setForm(f => ({ ...f, watcher_ids: [...new Set([...(f.watcher_ids || []), ...mentioned])] }))
        }
      }
    }
  }

  async function saveCommentEdit(id) {
    if (!editingBody.trim()) return
    const { error, count } = await supabase.from('task_comments')
      .update({ body: editingBody.trim(), edited_at: new Date().toISOString() }, { count: 'exact' })
      .eq('id', id)
    if (error || count === 0) {
      alert('You can only edit your own comment, and only within 5 minutes of posting it.')
      return
    }
    setEditingCommentId(null)
    setEditingBody('')
    fetchComments()
  }

  async function deleteComment(id) {
    if (!confirm('Delete this comment?')) return
    // Delete the row FIRST — if the server rejects it (not yours, or older than
    // 5 minutes) we stop here, so we never orphan the stored files. count === 0
    // means the row-level rule blocked it.
    const { error, count } = await supabase.from('task_comments').delete({ count: 'exact' }).eq('id', id)
    if (error || count === 0) {
      alert('You can only delete your own comment, and only within 5 minutes of posting it.')
      return
    }
    // Row gone (its attachment rows cascade away) — clean up the stored files.
    const atts = attachments.filter(a => a.comment_id === id)
    if (atts.length) await supabase.storage.from('task-attachments').remove(atts.map(a => a.storage_path))
    fetchComments()
    fetchAttachments()
  }

  // Paste a screenshot (or any image) straight from the clipboard into the
  // comment as an attachment. Pasted images arrive without a real filename, so
  // we give them a timestamped one, then reuse the normal staging flow.
  function handleCommentPaste(e) {
    const items = e.clipboardData?.items
    if (!items) return
    const files = []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.kind === 'file' && it.type && it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (!f) continue
        const ext = (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
        const named = (f.name && f.name.toLowerCase() !== 'image.png')
          ? f
          : new File([f], `pasted-${Date.now()}-${files.length + 1}.${ext}`, { type: f.type })
        files.push(named)
      }
    }
    if (files.length) {
      e.preventDefault() // don't also paste the image as junk text
      handleCommentFiles(files)
    }
  }

  function handleCommentFiles(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const tooBig = files.filter(f => f.size > MAX_COMMENT_FILE_BYTES)
    const ok = files.filter(f => f.size <= MAX_COMMENT_FILE_BYTES)
    if (ok.length) setCommentFiles(prev => [...prev, ...ok])
    if (tooBig.length) {
      const names = tooBig.map(f => `"${f.name}" (${humanSize(f.size)})`).join(', ')
      setCommentAttachError(`${names} ${tooBig.length > 1 ? 'are' : 'is'} over the 5 MB limit, so ${tooBig.length > 1 ? 'they were' : 'it was'} not attached. Please keep each file to 5 MB or less.`)
    } else {
      setCommentAttachError('')
    }
  }

  async function fetchAttachments() {
    const { data } = await supabase.from('task_attachments').select('*').eq('task_id', task.id).order('created_at', { ascending: true })
    setAttachments(data || [])
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || [])
    if (files.length === 0) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${task.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`
      const { error: upErr } = await supabase.storage.from('task-attachments').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
      if (upErr) { console.error('upload failed', upErr); alert(`Upload failed for ${file.name}: ${upErr.message}`); continue }
      await supabase.from('task_attachments').insert([{
        task_id: task.id,
        org_id: orgId,
        user_id: user.id,
        filename: file.name,
        storage_path: path,
        size_bytes: file.size,
        mime_type: file.type || null
      }])
    }
    setUploading(false)
    fetchAttachments()
  }

  async function openAttachment(a) {
    const { data, error } = await supabase.storage.from('task-attachments').createSignedUrl(a.storage_path, 60)
    if (error) { alert('Could not open file: ' + error.message); return }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function deleteAttachment(a) {
    if (!confirm(`Delete ${a.filename}?`)) return
    await supabase.storage.from('task-attachments').remove([a.storage_path])
    await supabase.from('task_attachments').delete().eq('id', a.id)
    fetchAttachments()
  }

  function humanSize(bytes) {
    if (!bytes || bytes < 1024) return (bytes || 0) + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
  }

  // One attachment row, shared by the task-level Files list and per-comment lists.
  function attachmentRow(a) {
    return (
      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: cardBg, border: `0.5px solid ${border}`, borderRadius: '1px' }}>
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' style={{ color: muted, flexShrink: 0 }}><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
        <button onClick={() => openAttachment(a)} title='Open in a new tab' style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', color: text, cursor: 'pointer', fontSize: '12px', textAlign: 'left', padding: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</button>
        <span style={{ fontSize: '10px', color: subtle, flexShrink: 0 }}>{humanSize(a.size_bytes)}</span>
        {a.user_id === currentUserId && (
          <button onClick={() => deleteAttachment(a)} title='Delete' style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
        )}
      </div>
    )
  }

  // Task-level attachments are those NOT tied to a specific comment.
  const taskAttachments = attachments.filter(a => !a.comment_id)

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

  async function handleCopyLink() {
    const url = `${window.location.origin}/?task=${task.id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedFlash(true)
    setTimeout(() => setCopiedFlash(false), 1800)
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
            {copiedFlash && <span style={{ fontSize: '10px', color: '#5C9E52', letterSpacing: '0.14em', textTransform: 'uppercase' }}>✓ Link copied</span>}
            {savedFlash && !copiedFlash && <span style={{ fontSize: '10px', color: '#5C9E52', letterSpacing: '0.14em', textTransform: 'uppercase' }}>✓ Saved</span>}
            <button onClick={handleCopyLink} title='Copy shareable link to this task' style={{ padding: '6px 12px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/><path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/></svg>
              <span>Copy link</span>
            </button>
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
          {editingDescription || !form.description ? (
            <textarea
              value={form.description || ''}
              autoFocus={editingDescription}
              onChange={e => {
                const val = e.target.value
                setForm(f => ({ ...f, description: val }))
                const lastWord = val.split(/\s/).pop()
                if (lastWord.startsWith('@')) { setShowMentions(true); setMentionQuery(lastWord.slice(1)) }
                else { setShowMentions(false); setMentionQuery('') }
              }}
              onBlur={() => { if (form.description) setEditingDescription(false) }}
              placeholder='Add more detail... (use @ to mention a team member)'
              style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', color: text, fontSize: '13px', lineHeight: 1.6, outline: 'none', resize: 'vertical', height: '100px', padding: '10px 12px', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '4px' }}
            />
          ) : (
            <div onClick={() => setEditingDescription(true)}
              title='Click to edit'
              style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', color: text, fontSize: '13px', lineHeight: 1.6, padding: '10px 12px', boxSizing: 'border-box', minHeight: '100px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: 'text', marginBottom: '4px' }}>
              <Linkify text={form.description} dark={dark} />
            </div>
          )}
          {showMentions && members.filter(m => (m.full_name || m.email).toLowerCase().includes(mentionQuery.toLowerCase())).length > 0 && (
            <div style={{ background: panelBg, border: `0.5px solid ${border}`, borderRadius: '1px', marginBottom: '10px', overflow: 'hidden' }}>
              {members.filter(m => (m.full_name || m.email).toLowerCase().includes(mentionQuery.toLowerCase())).map(m => (
                <div key={m.id}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
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

          {columns.length > 0 && (() => {
            const doneColumnIds = new Set()
            let last = columns[0]
            columns.forEach(c => {
              const nameLower = (c.name || '').trim().toLowerCase()
              if (DONE_COLUMN_NAMES.includes(nameLower)) doneColumnIds.add(c.id)
              if (c.position > last.position) last = c
            })
            doneColumnIds.add(last.id)
            return (
              <>
                {sectionLabel('Status')}
                <select
                  value={form.column_id || ''}
                  onChange={async e => {
                    const newColumnId = e.target.value
                    const nextForm = { ...form, column_id: newColumnId }
                    setForm(nextForm)
                    if (doneColumnIds.has(newColumnId) && !doneColumnIds.has(form.column_id)) {
                      try {
                        await onSave(nextForm)
                        onClose()
                      } catch (_) { /* leave panel open on error */ }
                    }
                  }}
                  style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', marginBottom: '20px', boxSizing: 'border-box' }}>
                  {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </>
            )
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              {sectionLabel('Priority')}
              <select value={form.priority || 'Medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none' }}>
                {['Low', 'Medium', 'High'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              {sectionLabel('Due Date')}
              {form.is_ongoing ? (
                <div style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: subtle, boxSizing: 'border-box' }}>No due date</div>
              ) : (
                <input type='date' value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: text, cursor: 'pointer', marginTop: '6px' }}>
                <input type='checkbox' checked={!!form.is_ongoing} onChange={e => setForm(f => ({ ...f, is_ongoing: e.target.checked, due_date: e.target.checked ? '' : f.due_date }))} />
                Ongoing (no due date)
              </label>
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
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = dark ? '#1a1a1a' : '#F8F7F3' }}
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
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = dark ? '#1a1a1a' : '#F8F7F3' }}
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

          {campaigns.length > 0 && (
            <>
              {sectionLabel('Linked campaign')}
              <select value={form.campaign_id || ''} onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', marginBottom: '24px', boxSizing: 'border-box' }}>
                <option value=''>Not linked</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </>
          )}

          <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '24px', marginTop: '8px', marginBottom: '8px' }}>
            {sectionLabel(`Files${taskAttachments.length > 0 ? ` (${taskAttachments.length})` : ''}`)}

            {taskAttachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {taskAttachments.map(a => attachmentRow(a))}
              </div>
            )}

            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
              style={{ display: 'block', padding: '18px', border: `1px dashed ${dragOver ? '#5b7c99' : border2}`, background: dragOver ? (dark ? 'rgba(91,124,153,0.08)' : 'rgba(91,124,153,0.04)') : 'transparent', borderRadius: '2px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
              <input type='file' multiple onChange={e => { handleFiles(e.target.files); e.target.value = '' }} style={{ display: 'none' }} disabled={uploading} />
              <div style={{ fontSize: '11px', color: uploading ? '#5b7c99' : muted, lineHeight: 1.6 }}>
                {uploading ? 'Uploading…' : 'Drop files here, or click to choose'}
              </div>
              {!uploading && (
                <div style={{ fontSize: '9px', color: subtle, marginTop: '4px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Any file type</div>
              )}
            </label>
          </div>

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
                // Edit and Delete are allowed only on your OWN comment, and only
                // within 5 minutes of posting it (also enforced server-side).
                const canModify = isMine && (Date.now() - new Date(c.created_at).getTime()) < 5 * 60 * 1000
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
                        {canModify && !isEditing && (
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
                        <div style={{ fontSize: '12px', color: text, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><Linkify text={c.body} dark={dark} /></div>
                      )}
                      {(() => {
                        const atts = attachments.filter(a => a.comment_id === c.id)
                        if (!atts.length) return null
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                            {atts.map(a => attachmentRow(a))}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '14px', position: 'relative' }}>
              <button onClick={() => setCommentExpanded(v => !v)} title={commentExpanded ? 'Shrink comment box' : 'Expand comment box'} style={{ position: 'absolute', top: '22px', right: '10px', zIndex: 2, background: dark ? 'rgba(20,20,20,0.7)' : 'rgba(255,255,255,0.75)', border: `0.5px solid ${border}`, borderRadius: '3px', color: muted, cursor: 'pointer', padding: '3px 4px', lineHeight: 0, display: 'flex' }}>
                {commentExpanded ? (
                  <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='4 14 10 14 10 20'/><polyline points='20 10 14 10 14 4'/><line x1='14' y1='10' x2='21' y2='3'/><line x1='3' y1='21' x2='10' y2='14'/></svg>
                ) : (
                  <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 3 21 3 21 9'/><polyline points='9 21 3 21 3 15'/><line x1='21' y1='3' x2='14' y2='10'/><line x1='3' y1='21' x2='10' y2='14'/></svg>
                )}
              </button>
              <textarea
                value={newComment}
                onChange={e => {
                  const val = e.target.value
                  setNewComment(val)
                  const match = val.match(/(?:^|\s)@([\w.]*)$/)
                  if (match) { setShowCommentMentions(true); setCommentMentionQuery(match[1]) }
                  else { setShowCommentMentions(false); setCommentMentionQuery('') }
                }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment() }}
                onDragOver={e => { e.preventDefault(); setCommentDragOver(true) }}
                onDragLeave={() => setCommentDragOver(false)}
                onDrop={e => { e.preventDefault(); setCommentDragOver(false); handleCommentFiles(e.dataTransfer.files) }}
                onPaste={handleCommentPaste}
                placeholder='Add a comment... (paste or drag in a screenshot, @ to mention, Cmd+Enter to post)'
                style={{ width: '100%', background: commentDragOver ? (dark ? 'rgba(91,124,153,0.10)' : 'rgba(91,124,153,0.06)') : inputBg, border: `0.5px solid ${commentDragOver ? '#5b7c99' : border}`, borderRadius: '1px', padding: '10px 12px', fontSize: '12px', color: text, outline: 'none', resize: 'vertical', minHeight: commentExpanded ? '260px' : '70px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px', transition: 'min-height 0.15s' }}
              />
              {showCommentMentions && members.filter(m => (m.full_name || m.email).toLowerCase().includes(commentMentionQuery.toLowerCase())).length > 0 && (
                <div style={{ position: 'absolute', bottom: '50px', left: 0, right: 0, background: panelBg, border: `0.5px solid ${border}`, borderRadius: '1px', zIndex: 30, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
                  {members.filter(m => (m.full_name || m.email).toLowerCase().includes(commentMentionQuery.toLowerCase())).map(m => (
                    <div key={m.id}
                      onClick={() => {
                        const name = (m.full_name || m.email).split(' ')[0]
                        const val = newComment.replace(/@[\w.]*$/, `@${name} `)
                        setNewComment(val)
                        setShowCommentMentions(false)
                        setCommentMentionQuery('')
                      }}
                      style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = dark ? '#1a1a1a' : '#F8F7F3'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt='' style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#7A9B8E', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>{initialFromName(m.full_name || m.email)}</span>
                      )}
                      <span style={{ fontSize: '12px', color: text }}>{m.full_name || m.email}</span>
                    </div>
                  ))}
                </div>
              )}
              {commentFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {commentFiles.map((f, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: cardBg, border: `0.5px solid ${border}`, borderRadius: '12px', padding: '3px 6px 3px 10px', fontSize: '11px', color: text }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{f.name}</span>
                      <span style={{ fontSize: '9px', color: subtle }}>{humanSize(f.size)}</span>
                      <button onClick={() => setCommentFiles(prev => prev.filter((_, idx) => idx !== i))} title='Remove' style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '13px', lineHeight: 1, padding: '0 2px' }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              {commentAttachError && (
                <div style={{ fontSize: '11px', color: '#c0392b', marginBottom: '8px', lineHeight: 1.5 }}>{commentAttachError}</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {(() => { const canPost = newComment.trim() || commentFiles.length > 0; return (
                <button onClick={postComment} disabled={postingComment || !canPost} style={{ padding: '7px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: canPost ? '#5b7c99' : 'transparent', border: canPost ? 'none' : `0.5px solid ${border2}`, color: canPost ? '#fff' : subtle, cursor: canPost ? 'pointer' : 'default', borderRadius: '1px', opacity: postingComment ? 0.6 : 1 }}>
                  {postingComment ? 'Posting...' : 'Comment'}
                </button>
                ) })()}
                <label title='Attach files (5 MB max each)' style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>
                  <input type='file' multiple onChange={e => { handleCommentFiles(e.target.files); e.target.value = '' }} style={{ display: 'none' }} />
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'/></svg>
                  Attach
                </label>
                {recentlySaved && (
                  <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5C9E52' }}>✓ Saved</span>
                )}
              </div>
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
