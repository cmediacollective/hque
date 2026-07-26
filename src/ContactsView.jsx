import { useState, useMemo, useEffect } from 'react'
import { supabase } from './supabase'
import { useCachedResource } from './useCachedResource'
import { cacheSet } from './dataCache'
import { ListSkeleton } from './Skeletons'
import { fieldLabelStyle } from './uiStyles'
import { planLimits } from './plans'
import ExpandableTextarea from './ExpandableTextarea'

// The contact "kinds" and their colors (pulled from HQue's brand palette so
// they feel native). Order here is the order the filter chips render in.
const TYPES = [
  { key: 'client', label: 'Client', color: '#5b7c99' },
  { key: 'prospect', label: 'Prospect', color: '#A67C52' },
  { key: 'manager', label: 'Manager', color: '#7A9B8E' },
  { key: 'press', label: 'Press', color: '#9B7A9B' },
  { key: 'vendor', label: 'Vendor', color: '#8E7A5B' },
  { key: 'other', label: 'Other', color: '#8C877D' },
]
const TYPE = Object.fromEntries(TYPES.map(t => [t.key, t]))

function initials(name) {
  const p = (name || '?').trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?'
}
function timeAgo(ts) {
  if (!ts) return '—'
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)
  if (d <= 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  if (d < 30) return `${Math.floor(d / 7)} week${d < 14 ? '' : 's'} ago`
  if (d < 365) return `${Math.floor(d / 30)} month${d < 60 ? '' : 's'} ago`
  return `${Math.floor(d / 365)} year${d < 730 ? '' : 's'} ago`
}

