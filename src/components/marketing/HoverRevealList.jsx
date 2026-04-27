import { useEffect, useRef, useState } from 'react'

export default function HoverRevealList({ items = [] }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const [stableIdx, setStableIdx] = useState(0)
  const [enabled, setEnabled] = useState(false)
  const imgRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (min-width: 768px)')
    const update = () => setEnabled(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (hoverIdx !== null) setStableIdx(hoverIdx)
  }, [hoverIdx])

  useEffect(() => {
    if (!enabled) return
    let tx = 0, ty = 0
    let cx = 0, cy = 0
    let raf = 0

    const onMove = e => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      tx = e.clientX - rect.left
      ty = e.clientY - rect.top
    }

    const tick = () => {
      cx += (tx - cx) * 0.12
      cy += (ty - cy) * 0.12
      const el = imgRef.current
      if (el) {
        el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener('mousemove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
    }
  }, [enabled])

  if (!enabled) {
    return (
      <ul className="list-none m-0 p-0">
        {items.map((it, i) => (
          <li key={i} className="border-t border-ink/15 last:border-b py-8">
            <div className="font-display italic leading-[1.05] tracking-tight text-ink" style={{ fontSize: 'clamp(34px, 6.2vw, 88px)' }}>{it.label}</div>
            <img src={it.image} alt={it.label} className="w-full mt-6 block" />
            {it.caption && (
              <div className="text-[12px] tracking-[0.14em] text-muted mt-3 uppercase">{it.caption}</div>
            )}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <ul className="list-none m-0 p-0">
        {items.map((it, i) => {
          const dim = hoverIdx !== null && hoverIdx !== i
          return (
            <li
              key={i}
              data-cursor="hover"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(prev => (prev === i ? null : prev))}
              className="font-display italic leading-[1.05] tracking-tight text-ink py-6 border-t border-ink/15 last:border-b cursor-pointer transition-opacity duration-300"
              style={{ opacity: dim ? 0.25 : 1, fontSize: 'clamp(34px, 6.2vw, 88px)' }}
            >
              {it.label}
            </li>
          )
        })}
      </ul>
      <img
        ref={imgRef}
        src={items[stableIdx]?.image || ''}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '280px',
          height: '360px',
          objectFit: 'cover',
          pointerEvents: 'none',
          opacity: hoverIdx !== null ? 1 : 0,
          transition: 'opacity 0.4s ease',
          willChange: 'transform',
        }}
      />
    </div>
  )
}
