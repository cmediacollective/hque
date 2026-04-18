import { useState } from 'react'
import { POSTS, CATEGORIES } from './BlogData'
import MarketingNav from './MarketingNav'
import HQueChat from './HQueChat'

export default function BlogPage({ onGetStarted }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const isMobile = window.innerWidth < 768

  const filtered = activeCategory === 'All' ? POSTS : POSTS.filter(p => p.category === activeCategory)
  const hero = filtered[0]
  const rest = filtered.slice(1)

  return (
    <div style={{ background: '#111', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#F0ECE6' }}>
      <style>{`
        .blog-card { transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: pointer; }
        .blog-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
        .blog-card:hover .blog-img { transform: scale(1.05); }
        .blog-img { transition: transform 0.5s ease; }
        .blog-card:hover .blog-overlay { opacity: 1; }
        .blog-overlay { opacity: 0; transition: opacity 0.3s ease; }
        .cat-chip { transition: all 0.2s ease; cursor: pointer; }
        .cat-chip:hover { border-color: #5b7c99 !important; color: #5b7c99 !important; }
      `}</style>

      <MarketingNav onGetStarted={onGetStarted} />

      <div style={{ padding: isMobile ? '100px 24px 40px' : '120px 48px 48px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px' }}>The HQue Journal</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '36px' : '52px', fontWeight: 'normal', color: '#F0ECE6', lineHeight: 1.05 }}>Insights for agencies<br />that move fast.</div>
        </div>
        <div style={{ fontSize: '13px', color: '#555', maxWidth: '260px', lineHeight: 1.7 }}>Strategy, operations, and the business of talent — for the agencies building what's next.</div>
      </div>

      <div style={{ padding: isMobile ? '0 24px' : '0 48px', maxWidth: '1100px', margin: '0 auto 40px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['All', ...CATEGORIES].map(cat => (
          <button key={cat} className="cat-chip" onClick={() => setActiveCategory(cat)} style={{ padding: '5px 14px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${activeCategory === cat ? '#5b7c99' : '#2A2A2A'}`, color: activeCategory === cat ? '#5b7c99' : '#555', borderRadius: '1px' }}>{cat}</button>
        ))}
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 24px 80px' : '0 48px 100px' }}>
        {hero && (
          <a href={'/blog/' + hero.slug} style={{ textDecoration: 'none', display: 'block', marginBottom: '2px' }}>
            <div className="blog-card" style={{ position: 'relative', height: isMobile ? '320px' : '480px', overflow: 'hidden', borderRadius: '2px', marginBottom: '2px' }}>
              <div className="blog-img" style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + hero.image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
              <div className="blog-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(91,124,153,0.15)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile ? '24px' : '40px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', background: 'rgba(91,124,153,0.15)', padding: '3px 10px', borderRadius: '1px' }}>{hero.category}</span>
                  <span style={{ fontSize: '10px', color: '#888' }}>{hero.readTime}</span>
                </div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '22px' : '32px', color: '#F0ECE6', lineHeight: 1.2, marginBottom: '12px', maxWidth: '700px' }}>{hero.title}</div>
                <div style={{ fontSize: '13px', color: '#aaa', maxWidth: '560px', lineHeight: 1.6 }}>{hero.excerpt}</div>
              </div>
            </div>
          </a>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '2px', marginBottom: '2px' }}>
          {rest.slice(0, 3).map(post => (
            <a key={post.slug} href={'/blog/' + post.slug} style={{ textDecoration: 'none' }}>
              <div className="blog-card" style={{ background: '#141414', overflow: 'hidden', borderRadius: '2px' }}>
                <div style={{ height: '200px', overflow: 'hidden' }}>
                  <div className="blog-img" style={{ height: '100%', backgroundImage: 'url(' + post.image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99' }}>{post.category}</span>
                    <span style={{ fontSize: '9px', color: '#444' }}>{post.readTime}</span>
                  </div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#F0ECE6', lineHeight: 1.3, marginBottom: '10px' }}>{post.title}</div>
                  <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.6 }}>{post.excerpt}</div>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2px', marginBottom: '2px' }}>
          {rest.slice(3, 5).map(post => (
            <a key={post.slug} href={'/blog/' + post.slug} style={{ textDecoration: 'none' }}>
              <div className="blog-card" style={{ background: '#141414', overflow: 'hidden', borderRadius: '2px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : '200px' }}>
                <div style={{ width: isMobile ? '100%' : '180px', height: isMobile ? '160px' : '100%', flexShrink: 0, overflow: 'hidden' }}>
                  <div className="blog-img" style={{ height: '100%', backgroundImage: 'url(' + post.image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '8px' }}>{post.category}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#F0ECE6', lineHeight: 1.3, marginBottom: '8px' }}>{post.title}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>{post.readTime}</div>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '2px' }}>
          {rest.slice(5).map(post => (
            <a key={post.slug} href={'/blog/' + post.slug} style={{ textDecoration: 'none' }}>
              <div className="blog-card" style={{ background: '#141414', overflow: 'hidden', borderRadius: '2px' }}>
                <div style={{ height: '160px', overflow: 'hidden' }}>
                  <div className="blog-img" style={{ height: '100%', backgroundImage: 'url(' + post.image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                </div>
                <div style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99' }}>{post.category}</span>
                    <span style={{ fontSize: '9px', color: '#444' }}>{post.readTime}</span>
                  </div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#F0ECE6', lineHeight: 1.3, marginBottom: '8px' }}>{post.title}</div>
                  <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.6 }}>{post.excerpt}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '20px 24px' : '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#2A2A2A' }}>© 2026 HQue. All rights reserved.</span>
        <a href="/" style={{ fontSize: '10px', color: '#333', textDecoration: 'none', letterSpacing: '0.1em' }}>← Back to home</a>
      </div>
      <HQueChat />
    </div>
  )
}
