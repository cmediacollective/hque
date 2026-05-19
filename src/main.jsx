import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const Loading = (
  <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Loading…</div>
  </div>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={Loading}>
      <App />
    </Suspense>
  </StrictMode>,
)
