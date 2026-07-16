import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

// Settings > Talent Labels — lets a company customize its own Type and Niche
// lists. Reads org_talent_labels; all writes go through the SECURITY DEFINER
// RPCs (add/rename/remove/reorder), which enforce owner/admin + plan tier.
// Locked (read-only + upgrade note) when the plan can't customize.
export default function TalentLabelsManager({ orgId, dark, colors }) {
  const { text, muted, subtle, border, border2, inputBg, card, accent = '#5b7c99' } = colors
  const [types, setTypes] = useState([])
  const [niches, setNiches] = useState([])
  const [canEdit, setCanEdit] = useState(null) // null = loading
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(null)  // `${kind}:${label}`
  const [editVal, setEditVal] = useState('')
  const [adding, setAdding] = useState({ type: '', niche: '' })
  const dragRef = useRef({ kind: null, label: null })

  async function load() {
    const [{ data }, { data: allowed }] = await Promise.all([
      supabase.from('org_talent_labels').select('kind,label,position').eq('org_id', orgId).order('position'),
      supabase.rpc('can_customize_labels', { p_org_id: orgId }),
    ])
    setTypes((data || []).filter(r => r.kind === 'type').map(r => r.label))
    setNiches((data || []).filter(r => r.kind === 'niche').map(r => r.label))
    setCanEdit(allowed === true)
    setLoading(false)
  }
  useEffect(() => { if (orgId) load() }, [orgId])

  const flash = (m) => { setErr(m); setTimeout(() => setErr(''), 4000) }

  async function run(rpc, args) {
    const { error } = await supabase.rpc(rpc, args)
    if (error) { flash(error.message.replace(/^.*?:\s*/, '')); return false }
    return true
  }

  async function addLabel(kind) {
    const label = (adding[kind === 'type' ? 'type' : 'niche'] || '').trim()
    if (!label) return
    setAdding(a => ({ ...a, [kind === 'type' ? 'type' : 'niche']: '' }))
    if (await run('add_talent_label', { p_org_id: orgId, p_kind: kind, p_label: label })) load()
  }
  async function removeLabel(kind, label) {
    if (await run('remove_talent_label', { p_org_id: orgId, p_kind: kind, p_label: label })) load()
  }
  async function commitRename(kind, oldLabel) {
    const next = editVal.trim()
    setEditing(null)
    if (!next || next === oldLabel) return
    if (await run('rename_talent_label', { p_org_id: orgId, p_kind: kind, p_old: oldLabel, p_new: next })) load()
  }
  async function persistOrder(kind, ordered) {
    if (kind === 'type') setTypes(ordered); else setNiches(ordered)
    await run('reorder_talent_labels', { p_org_id: orgId, p_kind: kind, p_labels: ordered })
  }
  function onDrop(kind, targetLabel) {
    const src = dragRef.current
    if (src.kind !== kind || src.label === targetLabel) return
    const arr = kind === 'type' ? [...types] : [...niches]
    const from = arr.indexOf(src.label), to = arr.indexOf(targetLabel)
    if (from < 0 || to < 0) return
    arr.splice(to, 0, arr.splice(from, 1)[0])
    persistOrder(kind, arr)
  }

  const eyebrow = { fontSize: '8px', letterSpacing: '0.26em', textTransform: 'uppercase', color: subtle }
  const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', background: card, border: `0.5px solid ${border2}`, borderRadius: '999px', padding: '6px 8px 6px 8px', fontSize: '12px', color: text }

  function chip(kind, label) {
    const key = `${kind}:${label}`
    if (editing === key) {
      return (
        <span key={key} style={{ ...chipStyle, padding: '3px 6px' }}>
          <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(kind, label); if (e.key === 'Escape') setEditing(null) }}
            onBlur={() => commitRename(kind, label)}
            style={{ border: 'none', outline: 'none', background: 'transparent', color: text, fontSize: '12px', width: `${Math.max(label.length, 6) + 1}ch` }} />
        </span>
      )
    }
    return (
      <span key={key}
        draggable={canEdit}
        onDragStart={() => { dragRef.current = { kind, label } }}
        onDragOver={e => e.preventDefault()}
        onDrop={() => onDrop(kind, label)}
        style={{ ...chipStyle, cursor: canEdit ? 'grab' : 'default' }}>
        {canEdit && <span style={{ color: subtle, cursor: 'grab', letterSpacing: '-2px', fontSize: '11px' }} title='Drag to reorder'>⠿</span>}
        <span
          onDoubleClick={() => { if (canEdit) { setEditing(key); setEditVal(label) } }}
          title={canEdit ? 'Double-click to rename' : ''}>{label}</span>
        {canEdit && <button onClick={() => removeLabel(kind, label)} title='Remove'
          style={{ border: 'none', background: 'transparent', color: subtle, cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}>×</button>}
      </span>
    )
  }

  function section(kind, title, hint, list) {
    const inputKey = kind === 'type' ? 'type' : 'niche'
    return (
      <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '20px', marginTop: '20px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: text, fontWeight: 600, marginBottom: '3px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: subtle, marginBottom: '14px' }}>{hint}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {list.map(l => chip(kind, l))}
          {list.length === 0 && <span style={{ fontSize: '12px', color: subtle }}>No labels yet.</span>}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0', marginTop: '14px', maxWidth: '280px' }}>
            <input value={adding[inputKey]} onChange={e => setAdding(a => ({ ...a, [inputKey]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') addLabel(kind) }}
              placeholder={`Add a ${kind}…`} maxLength={28}
              style={{ flex: 1, fontSize: '12px', color: text, background: inputBg, border: `0.5px dashed ${border2}`, borderRadius: '999px 0 0 999px', padding: '8px 12px', outline: 'none' }} />
            <button onClick={() => addLabel(kind)} style={{ fontSize: '12px', fontWeight: 600, color: '#fff', background: accent, border: 'none', borderRadius: '0 999px 999px 0', padding: '8px 16px', cursor: 'pointer' }}>Add</button>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div style={{ fontSize: '12px', color: subtle }}>Loading…</div>

  return (
    <div style={{ maxWidth: '620px' }}>
      <div style={eyebrow}>Settings / Talent Labels</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: text, margin: '8px 0 6px' }}>Talent Labels</div>
      <div style={{ fontSize: '13px', color: muted, lineHeight: 1.6, marginBottom: '18px' }}>
        The Types and Niches you use to categorize your roster. Rename them, remove the ones you don't use, and add the categories your agency actually works in. Renaming updates it on every talent already tagged.
      </div>

      {canEdit === false && (
        <div style={{ display: 'flex', gap: '9px', alignItems: 'center', fontSize: '12px', color: muted, background: dark ? 'rgba(184,121,27,0.12)' : '#FBF3E4', border: `0.5px solid ${dark ? '#5a4a2a' : '#EAD9B8'}`, borderRadius: '8px', padding: '11px 14px', marginBottom: '4px' }}>
          <span>🔒</span>
          <span><b style={{ color: text }}>Customizing labels is on Pro &amp; Business.</b> Your talent keep every tag they already have — upgrade to rename, add, or remove your own.</span>
        </div>
      )}

      {err && <div style={{ fontSize: '12px', color: '#c0392b', marginTop: '10px' }}>{err}</div>}

      {section('type', 'Types', 'What a talent is — the kind of talent they are.', types)}
      {section('niche', 'Niches', 'The subjects and industries a talent covers.', niches)}

      {canEdit && <div style={{ fontSize: '10.5px', color: subtle, marginTop: '18px' }}>Tip: double-click a label to rename it · drag the ⠿ handle to reorder.</div>}
    </div>
  )
}
