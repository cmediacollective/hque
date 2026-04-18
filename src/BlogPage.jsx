import { useState, useRef, useEffect } from 'react'
import { POSTS } from './BlogData'
import MarketingNav from './MarketingNav'
import HQueChat from './HQueChat'

const cursor = { x: -9999, y: -9999 }

function GravityCard({ post, height = '220px', titleSize = '17px', showExcerpt = false, wide = false, delay = 0 }) {
  const ref = useRef(null)
  const rafRef = useRef(null)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [imgX, setImgX] = useState(0)
  const [imgY, setImgY] = useState(0)
  const [scale, setScale] = useState(1)
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  useEffect(() => {
    function tick() {
      if (!ref.current) { rafRef.current = requestAnimationFrame(tick); return }
      const rect = ref.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = cursor.x - cx
      const dy = cursor.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const radius = 300
      if (dist < radius && dist > 0) {
        const s = (1 - dist / radius)
        const pull = s * s * 20
        setTx((dx / dist) * pull)
        setTy((dy / dist) * pull)
        setScale(1 + s * 0.07)
        setImgX(-(dx / dist) * s * 12)
        setImgY(-(dy / dist) * s * 8)
        setHovered(s > 0.5)
      } else {
        setTx(0); setTy(0); setScale(1); setImgX(0); setImgY(0); setHovered(false)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <a href={'/blog/' + post.slug} style={{
      textDecoration: 'none', display: 'block', position: 'relative',
      zIndex: hovered ? 10 : 1,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.6s ease ' + delay + 'ms',
    }}>
      <div ref={ref} style={{
        background: '#141414', overflow: 'hidden', borderRadius: '4px', position: 'relative',
        willChange: 'transform',
        transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')',
        transition: 'transform 0.12s cubic-bezier(0.23,1,0.32,1)',
        boxShadow: hovered
          ? (-tx * 1.5) + 'px ' + (-ty * 1.5) + 'px 40px rgba(91,124,153,0.25), 0 20px 50px rgba(0,0,0,0.7)'
          : '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <div style={{ height, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '120%', marginTop: '-10%',
            backgroundImage: 'url(' + post.image + ')',
            backgroundSize: 'cover', backgroundPosition: 'center',
            willChange: 'transform',
            transform: 'translate(' + imgX + 'px,' + imgY + 'px) scale(' + (hovered ? 1.06 : 1) + ')',
            transition: 'transform 0.12s cubic-bezier(0.23,1,0.32,1)',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 70%)' }} />
          {hovered && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 80%, rgba(91,124,153,0.28) 0%, transparent 60%)' }} />}
        </div>
        <div style={{ padding: wide ? '28px' : '18px', position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '7px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '8px' }}>{post.category} · {post.readTime}</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: titleSize, color: hovered ? '#fff' : '#F0ECE6', lineHeight: 1.25, transition: 'color 0.15s ease' }}>{post.title}</div>
          {showExcerpt && <div style={{ fontSize: '12px', color: hovered ? '#aaa' : '#555', lineHeight: 1.75, marginTop: '10px', transition: 'color 0.15s ease' }}>{post.excerpt}</div>}
          <div style={{ marginTop: '12px', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', opacity: hovered ? 1 : 0, transform: hovered ? 'translateX(0)' : 'translateX(-8px)', transition: 'opacity 0.2s ease, transform 0.2s ease' }}>Read article →</div>
        </div>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '4px', pointerEvents: 'none', border: '1px solid rgba(91,124,153,' + (hovered ? 0.5 : 0) + ')', transition: 'border-color 0.2s ease' }} />
      </div>
    </a>
  )
}

function HeroGravity({ post }) {
  const ref = useRef(null)
  const rafRef = useRef(null)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [imgX, setImgX] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)
  const isMobile = window.innerWidth < 768

  useEffect(() => { setTimeout(() => setVisible(true), 50) }, [])

  useEffect(() => {
    function tick() {
      if (!ref.current) { rafRef.current = requestAnimationFrame(tick); return }
      const rect = ref.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = cursor.x - cx
      const dy = cursor.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const radius = 500
      if (dist < radius && dist > 0) {
        const s = (1 - dist / radius) * 0.5
        setTx((dx / dist) * s * 12)
        setTy((dy / dist) * s * 8)
        setImgX(-(dx / dist) * s * 18)
        setHovered(s > 0.12)
      } else {
        setTx(0); setTy(0); setImgX(0); setHovered(false)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <a href={'/blog/' + post.slug} style={{ textDecoration: 'none', display: 'block', marginBottom: '16px', opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease' }}>
      <div ref={ref} style={{
        position: 'relative', height: isMobile ? '340px' : '560px',
        overflow: 'hidden', borderRadius: '4px', willChange: 'transform',
        transform: 'translate(' + tx + 'px,' + ty + 'px)',
        transition: 'transform 0.18s cubic-bezier(0.23,1,0.32,1)',
        boxShadow: hovered ? '0 30px 80px rgba(91,124,153,0.15), 0 20px 60px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, willChange: 'transform',
          backgroundImage: 'url(' + post.image + ')',
          backgroundSize: 'cover', backgroundPosition: 'center',
          transform: 'translateX(' + imgX + 'px) scale(1.08)',
          transition: 'transform 0.18s cubic-bezier(0.23,1,0.32,1)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }} />
        {hovered && <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'radial-gradient(ellipse at 30% 100%, rgba(91,124,153,0.16) 0%, transparent 55%)', pointerEvents: 'none' }} />}
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, border: '1px solid rgba(91,124,153,' + (hovered ? 0.35 : 0) + ')', borderRadius: '4px', pointerEvents: 'none', transition: 'border-color 0.3s ease' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile ? '28px' : '56px', zIndex: 4 }}>
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

  useEffect(() => {
    function onMove(e) { cursor.x = e.clientX; cursor.y = e.clientY }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div style={{ background: '#0E0E0E', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#F0ECE6' }}>
      <MarketingNav onGetStarted={onGetStarted} />
      <div style={{ padding: isMobile ? '100px 24px 48px' : '130px 48px 64px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.36em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '16px' }}>The Pitch</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '44px' : '72px', fontWeight: 'normal', color: '#F0ECE6', lineHeight: 0.95 }}>Every deal<br />starts somewhere.</div>
        </div>
        <div style={{ fontSize: '13px', color: '#3A3A3A', maxWidth: '200px', lineHeight: 1.9, paddingBottom: '10px' }}>Strategy and operations for agencies building what's next.</div>
      </div>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 24px 80px' : '0 48px 100px' }}>
        {hero && <HeroGravity post={hero} />}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
          {col1.map((post, i) => <GravityCard key={post.slug} post={post} height="200px" titleSize="16px" showExcerpt delay={100 + i * 80} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '5fr 8fr', gap: '14px', marginBottom: '14px' }}>
          {portrait && <GravityCard post={portrait} height="300px" titleSize="18px" delay={400} />}
          {wide && <GravityCard post={wide} height="240px" titleSize="24px" showExcerpt wide delay={480} />}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px' }}>
          {bottom.map((post, i) => <GravityCard key={post.slug} post={post} height="170px" titleSize="13px" delay={560 + i * 60} />)}
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
