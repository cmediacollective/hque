import { useState, useRef, useEffect } from 'react'

// Company switcher shown in the main header. When the user belongs to a single
// company it renders exactly the plain agency-name label it replaced (and
// nothing at all on mobile, matching the old behavior). With two or more
// companies it becomes a dropdown that flips the active company.
export default function OrgSwitcher({ orgs, activeOrgId, onSwitch, dark, colors, isMobile }) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [err, setErr] = useState(null)
  const ref = useRef(null)
  const { text, subtle, border, nav } = colors

  const active = (orgs || []).find(o => o.org_id === activeOrgId)
  const activeName = active?.name || 'HQue'

  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Single company (or none): behave exactly like the label it replaced.
  if (!orgs || orgs.length <= 1) {
    if (isMobile) return null
    return <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '6px' }}>{activeName}</div>
  }

  const handleSwitch = async (orgId) => {
    if (orgId === activeOrgId) { setOpen(false); return }
    setErr(null)
    setSwitching(true)
    const errMsg = await onSwitch(orgId)   // reloads on success; returns a message on failure
    if (errMsg) { setSwitching(false); setErr(errMsg) }
  }

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: isMobile ? 0 : '6px', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} disabled={switching} style={{
        display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none',
        padding: 0, cursor: switching ? 'default' : 'pointer',
        fontSize: '8px', color: subtle, letterSpacing: '0.28em', textTransform: 'uppercase',
      }}>
        <span style={{ maxWidth: isMobile ? '150px' : '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {switching ? 'Switching…' : activeName}
        </span>
        <svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' style={{ opacity: 0.7 }}><polyline points='6 9 12 15 18 9' /></svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200, minWidth: '230px',
          background: nav, border: `0.5px solid ${border}`, borderRadius: '6px',
          boxShadow: dark ? '0 6px 24px rgba(0,0,0,0.5)' : '0 6px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px 6px', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, borderBottom: `0.5px solid ${border}` }}>Switch company</div>
          {err && (
            <div style={{ padding: '8px 14px', fontSize: '10px', color: '#c0392b', background: dark ? 'rgba(192,57,43,0.12)' : '#fdecea', borderBottom: `0.5px solid ${border}`, lineHeight: 1.4 }}>
              Couldn't switch: {err}
            </div>
          )}
          {orgs.map((o, i) => {
            const isActive = o.org_id === activeOrgId
            return (
              <button key={o.org_id} onClick={() => handleSwitch(o.org_id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%',
                padding: '10px 14px', background: isActive ? (dark ? '#242424' : '#f4f1ec') : 'none', border: 'none',
                borderTop: i === 0 ? 'none' : `0.5px solid ${border}`, cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: text, fontFamily: 'Georgia, serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</div>
                  <div style={{ fontSize: '8px', color: subtle, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '2px' }}>{o.role}</div>
                </div>
                {isActive && <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#5b7c99' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' style={{ flexShrink: 0 }}><polyline points='20 6 9 17 4 12' /></svg>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
