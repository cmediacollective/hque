// Shared board helpers so the board header and the sidebar agree on what counts
// as a "done" task. Keep this the single source of truth — the two used to drift.

export const DONE_COLUMN_NAMES = ['done', 'completed', 'complete', 'shipped', 'closed']

// A column is "done" if it's named like one, or if it's the rightmost column on
// the board (that's where finished work lands, whatever it's been renamed to).
export function doneColumnIds(columns) {
  const ids = new Set()
  if (!columns || columns.length === 0) return ids
  let last = columns[0]
  columns.forEach(c => {
    if (DONE_COLUMN_NAMES.includes((c.name || '').trim().toLowerCase())) ids.add(c.id)
    if (c.position > last.position) last = c
  })
  ids.add(last.id)
  return ids
}

// Same rule, applied across many boards at once (columns from several boards mixed together).
export function doneColumnIdsAcrossBoards(columns) {
  const byBoard = {}
  ;(columns || []).forEach(c => {
    if (!byBoard[c.board_id]) byBoard[c.board_id] = []
    byBoard[c.board_id].push(c)
  })
  const all = new Set()
  Object.values(byBoard).forEach(cols => doneColumnIds(cols).forEach(id => all.add(id)))
  return all
}
