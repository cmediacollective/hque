import { Fragment } from 'react'
import { stageMeta, statusMeta, statusLabel, formatMoney, weightedValue, websiteFor, websiteUrl, LOST_STAGE } from './constants'
import { noteEntriesFor } from './notes'
import { NotesLog, Chevron, DeleteControl, LikelihoodGauge } from './ui'
import { tokens, UI } from './theme'

// Same grid discipline as PitchTable: every flexible track carries a px floor.
const GRID_COLUMNS =
  'minmax(120px,150px) minmax(150px,1.3fr) minmax(120px,1fr) 96px minmax(118px,140px) 128px 84px minmax(96px,120px)'
const MIN_TABLE_WIDTH = 1000
const CHEVRON_INDENT = 18

const cell = { minWidth: 0 }
const cellStack = { ...cell, display: 'flex', flexDirection: 'column', gap: 3 }
const wrapAnywhere = { overflowWrap: 'anywhere' }

export default function LeadTable({
  rows,
  emptyMessage,
  expandedId,
  onToggleRow,
  onEdit,
  onRemove,
  onOpenPitch,
  memberName,
  clientKind,
  dark,
}) {
  const t = tokens(dark)
  const stages = stageMeta(dark)
  const statuses = statusMeta(dark)
  const headerCell = { ...t.uppLbl, fontSize: '9.5px' }
  const detailLabel = { ...t.uppLbl, marginBottom: 5 }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ border: `1px solid ${t.hair2}`, borderRadius: 1, minWidth: MIN_TABLE_WIDTH, background: t.cardBg }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 12, padding: '12px 20px', borderBottom: `1px solid ${t.hair2}` }}>
          <div style={{ ...headerCell, paddingLeft: CHEVRON_INDENT }}>Client</div>
          <div style={headerCell}>Brand</div>
          <div style={headerCell}>Campaign</div>
          <div style={headerCell}>Value</div>
          <div style={headerCell}>Stage</div>
          <div style={headerCell}>Likelihood</div>
          <div style={headerCell}>Timing</div>
          <div style={headerCell}>Owner</div>
        </div>

        {rows.map((lead) => {
          const m = stages[lead.stage] || stages['Identified']
          const site = websiteFor(lead)
          const url = websiteUrl(site)
          const isExpanded = expandedId === lead.id
          const noteEntries = noteEntriesFor(lead)
          const weighted = weightedValue(lead)
          const pitchStatus = statuses[lead.status] || statuses['Sent']

          return (
            <Fragment key={lead.id}>
              <div
                role="button" tabIndex={0} aria-expanded={isExpanded}
                onClick={() => onToggleRow(lead.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleRow(lead.id) } }}
                onMouseEnter={(e) => { e.currentTarget.style.background = t.tint }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isExpanded ? t.tint : 'transparent' }}
                style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 12, padding: '14px 20px', borderBottom: `1px solid ${t.hair}`, fontSize: 13, alignItems: 'center', cursor: 'pointer', fontFamily: UI, background: isExpanded ? t.tint : 'transparent' }}
              >
                <div style={{ ...cell, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Chevron expanded={isExpanded} color={isExpanded ? t.accent : t.mut2} />
                  <div style={cellStack}>
                    <span style={{ color: t.ink, fontWeight: 500 }}>{lead.client_name}</span>
                    <span style={{ ...t.uppLbl, fontSize: '9px' }}>{clientKind(lead)}</span>
                  </div>
                </div>

                <div style={cellStack}>
                  <span style={{ ...wrapAnywhere, color: t.body }}>{lead.brand}</span>
                  {url && <a href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ ...wrapAnywhere, fontSize: 11, color: t.accent, textDecoration: 'none' }}>{site}</a>}
                </div>

                <div style={{ ...cell, ...wrapAnywhere, color: lead.campaign ? t.body : t.mut2, lineHeight: 1.4 }}>{lead.campaign || '—'}</div>

                <div style={cellStack}>
                  <span style={{ color: t.ink, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(lead.amount)}</span>
                  {weighted > 0 && <span title="Value × likelihood" style={{ fontSize: 10, color: t.mut, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(weighted)} wtd</span>}
                </div>

                <div style={{ ...cell, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 1, background: m.bar, flex: 'none' }} />
                  <span style={{ fontSize: 11.5, color: m.color, lineHeight: 1.4 }}>{lead.stage}</span>
                </div>

                <div style={cell}><LikelihoodGauge value={lead.likelihood} stage={lead.stage} dark={dark} /></div>

                <div style={{ ...cell, fontSize: 12, color: lead.timing ? t.body2 : t.mut2 }}>{lead.timing || '—'}</div>

                <div style={{ ...cell, fontSize: 12, color: t.body2, lineHeight: 1.4 }}>{memberName(lead.pitched_by) || '—'}</div>
              </div>

              {isExpanded && (
                <div style={{ padding: '16px 24px 20px', borderBottom: `1px solid ${t.hair}`, background: t.bandBg }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 18 }}>
                    <div>
                      <div style={detailLabel}>Next step</div>
                      <div style={{ fontSize: 13, color: lead.next_step ? t.body : t.mut2, lineHeight: 1.5, fontFamily: UI }}>{lead.next_step || '—'}</div>
                    </div>
                    <div>
                      <div style={detailLabel}>Contact</div>
                      <div style={{ fontSize: 13, color: lead.contact ? t.body : t.mut2, lineHeight: 1.5, fontFamily: UI }}>
                        {lead.contact || '—'}
                        {lead.contact_email && <div style={{ fontSize: 11, color: t.mut }}>{lead.contact_email}</div>}
                      </div>
                    </div>
                    {lead.stage === LOST_STAGE && (
                      <div>
                        <div style={detailLabel}>Lost reason</div>
                        <div style={{ fontSize: 13, color: t.copper, lineHeight: 1.5, fontFamily: UI }}>{lead.lost_reason || '—'}</div>
                      </div>
                    )}
                    <div>
                      <div style={detailLabel}>Outreach</div>
                      <button type="button" onClick={() => onOpenPitch(lead)} title="Open this pitch on the Outreach tab" style={{ ...t.btnText, display: 'inline-flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                        <span style={{ width: 7, height: 7, borderRadius: 1, flex: 'none', background: pitchStatus.bar }} />
                        {statusLabel(lead.status)} →
                      </button>
                    </div>
                  </div>

                  <div style={{ ...t.uppLbl, color: t.accent, marginBottom: 10 }}>
                    Notes{noteEntries.length > 1 && <span style={{ color: t.mut }}> · {noteEntries.length} entries</span>}
                  </div>
                  <NotesLog entries={noteEntries} dark={dark} editLabel="Edit lead" />

                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => onEdit(lead)} style={t.btnSolid}>Edit lead</button>
                    {/* The pitch stays; only the lead half of the row is cleared. */}
                    <DeleteControl onConfirm={() => onRemove(lead.id)} label="Stop tracking as lead" confirmLabel="Confirm — keep the pitch, drop the lead" dark={dark} />
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
  )
}
