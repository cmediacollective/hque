export default function TrialBanner({ trialEndsAt, onUpgrade, dark }) {
  if (!trialEndsAt) return null

  const end = new Date(trialEndsAt)
  const now = new Date()
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))

  const brand = '#5b7c99'

  if (daysLeft <= 0) return (
    <div style={{ background: '#c0392b', padding: '10px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div style={{ fontSize: '12px', color: '#fff' }}>Your free trial has ended. Upgrade to continue using HQue.</div>
      <button onClick={onUpgrade} style={{ padding: '5px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#fff', border: 'none', color: '#c0392b', cursor: 'pointer', borderRadius: '1px', fontWeight: '500' }}>Upgrade Now</button>
    </div>
  )

  const urgent = daysLeft <= 3
  // On-brand HQue blue on a clean surface — white in light mode, a dark surface
  // in dark mode — instead of the old teal/green.
  const bg = dark ? '#1f1f1f' : '#ffffff'
  const labelColor = dark ? '#8faec4' : brand
  const daysColor = dark ? '#ccc' : '#333'

  return (
    <div style={{ background: bg, padding: '8px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: `0.5px solid ${dark ? '#333' : '#dfe4ea'}`, boxShadow: `inset 3px 0 0 ${brand}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: labelColor, fontWeight: 600 }}>Free Trial</span>
        <span style={{ fontSize: '12px', color: daysColor, fontWeight: urgent ? 600 : 400 }}>
          {daysLeft === 1 ? 'Your trial ends tomorrow' : `${daysLeft} days left in your trial`}
        </span>
      </div>
      <button onClick={onUpgrade} style={{ padding: '5px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: brand, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', fontWeight: '500' }}>Upgrade</button>
    </div>
  )
}
