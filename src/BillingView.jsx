import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { PLANS } from './plans'

export default function BillingView({ dark = true, orgId, user }) {
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#DBD7D0'
  const border2 = dark ? '#3A3A3A' : '#CCC7BF'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'
  const isMobile = window.innerWidth < 768

  const [loading, setLoading] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState('')
  const [stripeCustomerId, setStripeCustomerId] = useState(null)
  const [stripePlan, setStripePlan] = useState(null)
  const [logoUrl, setLogoUrl] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [pendingPlan, setPendingPlan] = useState(null)

  // Danger zone: cancel the plan (keeps data) or close the account (30-day grace).
  const [orgName, setOrgName] = useState('')
  const [cancelAt, setCancelAt] = useState(null)
  const [isLifetime, setIsLifetime] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => { fetchOrgBilling() }, [])

  async function fetchOrgBilling() {
    const { data } = await supabase.from('organizations').select('name, stripe_customer_id, stripe_plan, cancel_at, is_lifetime').eq('id', orgId).single()
    if (data?.stripe_customer_id) setStripeCustomerId(data.stripe_customer_id)
    if (data?.stripe_plan) setStripePlan(data.stripe_plan)
    setOrgName(data?.name || '')
    setCancelAt(data?.cancel_at || null)
    setIsLifetime(!!data?.is_lifetime)
    const { data: settings } = await supabase.from('org_settings').select('*').eq('org_id', orgId).single()
    if (settings?.use_agency_logo && settings?.agency_logo_url) setLogoUrl(settings.agency_logo_url)
  }

  const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

  // Cancel ends the plan when the paid period runs out; resume undoes that.
  async function setCancellation(resume) {
    setCancelBusy(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ resume: !!resume }),
      })
      const data = await res.json()
      if (!res.ok || data.error) setError(data.error || 'Something went wrong')
      else { setCancelAt(data.cancel_at); setConfirmCancel(false) }
    } catch (err) {
      setError('Couldn’t reach the server. Please try again.')
    }
    setCancelBusy(false)
  }

  // Closing the account cancels billing and starts a 30-day countdown to a
  // permanent wipe. App.jsx locks the workspace as soon as deleted_at is set.
  async function deleteAccount() {
    setDeleteBusy(true)
    setError('')
    try {
      const { data, error: rpcErr } = await supabase.rpc('request_account_deletion')
      if (rpcErr || !data?.ok) {
        const reason = data?.reason
        setError(
          reason === 'not_owner' ? 'Only the workspace owner can close the account.'
          : reason === 'master_account' ? 'This is the master account — it can’t be deleted.'
          : rpcErr?.message || 'Couldn’t close the account. Please try again.'
        )
        setDeleteBusy(false)
        return
      }
      // Best-effort: stop the billing too. The workspace is closed either way.
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/.netlify/functions/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({}),
      }).catch(() => {})
      window.location.reload()
    } catch (err) {
      setError('Couldn’t close the account. Please try again.')
      setDeleteBusy(false)
    }
  }

  async function uploadLogo(file) {
    if (!file) return
    setUploadingLogo(true)
    setError('')
    const ext = file.name.split('.').pop()
    const path = `agency-logos/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('campaign-logos').upload(path, file, { upsert: true })
    if (upErr) { setError('Logo upload failed. Please try again.'); setUploadingLogo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('campaign-logos').getPublicUrl(path)
    const { data: existing } = await supabase.from('org_settings').select('id').eq('org_id', orgId).single()
    if (existing) await supabase.from('org_settings').update({ agency_logo_url: publicUrl }).eq('org_id', orgId)
    else await supabase.from('org_settings').insert([{ org_id: orgId, agency_logo_url: publicUrl }])
    setLogoUrl(publicUrl)
    setUploadingLogo(false)
    const plan = pendingPlan
    setPendingPlan(null)
    if (plan) checkout(plan, true)
  }

  async function checkout(plan, skipGate = false) {
    if (!skipGate && !logoUrl) { setPendingPlan(plan); setError(''); return }
    setLoading(plan.key)
    setError('')
    try {
      // The function verifies we're the owner from this token — it no longer
      // trusts an orgId sent from the browser.
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ priceId: plan.priceId })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error || 'Something went wrong')
    } catch (err) {
      setError('Failed to start checkout. Please try again.')
    }
    setLoading(null)
  }

  async function openPortal() {
    if (!stripeCustomerId) return
    setPortalLoading(true)
    try {
      // The function looks the customer up from our own org — it no longer
      // accepts a customerId from the browser.
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: '{}'
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error || 'Something went wrong')
    } catch (err) {
      setError('Failed to open billing portal.')
    }
    setPortalLoading(false)
  }

  const currentPlan = PLANS.find(p => p.key === stripePlan)

  return (
    <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '8px' }}>Billing</div>

      {currentPlan && (
        <div style={{ background: card, border: `0.5px solid #5b7c99`, borderRadius: '2px', padding: '20px 24px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '4px' }}>Current Plan</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: text }}>{currentPlan.name} — {currentPlan.price}{currentPlan.period}</div>
          </div>
          <button onClick={openPortal} disabled={portalLoading} style={{ padding: '9px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px', opacity: portalLoading ? 0.7 : 1 }}>
            {portalLoading ? 'Loading...' : 'Manage Billing & Invoices'}
          </button>
        </div>
      )}

      {!currentPlan && (
        <div style={{ fontSize: '12px', color: muted, marginBottom: '32px', lineHeight: 1.7 }}>
          Choose a plan to unlock full access. All plans include a 14-day free trial.
        </div>
      )}

      {error && <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '16px' }}>{error}</div>}

      {pendingPlan && (
        <div style={{ background: card, border: '0.5px solid #5b7c99', borderRadius: '2px', padding: '20px 24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '8px' }}>One quick step</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: text, marginBottom: '6px' }}>Add your agency logo to continue</div>
          <div style={{ fontSize: '12px', color: muted, lineHeight: 1.6, marginBottom: '16px', maxWidth: '460px' }}>
            Your logo powers your branded login page and white-label workspace. Upload it once here to start your {pendingPlan.name} plan.
          </div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <label style={{ padding: '10px 18px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', color: '#fff', cursor: uploadingLogo ? 'default' : 'pointer', borderRadius: '1px', display: 'inline-block', opacity: uploadingLogo ? 0.7 : 1 }}>
              {uploadingLogo ? 'Uploading...' : 'Upload Logo & Continue'}
              <input type='file' accept='image/*' disabled={uploadingLogo} onChange={e => uploadLogo(e.target.files[0])} style={{ display: 'none' }} />
            </label>
            <button onClick={() => setPendingPlan(null)} disabled={uploadingLogo} style={{ background: 'none', border: 'none', color: subtle, fontSize: '11px', cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {PLANS.map(plan => (
          <div key={plan.key} style={{
            background: card,
            border: `0.5px solid ${plan.key === stripePlan ? '#5b7c99' : plan.recommended ? '#5b7c99' : border}`,
            borderRadius: '2px', padding: '32px 28px',
            display: 'flex', flexDirection: 'column', position: 'relative',
            opacity: stripePlan && plan.key !== stripePlan ? 0.6 : 1
          }}>
            {plan.recommended && !stripePlan && (
              <div style={{ position: 'absolute', top: '-1px', right: '20px', background: '#5b7c99', color: '#fff', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 2px 2px' }}>
                Most Popular
              </div>
            )}
            {plan.key === stripePlan && (
              <div style={{ position: 'absolute', top: '-1px', right: '20px', background: '#5C9E52', color: '#fff', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 2px 2px' }}>
                Current Plan
              </div>
            )}
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px' }}>{plan.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '28px' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '36px', color: text }}>{plan.price}</span>
              <span style={{ fontSize: '12px', color: muted }}>{plan.period}</span>
            </div>
            <div style={{ flex: 1, marginBottom: '28px', borderTop: `0.5px solid ${border}`, paddingTop: '20px' }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ color: '#5b7c99', fontSize: '13px', marginTop: '1px', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '13px', color: muted, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => plan.key === stripePlan ? openPortal() : checkout(plan)}
              disabled={loading === plan.key || portalLoading}
              style={{
                width: '100%', padding: '13px', fontSize: '9px', letterSpacing: '0.18em',
                textTransform: 'uppercase',
                background: plan.key === stripePlan ? 'none' : plan.recommended ? '#5b7c99' : 'none',
                border: `0.5px solid ${plan.key === stripePlan ? '#5C9E52' : plan.recommended ? '#5b7c99' : border2}`,
                color: plan.key === stripePlan ? '#5C9E52' : plan.recommended ? '#fff' : muted,
                cursor: 'pointer', borderRadius: '1px', opacity: loading === plan.key ? 0.7 : 1
              }}>
              {loading === plan.key ? 'Loading...' : plan.key === stripePlan ? 'Manage Plan' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '11px', color: subtle, lineHeight: 1.7 }}>
        Payments processed securely by Stripe. Questions? <a href='mailto:support@h-que.com' style={{ color: '#5b7c99', textDecoration: 'none' }}>support@h-que.com</a>
      </div>

      {/* Danger zone — cancelling and closing are deliberately different things:
          cancelling stops the billing and keeps the data; closing wipes it. */}
      <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#C77B5B', margin: '48px 0 14px' }}>Danger zone</div>
      <div style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '1px' }}>

        {/* Cancel plan (nothing to cancel on a lifetime/comped account) */}
        {!isLifetime && (
          <div style={{ padding: '20px 24px', borderBottom: `0.5px solid ${border}` }}>
            {cancelAt ? (
              <>
                <div style={{ fontSize: '13px', color: text, marginBottom: '6px' }}>Your plan ends on {fmtDate(cancelAt)}</div>
                <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7, marginBottom: '14px', maxWidth: '560px' }}>
                  You keep full access until then. After that the workspace locks until you choose a plan again — your data stays put.
                </div>
                <button onClick={() => setCancellation(true)} disabled={cancelBusy} style={{ padding: '9px 18px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: cancelBusy ? 'default' : 'pointer', borderRadius: '3px', opacity: cancelBusy ? 0.6 : 1 }}>
                  {cancelBusy ? 'Working…' : 'Resume my plan'}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '13px', color: text, marginBottom: '6px' }}>Cancel my plan</div>
                <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7, marginBottom: '14px', maxWidth: '560px' }}>
                  Stops the billing at the end of the period you've already paid for. <strong style={{ color: text }}>Your data is kept</strong> — you can pick a plan again whenever you like.
                </div>
                {confirmCancel ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: text }}>Cancel the plan at the end of this period?</span>
                    <button onClick={() => setCancellation(false)} disabled={cancelBusy} style={{ padding: '8px 16px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#C77B5B', border: 'none', color: '#fff', cursor: cancelBusy ? 'default' : 'pointer', borderRadius: '3px', opacity: cancelBusy ? 0.6 : 1 }}>
                      {cancelBusy ? 'Working…' : 'Yes, cancel'}
                    </button>
                    <button onClick={() => setConfirmCancel(false)} disabled={cancelBusy} style={{ padding: '8px 16px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '3px' }}>Keep it</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmCancel(true)} disabled={!stripePlan} title={!stripePlan ? 'No active plan to cancel' : undefined} style={{ padding: '9px 18px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: stripePlan ? 'pointer' : 'default', borderRadius: '3px', opacity: stripePlan ? 1 : 0.5 }}>
                    Cancel plan
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Close the account */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: '13px', color: text, marginBottom: '6px' }}>Close this account</div>
          <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7, marginBottom: '14px', maxWidth: '560px' }}>
            Locks everyone out immediately and cancels any billing. Your brands, boards, tasks, campaigns, and talent are <strong style={{ color: text }}>permanently deleted after 30 days</strong> — until then you can restore it yourself.
          </div>

          {deleteOpen ? (
            <div style={{ border: `0.5px solid #C77B5B`, borderRadius: '3px', padding: '16px', maxWidth: '460px' }}>
              <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7, marginBottom: '10px' }}>
                Type <strong style={{ color: text }}>{orgName}</strong> to confirm.
              </div>
              <input
                value={deleteTyped}
                onChange={e => setDeleteTyped(e.target.value)}
                placeholder={orgName}
                style={{ width: '100%', background: inputBgSafe(dark), border: `0.5px solid ${border2}`, borderRadius: '3px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={deleteAccount}
                  disabled={deleteBusy || deleteTyped.trim() !== orgName}
                  style={{ padding: '9px 18px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#C0392B', border: 'none', color: '#fff', borderRadius: '3px', cursor: deleteBusy || deleteTyped.trim() !== orgName ? 'default' : 'pointer', opacity: deleteBusy || deleteTyped.trim() !== orgName ? 0.5 : 1 }}>
                  {deleteBusy ? 'Closing…' : 'Close account'}
                </button>
                <button onClick={() => { setDeleteOpen(false); setDeleteTyped('') }} disabled={deleteBusy} style={{ padding: '9px 18px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '3px' }}>Keep my account</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setDeleteOpen(true)} style={{ padding: '9px 18px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #C0392B', color: '#C0392B', cursor: 'pointer', borderRadius: '3px' }}>
              Close account
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const inputBgSafe = (dark) => (dark ? '#1A1A1A' : '#FFFFFF')
