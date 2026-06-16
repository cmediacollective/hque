import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Public, read-only "media kit" page for a single talent, reachable at
// /talent/<slug> with no login. It pulls ONLY the whitelisted public fields
// (photo, name, type, niches, bio) via the get_public_creator() database
// function, which itself only returns talent the agency has published.
export default function PublicTalentProfile({ slug }) {
  const [state, setState] = useState('loading') // loading | found | notfound
  const [creator, setCreator] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.rpc('get_public_creator', { p_slug: slug })
      if (cancelled) return
      const row = Array.isArray(data) ? data[0] : data
      if (error || !row) { setState('notfound'); return }
      setCreator(row)
      setState('found')
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  const bg = '#F8F7F3'
  const ink = '#1A1A1A'
  const muted = '#6B6B6B'
  const accent = '#5B7C99'
  const border = '#E0DCD4'

  const wrap = (children) => (
    <div style={{ minHeight: '100vh', background: bg, color: ink, fontFamily: '"Inter Tight", system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        {children}
      </div>
      <div style={{ textAlign: 'center', padding: '24px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A8A39B' }}>
        <a href='https://h-que.com' style={{ color: '#A8A39B', textDecoration: 'none' }}>Powered by HQue</a>
      </div>
    </div>
  )

  if (state === 'loading') {
    return wrap(<div style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: muted }}>Loading…</div>)
  }

  if (state === 'notfound') {
    return wrap(
      <div style={{ textAlign: 'center', maxWidth: '360px' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '26px', marginBottom: '10px' }}>Profile not available</div>
        <div style={{ fontSize: '13px', color: muted, lineHeight: 1.6 }}>This talent profile doesn&rsquo;t exist or isn&rsquo;t public. Please check the link with whoever shared it.</div>
      </div>
    )
  }

  const types = Array.isArray(creator.types) && creator.types.length ? creator.types.join(' · ') : (creator.type || '')
  const niches = Array.isArray(creator.niches) ? creator.niches : []
  const initials = creator.name?.split(' ').map(n => n[0]).join('').slice(0, 2)

  return wrap(
    <div style={{ width: '100%', maxWidth: '560px' }}>
      <div style={{ background: '#FFFFFF', border: `0.5px solid ${border}`, borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '44px 40px 36px', textAlign: 'center' }}>
          {creator.photo_url
            ? <img src={creator.photo_url} alt={creator.name} style={{ width: '128px', height: '128px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${border}`, display: 'block', margin: '0 auto 22px' }} onError={e => e.target.style.display = 'none'} />
            : <div style={{ width: '128px', height: '128px', borderRadius: '50%', background: '#ECEAE4', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '40px', color: muted, margin: '0 auto 22px' }}>{initials}</div>
          }

          <div style={{ fontFamily: 'Georgia, serif', fontSize: '32px', lineHeight: 1.1, marginBottom: '10px' }}>{creator.name}</div>

          {types && (
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '20px' }}>{types}</div>
          )}

          {niches.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: creator.bio ? '28px' : 0 }}>
              {niches.map(n => (
                <span key={n} style={{ padding: '4px 11px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, border: `0.5px solid ${border}`, borderRadius: '20px' }}>{n}</span>
              ))}
            </div>
          )}

          {creator.bio && (
            <div style={{ fontSize: '14px', lineHeight: 1.75, color: '#3A3A3A', textAlign: 'left', whiteSpace: 'pre-wrap', borderTop: `0.5px solid ${border}`, paddingTop: '26px', marginTop: niches.length ? '2px' : '6px' }}>{creator.bio}</div>
          )}
        </div>
      </div>
    </div>
  )
}
