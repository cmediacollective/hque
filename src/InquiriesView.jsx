import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function InquiriesView({ orgId, dark = true }) {
  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const card = dark ? '#1E1E1E' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#3A3A3A' : '#C4BFB8'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'

  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [processing, setProcessing] = useState(null)
  const [orgSlug, setOrgSlug] = useState('')
  const [orgName, setOrgName] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { fetchInquiries(); fetchOrg() }, [filter])

  async function fetchInquiries() {
    setLoading(true)
    const { data } = await supabase
      .from('talent_inquiries')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setInquiries(data || [])
    setLoading(false)
  }

  async function fetchOrg() {
    const { data } = await supabase.from('organizations').select('slug, name').eq('id', orgId).single()
    if (data) { setOrgSlug(data.slug); setOrgName(data.name) }
  }

  async function approve(inquiry) {
    setProcessing(inquiry.id)
    await supabase.from('creators').insert([{
      org_id: orgId,
      name: inquiry.name,
      contact_email: inquiry.email,
      photo_url: inquiry.photo_url,
      handles: {
        instagram: inquiry.instagram_handle,
        tiktok: inquiry.tiktok_handle,
        youtube: inquiry.youtube_handle
      },
      niches: inquiry.niche ? [inquiry.niche] : [],
      ig_followers: inquiry.ig_followers,
      tiktok_followers: inquiry.tiktok_followers,
      yt_subscribers: inquiry.yt_subscribers,
      rates: inquiry.rates,
      location: inquiry.location,
      notes: inquiry.bio,
      status: 'active',
      types: ['Influencer']
    }])

    await supabase.from('talent_inquiries').update({ status: 'approved' }).eq('id', inquiry.id)

    if (inquiry.email) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'HQue <noreply@h-que.com>',
          to: inquiry.email,
          subject: `You've been added to ${orgName}'s talent roster`,
          html: `
            <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#1A1A1A;color:#F0ECE6;">
              <img src="https://h-que.com/logo.svg" alt="HQue" width="120" style="display:block;margin-bottom:32px;" />
              <div style="font-family:Georgia,serif;font-size:22px;margin-bottom:16px;">You're on the roster 🎉</div>
              <div style="font-size:14px;color:#999;line-height:1.8;margin-bottom:24px;">
                Hi ${inquiry.name},<br/><br/>
                Great news — you've been added to <strong style="color:#F0ECE6;">${orgName}</strong>'s talent roster on HQue. 
                We'll be in touch when there's a campaign opportunity that fits your profile.
              </div>
              <div style="font-size:12px;color:#555;line-height:1.7;margin-top:32px;">
                If you have any questions, reply to this email or contact us at <a href="mailto:support@hque.com" style="color:#5b7c99;">support@hque.com</a>
              </div>
            </div>
          `
        })
      })
    }

    setProcessing(null)
    setSelected(null)
    fetchInquiries()
  }

  async function decline(inquiry) {
    setProcessing(inquiry.id)
    await supabase.from('talent_inquiries').update({ status: 'declined' }).eq('id', inquiry.id)
    setProcessing(null)
    setSelected(null)
    fetchInquiries()
  }

  const inquiryLink = `https://h-que.com/apply?agency=${orgSlug}`

  function copyLink() {
    navigator.clipboard.writeText(inquiryLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: bg }}>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ padding: '12px 28px', borderBottom: `0.5px solid ${border}`, background: bg, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {['pending', 'approved', 'declined'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 14px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
              border: `0.5px solid ${filter === f ? '#5b7c99' : border2}`,
              color: filter === f ? '#5b7c99' : muted,
              background: 'none', cursor: 'pointer', borderRadius: '1px'
            }}>{f}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: subtle }}>Your inquiry link:</span>
            <code style={{ fontSize: '10px', color: '#5b7c99', background: dark ? '#141414' : '#F0EDE8', padding: '3px 8px', borderRadius: '1px' }}>{inquiryLink}</code>
            <button onClick={copyLink} style={{ padding: '4px 12px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: copied ? '#5C9E52' : '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {loading && <div style={{ padding: '40px 28px', color: subtle, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading...</div>}

        {!loading && inquiries.length === 0 && (
          <div style={{ padding: '80px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: muted, marginBottom: '10px' }}>
              {filter === 'pending' ? 'No pending inquiries' : filter === 'approved' ? 'No approved talent yet' : 'No declined inquiries'}
            </div>
            {filter === 'pending' && (
              <div style={{ fontSize: '12px', color: subtle, lineHeight: 1.7 }}>
                Share your inquiry link with talent to start receiving applications.<br />
                <span style={{ color: '#5b7c99', cursor: 'pointer' }} onClick={copyLink}>Copy your link</span>
              </div>
            )}
          </div>
        )}

        {!loading && inquiries.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {inquiries.map(inq => (
              <div key={inq.id}
                onClick={() => setSelected(selected?.id === inq.id ? null : inq)}
                style={{ padding: '16px 28px', borderBottom: `0.5px solid ${border}`, cursor: 'pointer', background: selected?.id === inq.id ? (dark ? '#1E1E1E' : '#F0EDE8') : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {inq.photo_url
                    ? <img src={inq.photo_url} alt={inq.name} style={{ width: '44px', height: '44px', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                    : <div style={{ width: '44px', height: '44px', borderRadius: '2px', background: dark ? '#2A2A2A' : '#E0DCD6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '16px', color: text, flexShrink: 0 }}>
                        {inq.name?.charAt(0)}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: text }}>{inq.name}</div>
                      {inq.niche && <span style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5b7c99', border: '0.5px solid #5b7c99', padding: '1px 6px', borderRadius: '1px' }}>{inq.niche}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: muted }}>
                      {inq.instagram_handle && `@${inq.instagram_handle}`}
                      {inq.ig_followers && ` · ${Number(inq.ig_followers).toLocaleString()} followers`}
                      {inq.location && ` · ${inq.location}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '10px', color: subtle }}>{formatDate(inq.created_at)}</div>
                    {filter === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button onClick={e => { e.stopPropagation(); decline(inq) }} disabled={processing === inq.id} style={{ padding: '3px 10px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px' }}>Decline</button>
                        <button onClick={e => { e.stopPropagation(); approve(inq) }} disabled={processing === inq.id} style={{ padding: '3px 10px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: '#5C9E52', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
                          {processing === inq.id ? '...' : 'Approve'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {selected?.id === inq.id && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `0.5px solid ${border}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      {[
                        ['Email', inq.email],
                        ['Instagram', inq.instagram_handle ? `@${inq.instagram_handle}` : null],
                        ['TikTok', inq.tiktok_handle ? `@${inq.tiktok_handle}` : null],
                        ['YouTube', inq.youtube_handle],
                        ['IG Followers', inq.ig_followers?.toLocaleString()],
                        ['TikTok Followers', inq.tiktok_followers?.toLocaleString()],
                        ['YT Subscribers', inq.yt_subscribers?.toLocaleString()],
                        ['Location', inq.location],
                        ['HQue Opt-in', inq.hque_opted_in ? 'Yes' : 'No'],
                      ].filter(([, v]) => v).map(([label, value]) => (
                        <div key={label}>
                          <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: subtle, marginBottom: '3px' }}>{label}</div>
                          <div style={{ fontSize: '12px', color: text }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {inq.rates && Object.values(inq.rates).some(v => v) && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: subtle, marginBottom: '6px' }}>Rates</div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {inq.rates.feed && <span style={{ fontSize: '11px', color: '#5b7c99' }}>Feed: ${inq.rates.feed.toLocaleString()}</span>}
                          {inq.rates.reel && <span style={{ fontSize: '11px', color: '#5b7c99' }}>Reel: ${inq.rates.reel.toLocaleString()}</span>}
                          {inq.rates.story && <span style={{ fontSize: '11px', color: '#5b7c99' }}>Story: ${inq.rates.story.toLocaleString()}</span>}
                          {inq.rates.tiktok && <span style={{ fontSize: '11px', color: '#5b7c99' }}>TikTok: ${inq.rates.tiktok.toLocaleString()}</span>}
                          {inq.rates.youtube && <span style={{ fontSize: '11px', color: '#5b7c99' }}>YouTube: ${inq.rates.youtube.toLocaleString()}</span>}
                        </div>
                      </div>
                    )}

                    {inq.bio && (
                      <div>
                        <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: subtle, marginBottom: '6px' }}>Bio</div>
                        <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7 }}>{inq.bio}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
