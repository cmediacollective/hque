import { Fragment, useRef, useState } from 'react'
import { AWAITING_REPLY_STATUSES, statusMeta, statusLabel, canTrackAsLead, formatDate, websiteFor, websiteUrl } from './constants'
import { noteEntriesFor } from './notes'
import { NotesLog, Chevron, DeleteControl } from './ui'
import { tokens, UI } from './theme'

// Header and body rows share one track definition so the columns stay aligned.
// Every flexible track carries a px floor, never a bare fr: an fr track's
// automatic minimum is its min-content width, and each row is its own grid, so
// one long unbreakable email would widen that row's Contact track and shove
// every column after it out of step with the header.
const GRID_COLUMNS =
  'minmax(128px,168px) minmax(150px,1.3fr) minmax(160px,1.2fr) minmax(90px,136px) minmax(84px,110px) 64px 84px minmax(118px,150px)'

// Below this the table scrolls sideways rather than crushing Brand and
// Contact into a column of single words.
const MIN_TABLE_WIDTH = 1000
const CHEVRON_INDENT = 18

// Grid items default to min-width:auto; every cell opts out so the track
// definition above is the final word.
const cell = { minWidth: 0 }
const cellStack = { ...cell, display: 'flex', flexDirection: 'column', gap: 3 }
const wrapAnywhere = { overflowWrap: 'anywhere' }

// One screenful. Long lists load in full and paginate here, so paging never
// waits on the network.
const PAGE_SIZE = 50

