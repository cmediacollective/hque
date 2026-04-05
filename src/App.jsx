import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import AddCreatorForm from './AddCreatorForm'
import TalentView from './TalentView'
import WorkspaceView from './WorkspaceView'
import CampaignView from './CampaignView'
import ReportsView from './ReportsView'
import SettingsView from './SettingsView'
import Onboarding from './Onboarding'
import Login from './Login'
import SignUp from './SignUp'
import TrialBanner from './TrialBanner'
import TalentInquiry from './TalentInquiry'
import InquiriesView from './InquiriesView'

function App() {
  const [view, setView] = useState('talent')
  const [talentTab, setTalentTab] = useState('roster')
  const [showForm, setShowForm] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [agencyName, setAgencyName] = useState('HQue')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [orgId, setOrgId] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  const [trialEndsAt, setTrialEndsAt] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const nav = dark ? '#111111' : '#E8E4DE'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const muted = dark ? '#888' : '#666'
  const subtle = dark ? '#555' : '#999'

  const isInquiryPage = window.location.pathname === '/apply' || window.location.search.includes('agency=')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isInquiryPage) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (user) fetchProfile() }, [user])

  async function fetchProfile() {
    setProfileLoading(true)
    const { data } = await supabase.from('profiles').select('org_id, avatar_url').eq('id', user.id).single()
    if (data?.org_id) { setOrgId(data.org_id); fetchAgencyName(data.org_id) }
    if (data?.avatar_url) setAvatarUrl(data.avatar_url)
    setProfileLoading(false)
  }

  async function fetchAgencyName(oid) {
    const { data } = await supabase.from('org_settings').select('agency_name').eq('org_id', oid).single()
    if (data?.agency_name) setAgencyName(data.agency_name)
    const { data: org } = await supabase.from('organizations').select('trial_ends_at').eq('id', oid).single()
    if (org?.trial_ends_at) setTrialEndsAt(org.trial_ends_at)
  }

  function handleOnboardingComplete(newOrgId, newAgencyName) {
    setOrgId(newOrgId)
    setAgencyName(newAgencyName)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setOrgId(null)
  }

  async function handleExport() {
    if (!orgId) return
    setExporting(true)
    const { data: creators } = await supabase.from('creators').select('*').eq('status', 'active').order('name', { ascending: true })
    if (!creators || creators.length === 0) { setExporting(false); return }
    const toImg = (url, name) => url ? `<img src="${url}" alt="${name}" style="width:64px;height:64px;object-fit:cover;border-radius:4px;border:1px solid #e0e0e0;display:block;" onerror="this.style.display='none'" />` : `<div style="width:64px;height:64px;border-radius:4px;border:1px solid #e0e0e0;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:20px;color:#999;">${name?.split(' ').map(n => n[0]).join('').slice(0,2)}</div>`
    const rows = creators.map(c => {
      const type = Array.isArray(c.types) && c.types.length ? c.types.join(', ') : (c.type || '—')
      const niches = Array.isArray(c.niches) && c.niches.length ? c.niches.join(', ') : '—'
      const handles = [c.handles?.instagram && `IG: @${c.handles.instagram}`, c.handles?.tiktok && `TK: @${c.handles.tiktok}`, c.handles?.youtube && `YT: ${c.handles.youtube}`].filter(Boolean).join('<br>')
      const rates = [c.rates?.feed && `Feed: $${Number(c.rates.feed).toLocaleString()}`, c.rates?.reel && `Reel: $${Number(c.rates.reel).toLocaleString()}`, c.rates?.story && `Story: $${Number(c.rates.story).toLocaleString()}`, c.rates?.tiktok && `TikTok: $${Number(c.rates.tiktok).toLocaleString()}`, c.rates?.youtube && `YouTube: $${Number(c.rates.youtube).toLocaleString()}`].filter(Boolean).join('<br>')
      return `<tr><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;">${toImg(c.photo_url, c.name)}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;"><div style="font-family:Georgia,serif;font-size:15px;color:#1a1a1a;margin-bottom:3px;">${c.name || '—'}</div><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">${type}</div></td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${niches}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${handles || '—'}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#1a1a1a;">${c.ig_followers ? Number(c.ig_followers).toLocaleString() : '—'}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#1a1a1a;">${c.engagement_rate ? `${c.engagement_rate}%` : '—'}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${rates || '—'}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${c.location || '—'}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${c.manager_name ? `<div>${c.manager_name}</div>` : ''}${c.manager_email ? `<div style="color:#888;">${c.manager_email}</div>` : ''}${c.contact_email ? `<div style="color:#888;">${c.contact_email}</div>` : ''}${!c.manager_name && !c.manager_email && !c.contact_email ? '—' : ''}</td><td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${c.tier || '—'}</td></tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Talent Roster — ${agencyName}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a;background:#fff;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}tr{page-break-inside:avoid;}}</style></head><body><div style="padding:40px 48px;"><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1a1a1a;"><div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#999;margin-bottom:8px;">${agencyName}</div><div style="font-family:Georgia,serif;font-size:28px;color:#1a1a1a;">Talent Roster</div></div><div style="text-align:right;"><div style="font-size:11px;color:#999;">${creators.length} creators</div><div style="font-size:11px;color:#999;">${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div></div></div><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8f8f8;"><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Photo</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Name</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Niches</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Handles</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Followers</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Eng Rate</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Rates</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Location</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Contact</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Tier</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print() }, 500)
    setExporting(false)
  }

  if (isInquiryPage) return <TalentInquiry />

  if (authLoading || profileLoading) return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )

  if (!user && showSignUp) return <SignUp onSignUp={(u) => { setUser(u); setShowSignUp(false) }} />
  if (!user) return <Login onLogin={setUser} onShowSignUp={() => setShowSignUp(true)} />
  if (user && !orgId) return <Onboarding user={user} onComplete={handleOnboardingComplete} />

  const navItems = [
    { key: 'talent', label: 'Talent', icon: '👤' },
    { key: 'campaigns', label: 'Campaigns', icon: '📋' },
    { key: 'workspace', label: 'Work', icon: '⬜' },
    { key: 'reports', label: 'Reports', icon: '📊' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  const viewLabel = navItems.find(n => n.key === view)?.label || 'HQue'

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", overflowX: 'hidden' }}>
      {showForm && <AddCreatorForm orgId={orgId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); setRefresh(r => r + 1) }} />}

      <div style={{ display: 'flex', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? '100vh' : 'auto' }}>

        {!isMobile && (
          <nav style={{ width: '200px', background: nav, borderRight: `0.5px solid ${border}`, padding: '24px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '0 0 20px 16px', borderBottom: `0.5px solid ${border}`, marginBottom: '16px' }}>
              <img src="/logo.svg" alt="HQue" style={{ width: '140px', height: 'auto', display: 'block', filter: dark ? 'none' : 'invert(1)' }} />
            </div>
            {[['talent', 'Talent'], ['workspace', 'Workspace'], ['campaigns', 'Campaigns'], ['reports', 'Reports']].map(([key, label]) => (
              <button key={key} onClick={() => setView(key)} style={{
                padding: view === key ? '9px 20px 9px 14.5px' : '9px 16px',
                fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
                color: view === key ? text : muted, background: 'none', border: 'none',
                borderLeft: view === key ? '1.5px solid #5b7c99' : '1.5px solid transparent',
                textAlign: 'left', cursor: 'pointer', width: '100%',
                fontWeight: view === key ? '500' : '400'
              }}>{label}</button>
            ))}
            <div style={{ marginTop: 'auto', padding: '0 0 12px' }}>
              <button onClick={() => setView('settings')} style={{
                width: '100%', textAlign: 'left',
                padding: view === 'settings' ? '9px 20px 9px 14.5px' : '9px 16px',
                fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
                color: view === 'settings' ? text : subtle, background: 'none', border: 'none',
                borderLeft: view === 'settings' ? '1.5px solid #5b7c99' : '1.5px solid transparent',
                cursor: 'pointer', fontWeight: view === 'settings' ? '500' : '400'
              }}>Settings</button>
              <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt='avatar' style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: `0.5px solid ${border}`, flexShrink: 0, cursor: 'pointer' }} onClick={() => setView('settings')} onError={e => e.target.style.display = 'none'} />
                  : <div onClick={() => setView('settings')} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#5b7c99', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', fontFamily: 'Georgia, serif', flexShrink: 0, cursor: 'pointer' }}>
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                }
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                  <button onClick={handleLogout} style={{ marginTop: '4px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: 'none', color: subtle, padding: 0, cursor: 'pointer' }}>Sign out</button>
              )}
              {isMobile && (
                <button onClick={() => setDark(d => !d)} style={{ background: "none", border: `0.5px solid ${border}`, color: muted, fontSize: "14px", padding: "5px 8px", cursor: "pointer", borderRadius: "1px" }}>{dark ? "☀" : "☾"}</button>
                </div>
              </div>
            </div>
          </nav>
        )}

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden', background: bg, minWidth: 0 }}>
          <div style={{ padding: isMobile ? '12px 16px' : '20px 28px 16px', borderBottom: `0.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              {!isMobile && <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '6px' }}>{agencyName}</div>}
              <div style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '20px' : '26px', fontWeight: 'normal', color: text }}>{viewLabel}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {!isMobile && (
                <button onClick={() => setDark(d => !d)} style={{ padding: '7px 12px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>
                  {dark ? 'Light' : 'Dark'}
                </button>
              )}
              {view === 'talent' && talentTab === 'roster' && !isMobile && (
                <button onClick={handleExport} disabled={exporting} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: muted, cursor: 'pointer', borderRadius: '1px', opacity: exporting ? 0.6 : 1 }}>
                  {exporting ? 'Exporting...' : 'Export PDF'}
                </button>
              )}
              {view === 'talent' && talentTab === 'roster' && (
                <button onClick={() => setShowForm(true)} style={{ padding: isMobile ? '6px 12px' : '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>+ Talent</button>
              )}
              {isMobile && (
                <button onClick={handleLogout} style={{ background: 'none', border: `0.5px solid ${border}`, color: muted, fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '5px 10px', cursor: 'pointer', borderRadius: '1px' }}>Sign out</button>
              )}
              {isMobile && (
                <button onClick={() => setDark(d => !d)} style={{ background: "none", border: `0.5px solid ${border}`, color: muted, fontSize: "14px", padding: "5px 8px", cursor: "pointer", borderRadius: "1px" }}>{dark ? "☀" : "☾"}</button>
              )}
            </div>
          </div>

          {view === 'talent' && (
            <div style={{ display: 'flex', borderBottom: `0.5px solid ${border}`, background: bg, flexShrink: 0 }}>
              {[['roster', 'Roster'], ['inquiries', 'Inquiries']].map(([key, label]) => (
                <button key={key} onClick={() => setTalentTab(key)} style={{
                  padding: isMobile ? '8px 16px' : '10px 20px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase',
                  background: 'none', border: 'none',
                  borderBottom: talentTab === key ? '1.5px solid #5b7c99' : '1.5px solid transparent',
                  color: talentTab === key ? text : muted, cursor: 'pointer'
                }}>{label}</button>
              ))}
            </div>
          )}

          <TrialBanner trialEndsAt={trialEndsAt} onUpgrade={() => setView('settings')} />

          <div style={{ flex: 1, overflow: isMobile ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: isMobile ? '70px' : '0' }}>
            {view === 'talent' && talentTab === 'roster' && <TalentView key={refresh} dark={dark} orgId={orgId} isMobile={isMobile} />}
            {view === 'talent' && talentTab === 'inquiries' && <InquiriesView dark={dark} orgId={orgId} />}
            {view === 'workspace' && <WorkspaceView dark={dark} orgId={orgId} />}
            {view === 'campaigns' && <CampaignView dark={dark} orgId={orgId} />}
            {view === 'reports' && <ReportsView dark={dark} orgId={orgId} />}
            {view === 'settings' && <SettingsView dark={dark} user={user} orgId={orgId} onAgencyNameChange={setAgencyName} onAvatarChange={setAvatarUrl} />}
          </div>
        </main>
      </div>

      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: nav, borderTop: `0.5px solid ${border}`, display: 'flex', zIndex: 50 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => setView(item.key)} style={{
              flex: 1, padding: '10px 4px 8px', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px'
            }}>
              <span style={{ fontSize: '16px', lineHeight: 1, opacity: view === item.key ? 1 : 0.5 }}>{ item.key === 'talent' ? '◉' : item.key === 'campaigns' ? '▦' : item.key === 'workspace' ? '⊞' : item.key === 'reports' ? '▮' : '◎' }</span>
              <span style={{ fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: view === item.key ? '#5b7c99' : muted }}>
                {item.label}
              </span>
              {view === item.key && <div style={{ width: '20px', height: '1.5px', background: '#5b7c99', borderRadius: '1px' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
