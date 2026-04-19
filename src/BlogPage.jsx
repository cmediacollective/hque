import { useState, useRef, useEffect } from 'react'
import { POSTS } from './BlogData'
import MarketingNav from './MarketingNav'
import HQueChat from './HQueChat'

const mouse = { x: -9999, y: -9999 }

function SpotlightCard({ post, height = '220px', titleSize = '17px', showExcerpt = false, wide = false }) {
  const ref = useRef(null)
  const [brightness, setBrightness] = useState(0)
  const [hovered, setHovered] = useState(false)
  const rafRef = useRef(null)

  useEffect(() => {
    function tick() {
      if (!ref.current) { rafRef.current = requestAnimationFrame(tick); return }
      const rect = ref.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = mouse.x - cx
      const dy = mouse.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const radius = 380
      const b = dist < radius ? (1 - dist / radius) : 0
      setBrightness(b)
      setHovered(b > 0.65)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const dim = 1 - brightness * 0.85

  return (
    <a href={'/blog/' + post.slug} style={{ textDecoration: 'none', display: 'block', position: 'relative', zIndex: hovered ? 10 : 1 }}>
      <div
        ref={ref}
        style={{
          background: '#141414',
          overflow: 'hidden',
          borderRadius: '4px',
          position: 'relative',
          transform: hovered ? 'translateY(-8px) scale(1.03)' : 'translateY(0) scale(1)',
          boxShadow: hovered
            ? '0 28px 70px rgba(0,0,0,0.8), 0 0 60px rgba(91,124,153,' + (brightness * 0.4) + ')'
            : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s ease',
        }}
      >
        {/* Spotlight glow overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', borderRadius: '4px',
          background: 'radial-gradient(circle at 50% 40%, rgba(91,124,153,' + (brightness * 0.35) + ') 0%, transparent 70%)',
          transition: 'background 0.08s ease',
        }} />

        {/* Image */}
        <div style={{ height, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%',
            backgroundImage: 'url(' + post.image + ')',
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'brightness(' + (0.3 + brightness * 0.8) + ')',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'filter 0.08s ease, transform 0.4s ease',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 65%)' }} />
        </div>

        {/* Dark vignette that lifts with spotlight */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'rgba(0,0,0,' + (dim * 0.7) + ')',
          transition: 'background 0.08s ease',
          borderRadius: '4px',
        }} />

        {/* Content */}
        <div style={{ padding: wide ? '24px 28px' : '16px 18px', position: 'relative', zIndex: 4 }}>
          <div style={{ fontSize: '7px', letterSpacing: '0.18em', textTransform: 'uppercase', color: brightness > 0.3 ? '#5b7c99' : '#333', marginBottom: '8px', transition: 'color 0.12s ease' }}>
            {post.category} · {post.readTime}
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: titleSize, color: brightness > 0.2 ? (hovered ? '#fff' : '#F0ECE6') : '#2A2A2A', lineHeight: 1.25, transition: 'color 0.12s ease' }}>
            {post.title}
          </div>
          {showExcerpt && (
            <div style={{ fontSize: '12px', color: brightness > 0.4 ? '#888' : '#2A2A2A', lineHeight: 1.75, marginTop: '10px', transition: 'color 0.12s ease' }}>
              {post.excerpt}
            </div>
          )}
          <div style={{
            marginTop: '10px', fontSize: '8px', letterSpacing: '0.18em',
            textTransform: 'uppercase', color: '#5b7c99',
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(0)' : 'translateX(-8px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}>Read article →</div>
        </div>

        {/* Shimmer edge */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '4px', pointerEvents: 'none', zIndex: 5,
          border: '1px solid rgba(91,124,153,' + (brightness * 0.6) + ')',
          transition: 'border-color 0.08s ease',
        }} />
      </div>
    </a>
  )
}

function HeroSpotlight({ post }) {
  const ref = useRef(null)
  const [brightness, setBrightness] = useState(0.4)
  const [hovered, setHovered] = useState(false)
  const rafRef = useRef(null)
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    function tick() {
      if (!ref.current) { rafRef.current = requestAnimationFrame(tick); return }
      const rect = ref.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = mouse.x - cx
      const dy = mouse.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const radius = 600
      const b = dist < radius ? 0.3 + (1 - dist / radius) * 0.7 : 0.3
      setBrightness(b)
      setHovered(b > 0.8)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <a href={'/blog/' + post.slug} style={{ textDecoration: 'none', display: 'block', marginBottom: '16px' }}>
      <div
        ref={ref}
        style={{
          position: 'relative', height: isMobile ? '340px' : '560px',
          overflow: 'hidden', borderRadius: '4px',
          transform: hovered ? 'scale(1.01)' : 'scale(1)',
          boxShadow: '0 0 80px rgba(91,124,153,' + (brightness * 0.2) + '), 0 20px 60px rgba(0,0,0,0.5)',
          transition: 'transform 0.4s ease, box-shadow 0.1s ease',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(' + post.image + ')',
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(' + brightness + ')',
          transform: hovered ? 'scale(1.03)' : 'scale(1)',
          transition: 'filter 0.08s ease, transform 0.5s ease',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }} />

        {/* Spotlight beam following cursor inside hero */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 60%, rgba(91,124,153,' + (brightness * 0.2) + ') 0%, transparent 55%)',
          transition: 'background 0.08s ease',
        }} />

        <div style={{ position: 'absolute', inset: 0, zIndex: 3, border: '1px solid rgba(91,124,153,' + (brightness * 0.4) + ')', borderRadius: '4px', pointerEvents: 'none', transition: 'border-color 0.08s ease' }} />

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
    function onMove(e) { mouse.x = e.clientX; mouse.y = e.clientY }
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
        <div style={{ fontSize: '13px', color: '#888', maxWidth: '220px', lineHeight: 1.9, paddingBottom: '10px' }}>Strategy and operations for agencies and brands building what's next.</div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 24px 80px' : '0 48px 100px' }}>
        {hero && <HeroSpotlight post={hero} />}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
          {col1.map(post => <SpotlightCard key={post.slug} post={post} height="200px" titleSize="16px" showExcerpt />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '5fr 8fr', gap: '14px', marginBottom: '14px' }}>
          {portrait && <SpotlightCard post={portrait} height="300px" titleSize="18px" />}
          {wide && <SpotlightCard post={wide} height="240px" titleSize="24px" showExcerpt wide />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px' }}>
          {bottom.map(post => <SpotlightCard key={post.slug} post={post} height="170px" titleSize="13px" />)}
        </div>
      </div>

      <footer style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '40px 24px' : '60px 48px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1fr 1fr', gap: isMobile ? '32px' : '48px', maxWidth: '1100px', margin: '0 auto 48px' }}>
          <div>
            <img src="/logo.svg" alt="HQue" style={{ width: '100px', opacity: 0.5, marginBottom: '16px', display: 'block' }} />
            <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.7, maxWidth: '240px' }}>The operating system for agencies and brands built on talent partnerships.</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', marginBottom: '16px' }}>Product</div>
            {[['Features', '/#features'], ['Pricing', '/pricing'], ['FAQ', '/faq']].map(([l, h]) => (
              <div key={l} style={{ marginBottom: '10px' }}><a href={h} style={{ fontSize: '12px', color: '#aaa', textDecoration: 'none' }}>{l}</a></div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', marginBottom: '16px' }}>Resources</div>
            {[['The Pitch', '/blog'], ['Help Center', null]].map(([l, h]) => (
              <div key={l} style={{ marginBottom: '10px' }}>
                {h ? <a href={h} style={{ fontSize: '12px', color: '#aaa', textDecoration: 'none' }}>{l}</a> : <span style={{ fontSize: '12px', color: '#555' }}>{l}</span>}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', marginBottom: '16px' }}>Legal</div>
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['support@h-que.com', 'mailto:support@h-que.com']].map(([l, h]) => (
              <div key={l} style={{ marginBottom: '10px' }}><a href={h} style={{ fontSize: '12px', color: '#aaa', textDecoration: 'none' }}>{l}</a></div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '0.5px solid #1A1A1A', paddingTop: '24px', maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#666' }}>© 2026 HQue. All rights reserved.</span>
          <span style={{ fontSize: '10px', color: '#555' }}>Made for agencies that move fast.</span>
        </div>
      </footer>
      <HQueChat />
    </div>
  )
}
