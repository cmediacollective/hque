import useSEO from './useSEO'
import { useState } from 'react'
import { POSTS } from './BlogData'
import MarketingNav from './MarketingNav'
import Footer from './Footer'
import HQueChat from './HQueChat'

function SpotlightCard({ post, height = '220px', titleSize = '17px', showExcerpt = false, wide = false }) {
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={'/blog/' + post.slug}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.2s ease',
      }}
    >
      <div
        style={{
          background: '#141414',
          overflow: 'hidden',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* Image */}
        <div style={{ height, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%',
            backgroundImage: 'url(' + post.image + ')',
            backgroundSize: 'cover', backgroundPosition: 'center',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 65%)' }} />
        </div>

        {/* Content */}
        <div style={{ padding: wide ? '24px 28px' : '16px 18px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '8px' }}>
            {post.category}
          </div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: titleSize, color: '#F0ECE6', lineHeight: 1.25 }}>
            {post.title}
          </div>
          {showExcerpt && (
            <div style={{ fontSize: '12px', color: '#DCDCDC', lineHeight: 1.75, marginTop: '10px' }}>
              {post.excerpt}
            </div>
          )}
          <div style={{ marginTop: '10px', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99' }}>
            Read article →
          </div>
        </div>
      </div>
    </a>
  )
}

function HeroSpotlight({ post }) {
  const [hovered, setHovered] = useState(false)
  const isMobile = window.innerWidth < 768

  return (
    <a
      href={'/blog/' + post.slug}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textDecoration: 'none',
        display: 'block',
        marginBottom: '16px',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.2s ease',
      }}
    >
      <div
        style={{
          position: 'relative', height: isMobile ? '340px' : '560px',
          overflow: 'hidden', borderRadius: '4px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(' + post.image + ')',
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }} />

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile ? '28px' : '56px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '18px' }}>{post.category}</div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: isMobile ? '26px' : '42px', color: '#F0ECE6', lineHeight: 1.1, marginBottom: '16px', maxWidth: '680px' }}>{post.title}</div>
          <div style={{ fontSize: '14px', color: '#DCDCDC', maxWidth: '520px', lineHeight: 1.75 }}>{post.excerpt}</div>
          <div style={{ marginTop: '20px', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99' }}>Read article →</div>
        </div>
      </div>
    </a>
  )
}

export default function BlogPage({ onGetStarted }) {
  useSEO({
    title: 'The Pitch — Strategy, Operations & Playbooks for Agencies, Brands & Entrepreneurs',
    description: "Playbooks, strategies, and operations for agencies, brand teams, and entrepreneurs who work with talent.",
    canonical: 'https://h-que.com/blog',
  })
  const isMobile = window.innerWidth < 768

  const CATEGORIES = ['All', 'Agency Operations', 'Campaign Management', 'Talent Strategy', 'Brand Partnerships', 'Industry']
  const [activeCategory, setActiveCategory] = useState('All')
  const filteredPosts = activeCategory === 'All' ? POSTS : POSTS.filter(p => p.category === activeCategory)

  const hero = filteredPosts[0]
  const afterHero = filteredPosts.slice(1)
  // First two rows of three (cards 1–6 after the hero) sit above the CTA banner.
  const beforeCta = afterHero.slice(0, 6)
  // Remaining cards land below the CTA banner.
  const afterCta = afterHero.slice(6)

  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false)
  const [newsletterError, setNewsletterError] = useState('')
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim())

  function subscribeNewsletter() {
    if (!isValidEmail(newsletterEmail)) { setNewsletterError('Please enter a valid email address'); return }
    setNewsletterError('')
    const trimmed = newsletterEmail.trim()
    setNewsletterSubscribed(true)
    fetch('https://script.google.com/macros/s/AKfycbyvyIlOEgMAP_UOT4O07lUzQpB6MPJ5pipONT7Fem1IynGiDolHRfTQMQxWDtfIDk7e/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ email: trimmed, firstName: 'Blog Subscriber', list: 'marketing' })
    }).catch(() => {})
    fetch('/.netlify/functions/subscribe-klaviyo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed, firstName: 'Blog Subscriber', list: 'marketing' })
    }).catch(() => {})
  }

  return (
    <div style={{ background: '#0E0E0E', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#F0ECE6' }}>
      <MarketingNav onGetStarted={onGetStarted} />

      <div style={{ padding: isMobile ? '100px 24px 48px' : '130px 48px 64px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.36em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '16px' }}>The Pitch</div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: isMobile ? '44px' : '72px', fontWeight: 'normal', color: '#F0ECE6', lineHeight: 0.95 }}>Every deal<br />starts somewhere.</div>
        </div>
        <div style={{ fontSize: '13px', color: '#888', maxWidth: '280px', lineHeight: 1.9, paddingBottom: '10px' }}>Playbooks, strategies, and operations for agencies, brand teams, and entrepreneurs who work with talent.</div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 24px 24px' : '0 48px 28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '7px 14px',
                  fontSize: '9px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  background: active ? '#F0ECE6' : 'transparent',
                  color: active ? '#0E0E0E' : '#aaa',
                  border: `0.5px solid ${active ? '#F0ECE6' : '#2A2A2A'}`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 24px 80px' : '0 48px 100px' }}>
        {filteredPosts.length === 0 && (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#666', fontSize: '13px' }}>No posts in {activeCategory} yet. Try another category.</div>
        )}

        {hero && <HeroSpotlight post={hero} />}

        {beforeCta.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px', alignItems: 'stretch' }}>
            {beforeCta.map(post => <SpotlightCard key={post.slug} post={post} height="200px" titleSize="16px" showExcerpt />)}
          </div>
        )}

        {/* Mid-page CTA banner (between 6th and 7th post cards) */}
        {afterCta.length > 0 && (
          <div style={{ background: '#141414', border: '0.5px solid #1F1F1F', borderRadius: '6px', padding: isMobile ? '32px 24px' : '48px 56px', margin: '14px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(91,124,153,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '14px' }}>Ready to run it?</div>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: isMobile ? '24px' : '32px', color: '#F0ECE6', marginBottom: '14px', lineHeight: 1.25, maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto', letterSpacing: '-0.01em' }}>
                Everything in The Pitch works better when you have the right tool behind it.
              </div>
              <div style={{ fontSize: '14px', color: '#DCDCDC', lineHeight: 1.7, marginBottom: '24px', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
                HQue is the CRM and workspace built for agencies, brands, and entrepreneurs who work with talent.
              </div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
                <a href="/signup" style={{ padding: '13px 32px', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', background: '#5b7c99', color: '#fff', textDecoration: 'none', borderRadius: '2px' }}>Start Free Trial →</a>
                <a href="/#pricing" style={{ padding: '13px 24px', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#aaa', textDecoration: 'none' }}>See Pricing</a>
              </div>
            </div>
          </div>
        )}

        {afterCta.length > 0 && (() => {
          const remainder = afterCta.length % 3
          const fullCount = remainder === 0 ? afterCta.length : afterCta.length - remainder
          const fullRows = afterCta.slice(0, fullCount)
          const orphans = afterCta.slice(fullCount)
          // On desktop a 3-col grid cell with 14px gap = (100% - 28px) / 3
          const cardWidth = 'calc((100% - 28px) / 3)'
          return (
            <>
              {fullRows.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: orphans.length ? '14px' : 0, alignItems: 'stretch' }}>
                  {fullRows.map(post => <SpotlightCard key={post.slug} post={post} height="200px" titleSize="16px" showExcerpt />)}
                </div>
              )}
              {orphans.length > 0 && (
                isMobile ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                    {orphans.map(post => <SpotlightCard key={post.slug} post={post} height="200px" titleSize="16px" showExcerpt />)}
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', alignItems: 'stretch' }}>
                    {orphans.map(post => (
                      <div key={post.slug} style={{ width: cardWidth, display: 'flex' }}>
                        <SpotlightCard post={post} height="200px" titleSize="16px" showExcerpt />
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )
        })()}
      </div>

      {/* Newsletter capture strip */}
      <div style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '60px 24px' : '80px 48px', background: '#0E0E0E', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(91,124,153,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '14px' }}>The Pitch · In your inbox</div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: isMobile ? '28px' : '40px', color: '#F0ECE6', marginBottom: '14px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            No filler. <span style={{ fontStyle: 'italic', color: '#5b7c99' }}>Just playbooks.</span>
          </div>
          <div style={{ fontSize: '14px', color: '#DCDCDC', lineHeight: 1.7, marginBottom: '28px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
            Get strategy, operations, and real talk for agencies, brands, and entrepreneurs who work with talent. Drop your email — we'll do the rest.
          </div>
          {newsletterSubscribed ? (
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#5C9E52', padding: '20px 0' }}>You're in. We'll be in touch.</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', maxWidth: '460px', margin: '0 auto' }}>
                <input
                  value={newsletterEmail}
                  onChange={e => { setNewsletterEmail(e.target.value); if (newsletterError) setNewsletterError('') }}
                  onKeyDown={e => e.key === 'Enter' && subscribeNewsletter()}
                  placeholder='your@email.com'
                  type='email'
                  style={{ flex: 1, background: '#141414', border: `0.5px solid ${newsletterError ? '#c0392b' : '#2A2A2A'}`, borderRadius: '3px', padding: '12px 16px', fontSize: '13px', color: '#F0ECE6', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <button
                  onClick={subscribeNewsletter}
                  style={{ padding: '12px 24px', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '3px', whiteSpace: 'nowrap' }}
                >
                  Subscribe →
                </button>
              </div>
              {newsletterError && <div style={{ fontSize: '11px', color: '#c0392b', marginTop: '10px' }}>{newsletterError}</div>}
              <div style={{ fontSize: '10px', color: '#777', marginTop: '14px' }}>No spam. Unsubscribe anytime.</div>
            </>
          )}
        </div>
      </div>

      <Footer />
      <HQueChat />
    </div>
  )
}
