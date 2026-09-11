import { useState } from 'react'
import { PITCH_TYPES, STATUSES, statusLabel, bareDomain, isISODate } from './constants'
import { makeNote, noteEntriesFor } from './notes'
import { orNull } from './usePitches'
import { Modal, ModalTitle, Field, NoteHistory } from './ui'
import { tokens } from './theme'

// Log or edit a pitch. Six fields and a note; nothing else is required — the
// whole point of this board is that logging a pitch takes seconds.
//
// `clients` — active talent for the Client dropdown, talent first then media
// brands. `members` — the company's people for Pitched by. `userId` — who is
// logging it, the default pitcher.

function formFor(pitch, clients, members, userId) {
  const firstClient = clients[0]
  if (!pitch) {
    return {
      creator_id: firstClient?.id || '',
      pitched_by: members.some((m) => m.id === userId) ? userId : members[0]?.id || '',
      type: PITCH_TYPES[0],
      brand: '',
      website: '',
      status: STATUSES[0],
      contact: '',
      contact_email: '',
      sent_on: '',
      follow_up: '',
      note: '',
    }
  }
  return {
    creator_id: pitch.creator_id || '',
    pitched_by: pitch.pitched_by || '',
    type: pitch.type || PITCH_TYPES[0],
    brand: pitch.brand || '',
    website: pitch.website || '',
    status: pitch.status || STATUSES[0],
    contact: pitch.contact || '',
    contact_email: pitch.contact_email || '',
    sent_on: isISODate(pitch.sent_on) ? pitch.sent_on : '',
    follow_up: isISODate(pitch.follow_up) ? pitch.follow_up : '',
    // Always blank: typing here appends an entry, it never rewrites the log.
    note: '',
  }
}

export default function PitchModal({ pitch, clients, members, userId, dark, onClose, onSave }) {
  const t = tokens(dark)
  const isEditing = Boolean(pitch)
  const [form, setForm] = useState(() => formFor(pitch, clients, members, userId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const existingNotes = noteEntriesFor(pitch)

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // A pitch whose talent has since been archived still shows its name.
  const clientOptions = [...clients]
  if (pitch?.creator_id && !clients.some((c) => c.id === pitch.creator_id)) {
    clientOptions.push({ id: pitch.creator_id, name: pitch.client_name, kind: 'Talent' })
  }
  const orphanClient = pitch && !pitch.creator_id
  const talent = clientOptions.filter((c) => c.kind !== 'Media brand')
  const mediaBrands = clientOptions.filter((c) => c.kind === 'Media brand')

  const handleSave = async () => {
    const client = clientOptions.find((c) => c.id === form.creator_id)
    if (!client && !orphanClient) { setError('Pick who this pitch is for.'); return }
    if (!form.brand.trim()) { setError('Add the brand or outlet you pitched.'); return }
    const text = form.note.trim()
    const note_entries = text ? [makeNote(text), ...existingNotes] : existingNotes
    setSaving(true); setError('')
    try {
      await onSave({
        creator_id: client?.id || null,
        client_name: client?.name || pitch?.client_name || '',
        pitched_by: orNull(form.pitched_by),
        type: form.type,
        brand: form.brand.trim(),
        website: orNull(bareDomain(form.website)),
        contact: orNull(form.contact),
        contact_email: orNull(form.contact_email),
        status: form.status,
        sent_on: orNull(form.sent_on),
        follow_up: orNull(form.follow_up),
        note_entries,
      })
    } catch (e) {
      setSaving(false)
      setError('Could not save: ' + (e.message || 'unknown error'))
    }
  }

  return (
    <Modal onClose={() => !saving && onClose()} label={isEditing ? 'Edit pitch' : 'Log a pitch'} dark={dark}>
      <ModalTitle eyebrow={isEditing ? 'Edit outreach' : 'New outreach'} lead={isEditing ? 'Edit' : 'Log'} accent={isEditing ? 'this pitch.' : 'a pitch.'} dark={dark} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Client" dark={dark}>
          <select value={form.creator_id} onChange={set('creator_id')} style={t.inputStyle} autoFocus={!isEditing}>
            {orphanClient && <option value="">{pitch.client_name} (no longer on the roster)</option>}
            {talent.length > 0 && mediaBrands.length > 0 ? (
              <>
                <optgroup label="Talent">{talent.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                <optgroup label="Media brands">{mediaBrands.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
              </>
            ) : clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label="Pitched by" dark={dark}>
          <select value={form.pitched_by} onChange={set('pitched_by')} style={t.inputStyle}>
            <option value="">—</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
          </select>
        </Field>

        <Field label="Pitch type" dark={dark}>
          <select value={form.type} onChange={set('type')} style={t.inputStyle}>
            {PITCH_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>

        <Field label="Brand / outlet" dark={dark}>
          <input value={form.brand} onChange={set('brand')} placeholder="e.g. Sakara Life" style={t.inputStyle} />
        </Field>

        <Field label="Website" dark={dark}>
          <input value={form.website} onChange={set('website')} placeholder="brand.com" style={t.inputStyle} />
        </Field>

        <Field label="Status" dark={dark}>
          <select value={form.status} onChange={set('status')} style={t.inputStyle}>
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            {!STATUSES.includes(form.status) && <option value={form.status}>{form.status}</option>}
          </select>
        </Field>

        <Field label="Contact name" dark={dark}>
          <input value={form.contact} onChange={set('contact')} placeholder="First Last" style={t.inputStyle} />
        </Field>

        <Field label="Contact email" dark={dark}>
          <input value={form.contact_email} onChange={set('contact_email')} type="email" placeholder="name@brand.com" style={t.inputStyle} />
        </Field>

        <Field label="Date sent" dark={dark}>
          <input value={form.sent_on} onChange={set('sent_on')} type="date" style={t.inputStyle} />
        </Field>

        <Field label="Follow-up date" dark={dark}>
          <input value={form.follow_up} onChange={set('follow_up')} type="date" style={t.inputStyle} />
        </Field>

        <Field label={existingNotes.length > 0 ? 'Add a note' : 'Notes'} span hint="Saved with today’s date as a new entry. Earlier notes are kept." dark={dark}>
          <textarea value={form.note} onChange={set('note')} rows={4} placeholder="Angle, ask, or paste the whole email" style={{ ...t.inputStyle, resize: 'vertical', minHeight: 80 }} />
        </Field>

        {existingNotes.length > 0 && <div style={{ gridColumn: '1 / -1' }}><NoteHistory entries={existingNotes} dark={dark} /></div>}
      </div>

      {error && <div style={{ fontSize: 11.5, color: t.copper, marginTop: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button type="button" onClick={handleSave} disabled={saving} style={{ ...t.btnSolid, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add pitch'}
        </button>
        <button type="button" onClick={onClose} disabled={saving} style={t.btnGhost}>Cancel</button>
      </div>
    </Modal>
  )
}
