import { useState, useRef, useEffect } from 'react'
import { POSTS } from './BlogData'
import MarketingNav from './MarketingNav'
import HQueChat from './HQueChat'

function TiltCard({ post, height = '220px', titleSize = '17px', showExcerpt = false, wide = false, delay = 0 }) {
  const ref = useRef(null)
  const [tiltStyle, setTiltStyle] = useState({})
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 })
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  function onMouseMove(e) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const rotateY = ((x - cx) / cx) * 16
    const rotateX = ((cy - y) / cy) * 11
    const moveX = ((x - cx) / cx) * 7
    const moveY = ((cy - y) / cy) * 4
    setGlowPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 })
    setTiltStyle({
      transform: `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate(${moveX}px,${moveY}px) scale(1.05)`,
      boxShadow: `-${rotateY * 2}px ${rotateX * 2}px 50px rgba(91,124,153,0.3), 0 30px 70px rgba(0,0,0,0.8)`,
    })
  }

  function onMouseLeave() {
    setHovered(false)
    setTiltStyle({
      transform: 'perspective(700px) rotateX(0deg) rotateY(0deg) translate(0px,0px) scale(1)',
      boxShadow: '0 0 0 rgba(0,0,0,0)',
    })
  }

  return (
    <a href={'/blog/' + post.slug} style={{
      textDecoration: 'none', display: 'block',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0px)' : 'translateY(32px)',
      transition: 'opacity 0.6s ease ' + delay + 'ms, transform 0.6s cubic-bezier(0.23,1,0.32,1) ' + delay + 'ms',
    }}>
      <div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={onMouseLeave}
        style={{
          background: '#141414', overflow: 'hidden', borderRadius: '4px',
          position: 'relative', transformStyle: 'preserve-3d', willChange: 'transform',
          transition: hovered ? 'transform 0.06s linear, box-shadow 0.06s linear' : 'transform 0.55s cubic-bezier(0.23,1,0.32,1), box-shadow 0.55s ease',
          ...tiltStyle,
        }}
      >
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', borderRadius: '4px',
            background: 'radial-gradient(circle at ' + glowPos.x + '% ' + glowPos.y + '%, rgba(91,124,153,0.4) 0%, transparent 55%)',
            mixBlendMode: 'screen',
          }} />
        )}
        <div style={{ height, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%', backgroundImage: 'url(' + post.image + ')',
            backgroundSize: 'cover', backgroundPosition: 'center',
            transform: hovered ? 'scale(1.12)' : 'scale(1)',
            transition: hovered ? 'transform 0.06s linear' : 'transform 0.55s ease',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 65%)' }} />
        </div>
        <div style={{ padding: wide ? '28px' : '20px', position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '7px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '10px' }}>{post.category} · {post.readTime}</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: titleSize, color: hovered ? '#ffffff' : '#F0ECE6', lineHeight: 1.25, transition: 'color 0.15s ease' }}>{post.title}</div>
          {showExcerpt && <div style={{ fontSize: '12px', color: hovered ? '#aaa' : '#555', lineHeight: 1.75, transition: 'color 0.15s ease', marginTop: '12px' }}>{post.excerpt}</div>}
          {hovered && <div style={{ marginTop: '14px', fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99' }}>Read article →</div>}
        </div>
        {hovered && <div style={{ position: 'absolute', inset: 0, zIndex: 4, border: '1px solid rgba(91,124,153,0.45)', borderRadius: '4px', pointerEvents: 'none' }} />}
      </div>
    </a>
  )
}

function HeroTilt({ post }) {
  const ref = useRef(null)
  const [tiltStyle, setTiltStyle] = useState({})
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 })
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)
  const isMobile = window.innerWidth < 768

  useEffect(() => { setTimeout(() => setVisible(true), 60) }, [])

  function onMouseMove(e) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const rotateY = ((x - cx) / cx) * 7
    const rotateX = ((cy - y) / cy) * 4
    setGlowPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 })
    setTiltStyle({
      transform: 'perspective(1400px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale(1.015)',
      boxShadow: (-rotateY * 4) + 'px ' + (rotateX * 4) + 'px 80px rgba(91,124,153,0.2), 0 50px 100px rgba(0,0,0,0.7)',
    })
  }

  function onMouseLeave() {
    setHovered(false)
    setTiltStyle({ transform: 'perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1)', boxShadow: 'none' })
  }

  return (
    <a href={'/blog/' + post.slug} style={{
      textDecoration: 'none', display: 'block', marginBottom: '16px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0px)' : 'translateY(50px)',
      transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.23,1,0.32,1)',
    }}>
      <div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={onMouseLeave}
        style={{
          position: 'relative', height: isMobile ? '340px' : '560px',
          overflow: 'hidden', borderRadius: '4px',
          transformStyle: 'preserve-3d', willChange: 'transform',
          transition: hovered ? 'transform 0.06s linear' : 'transform 0.6s cubic-bezier(0.23,1,0.32,1), box-shadow 0.6s ease',
          ...tiltStyle,
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(' + post.image + ')',
          backgroundSize: 'cover', backgroundPosition: 'center',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
          transition: hovered ? 'transform 0.06s linear' : 'transform 0.6s ease',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }} />
        {hovered && <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'radial-gradient(circle at ' + glowPos.x + '% ' + glowPos.y + '%, rgba(91,124,153,0.22) 0%, transparent 50%)', pointerEvents: 'none' }} />}
        {hovered && <div style={{ position: 'absolute', inset: 0, zIndex: 3, border: '1px solid rgba(91,124,153,0.4)', borderRadius: '4px', pointerEvents: 'none' }} />}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile ? '28px' : '56px', zIndex: 4 }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '18px' }}>{post.category} · {post.readTime}</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '26px' : '42px', color: '#F0ECE6', lineHeight: 1.1, marginBottom: '16px', maxWidth: '680px' }}>{post.title}</div>
          <div style={{ fontSize: '14px', color: '#888', maxWidth: '520px', lineHeight: 1.75 }}>{post.excerpt}</div>
          {hovered && <div style={{ marginTop: '22px', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99' }}>Read article →</div>}
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
        {hero && <HeroTilt post={hero} />}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
          {col1.map((post, i) => <TiltCard key={post.slug} post={post} height="200px" titleSize="16px" showExcerpt delay={100 + i * 80} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '5fr 8fr', gap: '14px', marginBottom: '14px' }}>
          {portrait && <TiltCard post={portrait} height="300px" titleSize="18px" delay={400} />}
          {wide && <TiltCard post={wide} height="240px" titleSize="24px" showExcerpt wide delay={480} />}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px' }}>
          {bottom.map((post, i) => <TiltCard key={post.slug} post={post} height="170px" titleSize="13px" delay={560 + i * 60} />)}
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
