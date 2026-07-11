import { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const dotRef = useRef(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    if (!fine) return
    setEnabled(true)

    // Position is updated via the `translate` property (no CSS transition on it),
    // so the dot tracks the mouse instantly — no trailing/lag. The -7px centers
    // the 14px dot on the cursor. The hover "grow" is a separate `scale` property
    // that IS transitioned, so it stays smooth without slowing the movement.
    const onMove = e => {
      const el = dotRef.current
      if (el) el.style.translate = `${e.clientX - 7}px ${e.clientY - 7}px`
    }

    // Toggle hover state by adding/removing a class directly on the dot, so the
    // listeners below are bound once and never rebound (which used to feel finicky).
    const onOver = e => {
      if (e.target.closest && e.target.closest('a, button, [data-cursor]')) dotRef.current?.classList.add('is-hover')
    }
    const onOut = e => {
      if (e.target.closest && e.target.closest('a, button, [data-cursor]')) dotRef.current?.classList.remove('is-hover')
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    document.body.style.cursor = 'none'

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.body.style.cursor = ''
    }
  }, [])

  if (!enabled) return null

  return (
    <>
      <style>{`
        a, button, [data-cursor] { cursor: none; }
        .hque-dot { transition: scale 0.15s ease; }
        .hque-dot.is-hover { scale: 1.6; }
      `}</style>
      <div
        ref={dotRef}
        className="hque-dot"
        style={{
          position: 'fixed', top: 0, left: 0, width: '14px', height: '14px',
          background: '#5b7c99', borderRadius: '50%',
          pointerEvents: 'none', zIndex: 9999,
          willChange: 'translate, scale',
        }}
      />
    </>
  )
}
