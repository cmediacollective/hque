import { POSTS } from './BlogData'
import MarketingNav from './MarketingNav'
import HQueChat from './HQueChat'

export default function BlogPage({ onGetStarted }) {
  const isMobile = window.innerWidth < 768
  const hero = POSTS[0]
  const col1 = POSTS.slice(1, 4)
  const portrait = POSTS[4]
  const wide = POSTS[5]
  const bottom = POSTS.slice(6)

  return (
    <div style={{ background: '#111', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#F0ECE6' }}>
      <style>{`
        .pc { transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease; cursor: pointer; }
        .pc:hover { transform: scale(1.03) translateY(-6px); box-shadow: 0 20px 60px rgba(0,0,0,0.6); z-index: 2; position: relative; }
        .pc:hover .pi { transform: scale(1.12); }
        .pi { transition: transform 0.4s ease; }
        .pc:hover .po { opacity: 1; }
        .po { opacity: 0; transition: opacity 0.2s ease; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(91,124,153,0.3) 0%, transparent 60%); }
      `}</style>

      <MarketingNav onGetStarted={onGetStarted} />

      {/* Header */}
      <div style={{ padding: isMobile ? '100px 24px 48px' : '120px 48px 56px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '14px' }}>The Pitch</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '42px' : '64px', fontWeight: 'normal', color: '#F0ECE6', lineHeight: 1.0 }}>Every deal<br />starts somewhere.</div>
        </div>
        <div style={{ fontSize: '13px', color: '#444', maxWidth: '220px', lineHeight: 1.8, paddingBottom: '8px' }}>Strategy and operations for the agencies building what's next.</div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 24px 80px' : '0 48px 100px' }}>

        {/* Hero */}
        {hero && (
          <a href={'/blog/' + hero.slug} style={{ textDecoration: 'none', display: 'block', marginBottom: '12px' }}>
            <div className="pc" style={{ position: 'relative', height: isMobile ? '340px' : '520px', overflow: 'hidden', borderRadius: '3px' }}>
              <div className="pi" style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + hero.image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
              <div className="po" />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile ? '28px' : '48px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '14px' }}>{hero.category} · {hero.readTime}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '24px' : '36px', color: '#F0ECE6', lineHeight: 1.15, marginBottom: '14px', maxWidth: '700px' }}>{hero.title}</div>
                <div style={{ fontSize: '13px', color: '#999', maxWidth: '560px', lineHeight: 1.6 }}>{hero.excerpt}</div>
              </div>
            </div>
          </a>
        )}

        {/* Three column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
          {col1.map(post => (
            <a key={post.slug} href={'/blog/' + post.slug} style={{ textDecoration: 'none' }}>
              <div className="pc" style={{ background: '#141414', overflow: 'hidden', borderRadius: '3px', height: '100%' }}>
                <div style={{ height: '220px', overflow: 'hidden', position: 'relative' }}>
                  <div className="pi" style={{ height: '100%', backgroundImage: 'url(' + post.image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="po" />
                </div>
                <div style={{ padding: '22px' }}>
                  <div style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '10px' }}>{post.category} · {post.readTime}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#F0ECE6', lineHeight: 1.3, marginBottom: '12px' }}>{post.title}</div>
                  <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.7 }}>{post.excerpt}</div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Portrait + Wide row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
          {portrait && (
            <a href={'/blog/' + portrait.slug} style={{ textDecoration: 'none' }}>
              <div className="pc" style={{ background: '#141414', overflow: 'hidden', borderRadius: '3px', height: isMobile ? 'auto' : '420px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: '260px' }}>
                  <div className="pi" style={{ height: '100%', backgroundImage: 'url(' + portrait.image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="po" />
                </div>
                <div style={{ padding: '22px' }}>
                  <div style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '10px' }}>{portrait.category} · {portrait.readTime}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#F0ECE6', lineHeight: 1.3 }}>{portrait.title}</div>
                </div>
              </div>
            </a>
          )}
          {wide && (
            <a href={'/blog/' + wide.slug} style={{ textDecoration: 'none' }}>
              <div className="pc" style={{ background: '#141414', overflow: 'hidden', borderRadius: '3px', height: isMobile ? 'auto' : '420px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '260px', overflow: 'hidden', position: 'relative' }}>
                  <div className="pi" style={{ height: '100%', backgroundImage: 'url(' + wide.image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="po" />
                </div>
                <div style={{ padding: '28px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px' }}>{wide.category} · {wide.readTime}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#F0ECE6', lineHeight: 1.25, marginBottom: '14px' }}>{wide.title}</div>
                  <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.7 }}>{wide.excerpt}</div>
                </div>
              </div>
            </a>
          )}
        </div>

        {/* Bottom grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
          {bottom.map(post => (
            <a key={post.slug} href={'/blog/' + post.slug} style={{ textDecoration: 'none' }}>
              <div className="pc" style={{ background: '#141414', overflow: 'hidden', borderRadius: '3px' }}>
                <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
                  <div className="pi" style={{ height: '100%', backgroundImage: 'url(' + post.image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="po" />
                </div>
                <div style={{ padding: '18px' }}>
                  <div style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '8px' }}>{post.category}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#F0ECE6', lineHeight: 1.3, marginBottom: '8px' }}>{post.title}</div>
                  <div style={{ fontSize: '10px', color: '#444' }}>{post.readTime}</div>
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
