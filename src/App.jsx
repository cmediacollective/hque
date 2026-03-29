import { useState } from 'react'
import { supabase } from './supabase'
import AddCreatorForm from './AddCreatorForm'
import TalentView from './TalentView'

function App() {
  const [view, setView] = useState('talent')
  const [showForm, setShowForm] = useState(false)
  const [refresh, setRefresh] = useState(0)

  return (
    <div style={{
      background: '#0D0D0D',
      minHeight: '100vh',
      color: '#F2EEE8',
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    }}>
      {showForm && <AddCreatorForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); setRefresh(r => r + 1); }} />}

      <div style={{ display: 'flex', height: '100vh' }}>

        <nav style={{
          width: '200px',
          background: '#111111',
          borderRight: '0.5px solid #222222',
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <div style={{ padding: '0 20px 24px', borderBottom: '0.5px solid #222222', marginBottom: '16px' }}>
            <img src="/logo.svg" alt="HQue" style={{ width: '120px', height: 'auto', display: 'block', marginLeft: '-8px' }} />
            <div style={{ fontSize: '7px', color: '#555', letterSpacing: '0.32em', textTransform: 'uppercase', marginTop: '4px' }}>Agency OS</div>
          </div>
          {[['talent', 'Talent'], ['workspace', 'Workspace'], ['campaigns', 'Campaigns'], ['reports', 'Reports']].map(([key, label]) => (
            <button key={key} onClick={() => setView(key)} style={{
              padding: view === key ? '9px 20px 9px 18.5px' : '9px 20px',
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: view === key ? '#F2EEE8' : '#777777',
              background: 'none',
              border: 'none',
              borderLeft: view === key ? '1.5px solid #5b7c99' : '1.5px solid transparent',
              textAlign: 'left',
              cursor: 'pointer',
              width: '100%',
              fontWeight: view === key ? '500' : '400'
            }}>{label}</button>
          ))}
          <div style={{ marginTop: 'auto', padding: '0 20px' }}>
            <div style={{ fontSize: '8px', color: '#555', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Organization</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>C Media Collective</div>
          </div>
        </nav>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0D0D0D' }}>
          <div style={{ padding: '20px 28px 16px', borderBottom: '0.5px solid #222', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '8px', color: '#666', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '6px' }}>C Media Collective</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 'normal', color: '#F2EEE8' }}>
                {view === 'talent' ? 'Talent Database' : view === 'workspace' ? 'Workspace' : view.charAt(0).toUpperCase() + view.slice(1)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #333', color: '#888', cursor: 'pointer', borderRadius: '1px' }}>Export</button>
              <button onClick={() => setShowForm(true)} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>+ Creator</button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {view === 'talent' && <TalentView key={refresh} />}
            {view === 'workspace' && <div style={{ padding: '20px 28px', color: '#666', fontSize: '13px' }}>Workspace coming next...</div>}
            {view === 'campaigns' && <div style={{ padding: '20px 28px', color: '#666', fontSize: '13px' }}>Campaigns coming next...</div>}
            {view === 'reports' && <div style={{ padding: '20px 28px', color: '#666', fontSize: '13px' }}>Reports coming next...</div>}
          </div>
        </main>

      </div>
    </div>
  )
}

export default App
