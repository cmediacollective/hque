import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { fieldLabelStyle } from './uiStyles'

// Settings → Contact Types. Lets a company shape the "type" list used in the
// CRM (Contacts): rename, recolor, remove, reorder, or add their own
// (Photographer, Stylist, Label Contact…). Reads/writes org_contact_types
// directly — RLS lets owners/admins manage; everyone else sees it read-only.
//
// Note: Talent, Talent's Manager, and Company are DERIVED types (pulled live
// from the Talent/Brand records), so they aren't listed here — only the types
// a contact can actually be saved as.
const PALETTE = ['#5b7c99', '#A67C52', '#9B7A9B', '#8E7A5B', '#7A9B8E', '#4A6B7A', '#C77B5B', '#6E8B7A', '#8C877D', '#7E6B96', '#B08968', '#5F8A8B']

function slugify(s) {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32)
}

export default function ContactTypesManager({ orgId, dark, colors, canEdit = true }) {
  const { text, muted, subtle, border, border2, inputBg, card, accent = '#5b7c99' } = colors
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [adding, setAdding] = useState('')
  const [colorFor, setColorFor] = useState(null) // id whose swatch palette is open
  const dragRef = useRef(null)

  async function load() {
    const { data } = await supabase.from('org_contact_types')
      .select('id, key, label, color, position, is_system').eq('org_id', orgId).order('position')
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { if (orgId) load() }, [orgId])

  const flash = (m) => { setErr(m); setTimeout(() => setErr(''), 4000) }

  async function addType() {
    const label = adding.trim()
    if (!label) return
    let key = slugify(label)
    if (!key) { flash('Give it a name with at least one letter or number.'); return }
    if (rows.some(r => r.key === key)) { flash(`"${label}" already exists.`); return }
    setAdding('')
    const color = PALETTE[rows.length % PALETTE.length]
    const position = (rows.reduce((m, r) => Math.max(m, r.position), -1)) + 1
    const { error } = await supabase.from('org_contact_types').insert([{ org_id: orgId, key, label, color, position }])
    if (error) { flash(error.message); return }
    load()
  }
  async function commitRename(row) {
    const next = editVal.trim()
    setEditingId(null)
    if (!next || next === row.label) return
    const { error } = await supabase.from('org_contact_types').update({ label: next }).eq('id', row.id)
    if (error) { flash(error.message); return }
    load()
  }
  async function recolor(row, color) {
    setColorFor(null)
    if (color === row.color) return
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, color } : r))
    const { error } = await supabase.from('org_contact_types').update({ color }).eq('id', row.id)
    if (error) { flash(error.message); load() }
  }
  async function removeType(row) {
    if (row.is_system) { flash('Client is the default type and can’t be removed.'); return }
    if (!confirm(`Remove the "${row.label}" type? Contacts already set to it will show as "Other".`)) return
    const { error } = await supabase.from('org_contact_types').delete().eq('id', row.id)
    if (error) { flash(error.message); return }
    load()
  }
  async function persistOrder(ordered) {
    setRows(ordered)
    for (let i = 0; i < ordered.length; i++) {
      if (ordered[i].position !== i) await supabase.from('org_contact_types').update({ position: i }).eq('id', ordered[i].id)
    }
  }
  function onDrop(targetId) {
    const srcId = dragRef.current
    if (!srcId || srcId === targetId) return
    const arr = [...rows]
    const from = arr.findIndex(r => r.id === srcId), to = arr.findIndex(r => r.id === targetId)
    if (from < 0 || to < 0) return
    arr.splice(to, 0, arr.splice(from, 1)[0])
    persistOrder(arr)
  }

  const eyebrow = fieldLabelStyle(dark)

  if (loading) return <div style={{ fontSize: '12px', color: subtle }}>Loading…</div>

  return (
    <div style={{ maxWidth: '620px' }}>
      <div style={eyebrow}>Settings / Contact Types</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: text, margin: '8px 0 6px' }}>Contact Types</div>
      <div style={{ fontSize: '13px', color: muted, lineHeight: 1.6, marginBottom: '18px' }}>
        The categories you sort your Contacts into. Rename them, change their color, remove the ones you don’t use, and add your own. Talent, Talent’s Manager, and Company come from your roster and brands automatically, so they’re not listed here.
      </div>

      {!canEdit && (
        <div style={{ display: 'flex', gap: '9px', alignItems: 'center', fontSize: '12px', color: muted, background: dark ? 'rgba(91,124,153,0.12)' : '#EEF3F7', border: `0.5px solid ${dark ? '#33465a' : '#cddbe6'}`, borderRadius: '8px', padding: '11px 14px', marginBottom: '14px' }}>
          <span>🔒</span><span>Only owners and admins can change the contact types.</span>
        </div>
      )}
      {err && <div style={{ fontSize: '12px', color: '#c0392b', marginBottom: '10px' }}>{err}</div>}

      <div style={{ borderTop: `0.5px solid ${border}`, paddingTop: '18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rows.map(row => (
            <div key={row.id}
              draggable={canEdit}
              onDragStart={() => { dragRef.current = row.id }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(row.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: card, border: `0.5px solid ${border2}`, borderRadius: '8px', padding: '8px 10px', cursor: canEdit ? 'grab' : 'default' }}>
              {canEdit && <span style={{ color: subtle, fontSize: '12px', letterSpacing: '-2px' }} title='Drag to reorder'>⠿</span>}

              {/* color swatch */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => canEdit && setColorFor(o => o === row.id ? null : row.id)}
                  title={canEdit ? 'Change color' : ''}
                  style={{ width: '16px', height: '16px', borderRadius: '50%', background: row.color, border: `1.5px solid ${dark ? '#333' : '#fff'}`, boxShadow: '0 0 0 1px rgba(0,0,0,0.12)', cursor: canEdit ? 'pointer' : 'default', padding: 0 }} />
                {colorFor === row.id && (
                  <>
                    <div onClick={() => setColorFor(null)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                    <div style={{ position: 'absolute', top: '22px', left: 0, zIndex: 20, background: card, border: `0.5px solid ${border}`, borderRadius: '8px', boxShadow: '0 6px 18px rgba(0,0,0,0.22)', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', width: '168px' }}>
                      {PALETTE.map(c => (
                        <button key={c} onClick={() => recolor(row, c)} style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, border: c === row.color ? `2px solid ${text}` : `1.5px solid ${dark ? '#333' : '#fff'}`, boxShadow: '0 0 0 1px rgba(0,0,0,0.12)', cursor: 'pointer', padding: 0 }} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* label */}
              {editingId === row.id ? (
                <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(row); if (e.key === 'Escape') setEditingId(null) }}
                  onBlur={() => commitRename(row)} maxLength={28}
                  style={{ flex: 1, border: `0.5px solid ${border2}`, outline: 'none', background: inputBg, color: text, fontSize: '13px', borderRadius: '5px', padding: '5px 8px' }} />
              ) : (
                <span onDoubleClick={() => { if (canEdit) { setEditingId(row.id); setEditVal(row.label) } }}
                  title={canEdit ? 'Double-click to rename' : ''}
                  style={{ flex: 1, fontSize: '13px', color: text }}>{row.label}</span>
              )}

              {row.is_system && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: subtle, border: `0.5px solid ${border2}`, borderRadius: '4px', padding: '2px 6px' }}>Default</span>}
              {canEdit && !row.is_system && (
                <button onClick={() => removeType(row)} title='Remove'
                  style={{ border: 'none', background: 'transparent', color: subtle, cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 4px' }}>×</button>
              )}
            </div>
          ))}
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: 0, marginTop: '16px', maxWidth: '320px' }}>
            <input value={adding} onChange={e => setAdding(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addType() }}
              placeholder='Add a type… e.g. Photographer' maxLength={28}
              style={{ flex: 1, fontSize: '12.5px', color: text, background: inputBg, border: `0.5px dashed ${border2}`, borderRadius: '8px 0 0 8px', padding: '9px 12px', outline: 'none' }} />
            <button onClick={addType} style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff', background: accent, border: 'none', borderRadius: '0 8px 8px 0', padding: '9px 18px', cursor: 'pointer' }}>Add</button>
          </div>
        )}

        {canEdit && <div style={{ fontSize: '10.5px', color: subtle, marginTop: '16px' }}>Tip: double-click to rename · click the dot to recolor · drag the ⠿ handle to reorder.</div>}
      </div>
    </div>
  )
}
