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
              {view === 'talent' && <button style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Export</button>}
              {view === 'talent' && <button onClick={() => setShowForm(true)} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>+ Talent</button>}
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
