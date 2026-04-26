import { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const [enabled, setEnabled] = useState(false)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    if (!fine) return
    setEnabled(true)

    let mx = window.innerWidth / 2, my = window.innerHeight / 2
    let rx = mx, ry = my
    let raf = 0

    const onMove = e => {
      mx = e.clientX
      my = e.clientY
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`
      }
    }

    const tick = () => {
      rx += (mx - rx) * 0.18
      ry += (my - ry) * 0.18
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${hover ? 1.8 : 1})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

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
      cancelAnimationFrame(raf)
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
        .hque-ring { transition: width 0.25s ease, height 0.25s ease, background 0.25s ease, border-color 0.25s ease; }
        .hque-arrow { transition: opacity 0.2s ease, transform 0.25s ease; }
      `}</style>
      <div
        ref={ringRef}
        className="hque-ring"
        style={{
          position: 'fixed', top: 0, left: 0, width: '34px', height: '34px',
          border: `1px solid ${hover ? '#5b7c99' : 'rgba(240,236,230,0.55)'}`,
          background: hover ? 'rgba(91,124,153,0.18)' : 'transparent',
          borderRadius: '50%', pointerEvents: 'none', zIndex: 9999,
          mixBlendMode: hover ? 'normal' : 'difference',
        }}
      >
        <svg
          className="hque-arrow"
          width="14" height="14" viewBox="0 0 14 14"
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) rotate(${hover ? '0deg' : '-30deg'})`,
            opacity: hover ? 1 : 0,
            color: '#5b7c99',
          }}
        >
          <path d="M3 11 L11 3 M5 3 L11 3 L11 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div
        ref={dotRef}
        style={{
          position: 'fixed', top: 0, left: 0, width: '5px', height: '5px',
          background: '#5b7c99', borderRadius: '50%',
          pointerEvents: 'none', zIndex: 9999,
        }}
      />
    </>
  )
}
