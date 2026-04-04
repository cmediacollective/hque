import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const NICHES = ['Wellness', 'Beauty', 'Lifestyle', 'Parenting', 'Fashion', 'Fitness', 'Food', 'Books', 'Travel', 'Tech', 'Gaming', 'Sports', 'Music', 'Comedy', 'Education', 'Business', 'Other']

export default function TalentInquiry() {
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', photo_url: '',
    instagram_handle: '', tiktok_handle: '', youtube_handle: '',
    niche: '', ig_followers: '', tiktok_followers: '', yt_subscribers: '',
    rate_feed: '', rate_reel: '', rate_story: '', rate_tiktok: '', rate_youtube: '',
    location: '', bio: '', hque_opted_in: true
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('agency')
    if (slug) fetchOrg(slug)
    else setLoading(false)
  }, [])

  async function fetchOrg(slug) {
    const { data } = await supabase.from('organizations').select('id, name').eq('slug', slug).single()
    setOrg(data || null)
    setLoading(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit() {
    if (!form.name.trim()) return setError('Please enter your name')
    if (!form.email.trim()) return setError('Please enter your email')
    if (!form.instagram_handle.trim()) return setError('Please enter your Instagram handle')
    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('talent_inquiries').insert([{
      org_id: org.id,
      name: form.name,
      email: form.email,
      photo_url: form.photo_url || null,
      instagram_handle: form.instagram_handle || null,
      tiktok_handle: form.tiktok_handle || null,
      youtube_handle: form.youtube_handle || null,
      niche: form.niche || null,
      ig_followers: form.ig_followers ? parseInt(form.ig_followers) : null,
      tiktok_followers: form.tiktok_followers ? parseInt(form.tiktok_followers) : null,
      yt_subscribers: form.yt_subscribers ? parseInt(form.yt_subscribers) : null,
      rates: {
        feed: form.rate_feed ? parseFloat(form.rate_feed) : null,
        reel: form.rate_reel ? parseFloat(form.rate_reel) : null,
        story: form.rate_story ? parseFloat(form.rate_story) : null,
        tiktok: form.rate_tiktok ? parseFloat(form.rate_tiktok) : null,
        youtube: form.rate_youtube ? parseFloat(form.rate_youtube) : null,
      },
      location: form.location || null,
      bio: form.bio || null,
      hque_opted_in: form.hque_opted_in,
      status: 'pending'
    }])

    setSaving(false)
    if (err) return setError('Something went wrong. Please try again.')
    setSubmitted(true)
  }

  const inp = (props) => (
    <input {...props} style={{ width: '100%', background: '#141414', border: '0.5px solid #2A2A2A', borderRadius: '1px', padding: '10px 12px', fontSize: '13px', color: '#F2EEE8', outline: 'none', boxSizing: 'border-box' }} />
  )

  const field = (label, required, children) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '6px' }}>{label}{required && <span style={{ color: '#5b7c99' }}> *</span>}</div>
      {children}
    </div>
  )

  const section = (title) => (
    <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#5b7c99', margin: '24px 0 16px', paddingBottom: '8px', borderBottom: '0.5px solid #2A2A2A' }}>{title}</div>
  )

  if (loading) return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.3em', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )

  if (!org) return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo.svg" alt="HQue" style={{ width: '140px', marginBottom: '32px', display: 'block', margin: '0 auto 32px' }} />
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#F0ECE6', marginBottom: '10px' }}>Agency not found</div>
        <div style={{ fontSize: '13px', color: '#666' }}>This inquiry link may be invalid or expired.</div>
        <div style={{ marginTop: '20px', fontSize: '11px', color: '#444' }}>Questions? <a href='mailto:support@hque.com' style={{ color: '#5b7c99' }}>support@hque.com</a></div>
      </div>
    </div>
  )

  if (submitted) return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '0 20px' }}>
        <img src="/logo.svg" alt="HQue" style={{ width: '140px', marginBottom: '40px', display: 'block', margin: '0 auto 40px' }} />
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>✓</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#F0ECE6', marginBottom: '12px' }}>Application received</div>
        <div style={{ fontSize: '14px', color: '#777', lineHeight: 1.8 }}>
          Thanks for applying to <span style={{ color: '#F0ECE6' }}>{org.name}</span>. We'll review your profile and be in touch if there's a fit.
        </div>
        <div style={{ marginTop: '32px', fontSize: '11px', color: '#444' }}>Powered by <a href='https://h-que.com' style={{ color: '#5b7c99', textDecoration: 'none' }}>HQue</a></div>
      </div>
    </div>
  )

  return (
    <div style={{ background: '#1A1A1A', minHeight: '100vh', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#F0ECE6' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '48px 24px' }}>

        <div style={{ marginBottom: '40px' }}>
          <img src="/logo.svg" alt="HQue" style={{ width: '120px', marginBottom: '32px', display: 'block' }} />
          <div style={{ fontSize: '8px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '8px' }}>{org.name}</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px', marginBottom: '10px' }}>Talent Application</div>
          <div style={{ fontSize: '13px', color: '#777', lineHeight: 1.7 }}>Fill out the form below to apply to join {org.name}'s talent roster. Fields marked with * are required.</div>
        </div>

        <div style={{ background: '#1E1E1E', border: '0.5px solid #2A2A2A', borderRadius: '2px', padding: '32px' }}>

          {section('Basic Info')}
          {field('Full Name', true, inp({ value: form.name, onChange: e => set('name', e.target.value), placeholder: 'Your full name' }))}
          {field('Email', true, inp({ value: form.email, onChange: e => set('email', e.target.value), placeholder: 'you@email.com', type: 'email' }))}
          {field('Profile Photo URL', false, inp({ value: form.photo_url, onChange: e => set('photo_url', e.target.value), placeholder: 'https://...' }))}
          {field('Location', false, inp({ value: form.location, onChange: e => set('location', e.target.value), placeholder: 'e.g. Los Angeles, CA' }))}

          {field('Primary Niche', false,
            <select value={form.niche} onChange={e => set('niche', e.target.value)} style={{ width: '100%', background: '#141414', border: '0.5px solid #2A2A2A', borderRadius: '1px', padding: '10px 12px', fontSize: '13px', color: form.niche ? '#F2EEE8' : '#555', outline: 'none' }}>
              <option value=''>Select a niche...</option>
              {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}

          {section('Social Platforms')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              {field('Instagram Handle', true, inp({ value: form.instagram_handle, onChange: e => set('instagram_handle', e.target.value), placeholder: '@yourhandle' }))}
            </div>
            <div>
              {field('IG Followers', false, inp({ value: form.ig_followers, onChange: e => set('ig_followers', e.target.value), placeholder: '10000', type: 'number' }))}
            </div>
            <div>
              {field('TikTok Handle', false, inp({ value: form.tiktok_handle, onChange: e => set('tiktok_handle', e.target.value), placeholder: '@yourhandle' }))}
            </div>
            <div>
              {field('TikTok Followers', false, inp({ value: form.tiktok_followers, onChange: e => set('tiktok_followers', e.target.value), placeholder: '10000', type: 'number' }))}
            </div>
            <div>
              {field('YouTube Channel', false, inp({ value: form.youtube_handle, onChange: e => set('youtube_handle', e.target.value), placeholder: 'Channel name or URL' }))}
            </div>
            <div>
              {field('YouTube Subscribers', false, inp({ value: form.yt_subscribers, onChange: e => set('yt_subscribers', e.target.value), placeholder: '10000', type: 'number' }))}
            </div>
          </div>

          {section('Rates (USD)')}
          <div style={{ fontSize: '11px', color: '#555', marginBottom: '14px', lineHeight: 1.6 }}>Enter your rates per deliverable. Leave blank if not applicable.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {field('IG Feed Post', false, inp({ value: form.rate_feed, onChange: e => set('rate_feed', e.target.value), placeholder: '500', type: 'number' }))}
            {field('IG Reel', false, inp({ value: form.rate_reel, onChange: e => set('rate_reel', e.target.value), placeholder: '800', type: 'number' }))}
            {field('IG Story', false, inp({ value: form.rate_story, onChange: e => set('rate_story', e.target.value), placeholder: '200', type: 'number' }))}
            {field('TikTok Video', false, inp({ value: form.rate_tiktok, onChange: e => set('rate_tiktok', e.target.value), placeholder: '600', type: 'number' }))}
            {field('YouTube Integration', false, inp({ value: form.rate_youtube, onChange: e => set('rate_youtube', e.target.value), placeholder: '2000', type: 'number' }))}
          </div>

          {section('About You')}
          {field('Short Bio', false,
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} placeholder='Tell us a bit about yourself and your content...' style={{ width: '100%', background: '#141414', border: '0.5px solid #2A2A2A', borderRadius: '1px', padding: '10px 12px', fontSize: '13px', color: '#F2EEE8', outline: 'none', height: '100px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          )}

          <div style={{ padding: '16px', background: '#141414', border: '0.5px solid #2A2A2A', borderRadius: '1px', marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input type='checkbox' checked={form.hque_opted_in} onChange={e => set('hque_opted_in', e.target.checked)} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: '#999', lineHeight: 1.6 }}>
                I'd like to receive talent opportunities and updates from HQue. You can unsubscribe at any time.
              </div>
            </label>
          </div>

          {error && <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '16px' }}>{error}</div>}

          <button onClick={submit} disabled={saving} style={{ width: '100%', padding: '13px', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Submitting...' : 'Submit Application'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#444' }}>
            Questions? <a href='mailto:support@hque.com' style={{ color: '#5b7c99', textDecoration: 'none' }}>support@hque.com</a>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: '#333' }}>
          Powered by <a href='https://h-que.com' style={{ color: '#5b7c99', textDecoration: 'none' }}>HQue</a>
        </div>
      </div>
    </div>
  )
}
