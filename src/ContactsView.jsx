import { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { useCachedResource } from './useCachedResource'
import { cacheSet } from './dataCache'
import { ListSkeleton } from './Skeletons'
import { planLimits } from './plans'
import ExpandableTextarea from './ExpandableTextarea'

// ── HQue Contacts — rolodex redesign ────────────────────────────────────────
// A–Z rail, serif letter dividers, photo-for-talent / dot-for-everyone-else,
// in-place dossier expansion. Data layer is unchanged: brand_contacts (stored
// contacts) + live talent/managers (from creators) + companies (from brands).

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif"
const UI = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const DEFAULT_TYPES = [
  { key: 'client', label: 'Client' }, { key: 'prospect', label: 'Prospect' },
  { key: 'press', label: 'Press' }, { key: 'vendor', label: 'Vendor' }, { key: 'other', label: 'Other' },
]

function splitName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { first: '', last: parts[0] || '—' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
}
// For grouping/sorting we clean the name first: drop parentheticals like
// "(Bowles)" and anything after a comma (company suffixes like ", 1milk2sugars"),
// so the A–Z letter comes from the real surname — never a "(", number or symbol.
function cleanForSort(name) {
  return (name || '').replace(/\([^)]*\)/g, ' ').split(',')[0].replace(/\s+/g, ' ').trim()
}
function surnameOf(name) { const p = cleanForSort(name).split(/\s+/).filter(Boolean); return p.length ? p[p.length - 1] : '' }
function firstAlpha(s) { const m = (s || '').match(/[a-zA-Z]/); return m ? m[0].toUpperCase() : '' }
function letterOf(name) { return firstAlpha(surnameOf(name)) || firstAlpha(cleanForSort(name)) || firstAlpha(name) || '#' }
function sortKey(name) {
  const p = cleanForSort(name).split(/\s+/).filter(Boolean)
  const last = p.length ? p[p.length - 1] : '', first = p.slice(0, -1).join(' ')
  return (last + ' ' + first + ' ' + (name || '')).toLowerCase()
}
function pluralize(l) { return /s$/i.test(l) ? l : l + 's' }
function excerpt(s, n = 46) { s = (s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s }
function shortDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function timeAgo(ts) {
  if (!ts) return '—'
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)
  if (d <= 0) return 'today'
  if (d === 1) return '1d ago'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

export default function ContactsView({ dark = true, orgId, isMobile = false, focusVersion = 0, stripePlan }) {
  // Tokens — light-first (the redesign is a light system); dark kept usable.
  const page = dark ? '#151515' : '#faf8f5'
  const cardBg = dark ? '#1E1E1E' : '#ffffff'
  const ink = dark ? '#F0ECE6' : '#1a1a1a'
  const body = dark ? '#CFCAC2' : '#555'
  const body2 = dark ? '#B7B2AA' : '#666'
  const mut = dark ? '#8C877F' : '#999'
  const mut2 = dark ? '#6F6A62' : '#aaa'
  const accent = '#5b7c99'
  const accentSoft = '#8fa6b8'
  const hair = dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.10)'
  const hair2 = dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.12)'
  const heavy = dark ? '#EDE9E2' : '#1a1a1a'
  const tint = 'rgba(91,124,153,0.08)'
  const tint2 = 'rgba(91,124,153,0.15)'
  const bandBg = dark ? '#191919' : '#faf8f5'

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [activeLetter, setActiveLetter] = useState(null)
  const [rosterFilter, setRosterFilter] = useState(null)   // manager key or null
  const [rosterShown, setRosterShown] = useState(25)
  const [rosterSearch, setRosterSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [showLimit, setShowLimit] = useState(false)
  const [noteDraft, setNoteDraft] = useState(null)         // {id, text} inline note composer
  const listRef = useRef(null)

  const limit = planLimits(stripePlan).contacts
  const cacheKey = orgId ? `contacts:${orgId}` : null
  const { data, status, refetch, setData } = useCachedResource(cacheKey, async () => {
    const { data, error } = await supabase.from('brand_contacts').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  })
  const contacts = data || []
  const loading = status === 'loading'

  const [orgTypes, setOrgTypes] = useState(null)
  const [brands, setBrands] = useState([])
  const [members, setMembers] = useState([])
  const [creators, setCreators] = useState([])
  const [campByCreator, setCampByCreator] = useState({})
  const [campByBrand, setCampByBrand] = useState({})

  const fetchBrands = () => supabase.from('brands').select('id, name, logo_url, website, phone').eq('org_id', orgId).order('name').then(({ data }) => setBrands(data || []))
  const fetchCreators = () => supabase.from('creators').select('id, name, contact_email, manager_name, manager_email, niches, manager_user_id, photo_url').eq('org_id', orgId).eq('status', 'active').then(({ data }) => setCreators(data || []))
  const fetchTypes = () => supabase.from('org_contact_types').select('key, label, color, position').eq('org_id', orgId).order('position').then(({ data }) => setOrgTypes(data && data.length ? data : DEFAULT_TYPES))
  async function fetchCampaigns() {
    const [{ data: camps }, { data: links }] = await Promise.all([
      supabase.from('campaigns').select('id, name, status, archived, brand_id').eq('org_id', orgId),
      supabase.from('campaign_creators').select('campaign_id, creator_id'),
    ])
    const done = ['completed', 'complete', 'done', 'cancelled', 'canceled']
    const active = (camps || []).filter(c => !c.archived && !done.includes((c.status || '').toLowerCase()))
    const byId = Object.fromEntries(active.map(c => [c.id, c]))
    const byCreator = {}, byBrand = {}
    for (const l of links || []) { const c = byId[l.campaign_id]; if (!c) continue; (byCreator[l.creator_id] = byCreator[l.creator_id] || []).push(c.name) }
    for (const c of active) if (c.brand_id) (byBrand[c.brand_id] = byBrand[c.brand_id] || []).push(c.name)
    setCampByCreator(byCreator); setCampByBrand(byBrand)
  }
  useEffect(() => {
    if (!orgId) return
    fetchTypes(); fetchBrands(); fetchCreators(); fetchCampaigns()
    supabase.rpc('org_team', { p_org_id: orgId }).then(({ data }) => setMembers(data || []))
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (focusVersion > 0) { refetch(); fetchCreators(); fetchBrands(); fetchTypes(); fetchCampaigns() } }, [focusVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const storableTypes = orgTypes || DEFAULT_TYPES
  const typeLabel = (k) => (storableTypes.find(t => t.key === k) || { label: k || 'Other' }).label
  const memberName = (id) => { const m = members.find(x => x.id === id); return m ? (m.full_name || m.email) : '' }
  const brandName = (id) => brands.find(b => b.id === id)?.name || ''

  // ── build the unified people list + companies ──────────────────────────────
  const talentRows = useMemo(() => creators.map(cr => ({
    id: 'talent:' + cr.id, kind: 'talent', _creatorId: cr.id, name: cr.name || 'Unnamed',
    email: cr.contact_email || '', photoUrl: cr.photo_url || null, rep: (cr.manager_name || '').trim() || null,
    roleLabel: 'Talent', niches: cr.niches || [], ownerId: cr.manager_user_id || null,
    campaigns: campByCreator[cr.id] || [], lastTouch: null,
  })), [creators, campByCreator])

  const managerRows = useMemo(() => {
    const m = new Map()
    for (const cr of creators) {
      const mn = (cr.manager_name || '').trim(), me = (cr.manager_email || '').trim()
      if (!mn && !me) continue
      const key = (me || mn).toLowerCase()
      if (!m.has(key)) m.set(key, { id: 'manager:' + key, kind: 'manager', _managerKey: key, name: mn || me, email: me || '', roleLabel: 'Manager', roster: [] })
      m.get(key).roster.push(cr)
    }
    return [...m.values()].map(mg => {
      const camps = new Set()
      for (const cr of mg.roster) (campByCreator[cr.id] || []).forEach(c => camps.add(c))
      return { ...mg, rosterCount: mg.roster.length, campaigns: [...camps], lastTouch: null }
    })
  }, [creators, campByCreator])

  const contactRows = useMemo(() => contacts.map(c => ({
    id: c.id, kind: 'contact', _raw: c, name: c.name || c.email || 'Contact', email: c.email || '',
    roleLabel: typeLabel(c.type), type: c.type, company: c.company || brandName(c.brand_id) || '',
    ownerId: c.owner_user_id || null, campaigns: c.brand_id ? (campByBrand[c.brand_id] || []) : [],
    lastTouch: c.last_contacted_at || null, notes: c.notes || '', title: c.title || '',
  })), [data, campByBrand, brands, storableTypes]) // eslint-disable-line react-hooks/exhaustive-deps

  const people = useMemo(() => [...talentRows, ...managerRows, ...contactRows], [talentRows, managerRows, contactRows])

  const companyRows = useMemo(() => brands.map(b => ({
    id: 'company:' + b.id, kind: 'company', _brandId: b.id, name: b.name, roleLabel: 'Company',
    website: b.website || '', phone: b.phone || '', email: '',
    peopleCount: contacts.filter(c => c.brand_id === b.id).length, campaigns: campByBrand[b.id] || [],
  })), [brands, data, campByBrand]) // eslint-disable-line react-hooks/exhaustive-deps

  // pills — All / Talent / Managers / <each present type> / Companies
  const typeCounts = useMemo(() => { const o = {}; for (const c of contactRows) o[c.type || 'other'] = (o[c.type || 'other'] || 0) + 1; return o }, [contactRows])
  const pills = useMemo(() => {
    const base = [{ key: 'all', label: 'All', count: people.length }, { key: 'talent', label: 'Talent', count: talentRows.length }, { key: 'manager', label: 'Managers', count: managerRows.length }]
    for (const t of storableTypes) if ((typeCounts[t.key] || 0) > 0) base.push({ key: 't:' + t.key, label: pluralize(t.label), count: typeCounts[t.key] })
    base.push({ key: 'company', label: 'Companies', count: companyRows.length })
    return base
  }, [people.length, talentRows.length, managerRows.length, storableTypes, typeCounts, companyRows.length])

  const viewingCompanies = filter === 'company'

  const rows = useMemo(() => {
    let src
    if (filter === 'company') src = companyRows
    else if (filter === 'talent') src = talentRows
    else if (filter === 'manager') src = managerRows
    else if (filter.startsWith('t:')) src = contactRows.filter(c => (c.type || 'other') === filter.slice(2))
    else src = people
    const q = search.trim().toLowerCase()
    if (q) src = src.filter(c => [c.name, c.email, c.company, c.website, c.roleLabel].filter(Boolean).some(v => v.toLowerCase().includes(q)))
    return [...src].sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)))
  }, [filter, search, companyRows, talentRows, managerRows, contactRows, people])

  // group into A–Z sections
  const sections = useMemo(() => {
    const g = {}
    for (const r of rows) { const L = letterOf(r.name); (g[L] = g[L] || []).push(r) }
    return Object.keys(g).sort().map(L => ({ letter: L, items: g[L] }))
  }, [rows])
  const lettersWith = useMemo(() => new Set(sections.map(s => s.letter)), [sections])

  // keep an open stored-contact dossier in sync after a refetch
  useEffect(() => {
    if (expandedId && !expandedId.includes(':')) {
      if (!contacts.find(c => c.id === expandedId)) setExpandedId(null)
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  function jumpTo(L) {
    setActiveLetter(a => a === L ? null : L)
    const el = listRef.current?.querySelector(`[data-sec="${L}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function toggleRow(id) { setNoteDraft(null); setExpandedId(x => x === id ? null : id) }
  function pickFilter(k) { setFilter(k); setExpandedId(null); setActiveLetter(null); setRosterFilter(null); setSearch('') }
  function openRoster(key) { setRosterFilter(key); setRosterShown(25); setRosterSearch(''); setExpandedId(null); setActiveLetter(null); if (listRef.current) listRef.current.scrollTop = 0 }

  // ── CRUD (preserved from the previous CRM) ─────────────────────────────────
  function startAdd() {
    if (limit !== Infinity && contacts.length >= limit) { setShowLimit(true); return }
    setFormError('')
    setEditing({ name: '', title: '', company: '', type: storableTypes[0]?.key || 'client', email: '', phone: '', brand_id: '', owner_user_id: '', tags: '', notes: '', last_contacted_at: '' })
  }
  function startEdit(p) {
    setFormError('')
    if (p.kind === 'company') return setEditing({ _src: 'company', _brandId: p._brandId, name: p.name, website: p.website, phone: p.phone })
    if (p.kind === 'talent') return setEditing({ _src: 'talent', _creatorId: p._creatorId, name: p.name, email: p.email })
    if (p.kind === 'manager') return setEditing({ _src: 'manager', _managerKey: p._managerKey, _rosterIds: p.roster.map(r => r.id), name: p.name, email: p.email })
    const c = p._raw
    setEditing({ ...c, brand_id: c.brand_id || '', owner_user_id: c.owner_user_id || '', tags: (c.tags || []).join(', '), last_contacted_at: c.last_contacted_at ? c.last_contacted_at.slice(0, 10) : '' })
  }

  async function saveEditing() {
    const d = editing
    if (d._src === 'company') {
      if (!d.name?.trim()) { setFormError('A company needs a name.'); return }
      setSaving(true); setFormError('')
      let site = (d.website || '').trim(); if (site && !/^https?:\/\//i.test(site)) site = 'https://' + site
      const { error } = await supabase.from('brands').update({ name: d.name.trim(), website: site || null, phone: d.phone?.trim() || null }).eq('id', d._brandId)
      setSaving(false); if (error) return setFormError('Could not save: ' + error.message)
      fetchBrands(); setEditing(null); return
    }
    if (d._src === 'talent') {
      setSaving(true); setFormError('')
      const { error } = await supabase.from('creators').update({ name: d.name?.trim() || null, contact_email: d.email?.trim() || null }).eq('id', d._creatorId)
      setSaving(false); if (error) return setFormError('Could not save: ' + error.message)
      fetchCreators(); setEditing(null); return
    }
    if (d._src === 'manager') {
      setSaving(true); setFormError('')
      const ids = (d._rosterIds || []).map(x => x.replace('talent:', ''))
      const { error } = await supabase.from('creators').update({ manager_name: d.name?.trim() || null, manager_email: d.email?.trim() || null }).in('id', ids)
      setSaving(false); if (error) return setFormError('Could not save: ' + error.message)
      fetchCreators(); setEditing(null); return
    }
    if (!d.name?.trim() && !d.email?.trim()) { setFormError('Add at least a name or an email.'); return }
    setSaving(true); setFormError('')
    const row = {
      name: d.name?.trim() || null, title: d.title?.trim() || null, company: d.company?.trim() || null,
      type: d.type || 'client', email: d.email?.trim() || null, phone: d.phone?.trim() || null,
      brand_id: d.brand_id || null, owner_user_id: d.owner_user_id || null,
      tags: (d.tags || '').split(',').map(s => s.trim()).filter(Boolean),
      notes: d.notes?.trim() || null, last_contacted_at: d.last_contacted_at || null,
    }
    let error, saved
    if (d.id) ({ data: saved, error } = await supabase.from('brand_contacts').update(row).eq('id', d.id).select().single())
    else ({ data: saved, error } = await supabase.from('brand_contacts').insert([{ ...row, org_id: orgId }]).select().single())
    setSaving(false)
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('limit reached')) { setEditing(null); setShowLimit(true); return }
      if (msg.includes('does not exist') || msg.includes('schema cache') || error.code === '42P01' || error.code === 'PGRST205') return setFormError("The contacts table isn't set up in Supabase yet. Run the SQL Claude sent, then try again.")
      return setFormError('Could not save: ' + (error.message || 'unknown error'))
    }
    const next = d.id ? contacts.map(c => c.id === saved.id ? saved : c) : [saved, ...contacts]
    setData(next); if (cacheKey) cacheSet(cacheKey, next)
    setEditing(null); setExpandedId(saved.id)
  }

  async function deleteContact(p) {
    if (!confirm(`Delete ${p.name}? This can't be undone.`)) return
    const { error } = await supabase.from('brand_contacts').delete().eq('id', p.id)
    if (error) return alert('Could not delete: ' + error.message)
    const next = contacts.filter(x => x.id !== p.id)
    setData(next); if (cacheKey) cacheSet(cacheKey, next)
    if (expandedId === p.id) setExpandedId(null)
  }
  async function saveNote(p) {
    const text = (noteDraft?.text || '').trim(); if (!text) { setNoteDraft(null); return }
    const iso = new Date().toISOString()
    const { data: saved, error } = await supabase.from('brand_contacts').update({ notes: text, last_contacted_at: iso }).eq('id', p.id).select().single()
    if (error) return alert('Could not save note: ' + error.message)
    const next = contacts.map(c => c.id === saved.id ? saved : c)
    setData(next); if (cacheKey) cacheSet(cacheKey, next); setNoteDraft(null)
  }

  // ── styling atoms ──────────────────────────────────────────────────────────
  const uppLbl = { fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: mut }
  const btnGhost = { fontFamily: UI, fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', padding: '9px 15px', borderRadius: '1px', cursor: 'pointer', background: 'none', border: `1px solid ${dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)'}`, color: body }
  const btnSolid = { fontFamily: UI, fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', padding: '9px 15px', borderRadius: '1px', cursor: 'pointer', background: accent, border: `1px solid ${accent}`, color: '#fff', textDecoration: 'none', display: 'inline-block' }
  const inputStyle = { width: '100%', background: dark ? '#141414' : '#fff', border: `1px solid ${hair2}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: ink, outline: 'none', boxSizing: 'border-box', fontFamily: UI }
  const fieldLbl = { ...uppLbl, marginBottom: '6px', display: 'block' }

  function marker(p) {
    if (p.kind === 'talent') {
      if (p.photoUrl) return <img src={p.photoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none' }} />
      return <div style={{ width: 44, height: 44, borderRadius: 1, border: `1px dashed ${dark ? '#3a3a3a' : '#cfc9c0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, letterSpacing: '0.12em', color: dark ? '#666' : '#bbb', fontFamily: UI }}>ADD</div>
    }
    const col = p.kind === 'manager' ? accent : accentSoft
    return <div style={{ width: 44, display: 'flex', justifyContent: 'center' }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: col }} /></div>
  }

  function subline(p) {
    if (p.kind === 'talent') return p.rep ? `rep ${p.rep}` : 'unrepresented'
    if (p.kind === 'manager') return p.rosterCount === 1 ? `manages ${p.roster[0].name}` : `${p.rosterCount} talent`
    if (p.kind === 'company') return [p.website && p.website.replace(/^https?:\/\//, ''), p.peopleCount ? `${p.peopleCount} ${p.peopleCount === 1 ? 'person' : 'people'}` : ''].filter(Boolean).join(' · ')
    return [p.title, p.company].filter(Boolean).join(' · ') || (p.type ? '' : '')
  }
  function nameEl(p, big = false) {
    const { first, last } = splitName(p.name)
    return <span style={{ fontFamily: SERIF, fontSize: big ? 32 : 16, color: ink, lineHeight: 1.1 }}>{first && <span style={{ fontFamily: UI, fontWeight: 500 }}>{first} </span>}{last}</span>
  }

  // ── row ──
  function row(p) {
    const roleColor = p.kind === 'talent' ? accent : mut
    return (
      <div key={p.id} onClick={() => toggleRow(p.id)} style={{ display: 'grid', gridTemplateColumns: isMobile ? '44px 1fr' : '44px minmax(180px,1.5fr) 170px 1.3fr 74px', alignItems: 'center', gap: isMobile ? 12 : 18, padding: '15px 4px', borderBottom: `1px solid ${hair}`, cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = tint} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: p.kind === 'talent' ? 'flex-start' : 'center', height: 44 }}>{marker(p)}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nameEl(p)}</div>
          <div style={{ fontSize: 11, color: mut, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subline(p)}</div>
        </div>
        {!isMobile && <div style={{ ...uppLbl, color: roleColor }}>
          {p.roleLabel}{p.kind === 'manager' && <> · <span onClick={e => { e.stopPropagation(); openRoster(p._managerKey) }} style={{ color: accent, cursor: 'pointer' }}>{p.rosterCount} talent</span></>}
        </div>}
        {!isMobile && <div style={{ fontSize: 13, color: p.email ? body2 : mut2, fontFamily: UI }}>{p.kind === 'company' ? (p.website ? p.website.replace(/^https?:\/\//, '') : '—') : (p.email || '—')}</div>}
        {!isMobile && <div style={{ fontSize: 12, color: mut2, textAlign: 'right' }}>{p.kind === 'company' ? `${p.peopleCount}` : timeAgo(p.lastTouch)}</div>}
      </div>
    )
  }

  // ── dossier ──
  function dossier(p) {
    const recent = []
    if (p.kind === 'contact' && p.notes && p.lastTouch) recent.push(['Note added — ' + excerpt(p.notes), shortDate(p.lastTouch)])
    for (const c of (p.campaigns || [])) recent.push(['Added to campaign — ' + c, ''])
    const metaCampaigns = (p.campaigns && p.campaigns.length) ? p.campaigns.join(' · ') : '—'
    const bigRoster = p.kind === 'manager' && p.rosterCount > 6
    let sub
    if (p.kind === 'talent') sub = <>Talent · {p.rep ? <>rep <span style={{ color: accent }}>{p.rep}</span></> : 'unrepresented'}</>
    else if (p.kind === 'manager') sub = <>Manager · {p.rosterCount > 1 ? <span style={{ color: accent, cursor: 'pointer' }} onClick={() => openRoster(p._managerKey)}>{p.rosterCount} talent on roster</span> : <>manages {p.roster[0]?.name}</>}</>
    else if (p.kind === 'company') sub = <>Company{p.peopleCount ? ` · ${p.peopleCount} ${p.peopleCount === 1 ? 'person' : 'people'}` : ''}</>
    else sub = <>{p.roleLabel}{p.company ? ` · ${p.company}` : ''}</>

    const canNote = p.kind === 'contact'
    const rosterList = bigRoster ? [...p.roster].map(cr => ({ cr, ct: (campByCreator[cr.id] || []).length })).sort((a, b) => b.ct - a.ct) : []
    const rosterFiltered = rosterSearch ? rosterList.filter(r => r.cr.name.toLowerCase().includes(rosterSearch.toLowerCase())) : rosterList

    return (
      <div key={p.id} style={{ border: `1px solid ${accent}`, borderRadius: 1, background: cardBg, margin: '6px 0 4px', display: 'flex', overflow: 'hidden' }}>
        {p.kind === 'talent' && (p.photoUrl
          ? <img src={p.photoUrl} alt="" style={{ width: 220, flexShrink: 0, objectFit: 'cover' }} />
          : <div style={{ width: 220, flexShrink: 0, background: dark ? '#242424' : '#efece7', display: 'flex', alignItems: 'center', justifyContent: 'center', ...uppLbl, letterSpacing: '0.18em' }}>No photo</div>)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, padding: '24px 26px 18px' }}>
            <div>
              {nameEl(p, true)}
              <div style={{ fontSize: 13, color: body2, marginTop: 6, fontFamily: UI }}>{sub}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {canNote && <button onClick={() => setNoteDraft({ id: p.id, text: p.notes || '' })} style={btnGhost}>Add note</button>}
              <button onClick={() => startEdit(p)} style={btnGhost}>Edit</button>
              {p.email && <a href={`mailto:${p.email}`} style={btnSolid}>Email</a>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', padding: '0 26px 22px' }}>
            <div><div style={fieldLbl}>Email</div><div style={{ fontSize: 13.5, color: p.email ? accent : mut2, fontFamily: UI }}>{p.email || '—'}</div></div>
            <div><div style={fieldLbl}>Last touch</div><div style={{ fontSize: 13.5, color: body, fontFamily: UI }}>{p.lastTouch ? `${timeAgo(p.lastTouch)} · note added` : '—'}</div></div>
            <div><div style={fieldLbl}>Active campaigns</div><div style={{ fontSize: 13.5, color: body, fontFamily: UI }}>{metaCampaigns}</div></div>
            {p.kind === 'company' && p.phone && <div><div style={fieldLbl}>Phone</div><div style={{ fontSize: 13.5, color: body, fontFamily: UI }}>{p.phone}</div></div>}
          </div>

          {/* inline note composer */}
          {noteDraft?.id === p.id && (
            <div style={{ borderTop: `1px solid ${hair}`, padding: '16px 26px', background: bandBg }}>
              <div style={fieldLbl}>Add a note</div>
              <ExpandableTextarea dark={dark} value={noteDraft.text} onChange={e => setNoteDraft(n => ({ ...n, text: e.target.value }))} placeholder="What happened…" style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => saveNote(p)} style={btnSolid}>Save note</button>
                <button onClick={() => setNoteDraft(null)} style={btnGhost}>Cancel</button>
              </div>
            </div>
          )}

          {/* manager roster panel */}
          {bigRoster ? (
            <div style={{ borderTop: `1px solid ${hair}`, padding: '20px 26px 24px', background: bandBg }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ ...uppLbl, color: accent }}>Roster · {p.rosterCount}</div>
                <input value={rosterSearch} onChange={e => setRosterSearch(e.target.value)} placeholder="Search their roster…" style={{ ...inputStyle, width: 200, padding: '8px 11px', fontSize: 12 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 10 }}>
                {rosterFiltered.slice(0, 5).map(({ cr, ct }) => (
                  <div key={cr.id} style={{ border: `1px solid ${hair2}`, borderRadius: 1, background: cardBg, padding: '11px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, color: ink, fontFamily: UI, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cr.name}</span>
                    <span style={{ ...uppLbl, textAlign: 'right', lineHeight: 1.3 }}>{ct ? <>{ct}<br />campaign{ct > 1 ? 's' : ''}</> : '—'}</span>
                  </div>
                ))}
                <div onClick={() => openRoster(p._managerKey)} style={{ border: `1px dashed ${hair2}`, borderRadius: 1, padding: '11px 13px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, color: accent, cursor: 'pointer', ...uppLbl }}>View all {p.rosterCount}<span>→</span></div>
              </div>
              <div style={{ fontSize: 11, color: mut, marginTop: 12 }}>Sorted by campaign activity — most active first.</div>
            </div>
          ) : (
            <div style={{ borderTop: `1px solid ${hair}`, padding: '20px 26px 24px', background: bandBg }}>
              <div style={{ ...uppLbl, color: accent, marginBottom: 14 }}>Recent</div>
              {recent.length ? recent.map(([t, w], i) => (
                <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, marginTop: 6, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, color: body, fontFamily: UI }}>{t}{w && <span style={{ color: mut2 }}> · {w}</span>}</span>
                </div>
              )) : <div style={{ fontSize: 13, color: mut, fontFamily: UI }}>No notes or campaigns yet.</div>}
            </div>
          )}

          {p.kind === 'contact' && (
            <div style={{ borderTop: `1px solid ${hair}`, padding: '14px 26px' }}>
              <button onClick={() => deleteContact(p)} style={{ ...btnGhost, color: '#b3502f', borderColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)' }}>Delete contact</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── roster-filter view (manager's roster as the whole list) ────────────────
  function rosterFilterView() {
    const mgr = managerRows.find(m => m._managerKey === rosterFilter)
    if (!mgr) { setRosterFilter(null); return null }
    let list = mgr.roster.map(cr => talentRows.find(t => t._creatorId === cr.id)).filter(Boolean)
    if (rosterSearch) list = list.filter(t => t.name.toLowerCase().includes(rosterSearch.toLowerCase()))
    list.sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)))
    const shown = list.slice(0, rosterShown)
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, border: `1px solid ${accent}`, background: tint, padding: '12px 16px', borderRadius: 1, marginBottom: 8 }}>
          <span style={{ ...uppLbl, color: accent }}>Filtered</span>
          <span style={{ fontSize: 14, color: ink, fontFamily: UI }}>{mgr.name}'s roster · {mgr.rosterCount} talent</span>
          <span onClick={() => setRosterFilter(null)} style={{ marginLeft: 'auto', ...uppLbl, color: body2, cursor: 'pointer' }}>Clear ✕</span>
        </div>
        {shown.map(p => expandedId === p.id ? dossier(p) : row(p))}
        {list.length > rosterShown && (
          <div style={{ textAlign: 'center', padding: '22px 0', fontSize: 12, color: mut }}>
            … {list.length - rosterShown} more · <span onClick={() => setRosterShown(n => n + 25)} style={{ color: accent, cursor: 'pointer' }}>load next 25</span>
          </div>
        )}
      </>
    )
  }

  const nothing = rows.length === 0

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, background: page, fontFamily: UI }}>
      {/* A–Z rail */}
      {!isMobile && (
        <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${hair}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '20px 0', background: page }}>
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(L => {
            const has = lettersWith.has(L), active = activeLetter === L
            return <button key={L} disabled={!has} onClick={() => jumpTo(L)} style={{ fontFamily: UI, fontSize: 13, width: 28, height: 26, lineHeight: 1, border: active ? `1px solid ${accent}` : '1px solid transparent', borderRadius: 1, background: active ? tint2 : 'none', color: active ? ink : (has ? accent : (dark ? '#3a3a3a' : '#ccc')), fontWeight: active ? 600 : 400, cursor: has ? 'pointer' : 'default', transition: 'color .18s ease' }}>{L}</button>
          })}
        </div>
      )}

      {/* main */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {/* toolbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 5, background: page, padding: isMobile ? '16px 14px 12px' : '22px 30px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            {pills.map(pl => {
              const on = filter === pl.key
              return <button key={pl.key} onClick={() => pickFilter(pl.key)} style={{ fontFamily: UI, fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', border: `1px solid ${on ? accent : hair2}`, background: on ? tint2 : cardBg, color: on ? ink : body2, padding: '8px 15px', borderRadius: 100, cursor: 'pointer' }}>{pl.label}<span style={{ color: on ? accent : mut2, marginLeft: 6 }}>{pl.count}</span></button>
            })}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...inputStyle, width: isMobile ? '100%' : 220 }} />
          <button onClick={startAdd} style={{ ...btnSolid, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}><span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Contact</button>
        </div>

        <div style={{ padding: isMobile ? '4px 14px 90px' : '6px 30px 90px' }}>
          {loading && <ListSkeleton dark={dark} rows={8} />}
          {status === 'error' && (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: mut, marginBottom: 12 }}>Couldn't load contacts.</div>
              <button onClick={() => refetch()} style={btnSolid}>Retry</button>
            </div>
          )}

          {status === 'success' && rosterFilter && rosterFilterView()}

          {status === 'success' && !rosterFilter && nothing && (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <div style={{ fontFamily: SERIF, fontSize: 24, color: mut, marginBottom: 10 }}>{viewingCompanies ? 'No companies yet' : search ? 'Nothing matched' : 'No contacts yet'}</div>
              <div style={{ fontSize: 12.5, color: mut, marginBottom: 18, fontFamily: UI }}>{viewingCompanies ? 'Companies appear here as you add brands.' : 'Add clients, talent, managers, press and vendors — all in one place.'}</div>
              {!viewingCompanies && !search && <button onClick={startAdd} style={btnSolid}>+ Add your first contact</button>}
            </div>
          )}

          {status === 'success' && !rosterFilter && !nothing && sections.map(sec => (
            <div key={sec.letter} style={{ opacity: activeLetter && activeLetter !== sec.letter ? 0.45 : 1, transition: 'opacity .18s ease' }}>
              <div data-sec={sec.letter} style={{ margin: '32px 0 0', scrollMarginTop: 78 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 46, color: accent, lineHeight: 1 }}>{sec.letter}</span>
                  <span style={{ ...uppLbl }}>{sec.items.length} contact{sec.items.length > 1 ? 's' : ''}</span>
                </div>
                <div style={{ height: 2, background: heavy, marginTop: 8 }} />
              </div>
              {sec.items.map(p => expandedId === p.id ? dossier(p) : row(p))}
            </div>
          ))}
        </div>
      </div>

      {/* add / edit modal */}
      {editing && (
        <div onClick={() => !saving && setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,15,0.55)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: cardBg, border: `1px solid ${hair2}`, borderRadius: 1, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 26, fontFamily: UI }}>
            <div style={{ fontFamily: SERIF, fontSize: 22, color: ink, marginBottom: editing._src ? 6 : 18 }}>
              {editing._src === 'company' ? 'Edit company' : editing._src === 'talent' ? 'Edit talent' : editing._src === 'manager' ? 'Edit manager' : editing.id ? 'Edit contact' : 'New contact'}
            </div>
            {editing._src === 'company' && <div style={{ fontSize: 12, color: mut, marginBottom: 16, lineHeight: 1.6 }}>This company lives on your Brands — changes here update the brand.</div>}
            {(editing._src === 'talent' || editing._src === 'manager') && <div style={{ fontSize: 12, color: mut, marginBottom: 16, lineHeight: 1.6 }}>This lives on your Talent records — the name/email update there too{editing._src === 'manager' ? ', across every talent they manage' : ''}.</div>}

            {editing._src === 'company' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label style={fieldLbl}>Company name</label><input value={editing.name} onChange={e => setEditing(d => ({ ...d, name: e.target.value }))} style={inputStyle} autoFocus /></div>
                <div><label style={fieldLbl}>Website</label><input value={editing.website || ''} onChange={e => setEditing(d => ({ ...d, website: e.target.value }))} placeholder="company.com" style={inputStyle} /></div>
                <div><label style={fieldLbl}>Phone / company number</label><input value={editing.phone || ''} onChange={e => setEditing(d => ({ ...d, phone: e.target.value }))} style={inputStyle} /></div>
              </div>
            ) : editing._src ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label style={fieldLbl}>{editing._src === 'talent' ? 'Talent name' : 'Manager name'}</label><input value={editing.name} onChange={e => setEditing(d => ({ ...d, name: e.target.value }))} style={inputStyle} autoFocus /></div>
                <div><label style={fieldLbl}>Email</label><input value={editing.email} onChange={e => setEditing(d => ({ ...d, email: e.target.value }))} type="email" style={inputStyle} /></div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div><label style={fieldLbl}>Name</label><input value={editing.name} onChange={e => setEditing(d => ({ ...d, name: e.target.value }))} style={inputStyle} autoFocus /></div>
                  <div><label style={fieldLbl}>Title / role</label><input value={editing.title} onChange={e => setEditing(d => ({ ...d, title: e.target.value }))} placeholder="e.g. Marketing Lead" style={inputStyle} /></div>
                  <div><label style={fieldLbl}>Type</label><select value={editing.type} onChange={e => setEditing(d => ({ ...d, type: e.target.value }))} style={inputStyle}>{storableTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
                  <div><label style={fieldLbl}>Company</label><input value={editing.company} onChange={e => setEditing(d => ({ ...d, company: e.target.value }))} placeholder="Company name" style={inputStyle} /></div>
                  <div><label style={fieldLbl}>Email</label><input value={editing.email} onChange={e => setEditing(d => ({ ...d, email: e.target.value }))} type="email" style={inputStyle} /></div>
                  <div><label style={fieldLbl}>Phone</label><input value={editing.phone} onChange={e => setEditing(d => ({ ...d, phone: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={fieldLbl}>Linked client</label><select value={editing.brand_id} onChange={e => setEditing(d => ({ ...d, brand_id: e.target.value }))} style={inputStyle}><option value="">None — standalone</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                  <div><label style={fieldLbl}>Owner</label><select value={editing.owner_user_id} onChange={e => setEditing(d => ({ ...d, owner_user_id: e.target.value }))} style={inputStyle}><option value="">Unassigned</option>{members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}</select></div>
                  <div><label style={fieldLbl}>Tags</label><input value={editing.tags} onChange={e => setEditing(d => ({ ...d, tags: e.target.value }))} placeholder="VIP, Decision-maker" style={inputStyle} /></div>
                  <div><label style={fieldLbl}>Last contacted</label><input type="date" value={editing.last_contacted_at} onChange={e => setEditing(d => ({ ...d, last_contacted_at: e.target.value }))} style={inputStyle} /></div>
                </div>
                <div style={{ marginTop: 14 }}><label style={fieldLbl}>Notes</label><ExpandableTextarea dark={dark} value={editing.notes} onChange={e => setEditing(d => ({ ...d, notes: e.target.value }))} placeholder="Anything worth remembering…" style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} /></div>
              </>
            )}
            {formError && <div style={{ fontSize: 11.5, color: '#c0392b', marginTop: 12 }}>{formError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={saveEditing} disabled={saving} style={{ ...btnSolid, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : (editing.id || editing._src) ? 'Save changes' : 'Add contact'}</button>
              <button onClick={() => setEditing(null)} disabled={saving} style={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* limit modal */}
      {showLimit && (
        <div onClick={() => setShowLimit(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,15,0.55)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: cardBg, border: `1px solid ${hair2}`, borderRadius: 1, width: '100%', maxWidth: 420, padding: 28, textAlign: 'center' }}>
            <div style={{ fontFamily: SERIF, fontSize: 20, color: ink, marginBottom: 10 }}>You've reached your contact limit</div>
            <div style={{ fontSize: 13, color: body, lineHeight: 1.6, marginBottom: 20, fontFamily: UI }}>Your plan includes up to {limit === Infinity ? 'unlimited' : limit.toLocaleString()} contacts. Pro raises this to 5,000 and Business is unlimited.</div>
            <button onClick={() => setShowLimit(false)} style={btnSolid}>Got it</button>
          </div>
        </div>
      )}
    </div>
  )
}
