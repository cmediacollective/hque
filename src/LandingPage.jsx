import { useState, useEffect, useRef } from 'react'

const SCREENS = [
  { label: 'Talent Database', color: '#1E1E1E' },
  { label: 'Campaigns', color: '#1A1A1E' },
  { label: 'Workspace', color: '#1C1C1C' },
  { label: 'Reports', color: '#1E1A1E' },
]

const FEATURES = [
  {
    num: '01',
    title: 'Your entire roster, one place.',
    body: 'Talent profiles, social handles, rates, outreach history — everything your team needs to move fast and book deals.'
  },
  {
    num: '02',
    title: 'Campaigns that close.',
    body: 'Track every deal from pitch to payment. Know exactly what\'s booked, what\'s pending, and what\'s overdue.'
  },
  {
    num: '03',
    title: 'Built for agencies, not spreadsheets.',
    body: 'A platform that thinks the way you do. Multi-user, multi-campaign, with a talent inquiry form your clients will actually fill out.'
  }
]

const PLANS = [
  { name: 'Starter', price: '$49', features: ['Up to 50 talent', '2 team members', 'Campaigns & outreach', 'Talent inquiry form'] },
  { name: 'Pro', price: '$99', features: ['Unlimited talent', '5 team members', 'Reports & analytics', 'Priority support'], highlight: true },
  { name: 'Agency', price: '$199', features: ['Unlimited everything', 'Unlimited team members', 'Custom onboarding', 'Dedicated support'] },
]

