import { useEffect, useRef } from 'react'

const HOVER_SELECTOR = 'a, [data-cursor="hover"]'

export default function Cursor() {
  const dotRef = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return

    let tx = window.innerWidth / 2, ty = window.innerHeight / 2
    let cx = tx, cy = ty
    let raf = 0
    let isHover = false

    const onMove = e => {
      tx = e.clientX
      ty = e.clientY
    }

    const tick = () => {
      cx += (tx - cx) * 0.18
      cy += (ty - cy) * 0.18
      const el = dotRef.current
      if (el) {
        el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onOver = e => {
      const t = e.target
      if (t && t.closest && t.closest(HOVER_SELECTOR)) {
        if (!isHover) {
          isHover = true
          dotRef.current?.classList.add('is-hover')
        }
      }
    }
    const onOut = e => {
      const t = e.target
      if (t && t.closest && t.closest(HOVER_SELECTOR)) {
        const rel = e.relatedTarget
        const stillHovering = rel && rel.closest && rel.closest(HOVER_SELECTOR)
        if (!stillHovering) {
          isHover = false
          dotRef.current?.classList.remove('is-hover')
        }
      }
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    document.body.classList.add('hque-cursor-mounted')

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.body.classList.remove('hque-cursor-mounted')
    }
  }, [])

  return (
    <>
      <style>{`
        body.hque-cursor-mounted, body.hque-cursor-mounted * { cursor: none !important; }
        .hque-cursor {
          position: fixed; top: 0; left: 0;
          width: 8px; height: 8px;
          background: #1A1A1A;
          border: 1px solid transparent;
          border-radius: 9999px;
          pointer-events: none;
          z-index: 9999;
          transition: width 0.25s ease, height 0.25s ease, background 0.25s ease, border-color 0.25s ease;
          will-change: transform;
        }
        .hque-cursor.is-hover {
          width: 40px; height: 40px;
          background: transparent;
          border-color: #1A1A1A;
        }
        @media (hover: none) { .hque-cursor { display: none; } }
      `}</style>
      <div ref={dotRef} className="hque-cursor" aria-hidden="true" />
    </>
  )
}
