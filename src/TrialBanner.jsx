export default function TrialBanner({ trialEndsAt, onUpgrade }) {
  if (!trialEndsAt) return null

  const end = new Date(trialEndsAt)
  const now = new Date()
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) return (
    <div style={{ background: '#c0392b', padding: '10px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div style={{ fontSize: '12px', color: '#fff' }}>Your free trial has ended. Upgrade to continue using HQue.</div>
      <button onClick={onUpgrade} style={{ padding: '5px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#fff', border: 'none', color: '#c0392b', cursor: 'pointer', borderRadius: '1px', fontWeight: '500' }}>Upgrade Now</button>
    </div>
  )

  const urgent = daysLeft <= 3
  const bg = urgent ? '#1E3048' : '#1E3A3A'
  const accent = urgent ? '#4F8FD6' : '#4FA6A6'

  return (
    <div style={{ background: bg, padding: '8px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: `0.5px solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: accent }}>Free Trial</span>
        <span style={{ fontSize: '12px', color: '#ccc' }}>
          {daysLeft === 1 ? 'Your trial ends tomorrow' : `${daysLeft} days left in your trial`}
        </span>
      </div>
      <button onClick={onUpgrade} style={{ padding: '5px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Upgrade</button>
    </div>
  )
}
