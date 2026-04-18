import { POSTS } from './BlogData'
import MarketingNav from './MarketingNav'
import HQueChat from './HQueChat'

export default function BlogPostPage({ slug, onGetStarted }) {
  const post = POSTS.find(p => p.slug === slug)
  const isMobile = window.innerWidth < 768

  if (!post) return (
    <div style={{ background: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: '#F0ECE6', marginBottom: '16px' }}>Post not found</div>
        <a href="/blog" style={{ fontSize: '11px', color: '#5b7c99', textDecoration: 'none', letterSpacing: '0.14em', textTransform: 'uppercase' }}>The Pitch</a>
      </div>
    </div>
  )

  const sameCat = POSTS.filter(p => p.slug !== slug && p.category === post.category)
  const others = POSTS.filter(p => p.slug !== slug && p.category !== post.category)
  const related = [...sameCat, ...others].slice(0, 3)
  const paragraphs = post.body.split('\n\n').filter(p => p.trim())

  return (
    <div style={{ background: '#111', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#F0ECE6' }}>
      <style>{`
        .related-card { transition: transform 0.3s ease; cursor: pointer; }
        .related-card:hover { transform: translateY(-4px); }
        .related-card:hover .rel-img { transform: scale(1.05); }
        .rel-img { transition: transform 0.5s ease; }
      `}</style>

      <MarketingNav onGetStarted={onGetStarted} />

      <div style={{ height: isMobile ? '260px' : '480px', position: 'relative', overflow: 'hidden', marginTop: '57px' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + post.image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(17,17,17,0.3) 0%, rgba(17,17,17,0.7) 100%)' }} />
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: isMobile ? '40px 24px 60px' : '60px 48px 80px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
          <a href="/blog" style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', textDecoration: 'none' }}>← The Pitch</a>
          <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#444', border: '0.5px solid #2A2A2A', padding: '3px 10px', borderRadius: '1px' }}>{post.category}</span>
          <span style={{ fontSize: '10px', color: '#444' }}>{post.readTime}</span>
          <span style={{ fontSize: '10px', color: '#333' }}>{post.date}</span>
        </div>

        <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '28px' : '42px', fontWeight: 'normal', color: '#F0ECE6', lineHeight: 1.15, marginBottom: '20px' }}>{post.title}</div>
        <div style={{ fontSize: '16px', color: '#777', lineHeight: 1.7, marginBottom: '40px', borderLeft: '2px solid #5b7c99', paddingLeft: '20px', fontStyle: 'italic' }}>{post.excerpt}</div>
        <div style={{ height: '0.5px', background: '#1A1A1A', marginBottom: '40px' }} />

        <div style={{ fontSize: '16px', color: '#888', lineHeight: 1.9 }}>
          {paragraphs.map((para, i) => {
            if (para.startsWith('**') && para.endsWith('**')) {
              return <h3 key={i} style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F0ECE6', fontWeight: 'normal', margin: '36px 0 16px' }}>{para.replace(/\*\*/g, '')}</h3>
            }
            const parts = para.split(/(\*\*[^*]+\*\*)/)
            return (
              <p key={i} style={{ marginBottom: '24px' }}>
                {parts.map((part, j) => part.startsWith('**') ? <strong key={j} style={{ color: '#F0ECE6', fontWeight: 500 }}>{part.replace(/\*\*/g, '')}</strong> : <span key={j}>{part}</span>)}
              </p>
            )
          })}
        </div>

        <div style={{ marginTop: '60px', padding: '32px', background: '#141414', border: '0.5px solid #1A1A1A', borderRadius: '2px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#F0ECE6', marginBottom: '8px' }}>Run your agency like this.</div>
          <div style={{ fontSize: '13px', color: '#555', marginBottom: '20px', lineHeight: 1.6 }}>HQue is the operating system for agencies built on talent partnerships. Roster management, campaigns, payments — all in one place.</div>
          <button onClick={onGetStarted} style={{ padding: '12px 32px', background: '#5b7c99', border: 'none', color: '#fff', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '1px' }}>Start your free trial</button>
        </div>
      </div>

      {related.length > 0 && (
        <div style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '40px 24px 60px' : '60px 48px 80px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '24px' }}>More from The Pitch</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '2px' }}>
            {related.map(p => (
              <a key={p.slug} href={'/blog/' + p.slug} style={{ textDecoration: 'none' }}>
                <div className="related-card" style={{ background: '#141414', overflow: 'hidden', borderRadius: '2px' }}>
                  <div style={{ height: '160px', overflow: 'hidden' }}>
                    <div className="rel-img" style={{ height: '100%', backgroundImage: 'url(' + p.image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  </div>
                  <div style={{ padding: '18px' }}>
                    <div style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '8px' }}>{p.category}</div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#F0ECE6', lineHeight: 1.3 }}>{p.title}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div style={{ borderTop: '0.5px solid #1A1A1A', padding: isMobile ? '20px 24px' : '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#2A2A2A' }}>© 2026 HQue. All rights reserved.</span>
        <a href="/blog" style={{ fontSize: '10px', color: '#333', textDecoration: 'none', letterSpacing: '0.1em' }}>← The Pitch</a>
      </div>
      <HQueChat />
    </div>
  )
}
