import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

export default function BrandNotes({ brand, onClose, onSaved }) {
  const editorRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

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
      if (editorRef.current) editorRef.current.innerHTML = data?.meeting_notes || ''
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [brand.id])

  async function save() {
    if (!editorRef.current || error) return
    const html = editorRef.current.innerHTML
    setSaving(true)
    const { error: saveErr } = await supabase.from('brands').update({ meeting_notes: html || null }).eq('id', brand.id)
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
    setSavedAt(Date.now())
    if (onSaved) onSaved()
  }

  async function closeWithSave() {
    await save()
    onClose()
  }

  function exec(cmd) {
    document.execCommand(cmd, false, null)
    editorRef.current?.focus()
  }

  function addLink() {
    const sel = window.getSelection()
    const hasSelection = sel && sel.toString().length > 0
    const url = prompt(hasSelection ? 'Link URL:' : 'Link URL (selected text will become the link, or paste the URL to insert as both):', 'https://')
    if (!url) return
    let href = url.trim()
    if (!/^https?:\/\//i.test(href) && !href.startsWith('mailto:') && !href.startsWith('/')) href = 'https://' + href
    if (!hasSelection) {
      document.execCommand('insertHTML', false, `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noreferrer">${href}</a>`)
    } else {
      document.execCommand('createLink', false, href)
      // Make pasted links open in a new tab
      setTimeout(() => {
        editorRef.current?.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noreferrer' })
      }, 0)
    }
    editorRef.current?.focus()
  }

  function handlePaste(e) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      save()
    }
  }

  const savedLabel = saving ? 'Saving…' : savedAt ? '✓ Saved' : ''

  return (
    <div onClick={e => e.target === e.currentTarget && closeWithSave()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '780px', height: '85vh', background: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '2px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #2A2A2A', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '4px' }}>Notes</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F0ECE6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brand.name}</div>
          </div>
          <div style={{ fontSize: '9px', color: '#7A9B8E', letterSpacing: '0.14em', minWidth: '60px', textAlign: 'right' }}>{savedLabel}</div>
          <button onClick={closeWithSave} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '24px', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <div style={{ padding: '10px 24px', borderBottom: '0.5px solid #2A2A2A', display: 'flex', gap: '6px', flexShrink: 0, background: '#141414' }}>
          <ToolbarButton onClick={() => exec('bold')} title='Bold (⌘B)'><b>B</b></ToolbarButton>
          <ToolbarButton onClick={() => exec('italic')} title='Italic (⌘I)'><i>I</i></ToolbarButton>
          <ToolbarButton onClick={() => exec('underline')} title='Underline (⌘U)'><u>U</u></ToolbarButton>
          <div style={{ width: '1px', background: '#2A2A2A', margin: '4px 4px' }} />
          <ToolbarButton onClick={() => exec('insertUnorderedList')} title='Bulleted list'>•&nbsp;list</ToolbarButton>
          <ToolbarButton onClick={addLink} title='Insert link'>🔗 Link</ToolbarButton>
          <ToolbarButton onClick={() => exec('removeFormat')} title='Clear formatting'>clear</ToolbarButton>
        </div>

        {error && (
          <div style={{ padding: '12px 24px', background: '#3A1A1A', color: '#F0B0B0', fontSize: '11px', lineHeight: 1.5, borderBottom: '0.5px solid #5A2A2A', flexShrink: 0 }}>
            {error}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable={!error && loaded}
          suppressContentEditableWarning
          onBlur={save}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
            fontSize: '14px',
            lineHeight: 1.7,
            color: '#E8E4DD',
            outline: 'none',
            fontFamily: 'Georgia, serif',
            background: '#1A1A1A'
          }}
          data-placeholder='Start typing your notes…'
        />

        <style>{`
          [contenteditable][data-placeholder]:empty:before { content: attr(data-placeholder); color: #555; pointer-events: none; }
          [contenteditable] a { color: #5b7c99; text-decoration: underline; }
          [contenteditable] ul { padding-left: 22px; margin: 8px 0; }
          [contenteditable] li { margin: 4px 0; }
        `}</style>
      </div>
    </div>
  )
}

function ToolbarButton({ onClick, title, children }) {
  return (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      title={title}
      style={{
        background: 'none',
        border: '0.5px solid #2A2A2A',
        color: '#BBB',
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
