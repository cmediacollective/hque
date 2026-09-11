// Notes on a pitch are an append-only log: newest entry first, each stamped
// with the moment it was written. Adding a note never rewrites the ones
// already there. Stored whole in pitches.note_entries (jsonb).

/** The note log for a row. Always an array, newest first. */
export function noteEntriesFor(pitch) {
  return Array.isArray(pitch?.note_entries) ? pitch.note_entries : []
}

/** A new entry stamped with the current date and time. */
export function makeNote(text, now = new Date()) {
  return { id: `n${now.getTime()}`, at: now.toISOString(), text: text.trim() }
}

/** "Sep 1, 2026 · 10:42 AM", or a plain label for notes imported without a time. */
export function formatNoteStamp(at) {
  if (!at) return 'Earlier note'
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return 'Earlier note'
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}

// Whole emails get pasted in, so anything past a few lines is collapsed until
// asked for. Measured on the text itself — no layout measurement needed.
export function isLongNote(text) {
  return (text || '').length > 260 || (text || '').split('\n').length > 4
}
