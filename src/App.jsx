import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import AddCreatorForm from './AddCreatorForm'
import TalentView from './TalentView'
import WorkspaceView from './WorkspaceView'
import CampaignView from './CampaignView'
import ReportsView from './ReportsView'
import Login from './Login'

function App() {
  const [view, setView] = useState('talent')
  const [showForm, setShowForm] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [exporting, setExporting] = useState(false)

  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const nav = dark ? '#111111' : '#E8E4DE'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const muted = dark ? '#888' : '#666'
  const subtle = dark ? '#555' : '#999'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  async function handleExport() {
    setExporting(true)
    const { data: creators } = await supabase
      .from('creators')
      .select('*')
      .eq('status', 'active')
      .order('name', { ascending: true })

    if (!creators || creators.length === 0) {
      setExporting(false)
      return
    }

    const toImg = (url, name) => url
      ? `<img src="${url}" alt="${name}" style="width:64px;height:64px;object-fit:cover;border-radius:4px;border:1px solid #e0e0e0;display:block;" onerror="this.style.display='none'" />`
      : `<div style="width:64px;height:64px;border-radius:4px;border:1px solid #e0e0e0;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:20px;color:#999;">${name?.split(' ').map(n => n[0]).join('').slice(0,2)}</div>`

    const rows = creators.map(c => {
      const type = Array.isArray(c.types) && c.types.length ? c.types.join(', ') : (c.type || '—')
      const niches = Array.isArray(c.niches) && c.niches.length ? c.niches.join(', ') : '—'
      const handles = [
        c.handles?.instagram && `IG: @${c.handles.instagram}`,
        c.handles?.tiktok && `TK: @${c.handles.tiktok}`,
        c.handles?.youtube && `YT: ${c.handles.youtube}`
      ].filter(Boolean).join('<br>')
      const rates = [
        c.rates?.feed && `Feed: $${Number(c.rates.feed).toLocaleString()}`,
        c.rates?.reel && `Reel: $${Number(c.rates.reel).toLocaleString()}`,
        c.rates?.story && `Story: $${Number(c.rates.story).toLocaleString()}`,
        c.rates?.tiktok && `TikTok: $${Number(c.rates.tiktok).toLocaleString()}`,
        c.rates?.youtube && `YouTube: $${Number(c.rates.youtube).toLocaleString()}`
      ].filter(Boolean).join('<br>')

      return `
        <tr>
          <td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;">${toImg(c.photo_url, c.name)}</td>
          <td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;">
            <div style="font-family:Georgia,serif;font-size:15px;color:#1a1a1a;margin-bottom:3px;">${c.name || '—'}</div>
            <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">${type}</div>
          </td>
          <td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${niches}</td>
          <td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${handles || '—'}</td>
          <td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#1a1a1a;">${c.ig_followers ? Number(c.ig_followers).toLocaleString() : '—'}</td>
          <td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#1a1a1a;">${c.engagement_rate ? `${c.engagement_rate}%` : '—'}</td>
          <td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${rates || '—'}</td>
          <td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${c.location || '—'}</td>
          <td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">
            ${c.manager_name ? `<div>${c.manager_name}</div>` : ''}
            ${c.manager_email ? `<div style="color:#888;">${c.manager_email}</div>` : ''}
            ${c.contact_email ? `<div style="color:#888;">${c.contact_email}</div>` : ''}
            ${!c.manager_name && !c.manager_email && !c.contact_email ? '—' : ''}
          </td>
          <td style="padding:14px 12px;vertical-align:top;border-bottom:1px solid #f0f0f0;font-size:11px;color:#555;">${c.tier || '—'}</td>
        </tr>
      `
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Talent Roster — C Media Collective</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a;background:#fff;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}tr{page-break-inside:avoid;}}</style></head><body><div style="padding:40px 48px;"><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1a1a1a;"><div><div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#999;margin-bottom:8px;">C Media Collective</div><div style="font-family:Georgia,serif;font-size:28px;color:#1a1a1a;">Talent Roster</div></div><div style="text-align:right;"><div style="font-size:11px;color:#999;">${creators.length} creators</div><div style="font-size:11px;color:#999;">${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div></div></div><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8f8f8;"><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Photo</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Name</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Niches</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Handles</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Followers</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Eng Rate</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Rates</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Location</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Contact</th><th style="padding:10px 12px;text-align:left;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:1px solid #e0e0e0;">Tier</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print() }, 500)
    setExporting(false)
  }

  if (authLoading) return (
    <div style={{ background: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '9px', color: subtle, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )

  if (!user) return <Login onLogin={setUser} />

  return (
    <div style={{ background: bg, minHeight: '100vh', color: text, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {showForm && <AddCreatorForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); setRefresh(r => r + 1) }} />}

      <div style={{ display: 'flex', height: '100vh' }}>

        <nav style={{ width: '200px', background: nav, borderRight: `0.5px solid ${border}`, padding: '24px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '0 0 20px 16px', borderBottom: `0.5px solid ${border}`, marginBottom: '16px' }}>
            <img src="/logo.svg" alt="HQue" style={{ width: '140px', height: 'auto', display: 'block', filter: dark ? 'none' : 'invert(1)' }} />
          </div>
          {[['talent', 'Talent'], ['workspace', 'Workspace'], ['campaigns', 'Campaigns'], ['reports', 'Reports']].map(([key, label]) => (
            <button key={key} onClick={() => setView(key)} style={{
              padding: view === key ? '9px 20px 9px 14.5px' : '9px 16px',
              fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
              color: view === key ? text : muted,
              background: 'none', border: 'none',
              borderLeft: view === key ? '1.5px solid #5b7c99' : '1.5px solid transparent',
              textAlign: 'left', cursor: 'pointer', width: '100%',
              fontWeight: view === key ? '500' : '400'
            }}>{label}</button>
          ))}
          <div style={{ marginTop: 'auto', padding: '0 16px' }}>
            <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Signed in as</div>
            <div style={{ fontSize: '11px', color: muted, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            <button onClick={handleLogout} style={{ marginTop: '10px', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: subtle, padding: '4px 10px', cursor: 'pointer', borderRadius: '1px' }}>Sign out</button>
          </div>
        </nav>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: bg }}>
          <div style={{ padding: '20px 28px 16px', borderBottom: `0.5px solid ${border}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '6px' }}>C Media Collective</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 'normal', color: text }}>
                {view === 'talent' ? 'Talent Database' : view === 'workspace' ? 'Workspace' : view === 'campaigns' ? 'Campaigns' : 'Reports'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={() => setDark(d => !d)} style={{ padding: '7px 12px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>
                {dark ? 'Light' : 'Dark'}
              </button>
              {view === 'talent' && (
                <button onClick={handleExport} disabled={exporting} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: muted, cursor: 'pointer', borderRadius: '1px', opacity: exporting ? 0.6 : 1 }}>
                  {exporting ? 'Exporting...' : 'Export PDF'}
                </button>
              )}
              {view === 'talent' && (
                <button onClick={() => setShowForm(true)} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>+ Talent</button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {view === 'talent' && <TalentView key={refresh} dark={dark} />}
            {view === 'workspace' && <WorkspaceView />}
            {view === 'campaigns' && <CampaignView dark={dark} />}
            {view === 'reports' && <ReportsView dark={dark} />}
          </div>
        </main>

      </div>
    </div>
  )
}

export default App
