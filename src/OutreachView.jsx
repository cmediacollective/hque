import { useState, useMemo, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { ListSkeleton } from './Skeletons'
import { usePitches } from './outreach/usePitches'
import {
  STATUSES, OPEN_STATUSES, CLOSED_STATUSES, ACTIVE_STATUSES, RESPONDED_STATUSES, DELIVERED_STATUSES,
  SUCCESS_STATUS, PITCH_TYPES, statusMeta, statusLabel, isClosed,
  STAGES, OPEN_STAGES, WON_STAGE, LOST_STAGE, LEAD_VIEWS, stageMeta, leadViewFor, isOpenStage, weightedValue,
  formatMoney, byBrand,
} from './outreach/constants'
import { StatsRow, PipelineBar, ViewTabs, Chip } from './outreach/ui'
import { tokens, UI } from './outreach/theme'
import PitchTable from './outreach/PitchTable'
import PitchModal from './outreach/PitchModal'
import LeadTable from './outreach/LeadTable'
import LeadModal from './outreach/LeadModal'
import LeadReport from './outreach/LeadReport'

// ── HQue Outreach ───────────────────────────────────────────────────────────
// Cold outreach (pitches) and the paid-partnership pipeline (leads), ported
// from the standalone cMedia outreach tool. Two sub-tabs over one table: a
// lead is a pitch with is_lead = true and the lead columns filled.
//
// The client a pitch is for is always a talent record — cMedia's own media
// brands (Momé, Mommish) are entered as talent of type "Media brand", so the
// chips can split Talent from Media brands without a separate list.

const MEDIA_BRAND_TYPE = 'media brand'

function creatorKind(creator) {
  if (!creator) return 'Talent'
  const types = Array.isArray(creator.types) && creator.types.length ? creator.types : creator.type ? [creator.type] : []
  return types.some((ty) => (ty || '').trim().toLowerCase() === MEDIA_BRAND_TYPE) ? 'Media brand' : 'Talent'
}

// A row's chip key: the talent id, or the stored name when the talent is gone.
const clientKey = (row) => row.creator_id || `name:${row.client_name}`

// Open leads read most-likely-to-close first; the archive tabs read A to Z.
const byLikelihood = (a, b) => (b.likelihood || 0) - (a.likelihood || 0) || byBrand(a, b)

export default function OutreachView({ dark = true, orgId, userId, isMobile = false, focusVersion = 0, agencyName = 'HQue' }) {
  const t = tokens(dark)
  const statuses = useMemo(() => statusMeta(dark), [dark])
  const stages = useMemo(() => stageMeta(dark), [dark])

  const { pitches, status, refetch, addPitch, updatePitch, removePitch } = usePitches(orgId, { focusVersion })
  const loading = status === 'loading'

  const [creators, setCreators] = useState([])
  const [members, setMembers] = useState([])
  const fetchCreators = () => supabase.from('creators').select('id, name, type, types, status').eq('org_id', orgId).eq('status', 'active').order('name').then(({ data }) => setCreators(data || []))
  const fetchMembers = () => supabase.rpc('org_team', { p_org_id: orgId }).then(({ data }) => setMembers(data || []))
  useEffect(() => { if (orgId) { fetchCreators(); fetchMembers() } }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (focusVersion > 0) { fetchCreators(); fetchMembers() } }, [focusVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Client dropdown: talent first, then media brands, each A→Z.
  const clients = useMemo(() => {
    const list = creators.map((c) => ({ id: c.id, name: c.name || 'Unnamed', kind: creatorKind(c) }))
    const talent = list.filter((c) => c.kind === 'Talent')
    const media = list.filter((c) => c.kind === 'Media brand')
    return [...talent, ...media]
  }, [creators])
  const creatorById = useMemo(() => new Map(creators.map((c) => [c.id, c])), [creators])
  const kindOf = useCallback((row) => creatorKind(creatorById.get(row.creator_id)), [creatorById])
  const memberName = useCallback((id) => { const m = members.find((x) => x.id === id); return m ? (m.full_name || m.email) : '' }, [members])

  // ── page + modals ────────────────────────────────────────────────────────
  const [page, setPage] = useState('outreach')
  const [pitchModal, setPitchModal] = useState(null)   // { pitch } — pitch null = new
  const [leadModal, setLeadModal] = useState(null)     // { pitch } — pitch null = new lead, is_lead false = track
  const [reportOpen, setReportOpen] = useState(false)
  const [actionError, setActionError] = useState('')

  // ── Outreach filters ─────────────────────────────────────────────────────
  const [view, setView] = useState('Active')
  const [clientFilter, setClientFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [pitchedByFilter, setPitchedByFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  // ── Leads filters ────────────────────────────────────────────────────────
  const [leadView, setLeadView] = useState('Open')
  const [leadClientFilter, setLeadClientFilter] = useState('All')
  const [stageFilter, setStageFilter] = useState('All')
  const [ownerFilter, setOwnerFilter] = useState('All')
  const [leadSearch, setLeadSearch] = useState('')
  const [leadExpandedId, setLeadExpandedId] = useState(null)

  const matchesClient = useCallback((row, filter) => {
    if (filter === 'All') return true
    if (filter === 'Talent') return kindOf(row) !== 'Media brand'
    if (filter === 'Media brands') return kindOf(row) === 'Media brand'
    return clientKey(row) === filter
  }, [kindOf])

  // Chip counts, taken over an already-narrowed list so a chip's number is
  // exactly what clicking it shows. Chips exist for every client with at
  // least one row in `pool` (the whole tab's book), plus whichever is selected.
  const chipRows = useCallback((pool, narrowed, selected) => {
    const counts = { All: narrowed.length, Talent: 0, 'Media brands': 0 }
    for (const row of narrowed) {
      const k = clientKey(row)
      counts[k] = (counts[k] || 0) + 1
      if (kindOf(row) === 'Media brand') counts['Media brands'] += 1
      else counts.Talent += 1
    }
    const seen = new Map()
    for (const row of pool) {
      const k = clientKey(row)
      if (!seen.has(k)) seen.set(k, { key: k, name: row.client_name, kind: kindOf(row) })
    }
    if (selected !== 'All' && selected !== 'Talent' && selected !== 'Media brands' && !seen.has(selected)) {
      const c = clients.find((x) => x.id === selected)
      if (c) seen.set(selected, { key: selected, name: c.name, kind: c.kind })
    }
    const list = [...seen.values()].sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'Talent' ? -1 : 1))
    return { counts, list }
  }, [kindOf, clients])

  // ── Outreach derived lists ───────────────────────────────────────────────
  const viewPitches = useMemo(
    () => pitches.filter((p) => (view === 'Closed' ? isClosed(p.status) : !isClosed(p.status))),
    [pitches, view],
  )
  const narrowed = useMemo(() => {
    const q = search.trim().toLowerCase()
    return viewPitches.filter((p) => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false
      if (typeFilter !== 'All' && p.type !== typeFilter) return false
      if (pitchedByFilter !== 'All' && p.pitched_by !== pitchedByFilter) return false
      if (!q) return true
      return [p.brand, p.contact, p.contact_email, memberName(p.pitched_by), p.client_name].some((f) => (f || '').toLowerCase().includes(q))
    })
  }, [viewPitches, statusFilter, typeFilter, pitchedByFilter, search, memberName])
  const rows = useMemo(() => narrowed.filter((p) => matchesClient(p, clientFilter)).sort(byBrand), [narrowed, clientFilter, matchesClient])
  const chips = useMemo(() => chipRows(viewPitches, narrowed, clientFilter), [viewPitches, narrowed, clientFilter, chipRows])
  const filterKey = [view, clientFilter, statusFilter, typeFilter, pitchedByFilter, search].join('|')
  const hasNarrowing = statusFilter !== 'All' || typeFilter !== 'All' || pitchedByFilter !== 'All' || search !== ''
  const clearNarrowing = () => { setStatusFilter('All'); setTypeFilter('All'); setPitchedByFilter('All'); setSearch('') }
  const closedCount = useMemo(() => pitches.filter((p) => isClosed(p.status)).length, [pitches])

  const stats = useMemo(() => {
    const active = pitches.filter((p) => ACTIVE_STATUSES.includes(p.status)).length
    const responded = pitches.filter((p) => RESPONDED_STATUSES.includes(p.status)).length
    const delivered = pitches.filter((p) => DELIVERED_STATUSES.includes(p.status)).length
    const wins = pitches.filter((p) => p.status === SUCCESS_STATUS).length
    return [
      { value: String(pitches.length), label: 'Total pitches' },
      { value: String(active), label: 'Active in pipeline' },
      { value: delivered ? `${Math.round((responded / delivered) * 100)}%` : '—', label: 'Response rate' },
      { value: String(wins), label: 'Successes' },
    ]
  }, [pitches])
  const pipeline = useMemo(
    () => STATUSES.map((s) => ({ label: statusLabel(s), count: pitches.filter((p) => p.status === s).length, bar: statuses[s].bar })),
    [pitches, statuses],
  )

  const emptyMessage = pitches.length === 0
    ? 'No pitches logged yet — use “+ Log a pitch” to add the first one.'
    : viewPitches.length === 0
      ? view === 'Closed'
        ? 'Nothing closed yet — pitches land here once they’re won, declined, bounced or marked no response.'
        : 'Nothing active — every pitch has been closed out. Check the Closed tab.'
      : hasNarrowing
        ? 'No pitches match these filters — a dropdown or the search box is narrowing the list.'
        : 'No pitches match these filters.'

  // ── Leads derived lists ──────────────────────────────────────────────────
  const leads = useMemo(() => pitches.filter((p) => p.is_lead), [pitches])
  const viewLeads = useMemo(() => leads.filter((l) => leadViewFor(l.stage) === leadView), [leads, leadView])
  const leadNarrowed = useMemo(() => {
    const q = leadSearch.trim().toLowerCase()
    return viewLeads.filter((l) => {
      if (stageFilter !== 'All' && l.stage !== stageFilter) return false
      if (ownerFilter !== 'All' && l.pitched_by !== ownerFilter) return false
      if (!q) return true
      return [l.brand, l.campaign, l.contact, l.contact_email, memberName(l.pitched_by), l.next_step, l.client_name].some((f) => (f || '').toLowerCase().includes(q))
    })
  }, [viewLeads, stageFilter, ownerFilter, leadSearch, memberName])
  const leadRows = useMemo(
    () => leadNarrowed.filter((l) => matchesClient(l, leadClientFilter)).sort(leadView === 'Open' ? byLikelihood : byBrand),
    [leadNarrowed, leadClientFilter, leadView, matchesClient],
  )
  const leadChips = useMemo(() => chipRows(viewLeads, leadNarrowed, leadClientFilter), [viewLeads, leadNarrowed, leadClientFilter, chipRows])
  const leadHasNarrowing = stageFilter !== 'All' || ownerFilter !== 'All' || leadSearch !== ''
  const clearLeadNarrowing = () => { setStageFilter('All'); setOwnerFilter('All'); setLeadSearch('') }

  const leadTabs = useMemo(() => LEAD_VIEWS.map((key) => ({ key, label: key, count: leads.filter((l) => leadViewFor(l.stage) === key).length })), [leads])
  const leadStats = useMemo(() => {
    const open = leads.filter((l) => isOpenStage(l.stage))
    const pipelineValue = open.reduce((s, l) => s + (Number(l.amount) || 0), 0)
    const weighted = open.reduce((s, l) => s + weightedValue(l), 0)
    const won = leads.filter((l) => l.stage === WON_STAGE)
    const wonTotal = won.reduce((s, l) => s + (Number(l.amount) || 0), 0)
    return [
      { value: String(open.length), label: 'Open leads' },
      { value: formatMoney(pipelineValue), label: 'Pipeline value' },
      { value: formatMoney(weighted), label: 'Weighted by likelihood' },
      { value: formatMoney(wonTotal), label: `Closed won · ${won.length}` },
    ]
  }, [leads])
  const leadPipeline = useMemo(
    () => STAGES.map((s) => ({ label: s, count: leads.filter((l) => l.stage === s).length, bar: stages[s].bar })),
    [leads, stages],
  )
  const stageOptions = leadView === 'Open' ? OPEN_STAGES : leadView === 'Won' ? [WON_STAGE] : [LOST_STAGE]
  // The report covers every lead for the chip that's selected, in every stage.
  const reportLeads = useMemo(() => leads.filter((l) => matchesClient(l, leadClientFilter)), [leads, leadClientFilter, matchesClient])
  const reportScope = leadClientFilter === 'All' ? 'All clients'
    : leadClientFilter === 'Talent' || leadClientFilter === 'Media brands' ? leadClientFilter
    : (leadChips.list.find((c) => c.key === leadClientFilter)?.name || 'Client')

  const leadEmptyMessage = leads.length === 0
    ? 'No leads yet — use “+ Add a lead”, or “Track as lead” on a pitch in Outreach.'
    : viewLeads.length === 0
      ? leadView === 'Open' ? 'Nothing open — every lead has closed.' : `Nothing ${leadView.toLowerCase()} yet.`
      : leadHasNarrowing
        ? 'No leads match these filters — a dropdown or the search box is narrowing the list.'
        : 'No leads match these filters.'

  // ── actions ──────────────────────────────────────────────────────────────
  const savePitch = async (fields) => {
    if (pitchModal?.pitch) await updatePitch(pitchModal.pitch.id, fields)
    else await addPitch(fields)
    setPitchModal(null)
  }

  const saveLead = async (fields) => {
    const source = leadModal?.pitch
    const wasLead = Boolean(source?.is_lead)
    let saved
    if (source) saved = await updatePitch(source.id, fields)
    // A lead with no pitch behind it still gets an outreach row, mid-pipeline.
    else saved = await addPitch({ ...fields, status: 'In negotiation' })
    setLeadModal(null)
    // A newly tracked lead lands you on the Leads tab to see it there.
    if (!wasLead && saved) {
      setPage('leads')
      setLeadView(leadViewFor(saved.stage))
      setLeadExpandedId(saved.id)
    }
  }

  const run = (fn) => fn().catch((e) => setActionError(e.message || 'Something went wrong.'))

  const deletePitch = (id) => run(async () => {
    await removePitch(id)
    setExpandedId((c) => (c === id ? null : c))
    setLeadExpandedId((c) => (c === id ? null : c))
  })

  // Only the lead half of the row is cleared; the pitch stays.
  const removeLead = (id) => run(async () => {
    await updatePitch(id, { is_lead: false, campaign: null, amount: null, stage: null, likelihood: null, timing: null, next_step: null, lost_reason: null })
    setLeadExpandedId((c) => (c === id ? null : c))
  })

  const viewLeadForPitch = (pitch) => {
    setPage('leads')
    setLeadView(leadViewFor(pitch.stage))
    setLeadClientFilter('All'); setStageFilter('All'); setOwnerFilter('All')
    setLeadSearch(pitch.brand || '')
    setLeadExpandedId(pitch.id)
  }

  // Searching by brand rather than scrolling is what keeps it on page 1 of the
  // table however long the list is.
  const openPitchFromLead = (lead) => {
    setPage('outreach')
    setView(isClosed(lead.status) ? 'Closed' : 'Active')
    setClientFilter('All'); setStatusFilter('All'); setTypeFilter('All'); setPitchedByFilter('All')
    setSearch(lead.brand || '')
    setExpandedId(lead.id)
  }

  const changeView = (next) => { setView(next); setStatusFilter('All'); setExpandedId(null) }
  const changeLeadView = (next) => { setLeadView(next); setStageFilter('All'); setLeadExpandedId(null) }

  // ── render helpers ───────────────────────────────────────────────────────
  const selectStyle = { ...t.inputStyle, width: 'auto', padding: '8px 11px', fontSize: 12 }

  function chipRow(chipData, selected, onPick) {
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {['All', 'Talent', 'Media brands'].map((scope) => (
            <Chip key={scope} label={scope === 'All' ? 'All clients' : scope} count={chipData.counts[scope] ?? 0} isActive={selected === scope} onClick={() => onPick(scope)} dark={dark} />
          ))}
        </div>
        {chipData.list.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {chipData.list.map((c) => (
              <Chip key={c.key} label={c.name} count={chipData.counts[c.key] ?? 0} isActive={selected === c.key} onClick={() => onPick(c.key)} dark={dark} small />
            ))}
          </div>
        )}
      </div>
    )
  }

  const subTab = (key, label) => {
    const on = page === key
    return (
      <button key={key} onClick={() => setPage(key)} style={{ padding: isMobile ? '8px 16px' : '10px 20px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: 'none', borderBottom: on ? '1.5px solid #5b7c99' : '1.5px solid transparent', color: on ? t.ink : t.mut, cursor: 'pointer', fontFamily: UI }}>{label}</button>
    )
  }

  const noClients = !loading && clients.length === 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: t.page, fontFamily: UI }}>
      {/* sub-tabs + actions */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: `0.5px solid ${t.hair2}`, background: t.page, flexShrink: 0, paddingRight: isMobile ? 12 : 24 }}>
        {subTab('outreach', 'Outreach')}
        {subTab('leads', 'Leads')}
        <span style={{ flex: 1 }} />
        {page === 'outreach'
          ? <button onClick={() => setPitchModal({ pitch: null })} disabled={noClients} title={noClients ? 'Add a talent first — a pitch is always for someone' : undefined} style={{ ...t.btnSolid, padding: '8px 14px', opacity: noClients ? 0.5 : 1 }}>+ Log a pitch</button>
          : <button onClick={() => setLeadModal({ pitch: null })} disabled={noClients} style={{ ...t.btnSolid, padding: '8px 14px', opacity: noClients ? 0.5 : 1 }}>+ Add a lead</button>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <div style={{ padding: isMobile ? '18px 14px 90px' : '28px 30px 90px', maxWidth: 1440 }}>
          {actionError && (
            <div style={{ border: `1px solid ${t.copper}`, color: t.copper, padding: '10px 14px', fontSize: 12.5, marginBottom: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
              <span style={{ flex: 1 }}>{actionError}</span>
              <button onClick={() => setActionError('')} style={{ ...t.btnText, color: t.copper }}>Dismiss</button>
            </div>
          )}
          {status === 'error' && (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: t.mut, marginBottom: 12 }}>Couldn't load outreach.</div>
              <button onClick={() => refetch()} style={t.btnSolid}>Retry</button>
            </div>
          )}
          {loading && <ListSkeleton dark={dark} rows={8} />}

          {status === 'success' && page === 'outreach' && (
            <>
              <StatsRow stats={stats} dark={dark} isMobile={isMobile} />
              <PipelineBar segments={pipeline} label="Pipeline by status" dark={dark} />
              <ViewTabs
                view={view} onChange={changeView} dark={dark} label="Pipeline list"
                tabs={[{ key: 'Active', label: 'Active', count: pitches.length - closedCount }, { key: 'Closed', label: 'Closed', count: closedCount }]}
              />
              {chipRow(chips, clientFilter, setClientFilter)}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" style={selectStyle}>
                  <option value="All">All statuses</option>
                  {(view === 'Closed' ? CLOSED_STATUSES : OPEN_STATUSES).map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by pitch type" style={selectStyle}>
                  <option value="All">All types</option>
                  {PITCH_TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
                </select>
                <select value={pitchedByFilter} onChange={(e) => setPitchedByFilter(e.target.value)} aria-label="Filter by who pitched" style={selectStyle}>
                  <option value="All">All pitchers</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
                </select>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search brand or contact…" aria-label="Search brand, contact, email or pitcher" style={{ ...t.inputStyle, width: isMobile ? '100%' : 220, padding: '8px 11px', fontSize: 12 }} />
                {hasNarrowing && <button type="button" onClick={clearNarrowing} style={t.btnText}>Clear filters</button>}
              </div>
              <PitchTable
                rows={rows} totalPitches={pitches.length} emptyMessage={emptyMessage} filterKey={filterKey}
                expandedId={expandedId} onToggleRow={(id) => setExpandedId((c) => (c === id ? null : id))}
                onEdit={(p) => setPitchModal({ pitch: p })} onDelete={deletePitch}
                onTrackLead={(p) => setLeadModal({ pitch: p })} onViewLead={viewLeadForPitch}
                memberName={memberName} clientKind={kindOf} dark={dark}
              />
            </>
          )}

          {status === 'success' && page === 'leads' && (
            <>
              <StatsRow stats={leadStats} dark={dark} isMobile={isMobile} />
              <PipelineBar segments={leadPipeline} label="Pipeline by stage" dark={dark} />
              <ViewTabs view={leadView} tabs={leadTabs} onChange={changeLeadView} dark={dark} label="Lead list" />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>{chipRow(leadChips, leadClientFilter, setLeadClientFilter)}</div>
                <button type="button" onClick={() => setReportOpen(true)} disabled={reportLeads.length === 0} title="A print-ready lead list for the selected client" style={{ ...t.btnGhost, opacity: reportLeads.length === 0 ? 0.4 : 1, whiteSpace: 'nowrap' }}>
                  Client report{leadClientFilter !== 'All' && <span style={{ color: t.accent }}> · {reportScope}</span>}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
                <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} aria-label="Filter by stage" style={selectStyle}>
                  <option value="All">All stages</option>
                  {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} aria-label="Filter by owner" style={selectStyle}>
                  <option value="All">All owners</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
                </select>
                <input value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} placeholder="Search brand or campaign…" aria-label="Search brand, campaign, contact or next step" style={{ ...t.inputStyle, width: isMobile ? '100%' : 220, padding: '8px 11px', fontSize: 12 }} />
                {leadHasNarrowing && <button type="button" onClick={clearLeadNarrowing} style={t.btnText}>Clear filters</button>}
              </div>
              <LeadTable
                rows={leadRows} emptyMessage={leadEmptyMessage}
                expandedId={leadExpandedId} onToggleRow={(id) => setLeadExpandedId((c) => (c === id ? null : id))}
                onEdit={(l) => setLeadModal({ pitch: l })} onRemove={removeLead} onOpenPitch={openPitchFromLead}
                memberName={memberName} clientKind={kindOf} dark={dark}
              />
              {leads.length > 0 && (
                <div style={{ marginTop: 14, ...t.uppLbl }}>
                  {leadRows.length === 0 ? 'No leads shown' : `${leadRows.length} ${leadRows.length === 1 ? 'lead' : 'leads'} shown`} · click a row for details
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {pitchModal && (
        <PitchModal key={pitchModal.pitch?.id || 'new'} pitch={pitchModal.pitch} clients={clients} members={members} userId={userId} dark={dark} onClose={() => setPitchModal(null)} onSave={savePitch} />
      )}
      {leadModal && (
        <LeadModal key={leadModal.pitch?.id || 'new'} pitch={leadModal.pitch} clients={clients} members={members} userId={userId} dark={dark} onClose={() => setLeadModal(null)} onSave={saveLead} />
      )}
      {reportOpen && (
        <LeadReport scope={reportScope} leads={reportLeads} agencyName={agencyName} memberName={memberName} onClose={() => setReportOpen(false)} />
      )}
    </div>
  )
}