export default function ContactsView({ dark = true, orgId, isMobile = false, focusVersion = 0, stripePlan }) {
  const bg = dark ? '#141414' : '#F8F7F3'
  const card = dark ? '#1E1E1E' : '#FFFFFF'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#A5A099' : '#666'
  const subtle = dark ? '#7C776F' : '#888'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const border2 = dark ? '#3A3A3A' : '#CCC7BF'
  const inputBg = dark ? '#141414' : '#FFFFFF'
  const accent = '#5b7c99'
  const label = fieldLabelStyle(dark)
  const cardShadow = dark ? '0 1px 3px rgba(0,0,0,0.45)' : '0 1px 2px rgba(0,0,0,0.04), 0 3px 10px rgba(0,0,0,0.07)'

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)   // draft object when adding/editing
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [showLimit, setShowLimit] = useState(false)
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)

  const limit = planLimits(stripePlan).contacts

  const cacheKey = orgId ? `contacts:${orgId}` : null
  const { data, status, refetch, setData } = useCachedResource(cacheKey, async () => {
    const { data, error } = await supabase
      .from('brand_contacts')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  })
  const contacts = data || []
  const loading = status === 'loading'

  // Reference lists: brands (to show/choose the linked client) + team members
  // (owner). Fetched once per org.
  const [brands, setBrands] = useState([])
  const [members, setMembers] = useState([])
  useEffect(() => {
    if (!orgId) return
    supabase.from('brands').select('id, name, logo_url').eq('org_id', orgId).order('name').then(({ data }) => setBrands(data || []))
    supabase.rpc('org_team', { p_org_id: orgId }).then(({ data }) => setMembers(data || []))
  }, [orgId])
  useEffect(() => { if (focusVersion > 0) refetch() }, [focusVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const brandName = (id) => brands.find(b => b.id === id)?.name || ''
  const memberName = (id) => { const m = members.find(x => x.id === id); return m ? (m.full_name || m.email) : '' }
  const companyOf = (c) => c.company || brandName(c.brand_id) || ''

  const counts = useMemo(() => {
    const out = { all: contacts.length }
    for (const t of TYPES) out[t.key] = 0
    for (const c of contacts) out[c.type || 'other'] = (out[c.type || 'other'] || 0) + 1
    return out
  }, [contacts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contacts.filter(c => {
      if (typeFilter !== 'all' && (c.type || 'other') !== typeFilter) return false
      if (!q) return true
      return [c.name, c.title, companyOf(c), c.email, c.phone].filter(Boolean).some(v => v.toLowerCase().includes(q))
    })
  }, [contacts, search, typeFilter, brands]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the open detail in sync with fresh data.
  useEffect(() => {
    if (selected) setSelected(s => contacts.find(c => c.id === s.id) || null)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps
  // Close the quick type menu whenever you switch to a different contact.
  useEffect(() => { setTypeMenuOpen(false) }, [selected?.id])

  function startAdd() {
    if (limit !== Infinity && contacts.length >= limit) { setShowLimit(true); return }
    setFormError('')
    setEditing({ name: '', title: '', company: '', type: 'client', email: '', phone: '', brand_id: '', owner_user_id: '', tags: '', notes: '', last_contacted_at: '' })
  }
  function startEdit(c) {
    setFormError('')
    setEditing({ ...c, brand_id: c.brand_id || '', owner_user_id: c.owner_user_id || '', tags: (c.tags || []).join(', '), last_contacted_at: c.last_contacted_at ? c.last_contacted_at.slice(0, 10) : '' })
  }

  async function saveContact() {
    const d = editing
    if (!d.name?.trim() && !d.email?.trim()) { setFormError('Add at least a name or an email.'); return }
    setSaving(true); setFormError('')
    const row = {
      name: d.name?.trim() || null,
      title: d.title?.trim() || null,
      company: d.company?.trim() || null,
      type: d.type || 'client',
      email: d.email?.trim() || null,
      phone: d.phone?.trim() || null,
      brand_id: d.brand_id || null,
      owner_user_id: d.owner_user_id || null,
      tags: (d.tags || '').split(',').map(s => s.trim()).filter(Boolean),
      notes: d.notes?.trim() || null,
      last_contacted_at: d.last_contacted_at || null,
    }
    let error, saved
    if (d.id) {
      ({ data: saved, error } = await supabase.from('brand_contacts').update(row).eq('id', d.id).select().single())
    } else {
      ({ data: saved, error } = await supabase.from('brand_contacts').insert([{ ...row, org_id: orgId }]).select().single())
    }
    setSaving(false)
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('limit reached')) { setEditing(null); setShowLimit(true); return }
      if (msg.includes('does not exist') || msg.includes('schema cache') || error.code === '42P01' || error.code === 'PGRST205') {
        setFormError("The contacts table isn't set up in Supabase yet. Run the SQL Claude sent, then try again.")
        return
      }
      setFormError('Could not save: ' + (error.message || 'unknown error'))
      return
    }
    // Update local + cache so it appears without a full refetch.
    const next = d.id ? contacts.map(c => c.id === saved.id ? saved : c) : [saved, ...contacts]
    setData(next); if (cacheKey) cacheSet(cacheKey, next)
    setEditing(null)
    setSelected(saved)
  }

  async function deleteContact(c) {
    if (!confirm(`Delete ${c.name || c.email || 'this contact'}? This can't be undone.`)) return
    const { error } = await supabase.from('brand_contacts').delete().eq('id', c.id)
    if (error) { alert('Could not delete: ' + error.message); return }
    const next = contacts.filter(x => x.id !== c.id)
    setData(next); if (cacheKey) cacheSet(cacheKey, next)
    if (selected?.id === c.id) setSelected(null)
  }

  async function changeType(c, newType) {
    if (newType === c.type) return
    const { data: saved, error } = await supabase.from('brand_contacts').update({ type: newType }).eq('id', c.id).select().single()
    if (error) { alert('Could not update type: ' + error.message); return }
    const next = contacts.map(x => x.id === saved.id ? saved : x)
    setData(next); if (cacheKey) cacheSet(cacheKey, next)
    setSelected(saved)
  }

  async function logContactToday(c) {
    const iso = new Date().toISOString()
    const { data: saved, error } = await supabase.from('brand_contacts').update({ last_contacted_at: iso }).eq('id', c.id).select().single()
    if (error) { alert('Could not update: ' + error.message); return }
    const next = contacts.map(x => x.id === saved.id ? saved : x)
    setData(next); if (cacheKey) cacheSet(cacheKey, next)
    setSelected(saved)
  }

  // ── shared bits ────────────────────────────────────────────────────────────
  const avatar = (c, size = 34) => (
    <span style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 600, color: '#fff', background: (TYPE[c.type] || TYPE.other).color }}>{initials(c.name || c.email)}</span>
  )
  const pill = (t) => { const T = TYPE[t] || TYPE.other; return (
    <span style={{ fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, padding: '3px 9px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: T.color, background: T.color + (dark ? '22' : '14'), border: `1px solid ${T.color}33` }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.color }} />{T.label}
    </span>
  ) }

  const inputStyle = { width: '100%', background: inputBg, border: `1px solid ${border2}`, borderRadius: '6px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box' }

  const pct = limit === Infinity ? 0 : Math.min(100, Math.round((contacts.length / limit) * 100))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: bg }}>
      {/* toolbar: meter + search + filters + add */}
      <div style={{ padding: isMobile ? '12px 14px' : '14px 28px', borderBottom: `0.5px solid ${border}`, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: text, fontVariantNumeric: 'tabular-nums' }}>{loading ? '—' : contacts.length}{limit !== Infinity && <span style={{ color: subtle, fontWeight: 400 }}> / {limit.toLocaleString()}</span>}</span>
              <span style={{ ...label, fontSize: '10px' }}>contacts</span>
            </div>
            {limit !== Infinity && (
              <div style={{ height: '5px', borderRadius: '4px', background: border, overflow: 'hidden', marginTop: '5px', width: '170px' }}>
                <div style={{ height: '100%', width: pct + '%', background: pct > 90 ? '#C77B5B' : accent, borderRadius: '4px' }} />
              </div>
            )}
          </div>
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: subtle, fontSize: '13px', pointerEvents: 'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search name, company, email, phone…'
            style={{ ...inputStyle, paddingLeft: '32px', boxShadow: cardShadow }} />
        </div>
        <button onClick={startAdd} style={{ padding: '9px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', boxShadow: '0 2px 8px rgba(91,124,153,0.4)', whiteSpace: 'nowrap' }}>+ Contact</button>
      </div>

      {/* type filter chips */}
      <div style={{ padding: isMobile ? '10px 14px' : '10px 28px', borderBottom: `0.5px solid ${border}`, display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
        {[{ key: 'all', label: 'All', color: null }, ...TYPES].map(t => {
          const active = typeFilter === t.key
          const n = counts[t.key] || 0
          if (t.key !== 'all' && n === 0 && !active) return null
          return (
            <button key={t.key} onClick={() => setTypeFilter(t.key)} style={{ fontSize: '11px', letterSpacing: '0.4px', padding: '6px 12px', borderRadius: '999px', border: `1px solid ${active ? accent : border}`, background: active ? accent : card, color: active ? '#fff' : muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
              {t.color && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: t.color }} />}
              {t.label} <span style={{ fontSize: '10px', color: active ? 'rgba(255,255,255,0.75)' : subtle, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
            </button>
          )
        })}
      </div>

      {loading && <ListSkeleton dark={dark} rows={7} />}
      {status === 'error' && (
        <div style={{ padding: '60px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: muted, marginBottom: '12px' }}>Couldn't load contacts.</div>
          <button onClick={() => refetch()} style={{ padding: '7px 16px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px' }}>Retry</button>
        </div>
      )}

      {status === 'success' && contacts.length === 0 && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>No contacts yet</div>
          <div style={{ fontSize: '12px', color: muted, marginBottom: '18px' }}>Add clients, prospects, managers, press, and vendors — all in one place.</div>
          <button onClick={startAdd} style={{ padding: '9px 18px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px' }}>+ Add your first contact</button>
        </div>
      )}

      {status === 'success' && contacts.length > 0 && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: (selected && !isMobile) ? '1fr 384px' : '1fr', minHeight: 0 }}>
          {/* table */}
          <div style={{ overflowY: 'auto', padding: isMobile ? '8px 8px 100px' : '10px 16px 100px 28px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: muted, fontSize: '13px' }}>Nothing matched. Try a different search or filter.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Name', 'Company', 'Type', 'Email', 'Owner', 'Last contact'].map((h, i) => (
                      <th key={h} style={{ ...label, textAlign: 'left', padding: '6px 12px 10px', borderBottom: `0.5px solid ${border}`, display: (isMobile && i > 2) ? 'none' : undefined }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} onClick={() => setSelected(c)} style={{ cursor: 'pointer', borderBottom: `0.5px solid ${dark ? '#242424' : '#EEE9E1'}`, background: selected?.id === c.id ? (dark ? 'rgba(91,124,153,0.18)' : 'rgba(91,124,153,0.1)') : 'transparent', boxShadow: selected?.id === c.id ? `inset 2px 0 0 ${accent}` : 'none' }}
                      onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = dark ? 'rgba(91,124,153,0.1)' : 'rgba(91,124,153,0.06)' }}
                      onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = 'transparent' }}>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                          {avatar(c)}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13.5px', color: text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || '—'}</div>
                            {c.title && <div style={{ fontSize: '11.5px', color: subtle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 12px', display: isMobile ? 'none' : undefined }}><span style={{ fontSize: '13px', color: text }}>{companyOf(c) || <span style={{ color: subtle }}>—</span>}</span></td>
                      <td style={{ padding: '11px 12px' }}>{pill(c.type)}</td>
                      <td style={{ padding: '11px 12px', display: isMobile ? 'none' : undefined }}><span style={{ fontSize: '12.5px', color: muted }}>{c.email || '—'}</span></td>
                      <td style={{ padding: '11px 12px', display: isMobile ? 'none' : undefined }}><span style={{ fontSize: '12.5px', color: muted }}>{memberName(c.owner_user_id) || <span style={{ color: subtle }}>—</span>}</span></td>
                      <td style={{ padding: '11px 12px', display: isMobile ? 'none' : undefined }}><span style={{ fontSize: '12px', color: subtle, whiteSpace: 'nowrap' }}>{timeAgo(c.last_contacted_at)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* detail panel (desktop) */}
          {selected && !isMobile && (
            <div style={{ borderLeft: `0.5px solid ${border}`, overflowY: 'auto', padding: '20px 22px 60px', background: card }}>
              {detailPanel(selected)}
            </div>
          )}
        </div>
      )}

      {/* detail as modal on mobile */}
      {selected && isMobile && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: card, width: '100%', maxHeight: '88vh', overflowY: 'auto', borderRadius: '14px 14px 0 0', padding: '20px 18px 40px' }}>{detailPanel(selected)}</div>
        </div>
      )}

      {/* add / edit modal */}
      {editing && (
        <div onClick={() => !saving && setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '10px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '19px', color: text, marginBottom: '18px' }}>{editing.id ? 'Edit contact' : 'New contact'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div><div style={{ ...label, marginBottom: '6px' }}>Name</div><input value={editing.name} onChange={e => setEditing(d => ({ ...d, name: e.target.value }))} style={inputStyle} autoFocus /></div>
              <div><div style={{ ...label, marginBottom: '6px' }}>Title / role</div><input value={editing.title} onChange={e => setEditing(d => ({ ...d, title: e.target.value }))} placeholder='e.g. Marketing Lead' style={inputStyle} /></div>
              <div><div style={{ ...label, marginBottom: '6px' }}>Type</div>
                <select value={editing.type} onChange={e => setEditing(d => ({ ...d, type: e.target.value }))} style={inputStyle}>
                  {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div><div style={{ ...label, marginBottom: '6px' }}>Company</div><input value={editing.company} onChange={e => setEditing(d => ({ ...d, company: e.target.value }))} placeholder='Company name' style={inputStyle} /></div>
              <div><div style={{ ...label, marginBottom: '6px' }}>Email</div><input value={editing.email} onChange={e => setEditing(d => ({ ...d, email: e.target.value }))} type='email' style={inputStyle} /></div>
              <div><div style={{ ...label, marginBottom: '6px' }}>Phone</div><input value={editing.phone} onChange={e => setEditing(d => ({ ...d, phone: e.target.value }))} style={inputStyle} /></div>
              <div><div style={{ ...label, marginBottom: '6px' }}>Linked client <span style={{ textTransform: 'none', letterSpacing: 0, color: subtle }}>(optional)</span></div>
                <select value={editing.brand_id} onChange={e => setEditing(d => ({ ...d, brand_id: e.target.value }))} style={inputStyle}>
                  <option value=''>None — standalone contact</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div><div style={{ ...label, marginBottom: '6px' }}>Owner</div>
                <select value={editing.owner_user_id} onChange={e => setEditing(d => ({ ...d, owner_user_id: e.target.value }))} style={inputStyle}>
                  <option value=''>Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
                </select>
              </div>
              <div><div style={{ ...label, marginBottom: '6px' }}>Tags <span style={{ textTransform: 'none', letterSpacing: 0, color: subtle }}>(comma‑separated)</span></div><input value={editing.tags} onChange={e => setEditing(d => ({ ...d, tags: e.target.value }))} placeholder='VIP, Decision‑maker' style={inputStyle} /></div>
              <div><div style={{ ...label, marginBottom: '6px' }}>Last contacted</div><input type='date' value={editing.last_contacted_at} onChange={e => setEditing(d => ({ ...d, last_contacted_at: e.target.value }))} style={inputStyle} /></div>
            </div>
            <div style={{ marginTop: '14px' }}>
              <div style={{ ...label, marginBottom: '6px' }}>Notes</div>
              <ExpandableTextarea dark={dark} value={editing.notes} onChange={e => setEditing(d => ({ ...d, notes: e.target.value }))} placeholder='Anything worth remembering about this contact…' style={{ ...inputStyle, minHeight: '70px', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            {formError && <div style={{ fontSize: '11.5px', color: '#c0392b', marginTop: '12px', lineHeight: 1.5 }}>{formError}</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={saveContact} disabled={saving} style={{ padding: '9px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add contact'}</button>
              <button onClick={() => setEditing(null)} disabled={saving} style={{ padding: '9px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '6px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* limit-reached modal */}
      {showLimit && (
        <div onClick={() => setShowLimit(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '10px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', width: '100%', maxWidth: '420px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: text, marginBottom: '10px' }}>You've reached your contact limit</div>
            <div style={{ fontSize: '13px', color: muted, lineHeight: 1.6, marginBottom: '20px' }}>Your plan includes up to {limit === Infinity ? 'unlimited' : limit.toLocaleString()} contacts. Upgrade to add more — Pro raises this to 5,000 and Business is unlimited.</div>
            <button onClick={() => setShowLimit(false)} style={{ padding: '9px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px' }}>Got it</button>
          </div>
        </div>
      )}
    </div>
  )

  // ── detail panel renderer ──────────────────────────────────────────────────
  function detailPanel(c) {
    const kv = (lbl, val) => val ? (
      <div><div style={{ ...label, marginBottom: '3px' }}>{lbl}</div><div style={{ fontSize: '13.5px', color: text }}>{val}</div></div>
    ) : null
    const linkedBrand = brands.find(b => b.id === c.brand_id)
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {avatar(c, 52)}
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '19px', color: text }}>{c.name || c.email || 'Contact'}</div>
              <div style={{ fontSize: '12.5px', color: subtle, marginTop: '2px' }}>{[c.title, companyOf(c)].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <button onClick={() => setSelected(null)} title='Close' style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ margin: '12px 0 4px', position: 'relative', display: 'inline-block' }}>
          <button onClick={() => setTypeMenuOpen(o => !o)} title='Click to change type' style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            {pill(c.type)}<span style={{ fontSize: '9px', color: subtle }}>▾</span>
          </button>
          {typeMenuOpen && (
            <>
              <div onClick={() => setTypeMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
              <div style={{ position: 'absolute', top: '28px', left: 0, zIndex: 20, background: card, border: `0.5px solid ${border}`, borderRadius: '6px', boxShadow: '0 6px 18px rgba(0,0,0,0.22)', padding: '4px', minWidth: '160px' }}>
                <div style={{ ...label, padding: '5px 9px 4px' }}>Change type to</div>
                {TYPES.map(t => (
                  <button key={t.key} onClick={() => { changeType(c, t.key); setTypeMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', textAlign: 'left', background: c.type === t.key ? (dark ? '#242424' : '#F1EFEA') : 'none', border: 'none', padding: '8px 9px', borderRadius: '4px', cursor: 'pointer', fontSize: '12.5px', color: text }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.color }} />{t.label}
                    {c.type === t.key && <span style={{ marginLeft: 'auto', color: accent, fontSize: '11px' }}>✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', margin: '16px 0 22px', flexWrap: 'wrap' }}>
          <button onClick={() => logContactToday(c)} style={{ padding: '8px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px' }}>Log contact today</button>
          <button onClick={() => startEdit(c)} style={{ padding: '8px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '6px' }}>Edit</button>
          {c.email && <a href={`mailto:${c.email}`} style={{ padding: '8px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '6px', textDecoration: 'none' }}>Email</a>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {c.email && <div><div style={{ ...label, marginBottom: '3px' }}>Email</div><a href={`mailto:${c.email}`} style={{ fontSize: '13.5px', color: accent, textDecoration: 'none' }}>{c.email}</a></div>}
          {c.phone && <div><div style={{ ...label, marginBottom: '3px' }}>Phone</div><div style={{ fontSize: '13.5px', color: text, fontVariantNumeric: 'tabular-nums' }}>{c.phone}</div></div>}
          {kv('Company', c.company || (linkedBrand ? linkedBrand.name : null))}
          <div><div style={{ ...label, marginBottom: '3px' }}>Linked to</div>
            {linkedBrand
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 10px', borderRadius: '6px', border: `0.5px solid ${border}`, background: card, fontSize: '12.5px', color: text, boxShadow: cardShadow }}><span style={{ width: '18px', height: '18px', borderRadius: '4px', background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700 }}>{initials(linkedBrand.name)}</span>{linkedBrand.name}</span>
              : <span style={{ fontSize: '12.5px', color: subtle }}>Not linked to a client — a standalone contact</span>}
          </div>
          {c.tags?.length > 0 && <div><div style={{ ...label, marginBottom: '5px' }}>Tags</div><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{c.tags.map((t, i) => <span key={i} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '999px', background: dark ? 'rgba(91,124,153,0.22)' : 'rgba(91,124,153,0.12)', color: accent, fontWeight: 500 }}>{t}</span>)}</div></div>}
          {kv('Owner', memberName(c.owner_user_id))}
          <div><div style={{ ...label, marginBottom: '3px' }}>Last contacted</div><div style={{ fontSize: '13.5px', color: text }}>{timeAgo(c.last_contacted_at)}</div></div>
        </div>
        {c.notes && <><div style={{ height: '0.5px', background: border, margin: '20px 0' }} /><div style={{ ...label, marginBottom: '8px' }}>Notes</div><div style={{ fontSize: '13px', color: muted, lineHeight: 1.6, background: bg, border: `0.5px solid ${dark ? '#262626' : '#E7E3DC'}`, borderRadius: '6px', padding: '12px 14px', whiteSpace: 'pre-wrap' }}>{c.notes}</div></>}
        <div style={{ height: '0.5px', background: border, margin: '20px 0' }} />
        <button onClick={() => deleteContact(c)} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: '#c0392b', cursor: 'pointer', borderRadius: '6px' }}>Delete contact</button>
      </div>
    )
  }
}
