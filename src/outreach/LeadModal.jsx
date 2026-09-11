import { useState } from 'react'
import { STAGES, STAGE_LIKELIHOOD, LIKELIHOOD_OPTIONS, LOST_REASONS, LOST_STAGE, WON_STAGE, bareDomain } from './constants'
import { makeNote, noteEntriesFor } from './notes'
import { orNull } from './usePitches'
import { Modal, ModalTitle, Field, NoteHistory, LikelihoodGauge } from './ui'
import { tokens } from './theme'

// Track or edit a lead — a paid partnership on its way to a signed deal.
//
// A lead lives on the same row as its pitch. `pitch` is that row: one that is
// already a lead (editing), one that isn't yet ("Track as lead" — the contact
// details come across, the lead fields start blank), or null ("+ Add a lead"
// with no pitch behind it — a new row is made, already a lead).

function formFor(pitch, clients, members, userId) {
  const isLead = Boolean(pitch?.is_lead)
  const stage = (isLead && pitch.stage) || STAGES[0]
  return {
    creator_id: pitch?.creator_id || clients[0]?.id || '',
    pitched_by: pitch?.pitched_by || (members.some((m) => m.id === userId) ? userId : members[0]?.id || ''),
    brand: pitch?.brand || '',
    website: pitch?.website || '',
    contact: pitch?.contact || '',
    contact_email: pitch?.contact_email || '',
    campaign: pitch?.campaign || '',
    amount: pitch?.amount === null || pitch?.amount === undefined ? '' : String(pitch.amount),
    stage,
    likelihood: isLead && pitch.likelihood != null ? pitch.likelihood : STAGE_LIKELIHOOD[stage],
    timing: pitch?.timing || '',
    next_step: pitch?.next_step || '',
    lost_reason: pitch?.lost_reason || '',
    note: '',
  }
}