export default function PitchTable({
  rows,
  totalPitches,
  emptyMessage,
  // Any change here is a different list, so the table returns to page 1.
  filterKey,
  expandedId,
  onToggleRow,
  onEdit,
  onDelete,
  onTrackLead,
  onViewLead,
  memberName,
  clientKind,
  dark,
}) {
  const t = tokens(dark)
  const meta = statusMeta(dark)
  // The page is remembered together with the list it belongs to, so a new
  // filter, tab or search reads as page 1 without an effect.
  const [pageState, setPageState] = useState({ page: 1, key: filterKey })
  const page = pageState.key === filterKey ? pageState.page : 1
  const setPage = (next) => setPageState({ page: next, key: filterKey })
  const topRef = useRef(null)

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  // Clamped rather than stored: deleting the last row of the last page, or a
  // filter narrowing the list, must not strand you past the end.
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const pageRows = rows.slice(start, start + PAGE_SIZE)

  const goToPage = (next) => {
    setPage(next)
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  const headerCell = { ...t.uppLbl, fontSize: '9.5px' }

  return (
    <>
      <div ref={topRef} style={{ scrollMarginTop: 24 }} />
      <div style={{ overflowX: 'auto' }}>
        <div style={{ border: `1px solid ${t.hair2}`, borderRadius: 1, minWidth: MIN_TABLE_WIDTH, background: t.cardBg }}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 12, padding: '12px 20px', borderBottom: `1px solid ${t.hair2}` }}>
            <div style={{ ...headerCell, paddingLeft: CHEVRON_INDENT }}>Client</div>
            <div style={headerCell}>Brand / Outlet</div>
            <div style={headerCell}>Contact</div>
            <div style={headerCell}>Type</div>
            <div style={headerCell}>Pitched by</div>
            <div style={headerCell}>Sent</div>
            <div style={headerCell}>Follow-up</div>
            <div style={headerCell}>Status</div>
          </div>

          {pageRows.map((pitch) => {
            const m = meta[pitch.status] || meta['Sent']
            const site = websiteFor(pitch)
            const url = websiteUrl(site)
            const isExpanded = expandedId === pitch.id
            const noteEntries = noteEntriesFor(pitch)
            const followUpColor = AWAITING_REPLY_STATUSES.includes(pitch.status) ? t.accent : t.mut

            return (
              <Fragment key={pitch.id}>
                <div
                  role="button" tabIndex={0} aria-expanded={isExpanded}
                  onClick={() => onToggleRow(pitch.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleRow(pitch.id) } }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = t.tint }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isExpanded ? t.tint : 'transparent' }}
                  style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 12, padding: '14px 20px', borderBottom: `1px solid ${t.hair}`, fontSize: 13, alignItems: 'center', cursor: 'pointer', fontFamily: UI, background: isExpanded ? t.tint : 'transparent' }}
                >
                  <div style={{ ...cell, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Chevron expanded={isExpanded} color={isExpanded ? t.accent : t.mut2} />
                    <div style={cellStack}>
                      <span style={{ color: t.ink, fontWeight: 500 }}>{pitch.client_name}</span>
                      <span style={{ ...t.uppLbl, fontSize: '9px' }}>{clientKind(pitch)}</span>
                    </div>
                  </div>

                  <div style={cellStack}>
                    <span style={{ ...wrapAnywhere, color: t.body }}>{pitch.brand}</span>
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ ...wrapAnywhere, fontSize: 11, color: t.accent, textDecoration: 'none' }}>{site}</a>
                    )}
                  </div>

                  <div style={cellStack}>
                    <span style={{ ...wrapAnywhere, color: pitch.contact ? t.body : t.mut2 }}>{pitch.contact || '—'}</span>
                    {pitch.contact_email && <span style={{ ...wrapAnywhere, fontSize: 11, color: t.mut }}>{pitch.contact_email}</span>}
                  </div>

                  <div style={{ ...cell, fontSize: 11.5, color: t.body2, lineHeight: 1.4 }}>{pitch.type || '—'}</div>

                  <div style={{ ...cell, fontSize: 12, color: t.body2, lineHeight: 1.4 }}>{memberName(pitch.pitched_by) || '—'}</div>

                  <div style={{ ...cell, fontSize: 12, color: t.mut }}>{formatDate(pitch.sent_on)}</div>
                  <div style={{ ...cell, fontSize: 12, color: followUpColor }}>{formatDate(pitch.follow_up)}</div>

                  <div style={{ ...cell, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 1, background: m.bar, flex: 'none' }} />
                    <span style={{ fontSize: 11.5, color: m.color, lineHeight: 1.4 }}>{statusLabel(pitch.status)}</span>
                    {pitch.is_lead && <span title="Tracked as a lead" style={{ ...t.uppLbl, fontSize: '8px', color: t.accent, border: `1px solid ${t.accent}`, borderRadius: 999, padding: '2px 6px' }}>Lead</span>}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '16px 24px 20px', borderBottom: `1px solid ${t.hair}`, background: t.bandBg }}>
                    <div style={{ ...t.uppLbl, color: t.accent, marginBottom: 10 }}>
                      Notes{noteEntries.length > 1 && <span style={{ color: t.mut }}> · {noteEntries.length} entries</span>}
                    </div>
                    <NotesLog entries={noteEntries} dark={dark} />

                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => onEdit(pitch)} style={t.btnSolid}>Edit pitch</button>

                      {/* Paid partnerships only: press and PR pitches never become leads. */}
                      {pitch.is_lead ? (
                        <button type="button" onClick={() => onViewLead(pitch)} style={t.btnText}>View lead →</button>
                      ) : canTrackAsLead(pitch) ? (
                        <button type="button" onClick={() => onTrackLead(pitch)} style={t.btnText}>Track as lead</button>
                      ) : null}

                      <DeleteControl onConfirm={() => onDelete(pitch.id)} confirmLabel={pitch.is_lead ? 'Confirm delete (and its lead)' : 'Confirm delete'} dark={dark} />
                    </div>
                  </div>
                )}
              </Fragment>
            )
          })}

          {rows.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: t.mut, fontFamily: UI }}>{emptyMessage}</div>
          )}
        </div>
      </div>

      {totalPitches > 0 && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', ...t.uppLbl }}>
          <div>
            {rows.length === 0
              ? 'No pitches shown'
              : pageCount === 1
                ? `${rows.length} ${rows.length === 1 ? 'pitch' : 'pitches'} shown`
                : `Showing ${start + 1}–${start + pageRows.length} of ${rows.length}`}{' '}
            · click a row for notes
          </div>

          {pageCount > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{ ...t.btnText, color: currentPage === 1 ? t.mut2 : t.accent, cursor: currentPage === 1 ? 'default' : 'pointer' }}>← Prev</button>
              <span style={{ color: t.body2 }}>Page {currentPage} of {pageCount}</span>
              <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pageCount} style={{ ...t.btnText, color: currentPage === pageCount ? t.mut2 : t.accent, cursor: currentPage === pageCount ? 'default' : 'pointer' }}>Next →</button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
