import { useState, useRef, useEffect } from 'react'
import { POSTS } from './BlogData'
import MarketingNav from './MarketingNav'
import HQueChat from './HQueChat'

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, inView]
}

function TypewriterText({ text, inView, delay = 0, style = {} }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!inView || started) return
    const timer = setTimeout(() => {
      setStarted(true)
      let i = 0
      const interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) clearInterval(interval)
      }, 28)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timer)
  }, [inView, started, text, delay])

  return <span style={style}>{displayed}<span style={{ opacity: started && displayed.length < text.length ? 1 : 0, transition: 'opacity 0.1s' }}>|</span></span>
}

function RevealCard({ post, height = '220px', titleSize = '17px', showExcerpt = false, wide = false, delay = 0 }) {
  const [ref, inView] = useInView()
  const [hovered, setHovered] = useState(false)

  return (
    <a href={'/blog/' + post.slug} style={{ textDecoration: 'none', display: 'block', position: 'relative', zIndex: hovered ? 10 : 1 }}>
      <div
        ref={ref}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#141414',
          overflow: 'hidden',
          borderRadius: '4px',
          position: 'relative',
          transform: hovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
          boxShadow: hovered ? '0 24px 60px rgba(0,0,0,0.7), 0 0 30px rgba(91,124,153,0.15)' : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'transform 0.35s cubic-bezier(0.23,1,0.32,1), box-shadow 0.35s ease',
        }}
      >
        {/* Image fade in */}
        <div style={{ height, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%',
            backgroundImage: 'url(' + post.image + ')',
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: inView ? 1 : 0,
            transform: inView ? 'scale(1)' : 'scale(1.08)',
            transition: 'opacity 0.9s ease ' + (delay + 200) + 'ms, transform 0.9s ease ' + (delay + 200) + 'ms',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 65%)' }} />
          {hovered && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 100%, rgba(91,124,153,0.2) 0%, transparent 60%)' }} />}
        </div>

        {/* Category slide in from left */}
        <div style={{ padding: wide ? '24px 28px 0' : '16px 18px 0', overflow: 'hidden' }}>
          <div style={{
            fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99',
            transform: inView ? 'translateX(0)' : 'translateX(-20px)',
            opacity: inView ? 1 : 0,
            transition: 'transform 0.5s ease ' + (delay + 400) + 'ms, opacity 0.5s ease ' + (delay + 400) + 'ms',
            marginBottom: '10px',
          }}>{post.category} · {post.readTime}</div>
        </div>

        {/* Title typewriter */}
        <div style={{ padding: wide ? '0 28px' : '0 18px', minHeight: wide ? '72px' : '56px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: titleSize, color: hovered ? '#fff' : '#F0ECE6', lineHeight: 1.25, transition: 'color 0.2s ease' }}>
            {inView ? <TypewriterText text={post.title} inView={inView} delay={delay + 500} /> : <span style={{ opacity: 0 }}>{post.title}</span>}
          </div>
        </div>

        {/* Excerpt fade in */}
        {showExcerpt && (
          <div style={{ padding: wide ? '10px 28px 0' : '10px 18px 0' }}>
            <div style={{
              fontSize: '12px', color: hovered ? '#aaa' : '#555', lineHeight: 1.75,
              opacity: inView ? 1 : 0,
              transition: 'opacity 0.7s ease ' + (delay + 900) + 'ms, color 0.2s ease',
            }}>{post.excerpt}</div>
          </div>
        )}

        {/* Read link */}
        <div style={{ padding: wide ? '14px 28px 24px' : '10px 18px 16px' }}>
          <div style={{
            fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99',
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(0)' : 'translateX(-8px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}>Read article →</div>
        </div>

        {/* Shimmer border */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '4px', pointerEvents: 'none', border: '1px solid rgba(91,124,153,' + (hovered ? 0.4 : 0) + ')', transition: 'border-color 0.2s ease' }} />
      </div>
    </a>
  )
}

function HeroReveal({ post }) {
  const [ref, inView] = useInView(0.1)
  const [hovered, setHovered] = useState(false)
  const isMobile = window.innerWidth < 768

  return (
    <a href={'/blog/' + post.slug} style={{ textDecoration: 'none', display: 'block', marginBottom: '16px' }}>
      <div
        ref={ref}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative', height: isMobile ? '340px' : '560px',
          overflow: 'hidden', borderRadius: '4px',
          transform: hovered ? 'scale(1.01)' : 'scale(1)',
          boxShadow: hovered ? '0 24px 60px rgba(0,0,0,0.7)' : '0 4px 20px rgba(0,0,0,0.4)',
          transition: 'transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s ease',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(' + post.image + ')',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: inView ? 1 : 0,
          transform: inView ? 'scale(1.02)' : 'scale(1.1)',
          transition: 'opacity 1.2s ease 100ms, transform 1.2s ease 100ms',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }} />

        {/* Dark overlay that lifts */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(14,14,14,' + (inView ? 0 : 1) + ')',
          transition: 'background 0.8s ease',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile ? '28px' : '56px' }}>
          <div style={{
            fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '18px',
            transform: inView ? 'translateX(0)' : 'translateX(-30px)',
            opacity: inView ? 1 : 0,
            transition: 'transform 0.6s ease 400ms, opacity 0.6s ease 400ms',
          }}>{post.category} · {post.readTime}</div>

          <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '26px' : '42px', color: '#F0ECE6', lineHeight: 1.1, marginBottom: '16px', maxWidth: '680px' }}>
            {inView ? <TypewriterText text={post.title} inView={inView} delay={600} /> : <span style={{ opacity: 0 }}>{post.title}</span>}
          </div>

          <div style={{
            fontSize: '14px', color: '#888', maxWidth: '520px', lineHeight: 1.75,
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.8s ease 1200ms',
          }}>{post.excerpt}</div>

          <div style={{
            marginTop: '20px', fontSize: '9px', letterSpacing: '0.22em',
            textTransform: 'uppercase', color: '#5b7c99',
            opacity: hovered ? 1 : 0, transition: 'opacity 0.3s ease',
          }}>Read article →</div>
        </div>

        <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(91,124,153,' + (hovered ? 0.35 : 0) + ')', borderRadius: '4px', pointerEvents: 'none', transition: 'border-color 0.3s ease' }} />
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
        {hero && <HeroReveal post={hero} />}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
          {col1.map((post, i) => <RevealCard key={post.slug} post={post} height="200px" titleSize="16px" showExcerpt delay={i * 120} />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '5fr 8fr', gap: '14px', marginBottom: '14px' }}>
          {portrait && <RevealCard post={portrait} height="300px" titleSize="18px" delay={0} />}
          {wide && <RevealCard post={wide} height="240px" titleSize="24px" showExcerpt wide delay={120} />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px' }}>
          {bottom.map((post, i) => <RevealCard key={post.slug} post={post} height="170px" titleSize="13px" delay={i * 80} />)}
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
