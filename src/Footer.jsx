// Shared marketing footer — used on every public page so they stay identical.
// Matches the homepage footer (social icons, tagline, sign-off). It carries its
// own dark background + font so it renders correctly even on the light-themed
// legal pages. Links use root-relative hrefs (e.g. /#features) so they work from
// any page, not just the homepage.
export default function Footer() {
  const mobile = typeof window !== 'undefined' && window.innerWidth < 768

  const Column = (title, links) => (
    <div>
      <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ffffff', fontWeight: '700', marginBottom: '16px' }}>{title}</div>
      {links.map(([label, href]) => (
        <div key={label} style={{ marginBottom: '10px' }}>
          {href
            ? <a href={href} style={{ fontSize: '12px', color: '#CCCCCC', textDecoration: 'none' }}>{label}</a>
            : <span style={{ fontSize: '12px', color: '#2A2A2A' }}>{label}</span>}
        </div>
      ))}
    </div>
  )

  return (
    <footer style={{ borderTop: '0.5px solid #1A1A1A', padding: mobile ? '40px 24px' : '60px 48px 40px', background: '#111', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : '2fr 1fr 1fr 1fr', gap: mobile ? '32px' : '48px', marginBottom: '48px' }}>
        <div>
          <a href="/"><img src="/logo.svg" alt="HQue" style={{ width: '100px', marginBottom: '16px', display: 'block', cursor: 'pointer' }} /></a>
          <div style={{ fontSize: '12px', color: '#DCDCDC', lineHeight: 1.7, maxWidth: '260px' }}>The CRM and workspace for agencies, brands, and entrepreneurs who work with talent.</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <a href="https://instagram.com/theofficialHQue" target="_blank" rel="noreferrer" style={{ color: '#BBB' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
            </a>
            <a href="https://www.linkedin.com/company/h-que" target="_blank" rel="noreferrer" style={{ color: '#BBB' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
          </div>
        </div>
        {Column('Product', [['Features', '/#features'], ['Pricing', '/pricing']])}
        {Column('Resources', [['FAQ', '/faq'], ['The Pitch', '/blog'], ["What's New", '/updates']])}
        {Column('Legal', [['Privacy', '/privacy'], ['Terms', '/terms'], ['support@h-que.com', 'mailto:support@h-que.com']])}
      </div>
      <div style={{ borderTop: '0.5px solid #1A1A1A', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '10px', color: '#DCDCDC', whiteSpace: 'nowrap' }}>© 2026 HQue. All rights reserved.</span>
        <span style={{ fontSize: '10px', color: '#DCDCDC', fontStyle: 'italic', whiteSpace: 'nowrap', flexShrink: 0, marginRight: '60px' }}>Made for people who work with talent.</span>
      </div>
    </footer>
  )
}
