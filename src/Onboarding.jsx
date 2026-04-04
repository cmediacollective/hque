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

    const slug = agencyName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) + '-' + Date.now().toString().slice(-4)

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert([{ name: agencyName, slug }])
      .select()
      .single()

    if (orgErr) {
      setSaving(false)
      return setError('Org error: ' + orgErr.message)
    }

    const { error: settingsErr } = await supabase
      .from('org_settings')
      .insert([{ org_id: org.id, agency_name: agencyName }])

    if (settingsErr) {
      setSaving(false)
      return setError('Settings error: ' + settingsErr.message)
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ org_id: org.id, role: 'owner' })
      .eq('id', user.id)

    if (profileErr) {
      setSaving(false)
      return setError('Profile error: ' + profileErr.message)
    }

    setSaving(false)
    onComplete(org.id, agencyName)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ width: '420px', padding: '0 20px' }}>
        <div style={{ marginBottom: '40px' }}>
          <img src="/logo.svg" alt="HQue" style={{ width: '120px', marginBottom: '32px', display: 'block' }} />
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#F0ECE6', marginBottom: '10px' }}>Welcome to HQue</div>
          <div style={{ fontSize: '14px', color: '#777', lineHeight: 1.7 }}>Let's set up your agency workspace. This only takes a moment.</div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#666', marginBottom: '8px' }}>Agency Name</div>
          <input
            value={agencyName}
            onChange={e => setAgencyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createOrg()}
            placeholder='e.g. cMedia Collective'
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

        <div style={{ marginTop: '20px', fontSize: '11px', color: '#555', textAlign: 'center' }}>
          Signed in as {user.email}
        </div>
      </div>
    </div>
  )
}
