import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Admin manager for the public roadmap, embedded in Settings > Product Updates.
// Only platform admins reach this (gated in SettingsView + enforced by RLS).
const STATUSES = [
  { key: 'under_review', label: 'Under Review', note: 'Private — only you see this' },
  { key: 'planned', label: 'Planned', note: 'Public — shown as coming soon' },
  { key: 'in_progress', label: 'In Progress', note: 'Public — shown as being built' },
  { key: 'shipped', label: 'Shipped', note: 'Public — shown with a date' },
  { key: 'declined', label: 'Declined', note: 'Private — never shown' },
]
const CATEGORIES = ['Feature', 'Improvement', 'Fix']

export default function ProductUpdatesAdmin({ dark = true, isMaster = false }) {
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const border2 = dark ? '#3A3A3A' : '#CCC7BF'
  const inputBg = dark ? '#141414' : '#F8F7F3'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const accent = '#5b7c99'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // id being edited
  const [draft, setDraft] = useState(null)      // edit form state
  const [adding, setAdding] = useState(false)
  const blankNew = { title: '', description: '', category: 'Feature', status: 'planned', shipped_at: '' }
  const [newItem, setNewItem] = useState(blankNew)
  const [saving, setSaving] = useState(false)

  const today = () => new Date().toISOString().slice(0, 10)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    if (isMaster) {
      // Master admin sees everything, including the Under Review queue.
      const { data } = await supabase.from('product_updates').select('*').order('created_at', { ascending: false })
      setItems(data || [])
    } else {
      // Everyone else sees the curated public roadmap only (read-only).
      const { data } = await supabase.rpc('get_public_updates')
      setItems(data || [])
    }
    setLoading(false)
  }

  // Ping the marketing Slack the first time an item becomes public.
  async function maybeAnnounce(item) {
    if (!item || item.announced_at) return
    if (!['planned', 'in_progress', 'shipped'].includes(item.status)) return
    try {
      await fetch('/.netlify/functions/slack-new-update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title, description: item.description || '' }),
      })
    } catch (_) { /* best-effort */ }
    await supabase.from('product_updates').update({ announced_at: new Date().toISOString() }).eq('id', item.id)
  }

  async function createItem() {
    if (!newItem.title.trim() || saving) return
    setSaving(true)
    const { data: u } = await supabase.auth.getUser()
    const payload = {
      title: newItem.title.trim(),
      description: newItem.description.trim() || null,
      category: newItem.category,
      status: newItem.status,
      shipped_at: newItem.status === 'shipped' ? (newItem.shipped_at || today()) : null,
      created_by: u?.user?.id || null,
    }
    const { data: inserted, error } = await supabase.from('product_updates').insert([payload]).select().single()
    setSaving(false)
    if (!error) {
      if (inserted) await maybeAnnounce(inserted)
      setNewItem(blankNew); setAdding(false); fetchAll()
    }
  }

  async function patchItem(id, patch) {
    setItems(items.map(i => i.id === id ? { ...i, ...patch } : i)) // optimistic
    await supabase.from('product_updates').update(patch).eq('id', id)
  }

  async function changeStatus(item, status) {
    const patch = { status }
    if (status === 'shipped' && !item.shipped_at) patch.shipped_at = today()
    if (status !== 'shipped') patch.shipped_at = null
    await patchItem(item.id, patch)
    await maybeAnnounce({ ...item, ...patch })
  }

  async function saveEdit() {
    if (!draft.title.trim()) return
    await patchItem(editing, {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      category: draft.category,
      shipped_at: draft.status === 'shipped' ? (draft.shipped_at || today()) : draft.shipped_at || null,
    })
    setEditing(null); setDraft(null)
  }

  async function deleteItem(id) {
    if (!window.confirm('Delete this update? This cannot be undone.')) return
    setItems(items.filter(i => i.id !== id))
    await supabase.from('product_updates').delete().eq('id', id)
  }

  const inputStyle = { width: '100%', background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '8px 10px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const selectStyle = { background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: text, outline: 'none' }
  const labelStyle = { fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: subtle, marginBottom: '6px' }
  const btn = (bg) => ({ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: bg, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' })

  // Non-master users (owners, admins, members, customers) get a read-only roadmap.
  if (!isMaster) {
    const PUBLIC_SECTIONS = [
      { key: 'in_progress', label: 'In Progress' },
      { key: 'planned', label: 'Planned' },
      { key: 'shipped', label: 'Shipped' },
    ]
    return (
      <div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '6px' }}>Product Updates</div>
        <div style={{ fontSize: '11px', color: subtle, lineHeight: 1.6, marginBottom: '14px' }}>What we're building and what's recently shipped. Have an idea or found a bug? Send it our way.</div>
        <a href='/updates' target='_blank' rel='noreferrer' style={{ display: 'inline-block', padding: '9px 16px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', background: accent, color: '#fff', borderRadius: '4px', textDecoration: 'none', fontWeight: 600, marginBottom: '24px' }}>+ Submit a request</a>
        {loading ? (
          <div style={{ fontSize: '11px', color: subtle }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ fontSize: '12px', color: muted }}>No updates to show yet — check back soon.</div>
        ) : PUBLIC_SECTIONS.map(sec => {
          const rows = items.filter(i => i.status === sec.key)
          if (rows.length === 0) return null
          return (
            <div key={sec.key} style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '14px', letterSpacing: '0.16em', textTransform: 'uppercase', color: text, fontWeight: 800, marginBottom: '12px' }}>{sec.label}</div>
              {rows.map(item => (
                <div key={item.id} style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '2px', padding: '12px 14px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: item.description ? '4px' : 0, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', color: subtle, border: `0.5px solid ${border2}`, padding: '2px 5px', borderRadius: '2px' }}>{item.category}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: text }}>{item.title}</span>
                    {item.status === 'shipped' && item.shipped_at && <span style={{ fontSize: '10px', color: subtle, marginLeft: 'auto' }}>{item.shipped_at}</span>}
                  </div>
                  {item.description && <div style={{ fontSize: '12px', color: muted, lineHeight: 1.5 }}>{item.description}</div>}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '6px' }}>Product Updates</div>
      <div style={{ fontSize: '11px', color: subtle, lineHeight: 1.6, marginBottom: '20px' }}>
        Manage the public roadmap shown at <a href='/updates' target='_blank' rel='noreferrer' style={{ color: accent }}>h-que.com/updates</a>. Items set to Planned, In Progress, or Shipped are public; Under Review and Declined stay private.
      </div>

      {/* New item */}
      {!adding ? (
        <button onClick={() => setAdding(true)} style={{ ...btn(accent), marginBottom: '24px' }}>+ New Update</button>
      ) : (
        <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '2px', padding: '18px', marginBottom: '24px' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={labelStyle}>Title</div>
            <input value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} placeholder='What changed or is coming' style={inputStyle} autoFocus />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={labelStyle}>Description</div>
            <textarea value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder='A plain-English line customers will read' rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '14px' }}>
            <div>
              <div style={labelStyle}>Category</div>
              <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} style={selectStyle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Status</div>
              <select value={newItem.status} onChange={e => setNewItem({ ...newItem, status: e.target.value })} style={selectStyle}>
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            {newItem.status === 'shipped' && (
              <div>
                <div style={labelStyle}>Shipped date</div>
                <input type='date' value={newItem.shipped_at} onChange={e => setNewItem({ ...newItem, shipped_at: e.target.value })} style={selectStyle} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={createItem} disabled={saving || !newItem.title.trim()} style={{ ...btn(accent), opacity: saving || !newItem.title.trim() ? 0.5 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => { setAdding(false); setNewItem(blankNew) }} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: '11px', color: subtle }}>Loading…</div>
      ) : (
        STATUSES.map(sec => {
          const rows = items.filter(i => i.status === sec.key)
          if (rows.length === 0) return null
          return (
            <div key={sec.key} style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '14px', letterSpacing: '0.16em', textTransform: 'uppercase', color: text, fontWeight: 800, marginBottom: '2px' }}>{sec.label} <span style={{ color: subtle, fontWeight: 400, fontSize: '10px' }}>· {rows.length}</span></div>
              <div style={{ fontSize: '10px', color: subtle, marginBottom: '10px' }}>{sec.note}</div>
              {rows.map(item => (
                <div key={item.id} style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '2px', padding: '12px 14px', marginBottom: '8px' }}>
                  {editing === item.id ? (
                    <div>
                      <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} style={{ ...inputStyle, marginBottom: '8px' }} />
                      <textarea value={draft.description || ''} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: '8px' }} />
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
                        <select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} style={selectStyle}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {draft.status === 'shipped' && (
                          <input type='date' value={draft.shipped_at || ''} onChange={e => setDraft({ ...draft, shipped_at: e.target.value })} style={selectStyle} />
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={saveEdit} style={btn(accent)}>Save</button>
                        <button onClick={() => { setEditing(null); setDraft(null) }} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: item.description ? '4px' : '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', color: subtle, border: `0.5px solid ${border2}`, padding: '2px 5px', borderRadius: '2px' }}>{item.category}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: text }}>{item.title}</span>
                        {(item.vote_count || 0) > 0 && <span style={{ fontSize: '10px', color: accent, fontWeight: 600 }}>▲ {item.vote_count}</span>}
                        {item.source === 'customer' && <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C77B5B' }}>· from customer</span>}
                        {item.status === 'shipped' && item.shipped_at && <span style={{ fontSize: '10px', color: subtle, marginLeft: 'auto' }}>{item.shipped_at}</span>}
                      </div>
                      {item.description && <div style={{ fontSize: '12px', color: muted, lineHeight: 1.5, marginBottom: '8px' }}>{item.description}</div>}
                      {(item.area || item.screenshot_url || item.submitter_email) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '10px', color: subtle }}>
                          {item.area && <span>Area: <span style={{ color: muted }}>{item.area}</span></span>}
                          {item.screenshot_url && <a href={item.screenshot_url} target='_blank' rel='noreferrer' style={{ color: accent }}>View screenshot ↗</a>}
                          {item.submitter_email && <span>{item.submitter_name ? item.submitter_name + ' · ' : ''}{item.submitter_email}</span>}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <select value={item.status} onChange={e => changeStatus(item, e.target.value)} style={selectStyle}>
                          {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                        <button onClick={() => { setEditing(item.id); setDraft({ title: item.title, description: item.description, category: item.category, status: item.status, shipped_at: item.shipped_at }) }} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: 0 }}>Edit</button>
                        <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: 0 }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
