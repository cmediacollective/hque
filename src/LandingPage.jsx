import { useState, useEffect, useRef } from 'react'

const FAKE_TALENT = [
  { name: 'Ava Monroe', type: 'INFLUENCER', handle: '@avamonroe', followers: '847K', niche: 'BEAUTY', photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face' },
  { name: 'Jordan Ellis', type: 'UGC · INFLUENCER', handle: '@jordanellis', followers: '124K', niche: 'FITNESS', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
  { name: 'Mila Torres', type: 'INFLUENCER', handle: '@milatorresx', followers: '2.1M', niche: 'LIFESTYLE', photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop&crop=face' },
  { name: 'Caden Park', type: 'ATHLETE · INFLUENCER', handle: '@cadenpark', followers: '390K', niche: 'SPORTS', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
  { name: 'Simone Veil', type: 'SPEAKER/HOST', handle: '@simoneveil', followers: '58K', niche: 'WELLNESS', photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face' },
  { name: 'Raya Hassan', type: 'INFLUENCER', handle: '@rayahassan', followers: '1.4M', niche: 'FASHION', photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face' },
  { name: 'Teo Briggs', type: 'PODCAST · UGC', handle: '@teobriggs', followers: '210K', niche: 'TECH', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
  { name: 'Lena Voss', type: 'INFLUENCER', handle: '@lenavoss', followers: '76K', niche: 'FOOD', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=face' },
]

const FAKE_CAMPAIGNS = [
  { brand: 'LUMIÈRE', name: 'Spring Glow Campaign', status: 'ACTIVE', budget: '$24,000', talent: '4 talent', color: '#C9A96E' },
  { brand: 'NORD ATHLETIC', name: 'Q2 Brand Push', status: 'ACTIVE', budget: '$18,500', talent: '3 talent', color: '#4A7C59' },
  { brand: 'DUSK BEAUTY', name: 'Holiday Collection', status: 'PITCH', budget: '$12,000', talent: '2 talent', color: '#9B6B8A' },
  { brand: 'MAVEN FOODS', name: 'Creator Series', status: 'COMPLETED', budget: '$9,200', talent: '5 talent', color: '#C07A4F' },
]

const FAKE_TASKS = [
  { title: 'Send contracts — Lumière', col: 'IN PROGRESS', priority: 'HIGH', date: 'Apr 12' },
  { title: 'Review UGC deliverables', col: 'IN PROGRESS', priority: 'MEDIUM', date: 'Apr 14' },
  { title: 'Q2 talent roster refresh', col: 'TO DO', priority: 'LOW', date: 'Apr 18' },
  { title: 'Nord Athletic brief review', col: 'TO DO', priority: 'HIGH', date: 'Apr 11' },
  { title: 'Maven Foods final report', col: 'DONE', priority: 'LOW', date: 'Apr 3' },
  { title: 'Onboard Raya Hassan', col: 'DONE', priority: 'MEDIUM', date: 'Apr 1' },
  { title: 'Dusk Beauty pitch deck', col: 'DONE', priority: 'HIGH', date: 'Mar 28' },
]

const FAKE_STATS = [
  { label: 'TOTAL BUDGET', value: '$63,700' },
  { label: 'CAMPAIGNS', value: '4', sub: '2 active · 1 pitch · 1 done' },
  { label: 'PAYMENTS', value: '3 paid', sub: '5 pending' },
  { label: 'TOTAL TALENT', value: '24' },
]

const SCREENS = [
  { label: 'Talent Database', key: 'talent' },
  { label: 'Campaigns', key: 'campaigns' },
  { label: 'Workspace', key: 'workspace' },
  { label: 'Reports', key: 'reports' },
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

function BrandLogo({ brand, color, size = 44 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '2px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
      <span style={{ fontFamily: 'Georgia, serif', fontSize: Math.round(size * 0.4), color: '#fff', fontWeight: 700, lineHeight: 1 }}>{brand.charAt(0)}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const color = status === 'ACTIVE' ? '#5b7c99' : status === 'COMPLETED' ? '#5C9E52' : '#666'
  return (
    <span style={{ fontSize: '7px', letterSpacing: '0.12em', border: `0.5px solid ${color}`, color, padding: '4px 10px', borderRadius: '1px', whiteSpace: 'nowrap', minWidth: '64px', textAlign: 'center', display: 'inline-block' }}>{status}</span>
  )
}

function ScreenContent({ screen }) {
  if (screen === 'talent') return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2A2A2A' }}>
      {FAKE_TALENT.map((t, i) => (
        <div key={i} style={{ background: '#1E1E1E', padding: '16px', opacity: 1 - (i * 0.04) }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '2px', background: '#2A2A2A', marginBottom: '10px', overflow: 'hidden' }}>
            <img src={t.photo} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: '7px', letterSpacing: '0.16em', color: '#5b7c99', marginBottom: '4px' }}>{t.type}</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '12px', color: '#F0ECE6', marginBottom: '2px' }}>{t.name}</div>
          <div style={{ fontSize: '10px', color: '#555', marginBottom: '8px' }}>{t.handle}</div>
          <div style={{ paddingTop: '8px', borderTop: '0.5px solid #2A2A2A' }}>
            <div style={{ fontSize: '11px', color: '#F0ECE6', fontWeight: 500 }}>{t.followers}</div>
            <div style={{ fontSize: '7px', color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Followers</div>
          </div>
        </div>
      ))}
    </div>
  )

  if (screen === 'campaigns') return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: '#2A2A2A' }}>
      {FAKE_CAMPAIGNS.map((c, i) => (
        <div key={i} style={{ background: '#1E1E1E', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '160px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <BrandLogo brand={c.brand} color={c.color} size={44} />
            <StatusBadge status={c.status} />
          </div>
          <div style={{ fontSize: '8px', letterSpacing: '0.16em', color: '#5b7c99', marginBottom: '6px' }}>{c.brand}</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#F0ECE6', flex: 1, lineHeight: 1.4 }}>{c.name}</div>
          <div style={{ paddingTop: '14px', marginTop: '14px', borderTop: '0.5px solid #2A2A2A', display: 'flex', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#F0ECE6', fontWeight: 500 }}>{c.budget}</div>
              <div style={{ fontSize: '7px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>Budget</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#777' }}>{c.talent}</div>
              <div style={{ fontSize: '7px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>Talent</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  if (screen === 'workspace') return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#2A2A2A', height: '360px', overflow: 'hidden' }}>
      {['TO DO', 'IN PROGRESS', 'DONE'].map(col => (
        <div key={col} style={{ background: '#1A1A1A', padding: '14px', overflowY: 'auto' }}>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', color: col === 'DONE' ? '#5C9E52' : '#444', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{col}</span>
            <span>{FAKE_TASKS.filter(t => t.col === col).length}</span>
          </div>
          {FAKE_TASKS.filter(t => t.col === col).map((task, i) => (
            <div key={i} style={{ background: col === 'DONE' ? '#1C1C1C' : '#222', border: `0.5px solid ${col === 'DONE' ? '#1E1E1E' : '#2A2A2A'}`, borderRadius: '1px', padding: '12px', marginBottom: '8px', opacity: col === 'DONE' ? 0.6 : 1 }}>
              <div style={{ fontSize: '11px', color: col === 'DONE' ? '#555' : '#F0ECE6', marginBottom: '8px', lineHeight: 1.4, textDecoration: col === 'DONE' ? 'line-through' : 'none' }}>{task.title}</div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '7px', letterSpacing: '0.1em', border: `0.5px solid ${col === 'DONE' ? '#333' : task.priority === 'HIGH' ? '#c0392b' : task.priority === 'MEDIUM' ? '#5b7c99' : '#444'}`, color: col === 'DONE' ? '#444' : task.priority === 'HIGH' ? '#c0392b' : task.priority === 'MEDIUM' ? '#5b7c99' : '#555', padding: '1px 5px', borderRadius: '1px' }}>{task.priority}</span>
                <span style={{ fontSize: '9px', color: '#444' }}>{task.date}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )

  if (screen === 'reports') return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#2A2A2A', marginBottom: '1px' }}>
        {FAKE_STATS.map((s, i) => (
          <div key={i} style={{ background: '#222', padding: '16px' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F0ECE6', marginBottom: '4px' }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: '9px', color: '#555', marginBottom: '4px' }}>{s.sub}</div>}
            <div style={{ fontSize: '7px', letterSpacing: '0.16em', color: '#444', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#1A1A1A', padding: '14px 16px' }}>
        <div style={{ fontSize: '7px', letterSpacing: '0.2em', color: '#444', marginBottom: '10px', textTransform: 'uppercase' }}>Campaign Breakdown</div>
        {FAKE_CAMPAIGNS.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', borderBottom: '0.5px solid #1E1E1E' }}>
            <BrandLogo brand={c.brand} color={c.color} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '8px', color: '#5b7c99', letterSpacing: '0.12em' }}>{c.brand}</div>
              <div style={{ fontSize: '11px', color: '#F0ECE6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#F0ECE6', fontWeight: 500, minWidth: '64px', textAlign: 'right' }}>{c.budget}</div>
            <StatusBadge status={c.status} />
          </div>
        ))}
      </div>
    </div>
  )

  return null
}

export default function LandingPage({ onGetStarted, onSignIn }) {
  const [activeScreen, setActiveScreen] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveScreen(s => (s + 1) % SCREENS.length)
    }, 3200)
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: '#111', color: '#F0ECE6', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", overflowX: 'hidden' }}>

      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(17,17,17,0.95)' : 'transparent',
        borderBottom: scrolled ? '0.5px solid #222' : 'none',
        transition: 'all 0.3s ease'
      }}>
        <img src="/logo.svg" alt="HQue" style={{ width: '100px', height: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a href="#features" style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', textDecoration: 'none' }}>Features</a>
          <a href="#pricing" style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', textDecoration: 'none' }}>Pricing</a>
          <button onClick={onSignIn} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #333', color: '#999', cursor: 'pointer', borderRadius: '1px' }}>Sign in</button>
          <button onClick={onGetStarted} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Start free</button>
        </div>
      </nav>

      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 48px 80px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(91,124,153,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(42px, 7vw, 88px)', fontWeight: 'normal', lineHeight: 1.08, color: '#F0ECE6', margin: '0 0 28px', maxWidth: '900px' }}>
          Run your roster.<br />
          <span style={{ color: '#5b7c99' }}>Not your inbox.</span>
        </h1>
        <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.8, maxWidth: '520px', margin: '0 0 48px' }}>
          HQue is the operating system for agencies and brands built on talent partnerships.
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={onGetStarted} style={{ padding: '14px 36px', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
            Start free trial
          </button>
          <a href="#features" style={{ padding: '14px 24px', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#555', textDecoration: 'none' }}>See how it works →</a>
        </div>
        <div style={{ marginTop: '16px', fontSize: '10px', color: '#444', letterSpacing: '0.1em' }}>14-day free trial · No credit card required</div>
      </section>

      <section style={{ padding: '0 48px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1000px' }}>
          <div style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '8px 8px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['#FF5F57', '#FFBD2E', '#28C840'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
            </div>
            <div style={{ flex: 1, background: '#111', borderRadius: '4px', padding: '4px 12px', fontSize: '10px', color: '#444', textAlign: 'center' }}>h-que.com</div>
          </div>
          <div style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A', borderTop: 'none', borderRadius: '0 0 8px 8px', height: '520px', display: 'flex', overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: '180px', borderRight: '0.5px solid #2A2A2A', padding: '24px 0', flexShrink: 0 }}>
              <div style={{ padding: '0 16px 20px', borderBottom: '0.5px solid #2A2A2A', marginBottom: '16px' }}>
                <img src="/logo.svg" alt="HQue" style={{ width: '80px' }} />
              </div>
              {SCREENS.map((s, i) => (
                <div key={s.key} style={{ padding: '9px 16px', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: i === activeScreen ? '#F0ECE6' : '#444', borderLeft: i === activeScreen ? '1.5px solid #5b7c99' : '1.5px solid transparent' }}>{s.label.split(' ')[0]}</div>
              ))}
            </div>
            <div style={{ flex: 1, padding: '24px', overflow: 'hidden' }}>
              <div style={{ fontSize: '8px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#444', marginBottom: '6px' }}>Nova Talent Group</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#F0ECE6', marginBottom: '20px' }}>{SCREENS[activeScreen].label}</div>
              <ScreenContent screen={SCREENS[activeScreen].key} />
            </div>
            <div style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', gap: '6px' }}>
              {SCREENS.map((s, i) => (
                <div key={i} onClick={() => { setActiveScreen(i); clearInterval(intervalRef.current) }} style={{ width: i === activeScreen ? '24px' : '6px', height: '6px', borderRadius: '3px', background: i === activeScreen ? '#5b7c99' : '#333', cursor: 'pointer', transition: 'all 0.3s ease' }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" style={{ padding: '80px 48px 120px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '48px', textAlign: 'center' }}>What HQue does</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px' }}>
          {FEATURES.map(f => (
            <div key={f.num}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#444', marginBottom: '16px' }}>{f.num}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F0ECE6', marginBottom: '14px', lineHeight: 1.3 }}>{f.title}</div>
              <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.8 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: '0.5px', background: 'linear-gradient(to right, transparent, #2A2A2A, transparent)', maxWidth: '800px', margin: '0 auto' }} />

      <section id="pricing" style={{ padding: '100px 48px 120px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px', textAlign: 'center' }}>Pricing</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '36px', color: '#F0ECE6', marginBottom: '48px', textAlign: 'center', fontWeight: 'normal' }}>Simple, transparent pricing.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ background: plan.highlight ? '#1E2428' : '#141414', border: `0.5px solid ${plan.highlight ? '#5b7c99' : '#222'}`, borderRadius: '2px', padding: '36px 28px', position: 'relative' }}>
              {plan.highlight && <div style={{ position: 'absolute', top: '-1px', right: '20px', background: '#5b7c99', color: '#fff', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 2px 2px' }}>Most Popular</div>}
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
              <button onClick={onGetStarted} style={{ width: '100%', padding: '12px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: plan.highlight ? '#5b7c99' : 'none', border: `0.5px solid ${plan.highlight ? '#5b7c99' : '#333'}`, color: plan.highlight ? '#fff' : '#555', cursor: 'pointer', borderRadius: '1px' }}>Get started</button>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: '#444' }}>14-day free trial on all plans · No credit card required</div>
      </section>

      <section style={{ padding: '80px 48px 120px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(91,124,153,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '24px' }}>Ready?</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(32px, 5vw, 60px)', color: '#F0ECE6', marginBottom: '32px', fontWeight: 'normal', lineHeight: 1.2 }}>
          Your team deserves<br />a better tool.
        </div>
        <button onClick={onGetStarted} style={{ padding: '16px 48px', fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
          Start your free trial
        </button>
      </section>

      <footer style={{ borderTop: '0.5px solid #1A1A1A', padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <img src="/logo.svg" alt="HQue" style={{ width: '80px', opacity: 0.25 }} />
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="mailto:support@hque.com" style={{ fontSize: '10px', color: '#666', textDecoration: 'none', letterSpacing: '0.1em' }}>support@hque.com</a>
          <span style={{ fontSize: '10px', color: '#555' }}>© 2026 HQue</span>
          <a href="https://instagram.com/theofficialHQue" target="_blank" rel="noreferrer" title="Instagram" style={{ color: '#666', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
            </svg>
          </a>
          <a href="https://www.linkedin.com/company/h-que" target="_blank" rel="noreferrer" title="LinkedIn" style={{ color: '#444', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
            </svg>
          </a>
        </div>
      </footer>
    </div>
  )
}
