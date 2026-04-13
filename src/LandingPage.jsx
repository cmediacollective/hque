import { useState, useEffect, useRef } from 'react'

const isMob = () => window.innerWidth < 768

const FAKE_TALENT = [
  { name: 'Ava Monroe', type: 'INFLUENCER', handle: '@avamonroe', followers: '847K', photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face' },
  { name: 'Jordan Ellis', type: 'UGC', handle: '@jordanellis', followers: '124K', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
  { name: 'Mila Torres', type: 'INFLUENCER', handle: '@milatorresx', followers: '2.1M', photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop&crop=face' },
  { name: 'Caden Park', type: 'ATHLETE', handle: '@cadenpark', followers: '390K', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
  { name: 'Simone Veil', type: 'HOST', handle: '@simoneveil', followers: '58K', photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face' },
  { name: 'Raya Hassan', type: 'INFLUENCER', handle: '@rayahassan', followers: '1.4M', photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face' },
  { name: 'Teo Briggs', type: 'PODCAST', handle: '@teobriggs', followers: '210K', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
  { name: 'Lena Voss', type: 'INFLUENCER', handle: '@lenavoss', followers: '76K', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=face' },
]

const FAKE_CAMPAIGNS = [
  { brand: 'Sephora', name: 'Spring Glow Campaign', status: 'ACTIVE', budget: '$24,000', talent: '4 talent', color: '#D4A0A0', initial: 'S' },
  { brand: 'Nike', name: 'Q2 Brand Push', status: 'ACTIVE', budget: '$18,500', talent: '3 talent', color: '#1A1A1A', initial: 'N' },
  { brand: 'Glossier', name: 'Holiday Collection', status: 'PITCH', budget: '$12,000', talent: '2 talent', color: '#C8A2C8', initial: 'G' },
  { brand: 'Whole Foods', name: 'Creator Series', status: 'COMPLETED', budget: '$9,200', talent: '5 talent', color: '#4A7C59', initial: 'WF' },
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
  { label: 'CAMPAIGNS', value: '4', sub: '2 active · 1 pitch' },
  { label: 'PAYMENTS', value: '3 paid', sub: '5 pending' },
  { label: 'TALENT', value: '24' },
]

const SCREENS = [
  { label: 'Talent Database', key: 'talent' },
  { label: 'Campaigns', key: 'campaigns' },
  { label: 'Workspace', key: 'workspace' },
  { label: 'Reports', key: 'reports' },
]

const FEATURES = [
  { num: '01', title: 'Your entire roster, one place.', body: 'Talent profiles, social handles, rates, outreach history — everything your team needs to move fast and book deals.' },
  { num: '02', title: 'Campaigns that close.', body: 'Track every deal from pitch to payment. Know exactly what\'s booked, what\'s pending, and what\'s overdue.' },
  { num: '03', title: 'Built for agencies, not spreadsheets.', body: 'A platform that thinks the way you do. Multi-user, multi-campaign, with a talent inquiry form your clients will actually fill out.' },
]

const PLANS = [
  { name: 'Starter', price: '$49', features: ['Up to 50 talent', '2 team members', 'Campaigns & outreach', 'Talent inquiry form'] },
  { name: 'Pro', price: '$99', features: ['Unlimited talent', '5 team members', 'Reports & analytics', 'Priority support'], highlight: true },
  { name: 'Agency', price: '$199', features: ['Unlimited everything', 'Unlimited team members', 'Custom onboarding', 'Dedicated support'] },
]

function BrandLogo({ color, initial, size = 44 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '2px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontFamily: 'Georgia, serif', fontSize: Math.round(size * 0.35), color: '#fff', fontWeight: 700 }}>{initial}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const color = status === 'ACTIVE' ? '#5b7c99' : status === 'COMPLETED' ? '#5C9E52' : '#888'
  return <span style={{ fontSize: '7px', letterSpacing: '0.12em', border: `0.5px solid ${color}`, color, padding: '3px 8px', borderRadius: '1px', whiteSpace: 'nowrap' }}>{status}</span>
}

function MobileAppPreview() {
  const [activeScreen, setActiveScreen] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => setActiveScreen(s => (s + 1) % SCREENS.length), 3000)
    return () => clearInterval(intervalRef.current)
  }, [])

  return (
    <div style={{ width: '100%', maxWidth: '340px', margin: '0 auto' }}>
      {/* Phone frame */}
      <div style={{ background: '#1A1A1A', borderRadius: '24px', padding: '12px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ background: '#F5F3EF', borderRadius: '16px', overflow: 'hidden', minHeight: '460px' }}>
          {/* Mobile header */}
          <div style={{ background: '#ECEAE6', padding: '12px 16px', borderBottom: '0.5px solid #D4CFC8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <img src="/logo.svg" alt="HQue" style={{ width: '60px', filter: 'invert(1)' }} />
            <div style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#999', textTransform: 'uppercase' }}>Nova Talent Group</div>
          </div>
          {/* Screen title */}
          <div style={{ padding: '16px 16px 8px' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1A1A1A', marginBottom: '12px' }}>{SCREENS[activeScreen].label}</div>
          </div>
          {/* Content */}
          <div style={{ padding: '0 16px 16px' }}>
            {SCREENS[activeScreen].key === 'talent' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {FAKE_TALENT.slice(0, 4).map((t, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: '4px', padding: '12px', border: '0.5px solid #E0DCD6' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                      <img src={t.photo} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: '7px', color: '#5b7c99', letterSpacing: '0.1em', marginBottom: '2px' }}>{t.type}</div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: '#1A1A1A', marginBottom: '1px' }}>{t.name}</div>
                    <div style={{ fontSize: '9px', color: '#aaa' }}>{t.followers}</div>
                  </div>
                ))}
              </div>
            )}
            {SCREENS[activeScreen].key === 'campaigns' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {FAKE_CAMPAIGNS.slice(0, 3).map((c, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: '4px', padding: '12px', border: '0.5px solid #E0DCD6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BrandLogo color={c.color} initial={c.initial} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '8px', color: '#5b7c99', letterSpacing: '0.1em' }}>{c.brand}</div>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '12px', color: '#1A1A1A' }}>{c.name}</div>
                      <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>{c.budget} · {c.talent}</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            )}
            {SCREENS[activeScreen].key === 'workspace' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['TO DO', 'IN PROGRESS', 'DONE'].map(col => (
                  <div key={col}>
                    <div style={{ fontSize: '7px', letterSpacing: '0.18em', color: col === 'DONE' ? '#5C9E52' : '#aaa', marginBottom: '6px', textTransform: 'uppercase' }}>{col} · {FAKE_TASKS.filter(t => t.col === col).length}</div>
                    {FAKE_TASKS.filter(t => t.col === col).slice(0, 1).map((task, i) => (
                      <div key={i} style={{ background: col === 'DONE' ? '#E8E4DE' : '#fff', borderRadius: '4px', padding: '10px', border: '0.5px solid #E0DCD6' }}>
                        <div style={{ fontSize: '11px', color: col === 'DONE' ? '#aaa' : '#1A1A1A', textDecoration: col === 'DONE' ? 'line-through' : 'none', marginBottom: '4px' }}>{task.title}</div>
                        <span style={{ fontSize: '7px', border: `0.5px solid ${task.priority === 'HIGH' ? '#c0392b' : '#5b7c99'}`, color: task.priority === 'HIGH' ? '#c0392b' : '#5b7c99', padding: '1px 5px', borderRadius: '1px' }}>{task.priority}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {SCREENS[activeScreen].key === 'reports' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  {FAKE_STATS.map((s, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: '4px', padding: '12px', border: '0.5px solid #E0DCD6' }}>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#1A1A1A' }}>{s.value}</div>
                      {s.sub && <div style={{ fontSize: '8px', color: '#aaa', marginTop: '2px' }}>{s.sub}</div>}
                      <div style={{ fontSize: '7px', color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {FAKE_CAMPAIGNS.slice(0, 2).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '0.5px solid #E0DCD6' }}>
                    <BrandLogo color={c.color} initial={c.initial} size={24} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#1A1A1A' }}>{c.name}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#1A1A1A', fontWeight: 500 }}>{c.budget}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Bottom nav */}
          <div style={{ borderTop: '0.5px solid #D4CFC8', background: '#ECEAE6', display: 'flex', padding: '8px 0' }}>
            {SCREENS.map((s, i) => (
              <button key={i} onClick={() => { setActiveScreen(i); clearInterval(intervalRef.current) }} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '14px', opacity: i === activeScreen ? 1 : 0.4 }}>
                  {i === 0 ? '◉' : i === 1 ? '▦' : i === 2 ? '⊞' : '▮'}
                </span>
                <span style={{ fontSize: '7px', letterSpacing: '0.08em', textTransform: 'uppercase', color: i === activeScreen ? '#5b7c99' : '#aaa' }}>{s.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DesktopAppPreview({ activeScreen, setActiveScreen }) {
  return (
    <div style={{ width: '100%', maxWidth: '1000px' }}>
      <div style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '8px 8px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['#FF5F57', '#FFBD2E', '#28C840'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: '#111', borderRadius: '4px', padding: '4px 12px', fontSize: '10px', color: '#555', textAlign: 'center' }}>h-que.com</div>
      </div>
      <div style={{ background: '#F5F3EF', border: '0.5px solid #D4CFC8', borderTop: 'none', borderRadius: '0 0 8px 8px', height: '520px', display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: '180px', borderRight: '0.5px solid #D4CFC8', padding: '24px 0', flexShrink: 0, background: '#ECEAE6' }}>
          <div style={{ padding: '0 16px 20px', borderBottom: '0.5px solid #D4CFC8', marginBottom: '16px' }}>
            <img src="/logo.svg" alt="HQue" style={{ width: '80px', filter: 'invert(1)' }} />
          </div>
          {SCREENS.map((s, i) => (
            <div key={s.key} onClick={() => setActiveScreen(i)} style={{ padding: '9px 16px', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: i === activeScreen ? '#1A1A1A' : '#aaa', borderLeft: i === activeScreen ? '1.5px solid #5b7c99' : '1.5px solid transparent', cursor: 'pointer' }}>{s.label.split(' ')[0]}</div>
          ))}
        </div>
        <div style={{ flex: 1, padding: '24px', overflow: 'hidden' }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#bbb', marginBottom: '6px' }}>Nova Talent Group</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#1A1A1A', marginBottom: '20px' }}>{SCREENS[activeScreen].label}</div>

          {SCREENS[activeScreen].key === 'talent' && (
            <div>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {['All Types', 'Influencer', 'UGC', 'Actor', 'Wellness', 'Beauty', 'Fashion'].map((chip, i) => (
                  <span key={chip} style={{ padding: '3px 10px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', border: `0.5px solid ${i === 0 ? '#5b7c99' : '#C4CFC8'}`, color: i === 0 ? '#5b7c99' : '#aaa', borderRadius: '1px', whiteSpace: 'nowrap' }}>{chip}</span>
                ))}
                <span style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', border: '0.5px solid #C4CFC8', color: '#aaa', borderRadius: '1px' }}>Export PDF</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#D4CFC8' }}>
                {FAKE_TALENT.map((t, i) => (
                  <div key={i} style={{ background: '#FFFFFF', padding: '14px', opacity: 1 - (i * 0.04) }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '2px', background: '#E8E4DE', marginBottom: '8px', overflow: 'hidden' }}>
                      <img src={t.photo} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: '7px', letterSpacing: '0.16em', color: '#5b7c99', marginBottom: '3px' }}>{t.type}</div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: '#1A1A1A', marginBottom: '2px' }}>{t.name}</div>
                    <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '6px' }}>{t.handle}</div>
                    <div style={{ paddingTop: '6px', borderTop: '0.5px solid #E0DCD6' }}>
                      <div style={{ fontSize: '11px', color: '#1A1A1A', fontWeight: 500 }}>{t.followers}</div>
                      <div style={{ fontSize: '7px', color: '#bbb', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Followers</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {SCREENS[activeScreen].key === 'campaigns' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: '#D4CFC8' }}>
              {FAKE_CAMPAIGNS.map((c, i) => (
                <div key={i} style={{ background: '#FFFFFF', padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '160px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <BrandLogo color={c.color} initial={c.initial} size={44} />
                    <StatusBadge status={c.status} />
                  </div>
                  <div style={{ fontSize: '8px', letterSpacing: '0.16em', color: '#5b7c99', marginBottom: '6px' }}>{c.brand}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#1A1A1A', flex: 1, lineHeight: 1.4 }}>{c.name}</div>
                  <div style={{ paddingTop: '14px', marginTop: '14px', borderTop: '0.5px solid #E0DCD6', display: 'flex', gap: '20px' }}>
                    <div><div style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: 500 }}>{c.budget}</div><div style={{ fontSize: '7px', color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>Budget</div></div>
                    <div><div style={{ fontSize: '13px', color: '#888' }}>{c.talent}</div><div style={{ fontSize: '7px', color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>Talent</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {SCREENS[activeScreen].key === 'workspace' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#D4CFC8', height: '360px', overflow: 'hidden' }}>
              {['TO DO', 'IN PROGRESS', 'DONE'].map(col => (
                <div key={col} style={{ background: '#F5F3EF', padding: '14px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '7px', letterSpacing: '0.2em', color: col === 'DONE' ? '#5C9E52' : '#aaa', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase' }}>
                    <span>{col}</span><span>{FAKE_TASKS.filter(t => t.col === col).length}</span>
                  </div>
                  {FAKE_TASKS.filter(t => t.col === col).map((task, i) => (
                    <div key={i} style={{ background: col === 'DONE' ? '#E8E4DE' : '#FFFFFF', border: `0.5px solid ${col === 'DONE' ? '#D4CFC8' : '#E0DCD6'}`, borderRadius: '1px', padding: '12px', marginBottom: '8px', opacity: col === 'DONE' ? 0.7 : 1 }}>
                      <div style={{ fontSize: '11px', color: col === 'DONE' ? '#aaa' : '#1A1A1A', marginBottom: '8px', lineHeight: 1.4, textDecoration: col === 'DONE' ? 'line-through' : 'none' }}>{task.title}</div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '7px', letterSpacing: '0.1em', border: `0.5px solid ${col === 'DONE' ? '#ccc' : task.priority === 'HIGH' ? '#c0392b' : task.priority === 'MEDIUM' ? '#5b7c99' : '#aaa'}`, color: col === 'DONE' ? '#ccc' : task.priority === 'HIGH' ? '#c0392b' : task.priority === 'MEDIUM' ? '#5b7c99' : '#888', padding: '1px 5px', borderRadius: '1px' }}>{task.priority}</span>
                        <span style={{ fontSize: '9px', color: '#bbb' }}>{task.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {SCREENS[activeScreen].key === 'reports' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#D4CFC8', marginBottom: '1px' }}>
                {FAKE_STATS.map((s, i) => (
                  <div key={i} style={{ background: '#FFFFFF', padding: '16px' }}>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#1A1A1A', marginBottom: '4px' }}>{s.value}</div>
                    {s.sub && <div style={{ fontSize: '9px', color: '#aaa', marginBottom: '4px' }}>{s.sub}</div>}
                    <div style={{ fontSize: '7px', letterSpacing: '0.16em', color: '#bbb', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#F5F3EF', padding: '14px 16px' }}>
                <div style={{ fontSize: '7px', letterSpacing: '0.2em', color: '#bbb', marginBottom: '10px', textTransform: 'uppercase' }}>Campaign Breakdown</div>
                {FAKE_CAMPAIGNS.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', borderBottom: '0.5px solid #E0DCD6' }}>
                    <BrandLogo color={c.color} initial={c.initial} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '8px', color: '#5b7c99', letterSpacing: '0.12em' }}>{c.brand}</div>
                      <div style={{ fontSize: '11px', color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#1A1A1A', fontWeight: 500, minWidth: '64px', textAlign: 'right' }}>{c.budget}</div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', gap: '6px' }}>
          {SCREENS.map((s, i) => (
            <div key={i} onClick={() => setActiveScreen(i)} style={{ width: i === activeScreen ? '24px' : '6px', height: '6px', borderRadius: '3px', background: i === activeScreen ? '#5b7c99' : '#C4CFC8', cursor: 'pointer', transition: 'all 0.3s ease' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage({ onGetStarted, onSignIn }) {
  const [activeScreen, setActiveScreen] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [mobile, setMobile] = useState(isMob())
  const [openFaq, setOpenFaq] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setMobile(isMob())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!mobile) {
      intervalRef.current = setInterval(() => setActiveScreen(s => (s + 1) % SCREENS.length), 3200)
      return () => clearInterval(intervalRef.current)
    }
  }, [mobile])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const pad = mobile ? '0 20px' : '0 48px'

  return (
    <div style={{ background: '#111', color: '#F0ECE6', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: mobile ? '16px 20px' : '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrolled ? 'rgba(17,17,17,0.95)' : 'transparent', borderBottom: scrolled ? '0.5px solid #222' : 'none', transition: 'all 0.3s ease' }}>
        <img src="/logo.svg" alt="HQue" style={{ width: mobile ? '80px' : '100px', height: 'auto' }} />
        {mobile ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onSignIn} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #333', color: '#888', cursor: 'pointer', borderRadius: '1px' }}>Sign in</button>
            <button onClick={onGetStarted} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Start free</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <a href="#features" style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', textDecoration: 'none' }}>Features</a>
            <a href="#pricing" style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', textDecoration: 'none' }}>Pricing</a>
            <button onClick={onSignIn} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #333', color: '#888', cursor: 'pointer', borderRadius: '1px' }}>Sign in</button>
            <button onClick={onGetStarted} style={{ padding: '8px 20px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Start free</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: mobile ? '100px 24px 60px' : '120px 48px 80px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(91,124,153,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: mobile ? 'clamp(36px, 10vw, 56px)' : 'clamp(42px, 7vw, 88px)', fontWeight: 'normal', lineHeight: 1.08, color: '#F0ECE6', margin: '0 0 24px', maxWidth: '900px' }}>
          Run your roster.<br /><span style={{ color: '#5b7c99' }}>Not your inbox.</span>
        </h1>
        <p style={{ fontSize: mobile ? '14px' : '15px', color: '#777', lineHeight: 1.8, maxWidth: '480px', margin: '0 0 40px' }}>
          HQue is the operating system for agencies and brands built on talent partnerships.
        </p>
        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: '12px', alignItems: 'center' }}>
          <button onClick={onGetStarted} style={{ padding: '14px 36px', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', width: mobile ? '100%' : 'auto' }}>Start free trial</button>
          <a href="#features" style={{ padding: '14px 24px', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#777', textDecoration: 'none' }}>See how it works →</a>
        </div>
        <div style={{ marginTop: '16px', fontSize: '10px', color: '#666', letterSpacing: '0.1em' }}>14-day free trial · No credit card required</div>
      </section>

      {/* App Showcase */}
      <section style={{ padding: mobile ? '0 20px 80px' : '0 48px 120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {mobile
          ? <MobileAppPreview />
          : <DesktopAppPreview activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
        }
      </section>

      {/* Features */}
      <section id="features" style={{ padding: mobile ? '60px 24px 80px' : '80px 48px 120px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '48px', textAlign: 'center' }}>What HQue does</div>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: mobile ? '40px' : '48px' }}>
          {FEATURES.map(f => (
            <div key={f.num}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: '#555', marginBottom: '16px' }}>{f.num}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F0ECE6', marginBottom: '14px', lineHeight: 1.3 }}>{f.title}</div>
              <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.8 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: '0.5px', background: 'linear-gradient(to right, transparent, #2A2A2A, transparent)', maxWidth: '800px', margin: '0 auto' }} />

      {/* Pricing */}
      <section id="pricing" style={{ padding: mobile ? '60px 24px 80px' : '100px 48px 120px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px', textAlign: 'center' }}>Pricing</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: mobile ? '28px' : '36px', color: '#F0ECE6', marginBottom: '40px', textAlign: 'center', fontWeight: 'normal' }}>Simple, transparent pricing.</div>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ background: plan.highlight ? '#1E2428' : '#141414', border: `0.5px solid ${plan.highlight ? '#5b7c99' : '#222'}`, borderRadius: '2px', padding: '32px 28px', position: 'relative' }}>
              {plan.highlight && <div style={{ position: 'absolute', top: '-1px', right: '20px', background: '#5b7c99', color: '#fff', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 2px 2px' }}>Most Popular</div>}
              <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '16px' }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '28px' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: '40px', color: '#F0ECE6' }}>{plan.price}</span>
                <span style={{ fontSize: '12px', color: '#666' }}>/month</span>
              </div>
              <div style={{ borderTop: '0.5px solid #222', paddingTop: '20px', marginBottom: '28px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#5b7c99', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: '#777', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={onGetStarted} style={{ width: '100%', padding: '12px', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', background: plan.highlight ? '#5b7c99' : 'none', border: `0.5px solid ${plan.highlight ? '#5b7c99' : '#333'}`, color: plan.highlight ? '#fff' : '#777', cursor: 'pointer', borderRadius: '1px' }}>Get started</button>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: '#555' }}>14-day free trial on all plans · No credit card required</div>
      </section>


      {/* FAQ */}
      <section style={{ padding: mobile ? '60px 24px 80px' : '80px 48px 100px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '16px', textAlign: 'center' }}>FAQ</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: mobile ? '28px' : '36px', color: '#F0ECE6', marginBottom: '48px', textAlign: 'center', fontWeight: 'normal' }}>Common questions</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { q: 'What is HQue?', a: 'HQue is an operating system for talent agencies and brands built on talent partnerships. It replaces spreadsheets, email threads, and disconnected tools with one place to manage your roster, campaigns, and team.' },
            { q: 'Is there a free trial?', a: 'Yes — every plan starts with a 14-day free trial. No credit card required. Full access to all features during your trial.' },
            { q: 'Can multiple team members use HQue?', a: 'Yes. Starter includes 2 seats, Pro includes 5, and Agency includes unlimited seats.' },
            { q: 'Can I cancel anytime?', a: 'Yes. No long-term contracts. Cancel anytime from your billing settings.' },
            { q: 'How is HQue different from a spreadsheet or Monday.com?', a: 'Monday.com is generic. Spreadsheets break. HQue is purpose-built for agencies — roster management, campaign tracking, talent inquiries, and payment status all in one place.' },
          ].map((faq, i) => (
            <div key={i} style={{ borderTop: '0.5px solid #222' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '16px' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#F0ECE6', lineHeight: 1.4 }}>{faq.q}</span>
                <span style={{ color: '#5b7c99', fontSize: '20px', lineHeight: 1, flexShrink: 0, display: 'inline-block', transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
              </button>
              {openFaq === i && <div style={{ paddingBottom: '20px', fontSize: '13px', color: '#666', lineHeight: 1.9 }}>{faq.a}</div>}
            </div>
          ))}
          <div style={{ borderTop: '0.5px solid #222' }} />
        </div>
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a href="/faq" style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b7c99', textDecoration: 'none' }}>See all FAQs →</a>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: mobile ? '60px 24px 80px' : '80px 48px 120px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(91,124,153,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '24px' }}>Ready?</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: mobile ? '32px' : 'clamp(32px, 5vw, 60px)', color: '#F0ECE6', marginBottom: '32px', fontWeight: 'normal', lineHeight: 1.2 }}>
          Your team deserves<br />a better tool.
        </div>
        <button onClick={onGetStarted} style={{ padding: '16px 48px', fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
          Start your free trial
        </button>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '0.5px solid #1A1A1A', padding: mobile ? '40px 24px' : '60px 48px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : '2fr 1fr 1fr 1fr', gap: mobile ? '32px' : '48px', marginBottom: '48px' }}>
          <div>
            <img src="/logo.svg" alt="HQue" style={{ width: '100px', opacity: 0.5, marginBottom: '16px', display: 'block' }} />
            <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.7, maxWidth: '240px' }}>The operating system for agencies and brands built on talent partnerships.</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <a href="https://instagram.com/theofficialHQue" target="_blank" rel="noreferrer" style={{ color: '#444' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
              </a>
              <a href="https://www.linkedin.com/company/h-que" target="_blank" rel="noreferrer" style={{ color: '#444' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '16px' }}>Product</div>
            {[['Features', '#features'], ['Pricing', '#pricing'], ['Changelog', null]].map(([label, href]) => (
              <div key={label} style={{ marginBottom: '10px' }}>
                {href ? <a href={href} style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>{label}</a> : <span style={{ fontSize: '12px', color: '#2A2A2A' }}>{label}</span>}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '16px' }}>Resources</div>
            {[['FAQ', '/faq'], ['Blog', null], ['Help Center', null]].map(([label, href]) => (
              <div key={label} style={{ marginBottom: '10px' }}>
                {href ? <a href={href} style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>{label}</a> : <span style={{ fontSize: '12px', color: '#2A2A2A' }}>{label}</span>}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#444', marginBottom: '16px' }}>Legal</div>
            {[['Privacy', '/privacy'], ['Terms', '/terms'], ['support@hque.com', 'mailto:support@hque.com']].map(([label, href]) => (
              <div key={label} style={{ marginBottom: '10px' }}>
                <a href={href} style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>{label}</a>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '0.5px solid #1A1A1A', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#333' }}>© 2026 HQue. All rights reserved.</span>
          <span style={{ fontSize: '10px', color: '#2A2A2A' }}>Made for agencies that move fast.</span>
        </div>
      </footer>
    </div>
  )
}
