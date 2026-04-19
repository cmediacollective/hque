import { useState, useEffect } from 'react'

export default function MarketingNav({ onSignIn, onGetStarted }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/pricing' },
  ]

  return (
    <>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: isMobile ? '16px 20px' : '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrolled || menuOpen ? 'rgba(17,17,17,0.98)' : 'rgba(17,17,17,0.85)', borderBottom: scrolled || menuOpen ? '0.5px solid #222' : 'none', transition: 'all 0.3s ease' }}>
        <a href="/"><img src="/logo.svg" alt="HQue" style={{ width: isMobile ? '80px' : '100px', height: 'auto' }} /></a>

        {isMobile ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={onGetStarted} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Start free</button>
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ display: 'block', width: '20px', height: '1px', background: '#888', transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(3px, 3px)' : 'none' }} />
              <span style={{ display: 'block', width: '20px', height: '1px', background: '#888', transition: 'all 0.2s', opacity: menuOpen ? 0 : 1 }} />
              <span style={{ display: 'block', width: '20px', height: '1px', background: '#888', transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(3px, -3px)' : 'none' }} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {links.map(l => (
              <a key={l.label} href={l.href} style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#fff', textDecoration: 'none' }}>{l.label}</a>
            ))}
            {onSignIn && <button onClick={onSignIn} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #555', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Sign in</button>}
            <button onClick={onGetStarted} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Start free</button>
          </div>
        )}
      </nav>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div style={{ position: 'fixed', top: '57px', left: 0, right: 0, zIndex: 99, background: 'rgba(17,17,17,0.98)', borderBottom: '0.5px solid #222', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {links.map(l => (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{ padding: '12px 0', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#fff', textDecoration: 'none', borderBottom: '0.5px solid #1A1A1A' }}>{l.label}</a>
          ))}
          {onSignIn && (
            <button onClick={() => { setMenuOpen(false); onSignIn() }} style={{ marginTop: '8px', padding: '12px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #555', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Sign in</button>
          )}
        </div>
      )}
    </>
  )
}
