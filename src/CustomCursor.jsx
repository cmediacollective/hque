import { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const dotRef = useRef(null)
  const [enabled, setEnabled] = useState(false)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    if (!fine) return
    setEnabled(true)

    const onMove = e => {
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%) scale(${hover ? 1.5 : 1})`
      }
    }

    const onOver = e => {
      const t = e.target
      if (t.closest && t.closest('a, button, [data-cursor]')) setHover(true)
    }
    const onOut = e => {
      const t = e.target
      if (t.closest && t.closest('a, button, [data-cursor]')) setHover(false)
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
  }, [hover])

  if (!enabled) return null

  return (
    <>
      <style>{`
        a, button, [data-cursor] { cursor: none; }
        .hque-dot { transition: transform 0.18s ease; }
      `}</style>
      <div
        ref={dotRef}
        className="hque-dot"
        style={{
          position: 'fixed', top: 0, left: 0, width: '14px', height: '14px',
          background: '#5b7c99', borderRadius: '50%',
          pointerEvents: 'none', zIndex: 9999,
          willChange: 'transform',
        }}
      />
    </>
  )
}