export default function LandingPage({ onGetStarted }) {
  const [activeScreen, setActiveScreen] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveScreen(s => (s + 1) % SCREENS.length)
    }, 2800)
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: '#111', color: '#F0ECE6', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(17,17,17,0.95)' : 'transparent',
        borderBottom: scrolled ? '0.5px solid #222' : 'none',
        transition: 'all 0.3s ease'
      }}>
        <img src="/logo.svg" alt="HQue" style={{ width: '100px', height: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a href="#features" style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#666', textDecoration: 'none' }}>Features</a>
          <a href="#pricing" style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#666', textDecoration: 'none' }}>Pricing</a>
          <button onClick={onGetStarted} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #333', color: '#999', cursor: 'pointer', borderRadius: '1px' }}>Sign in</button>
          <button onClick={onGetStarted} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Start free</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 48px 80px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(91,124,153,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '28px' }}>The Agency OS</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(42px, 7vw, 88px)', fontWeight: 'normal', lineHeight: 1.08, color: '#F0ECE6', margin: '0 0 28px', maxWidth: '900px' }}>
          Run your roster.<br />
          <span style={{ color: '#5b7c99' }}>Not your inbox.</span>
        </h1>
        <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.8, maxWidth: '480px', margin: '0 0 48px' }}>
          HQue is the operating system for talent agencies — built to replace the spreadsheets, threads, and tools slowing you down.
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={onGetStarted} style={{ padding: '14px 36px', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
            Start free trial
          </button>
          <a href="#features" style={{ padding: '14px 24px', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#555', textDecoration: 'none' }}>See how it works →</a>
        </div>
        <div style={{ marginTop: '16px', fontSize: '10px', color: '#3A3A3A', letterSpacing: '0.1em' }}>14-day free trial · No credit card required</div>
      </section>

      {/* App Showcase */}
      <section style={{ padding: '0 48px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1000px', position: 'relative' }}>
          {/* Browser chrome */}
          <div style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '8px 8px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['#FF5F57', '#FFBD2E', '#28C840'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
            </div>
            <div style={{ flex: 1, background: '#111', borderRadius: '4px', padding: '4px 12px', fontSize: '10px', color: '#444', textAlign: 'center' }}>h-que.com</div>
          </div>

          {/* Screen area */}
          <div style={{ background: SCREENS[activeScreen].color, border: '0.5px solid #2A2A2A', borderTop: 'none', borderRadius: '0 0 8px 8px', height: '520px', display: 'flex', overflow: 'hidden', position: 'relative', transition: 'background 0.6s ease' }}>

            {/* Sidebar mockup */}
            <div style={{ width: '180px', borderRight: '0.5px solid #2A2A2A', padding: '24px 0', flexShrink: 0 }}>
              <div style={{ padding: '0 16px 20px', borderBottom: '0.5px solid #2A2A2A', marginBottom: '16px' }}>
                <img src="/logo.svg" alt="HQue" style={{ width: '80px' }} />
              </div>
              {['Talent', 'Workspace', 'Campaigns', 'Reports'].map((item, i) => (
                <div key={item} style={{ padding: '9px 16px', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: i === activeScreen ? '#F0ECE6' : '#444', borderLeft: i === activeScreen ? '1.5px solid #5b7c99' : '1.5px solid transparent' }}>{item}</div>
              ))}
            </div>

            {/* Content mockup */}
            <div style={{ flex: 1, padding: '28px', overflow: 'hidden' }}>
              <div style={{ fontSize: '8px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#444', marginBottom: '6px' }}>cMedia Collective</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#F0ECE6', marginBottom: '24px' }}>{SCREENS[activeScreen].label}</div>

              {/* Fake content grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2A2A2A' }}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{ background: '#1E1E1E', padding: '16px', opacity: 1 - (i * 0.05) }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '2px', background: '#2A2A2A', marginBottom: '10px' }} />
                    <div style={{ height: '8px', background: '#2A2A2A', borderRadius: '1px', marginBottom: '6px', width: '80%' }} />
                    <div style={{ height: '6px', background: '#222', borderRadius: '1px', width: '60%' }} />
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '0.5px solid #2A2A2A', display: 'flex', gap: '8px' }}>
                      <div style={{ height: '6px', background: '#2A2A2A', borderRadius: '1px', flex: 1 }} />
                      <div style={{ height: '6px', background: '#2A2A2A', borderRadius: '1px', flex: 1 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Screen label */}
            <div style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', gap: '6px' }}>
              {SCREENS.map((s, i) => (
                <div key={i} onClick={() => { setActiveScreen(i); clearInterval(intervalRef.current) }} style={{ width: i === activeScreen ? '24px' : '6px', height: '6px', borderRadius: '3px', background: i === activeScreen ? '#5b7c99' : '#333', cursor: 'pointer', transition: 'all 0.3s ease' }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 48px 120px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '48px', textAlign: 'center' }}>What HQue does</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px' }}>
          {FEATURES.map(f => (
            <div key={f.num}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#333', marginBottom: '16px' }}>{f.num}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F0ECE6', marginBottom: '14px', lineHeight: 1.3 }}>{f.title}</div>
              <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div style={{ height: '0.5px', background: 'linear-gradient(to right, transparent, #2A2A2A, transparent)', maxWidth: '800px', margin: '0 auto' }} />

      {/* Pricing */}
      <section id="pricing" style={{ padding: '100px 48px 120px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px', textAlign: 'center' }}>Pricing</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '36px', color: '#F0ECE6', marginBottom: '48px', textAlign: 'center', fontWeight: 'normal' }}>Simple, transparent pricing.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: plan.highlight ? '#1E2428' : '#141414',
              border: `0.5px solid ${plan.highlight ? '#5b7c99' : '#222'}`,
              borderRadius: '2px', padding: '36px 28px', position: 'relative'
            }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: '-1px', right: '20px', background: '#5b7c99', color: '#fff', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 2px 2px' }}>Most Popular</div>
              )}
              <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '16px' }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '28px' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: '40px', color: '#F0ECE6' }}>{plan.price}</span>
                <span style={{ fontSize: '12px', color: '#555' }}>/month</span>
              </div>
              <div style={{ borderTop: '0.5px solid #222', paddingTop: '20px', marginBottom: '28px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#5b7c99', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: '#666', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={onGetStarted} style={{
                width: '100%', padding: '12px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase',
                background: plan.highlight ? '#5b7c99' : 'none',
                border: `0.5px solid ${plan.highlight ? '#5b7c99' : '#333'}`,
                color: plan.highlight ? '#fff' : '#555',
                cursor: 'pointer', borderRadius: '1px'
              }}>Get started</button>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: '#333' }}>14-day free trial on all plans · No credit card required</div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '80px 48px 120px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(91,124,153,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '24px' }}>Ready?</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(32px, 5vw, 60px)', color: '#F0ECE6', marginBottom: '32px', fontWeight: 'normal', lineHeight: 1.2 }}>
          Your agency deserves<br />better tools.
        </div>
        <button onClick={onGetStarted} style={{ padding: '16px 48px', fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
          Start your free trial
        </button>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '0.5px solid #1A1A1A', padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/logo.svg" alt="HQue" style={{ width: '80px', opacity: 0.4 }} />
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="mailto:support@hque.com" style={{ fontSize: '10px', color: '#333', textDecoration: 'none', letterSpacing: '0.1em' }}>support@hque.com</a>
          <span style={{ fontSize: '10px', color: '#222' }}>© 2026 HQue</span>
        </div>
      </footer>
    </div>
  )
}
