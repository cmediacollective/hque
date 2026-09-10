import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { printOnePager } from './talentOnePager'

// The step between "One-pager" and the print dialog.
//
// A talent's photo, bio and numbers live on their record and are the same in
// every pitch. What changes each time is who it's for, what they're being asked
// to make, and the price — so those are typed here and never saved to the
// talent. Everything is optional; blank lines simply don't print.
export default function OnePagerDialog({ creator, orgId, stripePlan, dark = true, onClose }) {
  const bg = dark ? '#1A1A1A' : '#FFFFFF'
  const text = dark ? '#EDEAE4' : '#1A1A1A'
  const muted = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const fieldBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'
  const fieldBorder = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  const fieldBorderStrong = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'
  const accent = '#5b7c99'
  const overlay = dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)'

  const inputStyle = { width: '100%', background: fieldBg, border: `1px solid ${fieldBorder}`, borderRadius: '6px', padding: '9px 11px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease' }
  const onFocus = (e) => { e.target.style.borderColor = fieldBorderStrong }
  const onBlur = (e) => { e.target.style.borderColor = fieldBorder }

  // Suggest the talent's own rates as the deliverables list, so a sheet for
  // someone already priced in the roster is one click from done.
  const suggestedDeliverables = () => {
    const r = creator.rates || {}
    return [
      r.reel && '1 × 60-second IG in-feed Reel',
      r.feed && '1 × IG in-feed post',
      r.story && '3 × IG Stories with link',
      r.tiktok && '1 × TikTok video',
      r.youtube && '1 × YouTube integration',
    ].filter(Boolean).join('\n')
  }

  const [pitch, setPitch] = useState({
    client: '',
    deliverables: suggestedDeliverables(),
    terms: 'Organic + paid social usage, 60 days\n2 rounds of revisions\nFull content ownership',
    investment: '',
    investmentNote: '',
    periodLabel: creator.metrics?.period || 'Last 30 days',
  })
  const set = (k, v) => setPitch(p => ({ ...p, [k]: v }))

  // Branding is fetched when the dialog opens, so the export click itself is
  // synchronous — an awaited window.open gets caught by the popup blocker.
  //
  // Same rule as the roster export: only Business prints its own logo with no
  // HQue footer. Starter and Pro always get the HQue wordmark and "Powered by".
  const businessBrand = stripePlan === 'agency'
  const [brand, setBrand] = useState({ agencyName: 'HQue', logoUrl: null, businessBrand })
  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    supabase.from('org_settings').select('*').eq('org_id', orgId).maybeSingle().then(({ data }) => {
      if (cancelled) return
      setBrand({
        agencyName: (businessBrand && data?.agency_name) || 'HQue',
        logoUrl: (businessBrand && data?.use_agency_logo) ? data.agency_logo_url : null,
        businessBrand,
      })
    })
    return () => { cancelled = true }
  }, [orgId, businessBrand])

  const [blocked, setBlocked] = useState(false)

  function exportSheet() {
    const lines = (s) => String(s || '').split('\n').map(l => l.trim()).filter(Boolean)
    const ok = printOnePager(creator, {
      client: pitch.client.trim(),
      deliverables: lines(pitch.deliverables),
      terms: lines(pitch.terms),
      investment: pitch.investment,
      investmentNote: pitch.investmentNote.trim(),
      periodLabel: pitch.periodLabel.trim(),
    }, brand)
    if (!ok) return setBlocked(true)
    onClose()
  }

  const field = (lbl, children, hint) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: muted, marginBottom: '5px' }}>{lbl}</div>
      {children}
      {hint && <div style={{ fontSize: '11px', color: muted, opacity: 0.7, marginTop: '6px' }}>{hint}</div>}
    </div>
  )

  const missing = []
  if (!creator.photo_url) missing.push('photo')
  if (!creator.bio) missing.push('bio')
  if (!creator.metrics || !Object.keys(creator.metrics).length) missing.push('performance metrics')

  return (
    <div style={{ position: 'fixed', inset: 0, background: overlay, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', background: bg, border: `1px solid ${fieldBorder}`, borderRadius: '12px', padding: '26px 28px' }}>

        <div style={{ marginBottom: '6px', fontFamily: 'Georgia, serif', fontSize: '20px', color: text }}>One-pager</div>
        <div style={{ fontSize: '12px', color: muted, lineHeight: 1.6, marginBottom: '22px' }}>
          A full-page sheet for {creator.name}. It opens in a new tab — choose <strong style={{ fontWeight: 600 }}>Save as PDF</strong> in the print dialog.
        </div>

        {missing.length > 0 && (
          <div style={{ fontSize: '12px', color: '#c9a14a', lineHeight: 1.6, marginBottom: '20px', padding: '11px 13px', background: 'rgba(201,161,74,0.09)', border: '1px solid rgba(201,161,74,0.25)', borderRadius: '6px' }}>
            No {missing.join(', ')} on this talent yet — the sheet will print without {missing.length > 1 ? 'those sections' : 'that section'}. Close this and click Edit to fill {missing.length > 1 ? 'them' : 'it'} in.
          </div>
        )}

        {field('Pitching to',
          <input value={pitch.client} onChange={e => set('client', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Dr. Brown's · Option 1" style={inputStyle} />,
          'The small line above the name. Leave blank to print the talent’s type instead.'
        )}

        {field('Deliverables',
          <textarea value={pitch.deliverables} onChange={e => set('deliverables', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder={'1 × 60-second IG in-feed Reel'} style={{ ...inputStyle, height: '86px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />,
          'One per line.'
        )}

        {field('Terms',
          <textarea value={pitch.terms} onChange={e => set('terms', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder={'Organic + paid social usage, 60 days'} style={{ ...inputStyle, height: '86px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />,
          'One per line. Prints in the column beside the deliverables.'
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {field('Total investment',
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: muted, pointerEvents: 'none' }}>$</span>
              <input type='number' value={pitch.investment} onChange={e => set('investment', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder='10000' style={{ ...inputStyle, paddingLeft: '22px' }} />
            </div>
          )}
          {field('Metrics period',
            <input value={pitch.periodLabel} onChange={e => set('periodLabel', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder='Last 30 days' style={inputStyle} />
          )}
        </div>

        {field('Price footnote',
          <input value={pitch.investmentNote} onChange={e => set('investmentNote', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder='Total investment · all deliverables, usage and ownership included' style={inputStyle} />,
          'The caption beside the price.'
        )}

        {blocked && (
          <div style={{ fontSize: '12px', color: '#e74c3c', lineHeight: 1.6, marginBottom: '14px' }}>
            Your browser blocked the new tab. Allow pop-ups for this site and try again.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', fontSize: '12px', background: 'none', border: `1px solid ${fieldBorder}`, color: muted, cursor: 'pointer', borderRadius: '6px' }}>Cancel</button>
          <button onClick={exportSheet} style={{ padding: '9px 20px', fontSize: '12px', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px' }}>Export PDF</button>
        </div>
      </div>
    </div>
  )
}
