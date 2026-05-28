import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { createNotification } from './notify'

const URL_RE = /https?:\/\/[^\s<>"']+/i

export default function BrandNotes({ brand, userId, agencyTz, dark = true, orgId, members = [], onClose }) {
  // Invert theme: app dark → notes light, app light → notes dark
  const inv = !dark
  const bg = inv ? '#1A1A1A' : '#FBFAF7'
  const bgInner = inv ? '#1A1A1A' : '#FFFFFF'
  const bgPanel = inv ? '#141414' : '#F1EEE8'
  const border = inv ? '#2A2A2A' : '#DBD7D0'
  const text = inv ? '#E8E4DD' : '#1A1A1A'
  const muted = inv ? '#999' : '#666'
  const subtle = inv ? '#777' : '#888'
  const accent = '#5b7c99'
  const linkColor = inv ? '#7FA8C9' : '#3A6789'
  const headingColor = inv ? '#9FBCA8' : '#4A6B57'

  const editorRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionRect, setMentionRect] = useState(null)
  const [showColors, setShowColors] = useState(false)
  const [currentColor, setCurrentColor] = useState(null)
  const [showLists, setShowLists] = useState(false)
  const dayHeadingInsertedRef = useRef(false)
  const previousMentionsRef = useRef(new Set())
  const saveTimerRef = useRef(null)
  const dirtyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    supabase.from('brands').select('meeting_notes').eq('id', brand.id).maybeSingle().then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        const lower = (error.message || '').toLowerCase()
        if (lower.includes('meeting_notes') && (lower.includes('column') || lower.includes('does not exist') || lower.includes('schema cache'))) {
          setError("The 'meeting_notes' column doesn't exist on the brands table yet. Open Supabase → SQL Editor → run: alter table brands add column if not exists meeting_notes text;  Then refresh.")
        } else {
          setError('Could not load notes: ' + error.message)
        }
        setLoaded(true)
        return
      }
      if (editorRef.current) {
        editorRef.current.innerHTML = data?.meeting_notes || ''
        wrapExistingAttachments(editorRef.current)
        decorateHeadings(editorRef.current)
        previousMentionsRef.current = collectMentions(editorRef.current)
      }
      setLoaded(true)
    })
    // Mark this brand's notes as read for this user — clears the "NEW" badge.
    if (userId && brand.id) {
      supabase.from('brand_notes_views')
        .upsert({ brand_id: brand.id, user_id: userId, last_viewed_at: new Date().toISOString() }, { onConflict: 'brand_id,user_id' })
        .then(() => {})
    }
    return () => { cancelled = true; if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [brand.id, userId])

  // Place cursor at the very top of the editor when notes finish loading,
  // so first keystrokes create today's heading above any existing dated content.
  useEffect(() => {
    if (!loaded || error || !editorRef.current) return
    const el = editorRef.current
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(true)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }, [loaded, error])

  function collectMentions(el) {
    const set = new Set()
    el.querySelectorAll('span[data-mention]').forEach(s => set.add(s.getAttribute('data-mention')))
    return set
  }

  async function save() {
    if (!editorRef.current || error) return
    if (!dirtyRef.current) return
    const html = editorRef.current.innerHTML
    setSaving(true)
    let { error: saveErr } = await supabase.from('brands').update({ meeting_notes: html || null, meeting_notes_updated_at: new Date().toISOString() }).eq('id', brand.id)
    if (saveErr && (saveErr.message || '').toLowerCase().includes('meeting_notes_updated_at')) {
      // The updated-at column doesn't exist yet — fall back to a plain notes save.
      ;({ error: saveErr } = await supabase.from('brands').update({ meeting_notes: html || null }).eq('id', brand.id))
    }
    setSaving(false)
    if (saveErr) {
      const lower = (saveErr.message || '').toLowerCase()
      if (lower.includes('meeting_notes')) {
        setError("The 'meeting_notes' column doesn't exist yet. Open Supabase → SQL Editor → run: alter table brands add column if not exists meeting_notes text;")
      } else {
        setError('Could not save: ' + saveErr.message)
      }
      return
    }
    dirtyRef.current = false
    setSavedAt(Date.now())
    notifyNewMentions()
  }

  function notifyNewMentions() {
    if (!editorRef.current || !orgId) return
    const current = collectMentions(editorRef.current)
    const newOnes = []
    current.forEach(name => { if (!previousMentionsRef.current.has(name)) newOnes.push(name) })
    previousMentionsRef.current = current
    const message = `You were mentioned in notes for ${brand.name}`
    newOnes.forEach(name => createNotification(orgId, name, 'mention', message, members).catch(() => {}))
  }

  function scheduleSave() {
    dirtyRef.current = true
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { save() }, 800)
  }

  async function closeWithSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (dirtyRef.current) await save()
    onClose()
  }

  function exec(cmd, value = null) {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
    scheduleSave()
  }

  function todayHeadingText() {
    const d = new Date()
    // Use the agency's time zone so everyone on the team agrees on what
    // "today" is, regardless of where the editing person is sitting.
    try {
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: agencyTz || undefined })
    } catch {
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
  }

  function ensureTodayHeading() {
    if (dayHeadingInsertedRef.current) return
    const el = editorRef.current
    if (!el) return
    const today = todayHeadingText()
    const firstHeading = el.querySelector('h3[data-day]')
    if (firstHeading && firstHeading.getAttribute('data-day') === today) {
      // The top heading is already today — append under it instead of duplicating.
      dayHeadingInsertedRef.current = true
      const after = firstHeading.nextSibling
      if (after) placeCursorAtStartOf(after)
      return
    }
    // Otherwise — yesterday or earlier at the top — insert a fresh today heading
    // at the very top so the newest day is always first (running log).
    // Always insert today's heading at the top on first edit of the session.
    // Old headings stay put because they're contenteditable=false.
    const heading = document.createElement('h3')
    heading.setAttribute('data-day', today)
    heading.contentEditable = 'false'
    heading.textContent = today
    heading.style.cssText = `font-family: Georgia, serif; font-size: 13px; color: ${headingColor}; letter-spacing: 0.18em; text-transform: uppercase; margin: 18px 0 6px; padding-bottom: 4px; border-bottom: 0.5px solid ${border};`
    decorateHeading(heading)
    const spacer = document.createElement('div')
    spacer.innerHTML = '<br>'
    el.insertBefore(spacer, el.firstChild)
    el.insertBefore(heading, el.firstChild)
    dayHeadingInsertedRef.current = true
    placeCursorAtStartOf(spacer)
  }

  function placeCursorAtStartOf(node) {
    const range = document.createRange()
    range.setStart(node, 0)
    range.collapse(true)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }

  const [linkCopied, setLinkCopied] = useState(false)
  async function copyShareLink() {
    const url = `${window.location.origin}${window.location.pathname}?brand_notes=${brand.id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch (_) {
      const ta = document.createElement('textarea')
      ta.value = url; document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch (_) {}
      document.body.removeChild(ta)
    }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 1500)
  }

  function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
  function escapeAttr(s) { return s.replace(/"/g, '&quot;').replace(/&/g, '&amp;') }

  function insertLinkWithPreview(href, displayText) {
    const id = 'lp-' + Math.random().toString(36).slice(2, 9)
    const placeholderHtml = `<div data-preview-loading="${id}" contenteditable="false" style="display:flex;align-items:center;gap:8px;padding:10px 14px;margin:8px 0;background:${bgPanel};border:0.5px solid ${border};border-radius:3px;font-size:11px;color:${subtle};font-family:inherit;letter-spacing:0.04em;"><span style="display:inline-block;width:10px;height:10px;border:1.5px solid ${subtle};border-top-color:transparent;border-radius:50%;animation:hque-spin 0.7s linear infinite;"></span>Loading preview…</div>`
    const linkHtml = `<a href="${escapeAttr(href)}" target="_blank" rel="noreferrer">${escapeHtml(displayText || href)}</a>&nbsp;`
    document.execCommand('insertHTML', false, linkHtml + placeholderHtml + '<br>')
    fetchPreviewAndReplace(href, id)
  }

  async function fetchPreviewAndReplace(url, id) {
    try {
      const res = await fetch(`/.netlify/functions/link-preview?url=${encodeURIComponent(url)}`)
      const data = await res.json().catch(() => null)
      const el = editorRef.current?.querySelector(`[data-preview-loading="${id}"]`)
      if (!el) return
      if (!data || data.error || (!data.title && !data.image && !data.description)) {
        el.remove()
        scheduleSave()
        return
      }
      el.outerHTML = renderPreviewCard(data, url)
      scheduleSave()
    } catch (_) {
      const el = editorRef.current?.querySelector(`[data-preview-loading="${id}"]`)
      el?.remove()
    }
  }

  function renderPreviewCard(data, fallbackUrl) {
    const href = escapeAttr(data.url || fallbackUrl)
    const title = data.title ? escapeHtml(data.title) : escapeHtml(hostnameOf(data.url || fallbackUrl) || 'Link')
    const desc = data.description ? `<div style="font-size:11px;color:${subtle};line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(data.description)}</div>` : ''
    const site = data.siteName ? `<div style="font-size:9px;color:${subtle};letter-spacing:0.08em;text-transform:uppercase;margin-top:6px;">${escapeHtml(data.siteName)}</div>` : ''
    const img = data.image ? `<img src="${escapeAttr(data.image)}" alt="" style="width:96px;height:96px;object-fit:cover;flex-shrink:0;border-right:0.5px solid ${border};background:${bgPanel};" onerror="this.style.display='none'" />` : ''
    return `<a data-link-preview="1" contenteditable="false" href="${href}" target="_blank" rel="noreferrer" style="display:flex;align-items:stretch;margin:8px 0;background:${bgPanel};border:0.5px solid ${border};border-radius:3px;text-decoration:none;color:inherit;overflow:hidden;max-width:560px;">${img}<div style="flex:1;min-width:0;padding:10px 14px;display:flex;flex-direction:column;justify-content:center;"><div style="font-weight:600;font-size:13px;color:${text};line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">${title}</div>${desc}${site}</div></a>`
  }

  function hostnameOf(u) {
    try { return new URL(u).hostname.replace(/^www\./, '') } catch { return null }
  }

  function imageWrapperHtml(publicUrl, fileName) {
    return `<div data-attachment-wrapper="image" contenteditable="false" style="position:relative;display:inline-block;margin:8px 0;max-width:100%;line-height:0;"><img src="${escapeAttr(publicUrl)}" alt="${escapeAttr(fileName)}" data-attachment="image" style="max-width:100%;border-radius:2px;cursor:pointer;display:block;" /><button type="button" data-attachment-delete="1" title="Remove" style="position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;border:none;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;">×</button></div>&nbsp;`
  }

  function fileWrapperHtml(publicUrl, fileName) {
    return `<span data-attachment-wrapper="file" contenteditable="false" style="display:inline-flex;align-items:center;gap:8px;margin:4px 4px 4px 0;padding:4px 4px 4px 8px;background:${bgPanel};border:0.5px solid ${border};border-radius:2px;line-height:1.4;"><a href="${escapeAttr(publicUrl)}" target="_blank" rel="noreferrer" data-attachment="file" style="color:${linkColor};text-decoration:none;font-size:12px;">📎 ${escapeHtml(fileName)}</a><button type="button" data-attachment-delete="1" title="Remove" style="background:none;border:none;color:${subtle};cursor:pointer;font-size:13px;line-height:1;padding:0 4px;">×</button></span>&nbsp;`
  }

  function wrapExistingAttachments(el) {
    // Migrate previously-saved bare imgs/file links into wrappers with × buttons
    el.querySelectorAll('img[data-attachment="image"]').forEach(img => {
      if (img.closest('[data-attachment-wrapper]')) return
      const tmp = document.createElement('template')
      tmp.innerHTML = imageWrapperHtml(img.src, img.alt || 'image')
      const wrapper = tmp.content.firstChild
      img.replaceWith(wrapper)
    })
    el.querySelectorAll('a[data-attachment="file"]').forEach(a => {
      if (a.closest('[data-attachment-wrapper]')) return
      const tmp = document.createElement('template')
      tmp.innerHTML = fileWrapperHtml(a.href, a.textContent.replace(/^📎\s*/, ''))
      const wrapper = tmp.content.firstChild
      a.replaceWith(wrapper)
    })
  }

  // Give a day heading a delete button (so a whole date can be removed).
  function decorateHeading(h) {
    if (h.querySelector('[data-day-delete]')) return
    const labelText = h.textContent
    h.textContent = ''
    h.style.display = 'flex'
    h.style.justifyContent = 'space-between'
    h.style.alignItems = 'center'
    const span = document.createElement('span')
    span.textContent = labelText
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('data-day-delete', '1')
    btn.contentEditable = 'false'
    btn.title = 'Delete this date and its notes'
    btn.textContent = '×'
    btn.style.cssText = `background:none;border:none;color:${subtle};cursor:pointer;font-size:15px;line-height:1;padding:0 4px;flex-shrink:0;`
    h.appendChild(span)
    h.appendChild(btn)
  }

  function decorateHeadings(el) {
    el.querySelectorAll('h3[data-day]').forEach(decorateHeading)
  }

  function handleDayHeadingDelete(e) {
    const btn = e.target.closest('[data-day-delete]')
    if (!btn) return false
    e.preventDefault()
    e.stopPropagation()
    const heading = btn.closest('h3[data-day]')
    if (!heading) return true
    const label = heading.getAttribute('data-day') || 'this date'
    if (!confirm(`Delete "${label}" and all of its notes? This can't be undone.`)) return true
    // Remove the heading and everything below it until the next day heading.
    let node = heading.nextSibling
    heading.remove()
    while (node && !(node.nodeType === 1 && node.matches && node.matches('h3[data-day]'))) {
      const next = node.nextSibling
      node.remove()
      node = next
    }
    dirtyRef.current = true
    scheduleSave()
    return true
  }

  function handleAttachmentDelete(e) {
    const btn = e.target.closest('[data-attachment-delete]')
    if (!btn) return false
    e.preventDefault()
    e.stopPropagation()
    const wrapper = btn.closest('[data-attachment-wrapper]')
    if (wrapper) {
      wrapper.remove()
      scheduleSave()
    }
    return true
  }

  function handlePaste(e) {
    e.preventDefault()
    const text = (e.clipboardData?.getData('text/plain') || '').trim()
    if (!text) return
    if (URL_RE.test(text) && !/\s/.test(text)) {
      let href = text
      if (!/^https?:\/\//i.test(href)) href = 'https://' + href
      insertLinkWithPreview(href, text)
    } else {
      document.execCommand('insertText', false, text)
    }
    scheduleSave()
  }

  function handleEditorClick(e) {
    const a = e.target.closest('a')
    if (!a) return
    // Preview cards open on a normal click (they're block elements you'd never edit inline)
    if (a.hasAttribute('data-link-preview')) {
      e.preventDefault()
      window.open(a.href, '_blank', 'noopener,noreferrer')
      return
    }
    // Inline links open on ⌘/Ctrl-click so plain clicks still let you place a cursor
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      window.open(a.href, '_blank', 'noopener,noreferrer')
    }
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      save()
    }
    // Ensure today's heading is created right before the user types meaningful content
    if (!dayHeadingInsertedRef.current && !e.metaKey && !e.ctrlKey && e.key.length === 1) {
      ensureTodayHeading()
    }
  }

  function handleInput() {
    if (!dayHeadingInsertedRef.current) ensureTodayHeading()
    updateMentionPicker()
    scheduleSave()
  }

  function updateMentionPicker() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) { setShowMentions(false); return }
    const range = sel.getRangeAt(0)
    if (!editorRef.current?.contains(range.startContainer)) { setShowMentions(false); return }
    const node = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) { setShowMentions(false); return }
    const before = node.textContent.slice(0, range.startOffset)
    const m = before.match(/(?:^|\s)@([\w.]*)$/)
    if (!m) { setShowMentions(false); return }
    setMentionQuery(m[1])
    const rect = range.getBoundingClientRect()
    setMentionRect({ left: rect.left, top: rect.bottom + 4 })
    setShowMentions(true)
  }

  function insertMention(member) {
    const name = (member.full_name || member.email).split(' ')[0]
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) return
    const before = node.textContent.slice(0, range.startOffset)
    const m = before.match(/(?:^|\s)@([\w.]*)$/)
    if (!m) return
    const start = range.startOffset - m[0].trimStart().length
    const replaceRange = document.createRange()
    replaceRange.setStart(node, start)
    replaceRange.setEnd(node, range.startOffset)
    replaceRange.deleteContents()
    const span = document.createElement('span')
    span.setAttribute('data-mention', name)
    span.contentEditable = 'false'
    span.textContent = `@${name}`
    span.style.cssText = `display: inline-block; padding: 1px 6px; margin: 0 1px; background: ${accent}22; color: ${linkColor}; border-radius: 3px; font-weight: 500;`
    replaceRange.insertNode(span)
    const afterText = document.createTextNode(' ')
    span.parentNode.insertBefore(afterText, span.nextSibling)
    const newRange = document.createRange()
    newRange.setStart(afterText, 1)
    newRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(newRange)
    setShowMentions(false)
    scheduleSave()
  }

  async function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer?.files || [])
    if (!files.length) return
    for (const file of files) await uploadAndInsert(file)
  }

  async function uploadAndInsert(file) {
    setUploading(n => n + 1)
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `notes/${brand.id}/${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage.from('media-kits').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
      if (upErr) {
        alert('Upload failed: ' + upErr.message)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('media-kits').getPublicUrl(path)
      const isImg = (file.type || '').startsWith('image/')
      const html = isImg ? imageWrapperHtml(publicUrl, file.name) : fileWrapperHtml(publicUrl, file.name)
      editorRef.current?.focus()
      if (!dayHeadingInsertedRef.current) ensureTodayHeading()
      document.execCommand('insertHTML', false, html)
      scheduleSave()
    } finally {
      setUploading(n => n - 1)
    }
  }

  function handleImgClick(e) {
    const img = e.target.closest('img[data-attachment="image"]')
    if (!img) return
    e.preventDefault()
    window.open(img.src, '_blank', 'noopener,noreferrer')
  }

  const filteredMembers = members.filter(m => (m.full_name || m.email).toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)

  const savedLabel = saving
    ? 'Saving…'
    : uploading > 0
      ? `Uploading ${uploading}…`
      : savedAt
        ? '✓ Saved'
        : ''

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '780px', height: '85vh', background: bgInner, border: `0.5px solid ${border}`, borderRadius: '2px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ padding: '18px 24px', borderBottom: `0.5px solid ${border}`, display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, background: bg }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: accent, marginBottom: '4px' }}>Notes</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brand.name}</div>
          </div>
          <div style={{ fontSize: '9px', color: subtle, letterSpacing: '0.14em', textAlign: 'right' }}>
            <div style={{ color: '#7A9B8E', minHeight: '12px' }}>{savedLabel}</div>
            <div style={{ marginTop: '2px', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>Auto-saves as you type</div>
          </div>
          <button onClick={copyShareLink} title='Copy a shareable link to these notes' style={{ padding: '6px 12px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: linkCopied ? '#7A9B8E' : muted, cursor: 'pointer', borderRadius: '1px', flexShrink: 0 }}>
            {linkCopied ? '✓ Copied' : '↗ Copy Link'}
          </button>
          <button onClick={closeWithSave} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '24px', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <div style={{ padding: '10px 24px', borderBottom: `0.5px solid ${border}`, display: 'flex', gap: '6px', flexShrink: 0, background: bgPanel, alignItems: 'center', position: 'relative' }}>
          <ToolbarButton inv={inv} onClick={() => exec('bold')} title='Bold (⌘B)'><b>B</b></ToolbarButton>
          <ToolbarButton inv={inv} onClick={() => exec('italic')} title='Italic (⌘I)'><i>I</i></ToolbarButton>
          <ToolbarButton inv={inv} onClick={() => exec('underline')} title='Underline (⌘U)'><u>U</u></ToolbarButton>
          <ToolbarButton inv={inv} onClick={() => exec('strikeThrough')} title='Strikethrough'><s>S</s></ToolbarButton>
          <div style={{ position: 'relative' }}>
            <button onMouseDown={e => e.preventDefault()} onClick={() => setShowColors(s => !s)} title='Text color' style={{ background: 'none', border: `0.5px solid ${inv ? '#2A2A2A' : '#DBD7D0'}`, color: inv ? '#BBB' : '#3A3A3A', cursor: 'pointer', padding: '5px 8px', fontSize: '11px', borderRadius: '1px', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '2px', background: currentColor || (inv ? '#E8E4DD' : '#1A1A1A'), border: `0.5px solid ${border}` }} />
              <span style={{ fontSize: '9px' }}>▾</span>
            </button>
            {showColors && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: bgInner, border: `0.5px solid ${border}`, borderRadius: '2px', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(4, 22px)', gap: '6px', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
                {['#1A1A1A', '#FFFFFF', '#E74C3C', '#E67E22', '#F1C40F', '#27AE60', '#3498DB', '#9B59B6'].map(c => (
                  <button key={c} onMouseDown={e => e.preventDefault()} onClick={() => { exec('foreColor', c); setCurrentColor(c); setShowColors(false) }}
                    style={{ width: '22px', height: '22px', background: c, border: `0.5px solid ${border}`, borderRadius: '2px', cursor: 'pointer', padding: 0 }} />
                ))}
                <button onMouseDown={e => e.preventDefault()} onClick={() => { exec('foreColor', text); setCurrentColor(null); setShowColors(false) }}
                  style={{ gridColumn: '1 / -1', fontSize: '10px', padding: '6px 8px', background: 'none', border: `0.5px solid ${border}`, color: text, cursor: 'pointer', borderRadius: '1px', fontFamily: 'inherit', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Default
                </button>
              </div>
            )}
          </div>
          <div style={{ width: '1px', background: border, alignSelf: 'stretch', margin: '0 4px' }} />
          <div style={{ position: 'relative' }}>
            <button onMouseDown={e => e.preventDefault()} onClick={() => setShowLists(s => !s)} title='Lists' style={{ background: 'none', border: `0.5px solid ${inv ? '#2A2A2A' : '#DBD7D0'}`, color: inv ? '#BBB' : '#3A3A3A', cursor: 'pointer', padding: '5px 11px', fontSize: '11px', borderRadius: '1px', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              List <span style={{ fontSize: '9px' }}>▾</span>
            </button>
            {showLists && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: bgInner, border: `0.5px solid ${border}`, borderRadius: '2px', zIndex: 50, minWidth: '140px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
                <button onMouseDown={e => e.preventDefault()} onClick={() => { exec('insertUnorderedList'); setShowLists(false) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: text, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>•&nbsp;&nbsp;Bulleted</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => { exec('insertOrderedList'); setShowLists(false) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: text, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', borderTop: `0.5px solid ${border}` }}>1.&nbsp;&nbsp;Numbered</button>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '9px', color: subtle, letterSpacing: '0.1em' }}>Paste a URL to link · drop files · type @ to mention</span>
        </div>

        {error && (
          <div style={{ padding: '12px 24px', background: '#3A1A1A', color: '#F0B0B0', fontSize: '11px', lineHeight: 1.5, borderBottom: `0.5px solid #5A2A2A`, flexShrink: 0 }}>
            {error}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable={!error && loaded}
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onClick={e => { if (handleDayHeadingDelete(e)) return; if (handleAttachmentDelete(e)) return; handleEditorClick(e); handleImgClick(e) }}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault() }}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
            fontSize: '14px',
            lineHeight: 1.7,
            color: text,
            outline: 'none',
            fontFamily: 'Georgia, serif',
            background: bgInner,
            userSelect: 'text',
            WebkitUserSelect: 'text',
            cursor: 'text'
          }}
          data-placeholder='Start typing your notes…'
        />

        {showMentions && filteredMembers.length > 0 && mentionRect && (
          <div style={{ position: 'fixed', left: mentionRect.left, top: mentionRect.top, background: bgPanel, border: `0.5px solid ${border}`, borderRadius: '2px', zIndex: 300, minWidth: '220px', maxHeight: '220px', overflowY: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.25)' }}>
            {filteredMembers.map(m => (
              <div key={m.id}
                onMouseDown={e => { e.preventDefault(); insertMention(m) }}
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: text, fontSize: '12px' }}
                onMouseEnter={e => e.currentTarget.style.background = inv ? '#222' : '#E8E4DD'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt='' style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#7A9B8E', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{((m.full_name || m.email) || '?').charAt(0).toUpperCase()}</span>
                )}
                <span>{m.full_name || m.email}</span>
              </div>
            ))}
          </div>
        )}

        <style>{`
          [contenteditable][data-placeholder]:empty:before { content: attr(data-placeholder); color: ${subtle}; pointer-events: none; }
          [contenteditable] a { color: ${linkColor}; text-decoration: underline; }
          [contenteditable] a[data-link-preview] { text-decoration: none; }
          [contenteditable] a[data-link-preview]:hover { border-color: ${accent} !important; }
          [contenteditable] ul { padding-left: 26px; margin: 8px 0; list-style: disc outside; }
          [contenteditable] ol { padding-left: 26px; margin: 8px 0; list-style: decimal outside; }
          [contenteditable] li { margin: 4px 0; }
          [contenteditable] h3[data-day] { user-select: text; -webkit-user-select: text; }
          [contenteditable]::selection { background: #5b7c99; color: #ffffff; }
          [contenteditable] ::selection { background: #5b7c99; color: #ffffff; }
          [contenteditable] h3[data-day] button[data-day-delete] { opacity: 0; transition: opacity 0.15s; }
          [contenteditable] h3[data-day]:hover button[data-day-delete] { opacity: 0.6; }
          [contenteditable] [data-attachment-wrapper="image"] button[data-attachment-delete] { opacity: 0.55; transition: opacity 0.15s; }
          [contenteditable] [data-attachment-wrapper="image"]:hover button[data-attachment-delete] { opacity: 1; }
          @keyframes hque-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  )
}

function ToolbarButton({ onClick, title, children, inv }) {
  const border = inv ? '#2A2A2A' : '#DBD7D0'
  const color = inv ? '#BBB' : '#3A3A3A'
  return (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      title={title}
      style={{
        background: 'none',
        border: `0.5px solid ${border}`,
        color,
        cursor: 'pointer',
        padding: '5px 11px',
        fontSize: '11px',
        borderRadius: '1px',
        fontFamily: 'inherit',
        minWidth: '32px'
      }}
    >{children}</button>
  )
}
