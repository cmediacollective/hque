import { useState, useRef, useEffect } from 'react'
import { POSTS } from './BlogData'
import MarketingNav from './MarketingNav'
import HQueChat from './HQueChat'

function ThrowCard({ post, height = '220px', titleSize = '17px', showExcerpt = false, wide = false, delay = 0 }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [vel, setVel] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [thrown, setThrown] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)
  const dragStart = useRef(null)
  const lastPos = useRef({ x: 0, y: 0 })
  const lastTime = useRef(Date.now())
  const rafRef = useRef(null)
  const posRef = useRef({ x: 0, y: 0 })
  const velRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  // Physics loop for returning home
  useEffect(() => {
    function tick() {
      if (!thrown) { rafRef.current = requestAnimationFrame(tick); return }
      velRef.current.x += (-posRef.current.x) * 0.12
      velRef.current.y += (-posRef.current.y) * 0.12
      velRef.current.x *= 0.78
      velRef.current.y *= 0.78
      posRef.current.x += velRef.current.x
      posRef.current.y += velRef.current.y
      setPos({ ...posRef.current })
      setVel({ ...velRef.current })
      const speed = Math.sqrt(velRef.current.x ** 2 + velRef.current.y ** 2)
      const dist = Math.sqrt(posRef.current.x ** 2 + posRef.current.y ** 2)
      if (speed < 0.3 && dist < 0.5) {
        posRef.current = { x: 0, y: 0 }
        velRef.current = { x: 0, y: 0 }
        setPos({ x: 0, y: 0 })
        setThrown(false)
        setRotation(0)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    if (thrown) rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [thrown])

  function onMouseDown(e) {
    e.preventDefault()
    dragStart.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y }
    lastPos.current = { x: e.clientX, y: e.clientY }
    lastTime.current = Date.now()
    velRef.current = { x: 0, y: 0 }
    setDragging(true)
    setThrown(false)
    cancelAnimationFrame(rafRef.current)
  }

  function onMouseMove(e) {
    if (!dragging || !dragStart.current) return
    const now = Date.now()
    const dt = Math.max(now - lastTime.current, 1)
    const newX = e.clientX - dragStart.current.x
    const newY = e.clientY - dragStart.current.y
    velRef.current = {
      x: (e.clientX - lastPos.current.x) / dt * 14,
      y: (e.clientY - lastPos.current.y) / dt * 14,
    }
    posRef.current = { x: newX, y: newY }
    setPos({ x: newX, y: newY })
    setRotation(velRef.current.x * 0.8)
    lastPos.current = { x: e.clientX, y: e.clientY }
    lastTime.current = now
  }

  function onMouseUp(e) {
    if (!dragging) return
    setDragging(false)
    dragStart.current = null
    const speed = Math.sqrt(velRef.current.x ** 2 + velRef.current.y ** 2)
    if (speed > 1.5) {
      setThrown(true)
    } else {
      // Gently return
      posRef.current = { x: 0, y: 0 }
      velRef.current = { x: 0, y: 0 }
      setPos({ x: 0, y: 0 })
      setRotation(0)
    }
  }

  const isActive = dragging || thrown
  const absX = Math.abs(pos.x)
  const absY = Math.abs(pos.y)
  const distFromHome = Math.sqrt(pos.x ** 2 + pos.y ** 2)

  return (
    <div
      style={{
        position: 'relative',
        zIndex: isActive ? 100 : hovered ? 10 : 1,
        userSelect: 'none',
        opacity: visible ? 1 : 0,
        transition: visible ? 'none' : 'opacity 0.6s ease ' + delay + 'ms',
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={e => { if (dragging) onMouseUp(e) }}
    >
      
        href={!dragging && distFromHome < 5 ? ('/blog/' + post.slug) : undefined}
        onClick={e => { if (distFromHome >= 5) { e.preventDefault() } }}
        style={{ textDecoration: 'none', display: 'block' }}
      >
        <div
          ref={ref}
          onMouseDown={onMouseDown}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: '#141414',
            overflow: 'hidden',
            borderRadius: '4px',
            position: 'relative',
            cursor: dragging ? 'grabbing' : 'grab',
            willChange: 'transform',
            transform: `translate(${pos.x}px, ${pos.y}px) rotate(${rotation}deg) scale(${dragging ? 1.06 : hovered ? 1.02 : 1})`,
            transition: dragging ? 'none' : thrown ? 'none' : 'transform 0.4s cubic-bezier(0.23,1,0.32,1)',
            boxShadow: dragging
              ? `${pos.x * 0.1}px ${pos.y * 0.1 + 20}px 60px rgba(0,0,0,0.9), 0 0 40px rgba(91,124,153,0.3)`
              : hovered
                ? '0 16px 40px rgba(0,0,0,0.6), 0 0 20px rgba(91,124,153,0.15)'
                : '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {/* Drag hint */}
          {hovered && !dragging && (
            <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 5, fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: '2px', backdropFilter: 'blur(4px)' }}>drag me</div>
          )}

          <div style={{ height, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%',
              backgroundImage: 'url(' + post.image + ')',
              backgroundSize: 'cover', backgroundPosition: 'center',
              transform: `scale(${dragging ? 1.1 : 1}) translateX(${-pos.x * 0.05}px)`,
              transition: dragging ? 'none' : 'transform 0.4s ease',
            }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 70%)' }} />
            {dragging && <div style={{ position: 'absolute', inset: 0, background: 'rgba(91,124,153,0.12)' }} />}
          </div>

          <div style={{ padding: wide ? '28px' : '18px', position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '7px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '8px' }}>{post.category} · {post.readTime}</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: titleSize, color: dragging ? '#fff' : hovered ? '#F8F4EE' : '#F0ECE6', lineHeight: 1.25, transition: 'color 0.15s ease' }}>{post.title}</div>
            {showExcerpt && <div style={{ fontSize: '12px', color: hovered ? '#aaa' : '#555', lineHeight: 1.75, marginTop: '10px', transition: 'color 0.15s ease' }}>{post.excerpt}</div>}
            {!dragging && <div style={{ marginTop: '10px', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', opacity: hovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>Read article →</div>}
          </div>

          <div style={{ position: 'absolute', inset: 0, borderRadius: '4px', pointerEvents: 'none', border: '1px solid rgba(91,124,153,' + (dragging ? 0.6 : hovered ? 0.3 : 0) + ')', transition: 'border-color 0.2s ease' }} />
        </div>
      </a>
    </div>
  )
}

function HeroThrow({ post }) {
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)
  const isMobile = window.innerWidth < 768
  useEffect(() => { setTimeout(() => setVisible(true), 50) }, [])

  return (
    <a href={'/blog/' + post.slug} style={{ textDecoration: 'none', display: 'block', marginBottom: '16px', opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative', height: isMobile ? '340px' : '560px',
          overflow: 'hidden', borderRadius: '4px',
          transform: hovered ? 'scale(1.01)' : 'scale(1)',
          transition: 'transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s ease',
          boxShadow: hovered ? '0 24px 60px rgba(0,0,0,0.7), 0 0 40px rgba(91,124,153,0.12)' : '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(' + post.image + ')',
          backgroundSize: 'cover', backgroundPosition: 'center',
          transform: hovered ? 'scale(1.04)' : 'scale(1)',
          transition: 'transform 0.6s ease',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(91,124,153,' + (hovered ? 0.4 : 0) + ')', borderRadius: '4px', transition: 'border-color 0.3s ease', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile ? '28px' : '56px' }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '18px' }}>{post.category} · {post.readTime}</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '26px' : '42px', color: '#F0ECE6', lineHeight: 1.1, marginBottom: '16px', maxWidth: '680px' }}>{post.title}</div>
          <div style={{ fontSize: '14px', color: '#888', maxWidth: '520px', lineHeight: 1.75 }}>{post.excerpt}</div>
          <div style={{ marginTop: '20px', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s ease' }}>Read article →</div>
        </div>
      </div>
    </a>
  )
}

export default function BlogPage({ onGetStarted }) {
  const isMobile = window.innerWidth < 768
  const hero = POSTS[0]
  const col1 = POSTS.slice(1, 4)
  const portrait = POSTS[4]
  const wide = POSTS[5]
  const bottom = POSTS.slice(6)

  return (
    <div style={{ background: '#0E0E0E', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#F0ECE6', overflow: 'hidden' }}>
      <MarketingNav onGetStarted={onGetStarted} />
      <div style={{ padding: isMobile ? '100px 24px 48px' : '130px 48px 64px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.36em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '16px' }}>The Pitch</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '44px' : '72px', fontWeight: 'normal', color: '#F0ECE6', lineHeight: 0.95 }}>Every deal<br />starts somewhere.</div>
        </div>
        <div style={{ fontSize: '13px', color: '#3A3A3A', maxWidth: '200px', lineHeight: 1.9, paddingBottom: '10px' }}>Strategy and operations for agencies building what's next.</div>
      </div>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 24px 80px' : '0 48px 100px' }}>
        {hero && <HeroThrow post={hero} />}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
          {col1.map((post, i) => <ThrowCard key={post.slug} post={post} height="200px" titleSize="16px" showExcerpt delay={100 + i * 80} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '5fr 8fr', gap: '14px', marginBottom: '14px' }}>
          {portrait && <ThrowCard post={portrait} height="300px" titleSize="18px" delay={400} />}
          {wide && <ThrowCard post={wide} height="240px" titleSize="24px" showExcerpt wide delay={480} />}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px' }}>
          {bottom.map((post, i) => <ThrowCard key={post.slug} post={post} height="170px" titleSize="13px" delay={560 + i * 60} />)}
        </div>
      </div>
      <footer style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '40px 24px' : '60px 48px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1fr 1fr', gap: isMobile ? '32px' : '48px', maxWidth: '1100px', margin: '0 auto 48px' }}>
          <div>
            <img src="/logo.svg" alt="HQue" style={{ width: '100px', opacity: 0.5, marginBottom: '16px', display: 'block' }} />
            <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.7, maxWidth: '240px' }}>The operating system for agencies and brands built on talent partnerships.</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '16px' }}>Product</div>
            {[['Features', '/#features'], ['Pricing', '/pricing'], ['FAQ', '/faq']].map(([l, h]) => (
              <div key={l} style={{ marginBottom: '10px' }}><a href={h} style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>{l}</a></div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '16px' }}>Resources</div>
            {[['The Pitch', '/blog'], ['Help Center', null]].map(([l, h]) => (
              <div key={l} style={{ marginBottom: '10px' }}>
                {h ? <a href={h} style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>{l}</a> : <span style={{ fontSize: '12px', color: '#2A2A2A' }}>{l}</span>}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '16px' }}>Legal</div>
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['support@h-que.com', 'mailto:support@h-que.com']].map(([l, h]) => (
              <div key={l} style={{ marginBottom: '10px' }}><a href={h} style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>{l}</a></div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '0.5px solid #1A1A1A', paddingTop: '24px', maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#333' }}>© 2026 HQue. All rights reserved.</span>
          <span style={{ fontSize: '10px', color: '#2A2A2A' }}>Made for agencies that move fast.</span>
        </div>
      </footer>
      <HQueChat />
    </div>
  )
}
