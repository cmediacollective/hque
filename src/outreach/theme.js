// Theme tokens for the Outreach section. They follow the Contacts rolodex so
// the two sections read as one app in both themes. Kept apart from the
// components so fast refresh keeps working on ui.jsx.

export const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif"
export const UI = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export function tokens(dark) {
  const accent = '#5b7c99'
  return {
    accent,
    page: dark ? '#151515' : '#faf8f5',
    cardBg: dark ? '#1E1E1E' : '#ffffff',
    inputBg: dark ? '#141414' : '#ffffff',
    ink: dark ? '#F0ECE6' : '#1a1a1a',
    body: dark ? '#CFCAC2' : '#555',
    body2: dark ? '#B7B2AA' : '#666',
    mut: dark ? '#8C877F' : '#999',
    mut2: dark ? '#6F6A62' : '#aaa',
    hair: dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.10)',
    hair2: dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.12)',
    heavy: dark ? '#EDE9E2' : '#1a1a1a',
    tint: 'rgba(91,124,153,0.08)',
    tint2: 'rgba(91,124,153,0.15)',
    bandBg: dark ? '#191919' : '#faf8f5',
    copper: '#8a7068',
    // Small uppercase label.
    uppLbl: { fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: dark ? '#8C877F' : '#999', fontFamily: UI },
    btnGhost: { fontFamily: UI, fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', padding: '9px 15px', borderRadius: '1px', cursor: 'pointer', background: 'none', border: `1px solid ${dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)'}`, color: dark ? '#CFCAC2' : '#555' },
    btnSolid: { fontFamily: UI, fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', padding: '9px 15px', borderRadius: '1px', cursor: 'pointer', background: accent, border: `1px solid ${accent}`, color: '#fff', textDecoration: 'none', display: 'inline-block' },
    // Text-only action inside an expanded row.
    btnText: { background: 'transparent', border: 'none', padding: 0, fontFamily: UI, fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', cursor: 'pointer', color: accent },
    inputStyle: { width: '100%', background: dark ? '#141414' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.12)'}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: dark ? '#F0ECE6' : '#1a1a1a', outline: 'none', boxSizing: 'border-box', fontFamily: UI },
  }
}
