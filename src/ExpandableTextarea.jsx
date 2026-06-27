import { useState } from 'react'

// A <textarea> with a small corner expand/collapse toggle, so users can grow the
// field to write and review longer text, then shrink it back. Drop-in for a plain
// textarea: pass the same props (value, onChange, placeholder, style, etc.).
//   - Collapsed: uses the style's own minHeight/height (or 70px).
//   - Expanded: overrides min-height to expandedMinHeight.
// Outer margins from `style` are lifted onto the wrapper so surrounding spacing
// is preserved. Pass `dark` so the toggle button matches the theme.
export default function ExpandableTextarea({ style = {}, expandedMinHeight = 260, dark = false, ...props }) {
  const [expanded, setExpanded] = useState(false)

  const { margin, marginTop, marginBottom, marginLeft, marginRight, width, ...textStyle } = style
  const collapsedMin = style.minHeight ?? style.height ?? '70px'
  const btnBorder = dark ? '#3A3A3A' : '#CCC7BF'
  const btnColor = dark ? '#AAA' : '#666'

  return (
    <div style={{ position: 'relative', width: width ?? '100%', margin, marginTop, marginBottom, marginLeft, marginRight }}>
      <button
        type='button'
        onClick={() => setExpanded(v => !v)}
        title={expanded ? 'Shrink' : 'Expand'}
        style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 2, background: dark ? 'rgba(20,20,20,0.72)' : 'rgba(255,255,255,0.82)', border: `0.5px solid ${btnBorder}`, borderRadius: '3px', color: btnColor, cursor: 'pointer', padding: '2px 3px', lineHeight: 0, display: 'flex' }}>
        {expanded ? (
          <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='4 14 10 14 10 20'/><polyline points='20 10 14 10 14 4'/><line x1='14' y1='10' x2='21' y2='3'/><line x1='3' y1='21' x2='10' y2='14'/></svg>
        ) : (
          <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 3 21 3 21 9'/><polyline points='9 21 3 21 3 15'/><line x1='21' y1='3' x2='14' y2='10'/><line x1='3' y1='21' x2='10' y2='14'/></svg>
        )}
      </button>
      <textarea {...props} style={{ ...textStyle, width: '100%', minHeight: expanded ? `${expandedMinHeight}px` : collapsedMin, transition: 'min-height 0.15s', boxSizing: 'border-box' }} />
    </div>
  )
}