export default function LeadModal({ pitch, clients, members, userId, dark, onClose, onSave }) {
  const t = tokens(dark)
  const isEditing = Boolean(pitch?.is_lead)
  const fromPitch = Boolean(pitch) && !isEditing
  const [form, setForm] = useState(() => formFor(pitch, clients, members, userId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const existingNotes = noteEntriesFor(pitch)

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Picking a stage resets the likelihood to what that stage implies; the
  // picker below is then free to disagree. Won and lost pin it.
  const setStage = (e) => {
    const stage = e.target.value
    setForm((prev) => ({ ...prev, stage, likelihood: STAGE_LIKELIHOOD[stage] ?? prev.likelihood }))
  }
  const isClosedStage = form.stage === WON_STAGE || form.stage === LOST_STAGE

  const clientOptions = [...clients]
  if (pitch?.creator_id && !clients.some((c) => c.id === pitch.creator_id)) {
    clientOptions.push({ id: pitch.creator_id, name: pitch.client_name, kind: 'Talent' })
  }
  const orphanClient = pitch && !pitch.creator_id
  const talent = clientOptions.filter((c) => c.kind !== 'Media brand')
  const mediaBrands = clientOptions.filter((c) => c.kind === 'Media brand')

  const handleSave = async () => {
    const client = clientOptions.find((c) => c.id === form.creator_id)
    if (!client && !orphanClient) { setError('Pick who this lead is for.'); return }
    if (!form.brand.trim()) { setError('Add the brand.'); return }
    const text = form.note.trim()
    const note_entries = text ? [makeNote(text), ...existingNotes] : existingNotes
    setSaving(true); setError('')
    try {
      await onSave({
        creator_id: client?.id || null,
        client_name: client?.name || pitch?.client_name || '',
        pitched_by: orNull(form.pitched_by),
        brand: form.brand.trim(),
        website: orNull(bareDomain(form.website)),
        contact: orNull(form.contact),
        contact_email: orNull(form.contact_email),
        is_lead: true,
        campaign: orNull(form.campaign),
        amount: form.amount === '' ? null : Number(String(form.amount).replace(/[^0-9.]/g, '')) || null,
        stage: form.stage,
        likelihood: Number(form.likelihood) || 0,
        timing: orNull(form.timing),
        next_step: orNull(form.next_step),
        lost_reason: form.stage === LOST_STAGE ? orNull(form.lost_reason) : null,
        note_entries,
      })
    } catch (e) {
      setSaving(false)
      setError('Could not save: ' + (e.message || 'unknown error'))
    }
  }

  return (
    <Modal onClose={() => !saving && onClose()} label={isEditing ? 'Edit lead' : 'Track a lead'} dark={dark} width={600}>
      <ModalTitle
        eyebrow={`${isEditing ? 'Edit lead' : fromPitch ? 'From outreach' : 'New lead'} · paid partnerships only`}
        lead={isEditing ? 'Edit' : 'Track'} accent={isEditing ? 'this lead.' : 'a lead.'} dark={dark}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Client" dark={dark}>
          <select value={form.creator_id} onChange={set('creator_id')} style={t.inputStyle}>
            {orphanClient && <option value="">{pitch.client_name} (no longer on the roster)</option>}
            {talent.length > 0 && mediaBrands.length > 0 ? (
              <>
                <optgroup label="Talent">{talent.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                <optgroup label="Media brands">{mediaBrands.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
              </>
            ) : clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label="Owner" dark={dark}>
          <select value={form.pitched_by} onChange={set('pitched_by')} style={t.inputStyle}>
            <option value="">—</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
          </select>
        </Field>

        <Field label="Brand" dark={dark}>
          <input value={form.brand} onChange={set('brand')} placeholder="e.g. Similac" style={t.inputStyle} autoFocus={!fromPitch && !isEditing} />
        </Field>

        <Field label="Website" dark={dark}>
          <input value={form.website} onChange={set('website')} placeholder="brand.com" style={t.inputStyle} />
        </Field>

        <Field label="Campaign" dark={dark}>
          <input value={form.campaign} onChange={set('campaign')} placeholder="e.g. Holiday, Podcast, Event" style={t.inputStyle} autoFocus={fromPitch} />
        </Field>

        <Field label="Deal value (USD)" dark={dark}>
          <input value={form.amount} onChange={set('amount')} inputMode="decimal" placeholder="25000" style={t.inputStyle} />
        </Field>

        <Field label="Stage" dark={dark}>
          <select value={form.stage} onChange={setStage} style={t.inputStyle}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Likelihood to close" hint={isClosedStage ? undefined : 'Set from the stage; change it to your own read on whether it closes.'} dark={dark}>
          {isClosedStage ? (
            <div style={{ ...t.inputStyle, display: 'flex', alignItems: 'center' }}>
              <LikelihoodGauge value={form.likelihood} stage={form.stage} dark={dark} />
            </div>
          ) : (
            <select value={form.likelihood} onChange={set('likelihood')} style={t.inputStyle}>
              {LIKELIHOOD_OPTIONS.map((o) => <option key={o} value={o}>{o}%</option>)}
              {!LIKELIHOOD_OPTIONS.includes(Number(form.likelihood)) && <option value={form.likelihood}>{form.likelihood}%</option>}
            </select>
          )}
        </Field>

        {form.stage === LOST_STAGE && (
          <Field label="Lost reason" span dark={dark}>
            <select value={form.lost_reason} onChange={set('lost_reason')} style={t.inputStyle}>
              <option value="">— pick one —</option>
              {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        )}

        <Field label="Timing" dark={dark}>
          <input value={form.timing} onChange={set('timing')} placeholder="e.g. Q4 2026" style={t.inputStyle} />
        </Field>

        <Field label="Next step" dark={dark}>
          <input value={form.next_step} onChange={set('next_step')} placeholder="e.g. Send revised proposal by Fri" style={t.inputStyle} />
        </Field>

        <Field label="Contact name" dark={dark}>
          <input value={form.contact} onChange={set('contact')} placeholder="First Last" style={t.inputStyle} />
        </Field>

        <Field label="Contact email" dark={dark}>
          <input value={form.contact_email} onChange={set('contact_email')} type="email" placeholder="name@brand.com" style={t.inputStyle} />
        </Field>

        <Field label={existingNotes.length > 0 ? 'Add a note' : 'Notes'} span hint="Saved with today’s date as a new entry. Earlier notes are kept." dark={dark}>
          <textarea value={form.note} onChange={set('note')} rows={4} placeholder="Where it stands, what they said, what's blocking" style={{ ...t.inputStyle, resize: 'vertical', minHeight: 80 }} />
        </Field>

        {existingNotes.length > 0 && <div style={{ gridColumn: '1 / -1' }}><NoteHistory entries={existingNotes} dark={dark} /></div>}
      </div>

      {error && <div style={{ fontSize: 11.5, color: t.copper, marginTop: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button type="button" onClick={handleSave} disabled={saving} style={{ ...t.btnSolid, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add lead'}
        </button>
        <button type="button" onClick={onClose} disabled={saving} style={t.btnGhost}>Cancel</button>
      </div>
    </Modal>
  )
}
