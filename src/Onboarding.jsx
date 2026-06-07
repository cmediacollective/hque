import { useState } from 'react'
import { supabase } from './supabase'

export default function Onboarding({ user, onComplete }) {
  const [agencyName, setAgencyName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function createOrg() {
    if (!agencyName.trim()) return setError('Please enter your agency name')
    setSaving(true)
    setError('')

    // Create the workspace via a SECURITY DEFINER RPC. It performs all three
    // writes (organizations, org_settings, profile link) server-side in one
    // step, which is required because organizations has RLS enabled and the
    // browser key can't insert directly. The slug is generated inside the RPC.
    const { data: newOrgId, error: orgErr } = await supabase
      .rpc('create_organization', { p_name: agencyName.trim() })

    if (orgErr) {
      setSaving(false)
      return setError('Org error: ' + orgErr.message)
    }

    setSaving(false)
    onComplete(newOrgId, agencyName)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ width: '420px', padding: '0 20px' }}>
        <div style={{ marginBottom: '40px' }}>
          <img src="/logo.svg" alt="HQue" style={{ width: '120px', marginBottom: '32px', display: 'block' }} />
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#F0ECE6', marginBottom: '10px' }}>Welcome to HQue</div>
          <div style={{ fontSize: '14px', color: '#777', lineHeight: 1.7 }}>Let's set up your agency workspace. This only takes a moment.</div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#666', marginBottom: '8px' }}>Agency / Brand Name</div>
          <input
            value={agencyName}
            onChange={e => setAgencyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createOrg()}
            placeholder='e.g. Nova Talent Group'
            autoFocus
            style={{ width: '100%', background: '#141414', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '12px 14px', fontSize: '14px', color: '#F0ECE6', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '12px' }}>{error}</div>}

        <button
          onClick={createOrg}
          disabled={saving}
          style={{ width: '100%', padding: '12px', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Creating your workspace...' : 'Create Workspace'}
        </button>

        <div style={{ marginTop: '20px', fontSize: '11px', color: '#555', textAlign: 'center', lineHeight: 1.7 }}>
          Signed in as {user.email}
          <div style={{ marginTop: '10px' }}>
            Were you invited to an existing agency? Make sure you signed in with the
            exact email your invitation was sent to.
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.reload() }}
            style={{ marginTop: '10px', background: 'none', border: 'none', color: '#5b7c99', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', padding: 0 }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
