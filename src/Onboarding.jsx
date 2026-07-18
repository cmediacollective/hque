import { useState } from 'react'
import { supabase } from './supabase'
import { CLIENT_LABEL_PRESETS } from './useClientLabel'

export default function Onboarding({ user, onComplete }) {
  const [agencyName, setAgencyName] = useState('')
  const [labelChoice, setLabelChoice] = useState('0') // index into CLIENT_LABEL_PRESETS, or 'custom'
  const [customSingular, setCustomSingular] = useState('')
  const [customPlural, setCustomPlural] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Resolve the chosen client label to {singular, plural}, or null if it's the
  // default (index 0) — in which case we don't write anything and every company
  // keeps the standard "Brands/Clients" wording.
  function chosenLabel() {
    if (labelChoice === 'custom') {
      const singular = customSingular.trim()
      const plural = customPlural.trim()
      if (!singular || !plural) return { error: 'Please fill in both the singular and plural word.' }
      return { singular, plural }
    }
    if (labelChoice === '0') return null
    return CLIENT_LABEL_PRESETS[Number(labelChoice)] || null
  }

  async function createOrg() {
    if (!agencyName.trim()) return setError('Please enter your agency name')
    const label = chosenLabel()
    if (label && label.error) return setError(label.error)
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

    // Save their chosen word for the "Brand/Client" section (only if not the
    // default). Best-effort — if it fails, the workspace still opens with the
    // standard wording and they can set it later in Settings.
    if (label && !label.error) {
      await supabase.from('org_settings')
        .update({ client_label_singular: label.singular, client_label_plural: label.plural })
        .eq('org_id', newOrgId)
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

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#666', marginBottom: '8px' }}>How do you group your work?</div>
          <div style={{ display: 'grid', gap: '6px', marginBottom: '12px' }}>
            {[
              ['Agency', 'Clients · Brands'],
              ['HR / Ops', 'Departments — Payroll, HR…'],
              ['Media', 'Teams (Writers…) — or Months'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '74px 1fr', gap: '10px', alignItems: 'baseline', fontSize: '11.5px' }}>
                <span style={{ color: '#5b7c99', fontWeight: 600 }}>{k}</span>
                <span style={{ color: '#888' }}>{v}</span>
              </div>
            ))}
          </div>
          <select
            value={labelChoice}
            onChange={e => setLabelChoice(e.target.value)}
            style={{ width: '100%', background: '#141414', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '12px 14px', fontSize: '14px', color: '#F0ECE6', outline: 'none', boxSizing: 'border-box' }}>
            {CLIENT_LABEL_PRESETS.map((p, i) => (
              <option key={i} value={String(i)}>{p.plural}{i === 0 ? ' (default)' : ''}</option>
            ))}
            <option value='custom'>Something else…</option>
          </select>
          {labelChoice === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                value={customSingular}
                onChange={e => setCustomSingular(e.target.value)}
                placeholder='One (e.g. Client)'
                style={{ flex: 1, background: '#141414', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '10px 12px', fontSize: '13px', color: '#F0ECE6', outline: 'none', boxSizing: 'border-box' }}
              />
              <input
                value={customPlural}
                onChange={e => setCustomPlural(e.target.value)}
                placeholder='Many (e.g. Clients)'
                style={{ flex: 1, background: '#141414', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '10px 12px', fontSize: '13px', color: '#F0ECE6', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#555', marginTop: '8px', lineHeight: 1.6 }}>Pick the word that fits your team — or choose "Something else…" to type your own. You can change it anytime in Settings.</div>
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
