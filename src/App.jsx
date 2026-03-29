import { useState } from 'react'
import { supabase } from './supabase'
import AddCreatorForm from './AddCreatorForm'
import TalentView from './TalentView'
import { darkTheme, lightTheme } from './theme'

function App() {
  const [view, setView] = useState('talent')
  const [showForm, setShowForm] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [isDark, setIsDark] = useState(true)

  const t = isDark ? darkTheme : lightTheme

  return (
    <div style={{
      background: t.bg,
      minHeight: '100vh',
      color: t.textPrimary,
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    }}>
      {showForm && (
        <AddCreatorForm
          t={t}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setRefresh(r => r + 1); }}
        />
      )}

      <div style={{ display: 'flex', height: '100vh' }}>

        <nav style={{
          width: '200px',
          background: t.bgNav,
          borderRight: `0.5px solid ${t.border}`,
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <div style={{ padding: '0 0 20px 0', borderBottom: `0.5px solid ${t.border}`, marginBottom: '16px', overflow: 'hidden' }}>
            <div style={{ overflow: 'hidden', height: '40px', display: 'flex', alignItems: 'center', paddingLeft: '4px' }}>
              <img src={t.logo} alt="HQue" style={{ width: '170px', marginTop: '-34px', marginBottom: '-34px', marginLeft: '-24px', display: 'block' }} />
            </div>
          </div>

          {[['talent', 'Talent'], ['workspace', 'Workspace'], ['campaigns', 'Campaigns'], ['reports', 'Reports']].map(([key, label]) => (
            <button key={key} onClick={() => setView(key)} style={{
              padding: view === key ? '9px 20px 9px 14.5px' : '9px 16px',
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: view === key ? t.textPrimary : t.textSecondary,
              background: 'none',
              border: 'none',
              borderLeft: view === key ? '1.5px solid #5b7c99' : '1.5px solid transparent',
              textAlign: 'left',
              cursor: 'pointer',
              width: '100%',
              fontWeight: view === key ? '500' : '400'
            }}>{label}</button>
          ))}

          <div style={{ marginTop: 'auto', padding: '0 16px' }}>
            <div style={{ fontSize: '8px', color: t.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Organization</div>
            <div style={{ fontSize: '11px', color: t.textSecondary, marginTop: '4px' }}>C Media Collective</div>
            <button
              onClick={() => setIsDark(d => !d)}
              style={{
                marginTop: '12px', width: '100%', padding: '6px 0', fontSize: '8px',
                letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none',
                border: `0.5px solid ${t.borderChip}`, color: t.textMuted,
                cursor: 'pointer', borderRadius: '1px'
              }}>
              {isDark ? '☀ Light Mode' : '◑ Dark Mode'}
            </button>
          </div>
        </nav>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bg }}>
          <div style={{ padding: '20px 28px 16px', borderBottom: `0.5px solid ${t.border}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '8px', color: t.textMuted, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '6px' }}>C Media Collective</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 'normal', color: t.textPrimary }}>
                {view === 'talent' ? 'Talent Database' : view === 'workspace' ? 'Workspace' : view.charAt(0).toUpperCase() + view.slice(1)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${t.borderChip}`, color: t.textSecondary, cursor: 'pointer', borderRadius: '1px' }}>Export</button>
              <button onClick={() => setShowForm(true)} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>+ Creator</button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {view === 'talent' && <TalentView key={refresh} t={t} />}
            {view === 'workspace' && <div style={{ padding: '20px 28px', color: t.textMuted, fontSize: '13px' }}>Workspace coming next...</div>}
            {view === 'campaigns' && <div style={{ padding: '20px 28px', color: t.textMuted, fontSize: '13px' }}>Campaigns coming next...</div>}
            {view === 'reports' && <div style={{ padding: '20px 28px', color: t.textMuted, fontSize: '13px' }}>Reports coming next...</div>}
          </div>
        </main>

      </div>
    </div>
  )
}

export default App