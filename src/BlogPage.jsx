import { useState } from 'react'
import { POSTS } from './BlogData'
import MarketingNav from './MarketingNav'
import HQueChat from './HQueChat'

function Card({ post, height = '220px', titleSize = '17px', showExcerpt = false, tall = false }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ position: 'relative', zIndex: hovered ? 50 : 1 }}>
      <a href={'/blog/' + post.slug} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: '#141414',
            overflow: 'hidden',
            borderRadius: '3px',
            height: tall ? '100%' : 'auto',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            boxShadow: hovered ? '0 32px 80px rgba(0,0,0,0.8)' : '0 0 0 rgba(0,0,0,0)',
            transition: 'transform 0.25s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.25s ease',
            position: 'relative',
          }}
        >
          <div style={{ height, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%',
              backgroundImage: 'url(' + post.image + ')',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.4s ease'
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: hovered ? 'linear-gradient(135deg, rgba(91,124,153,0.4) 0%, rgba(0,0,0,0.2) 100%)' : 'none',
              transition: 'background 0.25s ease'
            }} />
          </div>
          <div style={{ padding: tall ? '24px' : '20px' }}>
            <div style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '10px' }}>{post.category} · {post.readTime}</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: titleSize, color: hovered ? '#fff' : '#F0ECE6', lineHeight: 1.3, marginBottom: showExcerpt ? '12px' : 0, transition: 'color 0.2s ease' }}>{post.title}</div>
            {showExcerpt && <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.7 }}>{post.excerpt}</div>}
          </div>
        </div>
      </a>
    </div>
  )
}

function HeroCard({ post }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ position: 'relative', zIndex: hovered ? 50 : 1, marginBottom: '12px' }}>
      <a href={'/blog/' + post.slug} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'relative',
            height: window.innerWidth < 768 ? '340px' : '520px',
            overflow: 'hidden',
            borderRadius: '3px',
            transform: hovered ? 'scale(1.02)' : 'scale(1)',
            boxShadow: hovered ? '0 40px 100px rgba(0,0,0,0.9)' : '0 0 0 rgba(0,0,0,0)',
            transition: 'transform 0.25s cubic-bezier(0.34,1.2,0.64,1), box-shadow 0.25s ease',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(' + post.image + ')',
            backgroundSize: 'cover', backgroundPosition: 'center',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.5s ease'
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
          {hovered && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(91,124,153,0.25) 0%, transparent 60%)' }} />}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: window.innerWidth < 768 ? '28px' : '48px' }}>
            <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '14px' }}>{post.category} · {post.readTime}</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: window.innerWidth < 768 ? '24px' : '36px', color: '#F0ECE6', lineHeight: 1.15, marginBottom: '14px', maxWidth: '700px' }}>{post.title}</div>
            <div style={{ fontSize: '13px', color: '#999', maxWidth: '560px', lineHeight: 1.6 }}>{post.excerpt}</div>
          </div>
        </div>
      </a>
    </div>
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
    <div style={{ background: '#111', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#F0ECE6' }}>
      <MarketingNav onGetStarted={onGetStarted} />

      <div style={{ padding: isMobile ? '100px 24px 48px' : '120px 48px 56px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '14px' }}>The Pitch</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '42px' : '64px', fontWeight: 'normal', color: '#F0ECE6', lineHeight: 1.0 }}>Every deal<br />starts somewhere.</div>
        </div>
        <div style={{ fontSize: '13px', color: '#444', maxWidth: '220px', lineHeight: 1.8, paddingBottom: '8px' }}>Strategy and operations for the agencies building what's next.</div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 24px 80px' : '0 48px 100px' }}>
        {hero && <HeroCard post={hero} />}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
          {col1.map(post => <Card key={post.slug} post={post} height="220px" titleSize="17px" showExcerpt />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
          {portrait && <Card post={portrait} height="280px" titleSize="17px" tall />}
          {wide && <Card post={wide} height="260px" titleSize="22px" showExcerpt tall />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
          {bottom.map(post => <Card key={post.slug} post={post} height="180px" titleSize="14px" />)}
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
            {[['Features', '/#features'], ['Pricing', '/pricing'], ['FAQ', '/faq']].map(([label, href]) => (
              <div key={label} style={{ marginBottom: '10px' }}><a href={href} style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>{label}</a></div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '16px' }}>Resources</div>
            {[['The Pitch', '/blog'], ['Help Center', null]].map(([label, href]) => (
              <div key={label} style={{ marginBottom: '10px' }}>
                {href ? <a href={href} style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>{label}</a> : <span style={{ fontSize: '12px', color: '#2A2A2A' }}>{label}</span>}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '16px' }}>Legal</div>
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['support@h-que.com', 'mailto:support@h-que.com']].map(([label, href]) => (
              <div key={label} style={{ marginBottom: '10px' }}><a href={href} style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>{label}</a></div>
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
