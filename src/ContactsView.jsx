import { useState, useMemo, useEffect } from 'react'
import { supabase } from './supabase'
import { useCachedResource } from './useCachedResource'
import { cacheSet } from './dataCache'
import { ListSkeleton } from './Skeletons'
import { fieldLabelStyle } from './uiStyles'
import { planLimits } from './plans'
import ExpandableTextarea from './ExpandableTextarea'

// Fallback set, used only if a company somehow has no saved types yet. Once the
// CRM migration has run every org is seeded, so this is just a safety net.
const DEFAULT_TYPES = [
  { key: 'client', label: 'Client', color: '#5b7c99' },
  { key: 'prospect', label: 'Prospect', color: '#A67C52' },
  { key: 'press', label: 'Press', color: '#9B7A9B' },
  { key: 'vendor', label: 'Vendor', color: '#8E7A5B' },
  { key: 'other', label: 'Other', color: '#8C877D' },
]
// Derived, display-only types — pulled live from Talent/Brand records, never
// stored on a contact, so they can't be chosen when creating a real contact.
const DERIVED = {
  talent:  { key: 'talent',  label: 'Talent',            color: '#4A6B7A' },
  manager: { key: 'manager', label: "Talent's Manager",  color: '#7A9B8E' },
  company: { key: 'company', label: 'Company',           color: '#37505E' },
}

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

  const [view, setView] = useState('people')       // 'people' | 'companies'
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [companyFilter, setCompanyFilter] = useState('all')  // all | has | none
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

  // Reference lists: this org's custom contact types, brands (companies + the
  // linked-client picker), team members (owner), and talent (for the live rows).
  const [orgTypes, setOrgTypes] = useState(null)   // null = not loaded yet
  const [brands, setBrands] = useState([])
  const [members, setMembers] = useState([])
  const [creators, setCreators] = useState([])
  function fetchBrands() {
    supabase.from('brands').select('id, name, logo_url, website, phone').eq('org_id', orgId).order('name').then(({ data }) => setBrands(data || []))
  }
  function fetchCreators() {
    supabase.from('creators').select('id, name, contact_email, manager_name, manager_email, niches, manager_user_id')
      .eq('org_id', orgId).eq('status', 'active').then(({ data }) => setCreators(data || []))
  }
  function fetchTypes() {
    supabase.from('org_contact_types').select('key, label, color, position').eq('org_id', orgId).order('position')
      .then(({ data }) => setOrgTypes(data && data.length ? data : DEFAULT_TYPES))
  }
  useEffect(() => {
    if (!orgId) return
    fetchTypes(); fetchBrands()
    supabase.rpc('org_team', { p_org_id: orgId }).then(({ data }) => setMembers(data || []))
    fetchCreators()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (focusVersion > 0) { refetch(); fetchCreators(); fetchBrands(); fetchTypes() } }, [focusVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // The types a real contact can be saved as (custom, per company).
  const storableTypes = orgTypes || DEFAULT_TYPES
  // key → { label, color } for every type we might render (storable + derived).
  const TYPE = useMemo(() => {
    const m = {}
    for (const t of storableTypes) m[t.key] = t
    for (const t of Object.values(DERIVED)) m[t.key] = t
    return m
  }, [storableTypes])

  // Talent + their managers, surfaced live from the Talent records (never stored
  // here, so they can't drift and don't count toward the contact limit). Their
  // shared fields (name, email) write back to the creator record when edited.
  const derived = useMemo(() => {
    const out = []
    for (const cr of creators) {
      out.push({ id: 'talent:' + cr.id, _src: 'talent', _creatorId: cr.id, name: cr.name, title: 'Talent', company: '', type: 'talent', email: cr.contact_email || null, phone: null, tags: cr.niches || [], owner_user_id: cr.manager_user_id || null, brand_id: null, notes: null, last_contacted_at: null })
      if ((cr.manager_name || '').trim() || (cr.manager_email || '').trim()) {
        out.push({ id: 'manager:' + cr.id, _src: 'manager', _creatorId: cr.id, _forTalent: cr.name, name: cr.manager_name || 'Manager', title: cr.name ? `Manager · ${cr.name}` : 'Manager', company: '', type: 'manager', email: cr.manager_email || null, phone: null, tags: [], owner_user_id: null, brand_id: null, notes: null, last_contacted_at: null })
      }
    }
    return out
  }, [creators])

  const brandName = (id) => brands.find(b => b.id === id)?.name || ''
  const memberName = (id) => { const m = members.find(x => x.id === id); return m ? (m.full_name || m.email) : '' }
  const companyOf = (c) => c.company || brandName(c.brand_id) || ''

  // Every brand shown as a live "Company" row (editable → writes back to the
  // brand; a brand with no people still appears).
  const companyRows = useMemo(() => brands.map(b => ({
    id: 'company:' + b.id, _src: 'company', _brandId: b.id, name: b.name, title: 'Company', company: '',
    type: 'company', email: null, phone: b.phone || null, website: b.website || null, tags: [],
    owner_user_id: null, brand_id: null, notes: null, last_contacted_at: null,
    _peopleCount: contacts.filter(c => c.brand_id === b.id).length,
  })), [brands, data]) // eslint-disable-line react-hooks/exhaustive-deps

  // People = real contacts + the live talent/manager rows.
  const peopleRows = useMemo(() => [...contacts, ...derived], [data, derived]) // eslint-disable-line react-hooks/exhaustive-deps

  // People-view type chips: the storable types, then Talent & Talent's Manager.
  const peopleTypeChips = useMemo(() => [...storableTypes, DERIVED.talent, DERIVED.manager], [storableTypes])
  const counts = useMemo(() => {
    const out = { all: peopleRows.length }
    for (const t of peopleTypeChips) out[t.key] = 0
    for (const c of peopleRows) out[c.type || 'other'] = (out[c.type || 'other'] || 0) + 1
    return out
  }, [peopleRows, peopleTypeChips])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (view === 'companies') {
      return companyRows.filter(c => {
        if (companyFilter === 'has' && c._peopleCount === 0) return false
        if (companyFilter === 'none' && c._peopleCount > 0) return false
        if (!q) return true
        return [c.name, c.website, c.phone].filter(Boolean).some(v => v.toLowerCase().includes(q))
      })
    }
    return peopleRows.filter(c => {
      if (typeFilter !== 'all' && (c.type || 'other') !== typeFilter) return false
      if (!q) return true
      return [c.name, c.title, companyOf(c), c.email, c.phone].filter(Boolean).some(v => v.toLowerCase().includes(q))
    })
  }, [view, peopleRows, companyRows, search, typeFilter, companyFilter, brands]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep an open real-contact detail in sync with fresh data. (Talent/manager/
  // company rows are derived and reconciled through their own refetch.)
  useEffect(() => {
    if (selected && !selected._src) setSelected(s => contacts.find(c => c.id === s.id) || null)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTypeMenuOpen(false) }, [selected?.id])

  function switchView(v) {
    if (v === view) return
    setView(v); setSelected(null); setSearch(''); setTypeFilter('all'); setCompanyFilter('all')
  }

  function startAdd() {
    if (limit !== Infinity && contacts.length >= limit) { setShowLimit(true); return }
    setFormError('')
    setEditing({ name: '', title: '', company: '', type: storableTypes[0]?.key || 'client', email: '', phone: '', brand_id: '', owner_user_id: '', tags: '', notes: '', last_contacted_at: '' })
  }
  function startEdit(c) {
    setFormError('')
    setEditing({ ...c, brand_id: c.brand_id || '', owner_user_id: c.owner_user_id || '', tags: (c.tags || []).join(', '), last_contacted_at: c.last_contacted_at ? c.last_contacted_at.slice(0, 10) : '' })
  }

  async function saveContact() {
    const d = editing
    if (!d.name?.trim() && !d.email?.trim() && d._src !== 'company') { setFormError('Add at least a name or an email.'); return }

    // Company rows aren't stored here — write straight back to the brand.
    if (d._src === 'company') {
      if (!d.name?.trim()) { setFormError('A company needs a name.'); return }
      setSaving(true); setFormError('')
      let site = (d.website || '').trim()
      if (site && !/^https?:\/\//i.test(site)) site = 'https://' + site
      const { error } = await supabase.from('brands').update({ name: d.name.trim(), website: site || null, phone: d.phone?.trim() || null }).eq('id', d._brandId)
      setSaving(false)
      if (error) { setFormError('Could not save: ' + error.message); return }
      fetchBrands()
      setSelected(s => (s && s.id === d.id) ? { ...s, name: d.name, website: site || null, phone: d.phone } : s)
      setEditing(null)
      return
    }
    // Talent / manager rows write the shared fields back to the talent record.
    if (d._src) {
      setSaving(true); setFormError('')
      const patch = d._src === 'talent'
        ? { name: d.name?.trim() || null, contact_email: d.email?.trim() || null }
        : { manager_name: d.name?.trim() || null, manager_email: d.email?.trim() || null }
      const { error } = await supabase.from('creators').update(patch).eq('id', d._creatorId)
      setSaving(false)
      if (error) { setFormError('Could not save: ' + error.message); return }
      fetchCreators()
      setSelected(s => (s && s.id === d.id) ? { ...s, name: d.name, email: d.email } : s)
      setEditing(null)
      return
    }
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
  const colorOf = (t) => (TYPE[t] || { color: '#8C877D' }).color
  const labelOf = (t) => (TYPE[t] || { label: 'Other' }).label
  const avatar = (c, size = 34) => {
    const isCompany = c._src === 'company'
    return (
      <span style={{ width: size, height: size, borderRadius: isCompany ? size * 0.24 : '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 600, color: '#fff', background: colorOf(c.type) }}>{initials(c.name || c.email)}</span>
    )
  }
  const pill = (t) => { const color = colorOf(t); return (
    <span style={{ fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, padding: '3px 9px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '6px', color, background: color + (dark ? '22' : '14'), border: `1px solid ${color}33` }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />{labelOf(t)}
    </span>
  ) }

  const inputStyle = { width: '100%', background: inputBg, border: `1px solid ${border2}`, borderRadius: '6px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box' }

  const pct = limit === Infinity ? 0 : Math.min(100, Math.round((contacts.length / limit) * 100))
  const nothingHere = view === 'people' ? peopleRows.length === 0 : companyRows.length === 0

  // segmented People / Companies toggle
  const seg = (
    <div style={{ display: 'inline-flex', background: dark ? '#232323' : '#ECE9E2', borderRadius: '8px', padding: '3px' }}>
      {[['people', 'People', peopleRows.length], ['companies', 'Companies', companyRows.length]].map(([k, lbl, n]) => (
        <button key={k} onClick={() => switchView(k)} style={{ border: 'none', background: view === k ? card : 'transparent', color: view === k ? text : muted, fontSize: '12px', fontWeight: 600, padding: '6px 13px', borderRadius: '6px', cursor: 'pointer', boxShadow: view === k ? '0 1px 2px rgba(0,0,0,0.12)' : 'none', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
          {lbl}<span style={{ fontSize: '10px', color: subtle, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: bg }}>
      {/* toolbar: meter + toggle + search + add */}
      <div style={{ padding: isMobile ? '12px 14px' : '14px 28px', borderBottom: `0.5px solid ${border}`, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ minWidth: '150px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: text, fontVariantNumeric: 'tabular-nums' }}>{loading ? '—' : contacts.length}{limit !== Infinity && <span style={{ color: subtle, fontWeight: 400 }}> / {limit.toLocaleString()}</span>}</span>
            <span style={{ ...label, fontSize: '10px' }}>contacts</span>
          </div>
          {limit !== Infinity
            ? <div style={{ height: '5px', borderRadius: '4px', background: border, overflow: 'hidden', marginTop: '5px', width: '170px' }}>
                <div style={{ height: '100%', width: pct + '%', background: pct > 90 ? '#C77B5B' : accent, borderRadius: '4px' }} />
              </div>
            : <div style={{ fontSize: '10px', color: subtle, marginTop: '3px' }}>Talent, managers &amp; companies don’t count</div>}
        </div>
        {seg}
        <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '340px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: subtle, fontSize: '13px', pointerEvents: 'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={view === 'companies' ? 'Search companies…' : 'Search name, company, email, phone…'}
            style={{ ...inputStyle, paddingLeft: '32px', boxShadow: cardShadow }} />
        </div>
        <button onClick={startAdd} style={{ padding: '9px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', boxShadow: '0 2px 8px rgba(91,124,153,0.4)', whiteSpace: 'nowrap' }}>+ Contact</button>
      </div>

      {/* filter chips (context-dependent) */}
      <div style={{ padding: isMobile ? '10px 14px' : '10px 28px', borderBottom: `0.5px solid ${border}`, display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
        {view === 'people'
          ? [{ key: 'all', label: 'All people', color: null }, ...peopleTypeChips].map(t => {
              const active = typeFilter === t.key
              const n = counts[t.key] || 0
              if (t.key !== 'all' && n === 0 && !active) return null
              return (
                <button key={t.key} onClick={() => setTypeFilter(t.key)} style={{ fontSize: '11px', letterSpacing: '0.4px', padding: '6px 12px', borderRadius: '999px', border: `1px solid ${active ? accent : border}`, background: active ? accent : card, color: active ? '#fff' : muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                  {t.color && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: t.color }} />}
                  {t.label} <span style={{ fontSize: '10px', color: active ? 'rgba(255,255,255,0.75)' : subtle, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                </button>
              )
            })
          : [['all', 'All companies'], ['has', 'Has people'], ['none', 'No people yet']].map(([k, lbl]) => {
              const active = companyFilter === k
              return (
                <button key={k} onClick={() => setCompanyFilter(k)} style={{ fontSize: '11px', letterSpacing: '0.4px', padding: '6px 12px', borderRadius: '999px', border: `1px solid ${active ? accent : border}`, background: active ? accent : card, color: active ? '#fff' : muted, cursor: 'pointer' }}>{lbl}</button>
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

      {status === 'success' && nothingHere && (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>{view === 'companies' ? 'No companies yet' : 'No contacts yet'}</div>
          <div style={{ fontSize: '12px', color: muted, marginBottom: '18px' }}>{view === 'companies' ? 'Companies appear here automatically as you add brands.' : 'Add clients, prospects, managers, press, and vendors — all in one place.'}</div>
          {view === 'people' && <button onClick={startAdd} style={{ padding: '9px 18px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px' }}>+ Add your first contact</button>}
        </div>
      )}

      {status === 'success' && !nothingHere && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: (selected && !isMobile) ? '1fr 384px' : '1fr', minHeight: 0 }}>
          {/* table */}
          <div style={{ overflowY: 'auto', padding: isMobile ? '8px 8px 100px' : '10px 16px 100px 28px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: muted, fontSize: '13px' }}>Nothing matched. Try a different search or filter.</div>
            ) : view === 'companies' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Company', 'Website', 'Phone', 'People'].map((h, i) => (
                      <th key={h} style={{ ...label, textAlign: i === 3 ? 'right' : 'left', padding: '6px 12px 10px', borderBottom: `0.5px solid ${border}`, display: (isMobile && i > 0 && i < 3) ? 'none' : undefined }}>{h}</th>
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
                          <div style={{ fontSize: '13.5px', color: text, fontWeight: 500 }}>{c.name || '—'}</div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 12px', display: isMobile ? 'none' : undefined }}><span style={{ fontSize: '12.5px', color: c.website ? accent : subtle }}>{c.website ? c.website.replace(/^https?:\/\//, '') : '—'}</span></td>
                      <td style={{ padding: '11px 12px', display: isMobile ? 'none' : undefined }}><span style={{ fontSize: '12.5px', color: muted, fontVariantNumeric: 'tabular-nums' }}>{c.phone || '—'}</span></td>
                      <td style={{ padding: '11px 12px', textAlign: 'right' }}><span style={{ fontSize: '11px', color: c._peopleCount ? text : subtle, background: dark ? '#242424' : '#F1EEE8', border: `0.5px solid ${border}`, borderRadius: '999px', padding: '2px 9px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{c._peopleCount}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                      <td style={{ padding: '11px 12px', display: isMobile ? 'none' : undefined }}><span style={{ fontSize: '12px', color: subtle, whiteSpace: 'nowrap' }}>{c._src ? '—' : timeAgo(c.last_contacted_at)}</span></td>
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
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '19px', color: text, marginBottom: editing._src ? '6px' : '18px' }}>
              {editing._src === 'company' ? 'Edit company' : editing._src ? `Edit ${editing._src === 'talent' ? 'talent' : 'manager'}` : editing.id ? 'Edit contact' : 'New contact'}
            </div>
            {editing._src === 'company' && <div style={{ fontSize: '12px', color: subtle, marginBottom: '16px', lineHeight: 1.6 }}>This company lives on your Brands — changes here update the brand, and show on the Brand page too.</div>}
            {editing._src && editing._src !== 'company' && <div style={{ fontSize: '12px', color: subtle, marginBottom: '16px', lineHeight: 1.6 }}>This one lives on your Talent records — changing the name or email here updates the talent, and shows on the Talent page too.</div>}

            {editing._src === 'company' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><div style={{ ...label, marginBottom: '6px' }}>Company name</div><input value={editing.name} onChange={e => setEditing(d => ({ ...d, name: e.target.value }))} style={inputStyle} autoFocus /></div>
                <div><div style={{ ...label, marginBottom: '6px' }}>Website</div><input value={editing.website || ''} onChange={e => setEditing(d => ({ ...d, website: e.target.value }))} placeholder='company.com' style={inputStyle} /></div>
                <div><div style={{ ...label, marginBottom: '6px' }}>Phone / company number</div><input value={editing.phone || ''} onChange={e => setEditing(d => ({ ...d, phone: e.target.value }))} style={inputStyle} /></div>
              </div>
            ) : editing._src ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><div style={{ ...label, marginBottom: '6px' }}>{editing._src === 'talent' ? 'Talent name' : 'Manager name'}</div><input value={editing.name} onChange={e => setEditing(d => ({ ...d, name: e.target.value }))} style={inputStyle} autoFocus /></div>
                <div><div style={{ ...label, marginBottom: '6px' }}>Email</div><input value={editing.email} onChange={e => setEditing(d => ({ ...d, email: e.target.value }))} type='email' style={inputStyle} /></div>
              </div>
            ) : (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div><div style={{ ...label, marginBottom: '6px' }}>Name</div><input value={editing.name} onChange={e => setEditing(d => ({ ...d, name: e.target.value }))} style={inputStyle} autoFocus /></div>
              <div><div style={{ ...label, marginBottom: '6px' }}>Title / role</div><input value={editing.title} onChange={e => setEditing(d => ({ ...d, title: e.target.value }))} placeholder='e.g. Marketing Lead' style={inputStyle} /></div>
              <div><div style={{ ...label, marginBottom: '6px' }}>Type</div>
                <select value={editing.type} onChange={e => setEditing(d => ({ ...d, type: e.target.value }))} style={inputStyle}>
                  {storableTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
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
            </>
            )}
            {formError && <div style={{ fontSize: '11.5px', color: '#c0392b', marginTop: '12px', lineHeight: 1.5 }}>{formError}</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={saveContact} disabled={saving} style={{ padding: '9px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : (editing.id || editing._src) ? 'Save changes' : 'Add contact'}</button>
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
    const isCompany = c._src === 'company'
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {avatar(c, 52)}
            <div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '19px', color: text }}>{c.name || c.email || 'Contact'}</div>
              <div style={{ fontSize: '12.5px', color: subtle, marginTop: '2px' }}>{isCompany ? 'Company' : [c.title, companyOf(c)].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <button onClick={() => setSelected(null)} title='Close' style={{ background: 'none', border: 'none', color: subtle, cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ margin: '12px 0 4px', position: 'relative', display: 'inline-block' }}>
          {c._src ? pill(c.type) : (
            <>
              <button onClick={() => setTypeMenuOpen(o => !o)} title='Click to change type' style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                {pill(c.type)}<span style={{ fontSize: '9px', color: subtle }}>▾</span>
              </button>
              {typeMenuOpen && (
                <>
                  <div onClick={() => setTypeMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div style={{ position: 'absolute', top: '28px', left: 0, zIndex: 20, background: card, border: `0.5px solid ${border}`, borderRadius: '6px', boxShadow: '0 6px 18px rgba(0,0,0,0.22)', padding: '4px', minWidth: '160px' }}>
                    <div style={{ ...label, padding: '5px 9px 4px' }}>Change type to</div>
                    {storableTypes.map(t => (
                      <button key={t.key} onClick={() => { changeType(c, t.key); setTypeMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', textAlign: 'left', background: c.type === t.key ? (dark ? '#242424' : '#F1EFEA') : 'none', border: 'none', padding: '8px 9px', borderRadius: '4px', cursor: 'pointer', fontSize: '12.5px', color: text }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.color }} />{t.label}
                        {c.type === t.key && <span style={{ marginLeft: 'auto', color: accent, fontSize: '11px' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', margin: '16px 0 22px', flexWrap: 'wrap' }}>
          {!c._src && <button onClick={() => logContactToday(c)} style={{ padding: '8px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px' }}>Log contact today</button>}
          <button onClick={() => startEdit(c)} style={{ padding: '8px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '6px' }}>Edit</button>
          {c.email && <a href={`mailto:${c.email}`} style={{ padding: '8px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '6px', textDecoration: 'none' }}>Email</a>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isCompany && c.website && <div><div style={{ ...label, marginBottom: '3px' }}>Website</div><a href={/^https?:\/\//.test(c.website) ? c.website : 'https://' + c.website} target='_blank' rel='noreferrer' style={{ fontSize: '13.5px', color: accent, textDecoration: 'none' }}>{c.website.replace(/^https?:\/\//, '')}</a></div>}
          {c.email && <div><div style={{ ...label, marginBottom: '3px' }}>Email</div><a href={`mailto:${c.email}`} style={{ fontSize: '13.5px', color: accent, textDecoration: 'none' }}>{c.email}</a></div>}
          {c.phone && <div><div style={{ ...label, marginBottom: '3px' }}>{isCompany ? 'Phone / company number' : 'Phone'}</div><div style={{ fontSize: '13.5px', color: text, fontVariantNumeric: 'tabular-nums' }}>{c.phone}</div></div>}
          {isCompany && <div><div style={{ ...label, marginBottom: '3px' }}>People at this company</div><div style={{ fontSize: '13.5px', color: text }}>{c._peopleCount} {c._peopleCount === 1 ? 'contact' : 'contacts'} <span style={{ color: subtle }}>· lives on the Brand page</span></div></div>}
          {!c._src && kv('Company', c.company || (linkedBrand ? linkedBrand.name : null))}
          {c._src && c._src !== 'company' && (
            <div><div style={{ ...label, marginBottom: '3px' }}>{c._src === 'talent' ? 'Talent record' : 'Manager for'}</div>
              <div style={{ fontSize: '12.5px', color: text }}>{c._src === 'talent' ? c.name : (c._forTalent || '—')} <span style={{ color: subtle }}>· lives on the Talent page</span></div>
            </div>
          )}
          {!c._src && (
            <div><div style={{ ...label, marginBottom: '3px' }}>Linked to</div>
              {linkedBrand
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 10px', borderRadius: '6px', border: `0.5px solid ${border}`, background: card, fontSize: '12.5px', color: text, boxShadow: cardShadow }}><span style={{ width: '18px', height: '18px', borderRadius: '4px', background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700 }}>{initials(linkedBrand.name)}</span>{linkedBrand.name}</span>
                : <span style={{ fontSize: '12.5px', color: subtle }}>Not linked to a client — a standalone contact</span>}
            </div>
          )}
          {c.tags?.length > 0 && <div><div style={{ ...label, marginBottom: '5px' }}>{c._src === 'talent' ? 'Niches' : 'Tags'}</div><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{c.tags.map((t, i) => <span key={i} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '999px', background: dark ? 'rgba(91,124,153,0.22)' : 'rgba(91,124,153,0.12)', color: accent, fontWeight: 500 }}>{t}</span>)}</div></div>}
          {kv(c._src === 'talent' ? 'Talent manager' : 'Owner', memberName(c.owner_user_id))}
          {!c._src && <div><div style={{ ...label, marginBottom: '3px' }}>Last contacted</div><div style={{ fontSize: '13.5px', color: text }}>{timeAgo(c.last_contacted_at)}</div></div>}
        </div>
        {c.notes && <><div style={{ height: '0.5px', background: border, margin: '20px 0' }} /><div style={{ ...label, marginBottom: '8px' }}>Notes</div><div style={{ fontSize: '13px', color: muted, lineHeight: 1.6, background: bg, border: `0.5px solid ${dark ? '#262626' : '#E7E3DC'}`, borderRadius: '6px', padding: '12px 14px', whiteSpace: 'pre-wrap' }}>{c.notes}</div></>}
        {!c._src && <>
          <div style={{ height: '0.5px', background: border, margin: '20px 0' }} />
          <button onClick={() => deleteContact(c)} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: '#c0392b', cursor: 'pointer', borderRadius: '6px' }}>Delete contact</button>
        </>}
      </div>
    )
  }
}
