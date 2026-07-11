import { useState } from 'react'

// Same email-capture endpoint the chat gate and blog use (a Google Apps Script
// that writes to a Sheet). Footer signups are tagged list:'leads' so they can be
// routed to the Klaviyo "Leads" list once that integration is wired up.
const NEWSLETTER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyvyIlOEgMAP_UOT4O07lUzQpB6MPJ5pipONT7Fem1IynGiDolHRfTQMQxWDtfIDk7e/exec'

// Shared marketing footer — used on every public page so they stay identical.
// Matches the homepage footer (social icons, tagline, sign-off). It carries its
// own dark background + font so it renders correctly even on the light-themed
// legal pages. Links use root-relative hrefs (e.g. /#features) so they work from
// any page, not just the homepage.
export default function Footer() {
  const mobile = typeof window !== 'undefined' && window.innerWidth < 768

  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [err, setErr] = useState('')

  function subscribe() {
    const e = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setErr('Enter a valid email'); return }
    setErr('')
    setSubscribed(true)
    fetch(NEWSLETTER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ email: e, firstName: 'Footer Subscriber', list: 'leads', source: 'footer' }),
    }).catch(() => {})
  }

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

          {/* Newsletter / leads capture */}
          <div style={{ marginTop: '22px', maxWidth: '280px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '10px' }}>Get tips & updates</div>
            {subscribed ? (
              <div style={{ fontSize: '12px', color: '#5C9E52' }}>✓ Thanks — you’re on the list.</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email" value={email}
                    onChange={e => { setEmail(e.target.value); if (err) setErr('') }}
                    onKeyDown={e => { if (e.key === 'Enter') subscribe() }}
                    placeholder="your@email.com"
                    style={{ flex: 1, minWidth: 0, background: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '4px', padding: '9px 11px', fontSize: '12px', color: '#F0ECE6', outline: 'none' }}
                  />
                  <button onClick={subscribe} style={{ padding: '9px 15px', background: '#5b7c99', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>→</button>
                </div>
                {err && <div style={{ fontSize: '10px', color: '#C77B5B', marginTop: '6px' }}>{err}</div>}
              </>
            )}
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
