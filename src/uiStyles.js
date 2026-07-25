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
