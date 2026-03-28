import { useState } from 'react'
import { supabase } from './supabase'

function App() {
  const [view, setView] = useState('talent')

  return (
    <div style={{
      background: '#080808',
      minHeight: '100vh',
      color: '#F2EEE8',
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    }}>
      <div style={{ display: 'flex', height: '100vh' }}>

        {/* NAV */}
        <nav style={{
          width: '188px',
          background: '#060606',
          borderRight: '0.5px solid #131313',
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <div style={{ padding: '0 20px 24px', borderBottom: '0.5px solid #131313', marginBottom: '16px' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', letterSpacing: '0.14em' }}>H—QUE</div>
            <div style={{ fontSize: '7px', color: '#2E2E2E', letterSpacing: '0.32em', textTransform: 'uppercase', marginTop: '4px' }}>Agency OS</div>
          </div>
          {[['talent', 'Talent'], ['workspace', 'Workspace'], ['campaigns', 'Campaigns'], ['reports', 'Reports']].map(([key, label]) => (
            <button key={key} onClick={() => setView(key)} style={{
              padding: view === key ? '8px 20px 8px 18.5px' : '8px 20px',
              fontSize: '9px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: view === key ? '#F2EEE8' : '#383838',
              background: 'none',
              border: 'none',
              borderLeft: view === key ? '1.5px solid #5b7c99' : '1.5px solid transparent',
              textAlign: 'left',
              cursor: 'pointer',
              width: '100%'
            }}>{label}</button>
          ))}
          <div style={{ marginTop: 'auto', padding: '0 20px' }}>
            <div style={{ fontSize: '7px', color: '#2A2A2A', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Organization</div>
            <div style={{ fontSize: '10px', color: '#444', marginTop: '4px' }}>C Media Collective</div>
          </div>
        </nav>

        {/* MAIN */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0A0A0A' }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '0.5px solid #131313', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '7px', color: '#2E2E2E', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '6px' }}>C Media Collective</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 'normal' }}>
                {view === 'talent' ? 'Talent Database' : view === 'workspace' ? 'Workspace' : view.charAt(0).toUpperCase() + view.slice(1)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ padding: '6px 12px', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #1E1E1E', color: '#444', cursor: 'pointer', borderRadius: '1px' }}>Export</button>
              <button style={{ padding: '6px 12px', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>+ Creator</button>
            </div>
          </div>

          <div style={{ padding: '20px 24px', color: '#333', fontSize: '12px' }}>
            {view === 'talent' && <p>Talent database coming next...</p>}
            {view === 'workspace' && <p>Workspace coming next...</p>}
            {view === 'campaigns' && <p>Campaigns coming next...</p>}
            {view === 'reports' && <p>Reports coming next...</p>}
          </div>
        </main>

      </div>
    </div>
  )
}

export default App