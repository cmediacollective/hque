import { useState, useRef, useEffect } from 'react'

// Company switcher shown in the main header. Renders as the plain agency-name
// label when the user has a single company and can't create more (zero change
// for those users). Otherwise it's a dropdown that switches the active company
// and — unless the user owns a lifetime/comped company — lets them add another.
export default function OrgSwitcher({ orgs, activeOrgId, onSwitch, onCreate, canCreate, dark, colors, isMobile }) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [err, setErr] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const ref = useRef(null)
  const { text, subtle, border, nav } = colors

  const list = orgs || []
  const active = list.find(o => o.org_id === activeOrgId)
  const activeName = active?.name || 'HQue'

  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => { if (!open) { setAdding(false); setNewName(''); setErr(null) } }, [open])

  // Single company AND can't create more: behave exactly like the plain label
  // it replaced (and nothing on mobile).
  const showChrome = list.length > 1 || canCreate
  if (!showChrome) {
    if (isMobile) return null
    return <div style={{ fontSize: '9px', color: text, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px' }}>{activeName}</div>
  }

  const handleSwitch = async (orgId) => {
    if (orgId === activeOrgId) { setOpen(false); return }
    setErr(null)
    setSwitching(true)
    const errMsg = await onSwitch(orgId)   // reloads on success; returns a message on failure
    if (errMsg) { setSwitching(false); setErr(errMsg) }
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setErr(null)
    setCreating(true)
    const errMsg = await onCreate(name)    // reloads into the new company on success
    if (errMsg) { setCreating(false); setErr(errMsg) }
  }

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: isMobile ? 0 : '6px', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} disabled={switching} style={{
        display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none',
        padding: 0, cursor: switching ? 'default' : 'pointer',
        fontSize: '9px', color: text, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
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
          <div style={{ padding: '10px 14px 6px', fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, borderBottom: `0.5px solid ${border}` }}>
            {list.length > 1 ? 'Switch company' : 'Company'}
          </div>
          {err && (
            <div style={{ padding: '8px 14px', fontSize: '10px', color: '#c0392b', background: dark ? 'rgba(192,57,43,0.12)' : '#fdecea', borderBottom: `0.5px solid ${border}`, lineHeight: 1.4 }}>
              {err}
            </div>
          )}
          {list.map((o, i) => {
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

          {canCreate && (
            <div style={{ borderTop: `0.5px solid ${border}` }}>
              {!adding ? (
                <button onClick={() => setAdding(true)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '11px 14px',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b7c99', fontWeight: 600,
                }}>
                  <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> Add a company
                </button>
              ) : (
                <div style={{ padding: '10px 14px' }}>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                    placeholder='Company name'
                    disabled={creating}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '7px 9px', fontSize: '12px', color: text, background: dark ? '#1a1a1a' : '#fff', border: `0.5px solid ${border}`, borderRadius: '4px', outline: 'none', marginBottom: '8px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleCreate} disabled={creating || !newName.trim()} style={{ flex: 1, padding: '7px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: creating ? 'default' : 'pointer', borderRadius: '4px', fontWeight: 600, opacity: (creating || !newName.trim()) ? 0.6 : 1 }}>
                      {creating ? 'Creating…' : 'Create'}
                    </button>
                    <button onClick={() => { setAdding(false); setNewName(''); setErr(null) }} disabled={creating} style={{ padding: '7px 10px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: subtle, cursor: 'pointer', borderRadius: '4px' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
