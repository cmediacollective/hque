// Shared UI style helpers, so a tweak here updates every screen at once and the
// styling can't drift apart again.

// The small uppercase label above a form field or settings sub-section. Bumped
// up from the old 7–8px/light-gray so it's actually readable. Theme-aware.
// For accent-colored labels (a blue active tab, a red "Danger zone"), spread
// this and override `color`, so the readable size/spacing stays shared.
export function fieldLabelStyle(dark) {
  return {
    fontSize: '11px',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: dark ? '#AAAAAA' : '#5A5A5A',
  }
}

// The site-wide CHIP: a rounded pill, normal-case, thin soft border — the
// look of the Talent Labels chips. Used for filters and toggles everywhere so
// nothing reads as a squared "AI" chip. Buttons are deliberately NOT chips.
//   filterChipStyle(dark, active)  → clickable filter/toggle
// Spread it and override to add a leading color dot, counts, etc.
export function filterChipStyle(dark, active, accent = '#5b7c99') {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '6px 13px',
    fontSize: '12px',
    fontWeight: active ? 500 : 400,
    lineHeight: 1,
    borderRadius: '999px',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    border: `1px solid ${active ? accent : (dark ? '#3A3A3A' : '#DBD7D0')}`,
    background: active ? accent : (dark ? '#1E1E1E' : '#FFFFFF'),
    color: active ? '#fff' : (dark ? '#A5A099' : '#666'),
    boxShadow: active ? '0 1px 3px rgba(91,124,153,0.30)' : 'none',
    transition: 'background 0.14s, border-color 0.14s, color 0.14s',
  }
}

// A read-only category/status PILL — tinted background + colored text, same
// rounded geometry as the filter chip. Pass the category's color.
export function tagPillStyle(dark, color = '#8C877D') {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    fontSize: '11.5px',
    fontWeight: 500,
    lineHeight: 1.5,
    borderRadius: '999px',
    whiteSpace: 'nowrap',
    color,
    background: color + (dark ? '22' : '14'),
    border: `1px solid ${color}33`,
  }
}
