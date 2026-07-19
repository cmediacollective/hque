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

  const fmt = (n) => {
    const v = parseInt(n) || 0
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
    return v ? v.toLocaleString() : null
  }
  const handles = creator.handles || {}
  const stats = [
    { label: 'Instagram', val: fmt(creator.ig_followers) },
    { label: 'TikTok', val: fmt(creator.tiktok_followers) },
    { label: 'YouTube', val: fmt(creator.yt_subscribers) },
  ].filter(s => s.val)
  const socials = [
    handles.instagram && { key: 'instagram', url: `https://instagram.com/${handles.instagram}` },
    handles.tiktok && { key: 'tiktok', url: `https://tiktok.com/@${handles.tiktok}` },
    handles.youtube && { key: 'youtube', url: `https://youtube.com/@${handles.youtube}` },
  ].filter(Boolean)
  const socialIcon = (key) => {
    if (key === 'instagram') return <svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8'><rect x='2' y='2' width='20' height='20' rx='5' /><circle cx='12' cy='12' r='4' /><circle cx='17.5' cy='6.5' r='1' fill='currentColor' stroke='none' /></svg>
    if (key === 'tiktok') return <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'><path d='M16.5 3c.3 2.3 1.7 3.9 4 4.2v2.7c-1.5.1-2.9-.3-4.2-1.1v6.4c0 3.4-2.5 5.8-5.8 5.8-3 0-5.4-2.2-5.4-5.2 0-3.2 2.6-5.4 6-5.1v2.8c-.5-.1-1-.2-1.5-.1-1.3.1-2.1 1-2 2.4.1 1.2 1 2 2.2 2 1.4 0 2.3-1 2.3-2.6V3h2.4Z' /></svg>
    return <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8'><rect x='2' y='5' width='20' height='14' rx='4' /><path d='M10 9l5 3-5 3V9Z' fill='currentColor' stroke='none' /></svg>
  }

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
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: creator.location ? '10px' : '20px' }}>{types}</div>
          )}

          {creator.location && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: muted, marginBottom: '20px' }}>
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' style={{ opacity: 0.8 }}><path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' /><circle cx='12' cy='10' r='3' /></svg>
              {creator.location}
            </div>
          )}

          {stats.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, borderTop: `0.5px solid ${border}`, borderBottom: `0.5px solid ${border}`, margin: '4px 0 22px' }}>
              {stats.map((s, i) => (
                <div key={s.label} style={{ padding: '15px 6px', borderLeft: i === 0 ? 'none' : `0.5px solid ${border}` }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '21px', fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
                  <div style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#A8A39B', marginTop: '5px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {socials.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
              {socials.map(s => (
                <a key={s.key} href={s.url} target='_blank' rel='noopener noreferrer' title={s.key} style={{ width: '40px', height: '40px', borderRadius: '50%', border: `0.5px solid ${border}`, color: '#4A4A46', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  {socialIcon(s.key)}
                </a>
              ))}
            </div>
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
