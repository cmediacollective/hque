import { useState, useEffect } from 'react'

// Turn a campaign name into a clean URL slug, e.g. "Summer Wellness!" → "summer-wellness".
function slugifyCampaign(name) {
  return ((name || 'campaign')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)) || 'campaign'
}
import { supabase } from './supabase'
import CampaignForm from './CampaignForm'
import BrandDetail from './BrandDetail'
import Linkify from './Linkify'
import { createNotification, parseMentions } from './notify'

const PAYMENT_METHODS = ['PayPal', 'Venmo', 'Wire Transfer', 'Check', 'ACH', 'Other']

const BRAND_COLORS = ['#5b7c99', '#7A9B8E', '#A67C52', '#9B7A9B', '#8E7A5B', '#4A6B7A', '#7A5B6B', '#6B7A4A']
const brandColor = (name) => {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length]
}
const brandInitial = (name) => (name || '?').trim().charAt(0).toUpperCase()
const ROLES = ['Post', 'Content Only', 'Host', 'Event', 'Gifting', 'UGC', 'Other']

function DocPreview({ url, label, onClose }) {
  const embedUrl = url.includes('drive.google.com')
    ? url.replace('/view', '/preview').split('?')[0]
    : url
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 600, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #2A2A2A', background: '#111', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', color: '#999', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href={url} target='_blank' rel='noreferrer' style={{ padding: '5px 12px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #3A3A3A', color: '#999', cursor: 'pointer', borderRadius: '1px', textDecoration: 'none' }}>Open in New Tab</a>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '24px', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      </div>
      <iframe src={embedUrl} style={{ flex: 1, border: 'none', background: '#fff' }} title={label} allow='autoplay' />
    </div>
  )
}

function TalentEditor({ link, onSave, onCancel, dark = true }) {
  // Follows the panel it's rendered inside — it used to be hardcoded dark, which
  // put a black form with black inputs in the middle of the light-mode panel.
  const editorBg = dark ? '#141414' : '#F5F3EF'
  const inputBg = dark ? '#1A1A1A' : '#FFFFFF'
  const editorBorder = dark ? '#3A3A3A' : '#CCC7BF'
  const editorText = dark ? '#F2EEE8' : '#1A1A1A'
  const label = dark ? '#666' : '#888'
  const idle = dark ? '#777' : '#666'

  const [form, setForm] = useState({
    payment_status: link.payment_status || 'Pending',
    payment_method: link.payment_method || '',
    payment_date: link.payment_date || '',
    role: link.role || '',
    views: link.views || '',
    likes: link.likes || '',
    reach: link.reach || '',
    performance_notes: link.performance_notes || ''
  })

  return (
    <div style={{ background: editorBg, border: `0.5px solid ${editorBorder}`, padding: '16px', marginTop: '1px' }}>

      <div style={{ fontSize: '7px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px' }}>Payment</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: label, marginBottom: '5px' }}>Status</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['Pending', 'Paid'].map(s => (
              <button key={s} onClick={() => setForm(f => ({ ...f, payment_status: s }))} style={{
                padding: '3px 10px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase',
                border: `0.5px solid ${form.payment_status === s ? '#5b7c99' : editorBorder}`,
                color: form.payment_status === s ? '#5b7c99' : idle,
                background: 'none', cursor: 'pointer', borderRadius: '1px'
              }}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: label, marginBottom: '5px' }}>Method</div>
          <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} style={{ width: '100%', background: inputBg, border: `0.5px solid ${editorBorder}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: editorText, outline: 'none' }}>
            <option value=''>Select...</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: label, marginBottom: '5px' }}>Date Paid</div>
          <input type='date' value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} style={{ width: '100%', background: inputBg, border: `0.5px solid ${editorBorder}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: editorText, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ fontSize: '7px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px' }}>Role & Performance</div>
      <div>
        <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: label, marginBottom: '5px' }}>Role</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
          {ROLES.map(r => (
            <button key={r} onClick={() => setForm(f => ({ ...f, role: f.role === r ? '' : r }))} style={{
              padding: '3px 10px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase',
              border: `0.5px solid ${form.role === r ? '#5b7c99' : editorBorder}`,
              color: form.role === r ? '#5b7c99' : idle,
              background: 'none', cursor: 'pointer', borderRadius: '1px'
            }}>{r}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {[['Views', 'views'], ['Likes', 'likes'], ['Reach', 'reach']].map(([lbl, key]) => (
          <div key={key}>
            <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: label, marginBottom: '5px' }}>{lbl}</div>
            <input type='number' value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder='0' style={{ width: '100%', background: inputBg, border: `0.5px solid ${editorBorder}`, borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: editorText, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: label, marginBottom: '5px' }}>Performance Notes</div>
        <textarea value={form.performance_notes} onChange={e => setForm(f => ({ ...f, performance_notes: e.target.value }))} placeholder='e.g. Strong engagement, comment section very positive...' style={{ width: '100%', background: inputBg, border: `0.5px solid ${editorBorder}`, borderRadius: '1px', padding: '8px', fontSize: '11px', color: editorText, outline: 'none', height: '70px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => onSave(form)} style={{ padding: '5px 14px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Save</button>
        <button onClick={onCancel} style={{ padding: '5px 14px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${editorBorder}`, color: idle, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function CampaignDetail({ campaign: initialCampaign, onClose, onSaved, dark = true, orgId, members = [], onBack, backToLabel }) {
  const [campaign, setCampaign] = useState(initialCampaign)
  const [editing, setEditing] = useState(false)
  const [creatorLinks, setCreatorLinks] = useState([])
  const [preview, setPreview] = useState(null)
  const [editingLink, setEditingLink] = useState(null)
  const [editingBrandId, setEditingBrandId] = useState(null)
  const [brandContact, setBrandContact] = useState(null)

  const [linkCopied, setLinkCopied] = useState(false)
  const [hoveredLink, setHoveredLink] = useState(null)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingBody, setEditingBody] = useState('')
  const [showCommentMentions, setShowCommentMentions] = useState(false)
  const [commentMentionQuery, setCommentMentionQuery] = useState('')
  const [commentError, setCommentError] = useState('')

  useEffect(() => { fetchCampaign(); fetchCreators(); fetchComments(); fetchCurrentUser() }, [initialCampaign.id])

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  async function fetchComments() {
    setLoadingComments(true)
    const { data } = await supabase
      .from('campaign_comments')
      .select('*')
      .eq('campaign_id', initialCampaign.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoadingComments(false)
  }

  async function postComment() {
    if (!newComment.trim()) return
    setPostingComment(true)
    setCommentError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setPostingComment(false); setCommentError('Not signed in.'); return }
    const body = newComment.trim()
    const { error } = await supabase.from('campaign_comments').insert([{
      campaign_id: initialCampaign.id,
      user_id: user.id,
      body
    }])
    setPostingComment(false)
    if (error) {
      const msg = error.message || ''
      const lower = msg.toLowerCase()
      const isMissingTable = lower.includes('campaign_comments') && (lower.includes('schema cache') || lower.includes('does not exist') || lower.includes('could not find') || error.code === '42P01' || error.code === 'PGRST205')
      if (isMissingTable) {
        setCommentError("The 'campaign_comments' table doesn't exist in Supabase yet. Open Supabase → SQL Editor → paste the SQL Claude sent → click Run. Then refresh and try again.")
      } else if (error.code === '42501' || lower.includes('row-level security') || lower.includes('policy')) {
        setCommentError(`Blocked by Supabase row-level-security. (${msg})`)
      } else {
        setCommentError(`Could not post: ${msg || 'unknown error'}`)
      }
      return
    }
    setNewComment('')
    fetchComments()
    if (orgId) {
      await parseMentions(body, orgId, `You were mentioned in a comment on campaign: ${campaign.name}`, members, null, campaign.id)
    }
  }

  async function saveCommentEdit(id) {
    if (!editingBody.trim()) return
    await supabase.from('campaign_comments').update({ body: editingBody.trim(), edited_at: new Date().toISOString() }).eq('id', id)
    setEditingCommentId(null)
    setEditingBody('')
    fetchComments()
  }

  async function deleteComment(id) {
    if (!confirm('Delete this comment?')) return
    await supabase.from('campaign_comments').delete().eq('id', id)
    fetchComments()
  }

  function timeAgo(iso) {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const s = Math.floor(diff / 1000)
    if (s < 60) return 'just now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d}d ago`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function fullTime(iso) {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const initialFromName = (n) => (n || '?').trim().charAt(0).toUpperCase()

  async function fetchCampaign() {
    const { data } = await supabase.from('campaigns').select('*').eq('id', initialCampaign.id).single()
    if (!data) return
    let merged = data
    if (data.brand_id) {
      const { data: b } = await supabase.from('brands').select('name, logo_url, website').eq('id', data.brand_id).maybeSingle()
      if (b) {
        merged = {
          ...data,
          brand: data.brand || b.name,
          brand_logo_url: data.brand_logo_url || b.logo_url,
          brand_website: data.brand_website || b.website
        }
      }
    }
    if (data.contact_id) {
      const { data: c } = await supabase.from('brand_contacts').select('name, title, email, phone').eq('id', data.contact_id).maybeSingle()
      setBrandContact(c || null)
    } else {
      setBrandContact(null)
    }
    setCampaign(merged)
  }

  async function fetchCreators() {
    const { data: links } = await supabase
      .from('campaign_creators')
      .select('id, creator_id, payment_status, payment_method, payment_date, role, views, likes, reach, performance_notes')
      .eq('campaign_id', campaign.id)

    if (!links || links.length === 0) return setCreatorLinks([])

    const ids = links.map(l => l.creator_id)
    const { data: creators } = await supabase
      .from('creators')
      .select('id, name, photo_url, handles')
      .in('id', ids)

    const merged = links.map(link => ({
      ...link,
      creator: creators?.find(c => c.id === link.creator_id)
    })).filter(l => l.creator)

    setCreatorLinks(merged)
  }

  async function saveLink(linkId, form) {
    await supabase.from('campaign_creators').update({
      payment_status: form.payment_status,
      payment_method: form.payment_method || null,
      payment_date: form.payment_date || null,
      role: form.role || null,
      views: form.views ? parseInt(form.views) : null,
      likes: form.likes ? parseInt(form.likes) : null,
      reach: form.reach ? parseInt(form.reach) : null,
      performance_notes: form.performance_notes || null
    }).eq('id', linkId)
    setEditingLink(null)
    fetchCreators()
  }

  const statusColor = (s) => s === 'Active' ? '#5b7c99' : s === 'Completed' ? '#5C9E52' : s === 'Pending Payment' ? '#C4962E' : s === 'Contract Pending' ? '#C4962E' : s === 'Dead' ? '#5A5A5A' : '#9a8f7e'
  const paymentColor = (s) => s === 'Paid' ? '#5C9E52' : '#C4962E'
  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const formatPaymentDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

  // Theme — follows the feed's mode. All panel colors come from here so light and
  // dark both read as intentional, not auto-generated.
  const t = dark ? {
    panel: '#1A1A1A', overlay: 'rgba(0,0,0,0.5)', border: 'rgba(255,255,255,0.10)', borderStrong: 'rgba(255,255,255,0.26)',
    text: '#EDEAE4', textMuted: 'rgba(255,255,255,0.56)', textFaint: 'rgba(255,255,255,0.38)', hover: 'rgba(255,255,255,0.045)'
  } : {
    panel: '#FFFFFF', overlay: 'rgba(0,0,0,0.32)', border: 'rgba(0,0,0,0.09)', borderStrong: 'rgba(0,0,0,0.28)',
    text: '#1A1A1A', textMuted: 'rgba(0,0,0,0.56)', textFaint: 'rgba(0,0,0,0.42)', hover: 'rgba(0,0,0,0.03)'
  }
  const accent = '#5b7c99'
  const ghostBtn = { padding: '5px 12px', fontSize: '11px', background: 'none', border: `1px solid ${t.border}`, color: t.textMuted, cursor: 'pointer', borderRadius: '3px', whiteSpace: 'nowrap' }

  // A fine rule with a small, low-opacity label — replaces the old shouty all-caps headers.
  const section = (label) => (
    <div style={{ marginTop: '32px', marginBottom: '14px', borderTop: `1px solid ${t.border}`, paddingTop: '15px' }}>
      {label && <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text, opacity: 0.4, fontWeight: 400 }}>{label}</div>}
    </div>
  )

  // Status as a 6px colored dot + plain text — no box, no border, no fill.
  const dotBadge = (color, label) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '11px', color: t.textMuted, fontWeight: 400 }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )

  // A breathing stat: big value, small muted label beneath. No box.
  const stat = (label, value) => (
    <div>
      <div style={{ fontSize: '19px', fontWeight: 500, color: t.text, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '10px', color: t.textFaint, marginTop: '4px', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )

  return (
    <>
      {editing && (
        <CampaignForm
          orgId={campaign.org_id}
          existing={campaign}
          dark={dark}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onSaved() }}
          onDeleted={() => { setEditing(false); if (onSaved) onSaved(); if (onClose) onClose() }}
        />
      )}

      {preview && <DocPreview url={preview.url} label={preview.label} onClose={() => setPreview(null)} />}

      {editingBrandId && (
        <BrandDetail
          brandId={editingBrandId}
          dark={dark}
          onClose={() => setEditingBrandId(null)}
          onSaved={() => fetchCampaign()}
        />
      )}

      <div style={{ position: 'fixed', inset: 0, background: t.overlay, zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ width: '580px', maxWidth: '92vw', background: t.panel, height: '100vh', overflowY: 'auto', borderLeft: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '32px 28px 22px', borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, background: t.panel, zIndex: 1 }}>
            {onBack && (
              <button onClick={onBack} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: '12px', padding: '0 0 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                ← Back{backToLabel ? ` to ${backToLabel}` : ''}
              </button>
            )}
            {/* Action toolbar on its own row so a long campaign name keeps full width */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginBottom: '22px' }}>
              <button onClick={async () => {
                const isArchived = !!campaign.archived
                const ok = confirm(isArchived ? `Restore "${campaign.name}" to active campaigns?` : `Archive "${campaign.name}"? You can restore it anytime. Any workspace tasks linked to this campaign will be removed.`)
                if (!ok) return
                const { error } = await supabase.from('campaigns').update({ archived: !isArchived }).eq('id', campaign.id)
                if (error) { alert('Could not update: ' + error.message); return }
                if (!isArchived) {
                  try { await supabase.from('tasks').delete().eq('campaign_id', campaign.id) } catch (_) {}
                }
                if (onSaved) onSaved()
                if (onClose) onClose()
              }} style={{ padding: '6px 10px', fontSize: '12px', background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer' }}>
                {campaign.archived ? 'Restore' : 'Archive'}
              </button>
              <button onClick={async () => {
                // Claim a clean name-based slug the first time this campaign is shared,
                // bumping -2, -3… on collisions. Fall back to the id link if it can't.
                let slug = campaign.slug
                if (!slug) {
                  const base = slugifyCampaign(campaign.name)
                  for (let i = 0; i < 50; i++) {
                    const candidate = i === 0 ? base : `${base}-${i + 1}`
                    const { error } = await supabase.from('campaigns').update({ slug: candidate }).eq('id', campaign.id)
                    if (!error) { slug = candidate; setCampaign(c => ({ ...c, slug: candidate })); break }
                    if (error.code !== '23505') break
                  }
                }
                const url = slug
                  ? `${window.location.origin}/campaign/${slug}`
                  : `${window.location.origin}${window.location.pathname}?campaign=${campaign.id}`
                try {
                  await navigator.clipboard.writeText(url)
                } catch (_) {
                  const ta = document.createElement('textarea')
                  ta.value = url; document.body.appendChild(ta); ta.select()
                  try { document.execCommand('copy') } catch (_) {}
                  document.body.removeChild(ta)
                }
                setLinkCopied(true)
                setTimeout(() => setLinkCopied(false), 1500)
              }} title="Copy shareable link" style={{ padding: '6px 10px', fontSize: '12px', background: 'none', border: 'none', color: linkCopied ? '#7A9B8E' : t.textMuted, cursor: 'pointer' }}>
                {linkCopied ? '✓ Copied' : 'Copy URL'}
              </button>
              <button onClick={() => setEditing(true)} style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 500, background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '3px', marginLeft: '8px' }}>Edit</button>
              <button onClick={onClose} title="Close" style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 0 0 10px' }}>×</button>
            </div>

            {/* Brand breadcrumb + title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              {campaign.brand_logo_url
                ? <img src={campaign.brand_logo_url} alt={campaign.brand} style={{ width: '52px', height: '52px', objectFit: 'contain', borderRadius: '6px', border: `1px solid ${t.border}`, background: '#fff', padding: '4px', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                : <div style={{ width: '52px', height: '52px', borderRadius: '6px', background: brandColor(campaign.brand || campaign.name || '?'), color: '#fff', fontFamily: 'Georgia, serif', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{brandInitial(campaign.brand || campaign.name || '?')}</div>
              }
              <div style={{ minWidth: 0, flex: 1, paddingTop: '1px' }}>
                <div style={{ fontSize: '11px', color: t.text, opacity: 0.5, marginBottom: '7px' }}>
                  {campaign.brand || 'Campaign'}
                  {campaign.brand_website && (<a href={campaign.brand_website.startsWith('http') ? campaign.brand_website : 'https://' + campaign.brand_website} target='_blank' rel='noreferrer' style={{ marginLeft: '10px', fontSize: '11px', color: t.textMuted, textDecoration: 'none', borderBottom: '1px solid transparent' }} onMouseEnter={e => e.currentTarget.style.borderBottomColor = t.borderStrong} onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}>↗ website</a>)}
                </div>
                <div style={{ fontSize: '23px', fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.2, color: t.text, marginBottom: '13px', textDecoration: campaign.archived ? 'line-through' : 'none', opacity: campaign.archived ? 0.6 : 1 }}>{campaign.name}</div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {dotBadge(statusColor(campaign.status), campaign.status)}
                  {campaign.campaign_type && dotBadge(accent, campaign.campaign_type)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '24px 28px 32px', flex: 1 }}>

            {/* Stats — a loose row, no boxes; empty values are omitted entirely */}
            {(campaign.budget || campaign.start_date || campaign.end_date) && (
              <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', marginTop: '4px' }}>
                {campaign.budget ? stat('Budget', `$${Number(campaign.budget).toLocaleString()}`) : null}
                {campaign.start_date ? stat('Start', formatDate(campaign.start_date)) : null}
                {campaign.end_date ? stat('End', formatDate(campaign.end_date)) : null}
              </div>
            )}

            {/* Contact — no card; clean text when present, a single muted line when not */}
            {campaign.brand_id && (
              <>
                {section('Contact')}
                {brandContact && (brandContact.name || brandContact.email || brandContact.phone) ? (
                  <div onClick={() => setEditingBrandId(campaign.brand_id)} style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', cursor: 'pointer', margin: '0 -8px', padding: '8px', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.background = t.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {brandContact.name && (
                      <div>
                        <div style={{ fontSize: '14px', color: t.text }}>{brandContact.name}</div>
                        {brandContact.title && <div style={{ fontSize: '11px', color: t.textFaint, marginTop: '2px' }}>{brandContact.title}</div>}
                      </div>
                    )}
                    {brandContact.email && <a href={`mailto:${brandContact.email}`} target='_blank' rel='noreferrer' onClick={e => e.stopPropagation()} style={{ fontSize: '12px', color: accent, textDecoration: 'none' }}>{brandContact.email}</a>}
                    {brandContact.phone && <a href={`tel:${brandContact.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: '12px', color: t.textMuted, textDecoration: 'none' }}>{brandContact.phone}</a>}
                  </div>
                ) : (
                  <div onClick={() => setEditingBrandId(campaign.brand_id)} style={{ fontSize: '12px', color: t.textFaint, fontStyle: 'italic', cursor: 'pointer' }}>No contact set — click to choose one.</div>
                )}
              </>
            )}

            {campaign.deliverables && (
              <>
                {section('Deliverables')}
                <div style={{ fontSize: '13px', color: t.textMuted, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{campaign.deliverables}</div>
              </>
            )}

            {campaign.deliverables_link && (
              <>
                {section('Deliverables Link')}
                <a href={campaign.deliverables_link} target='_blank' rel='noreferrer' style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: accent, textDecoration: 'none' }}>↗ View deliverables folder</a>
              </>
            )}

            {campaign.timeline && (
              <>
                {section('Key Milestones')}
                <div style={{ fontSize: '13px', color: t.textMuted, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{campaign.timeline}</div>
              </>
            )}

            {(campaign.brief_url || campaign.contract_url) && (
              <>
                {section('Documents')}
                <div>
                  {[['Campaign Brief', campaign.brief_url], ['Contract', campaign.contract_url]].filter(([, url]) => url).map(([label, url], i) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: i === 0 ? 'none' : `1px solid ${t.border}` }}>
                      <span style={{ fontSize: '13px', color: t.text }}>{label}</span>
                      <button onClick={() => setPreview({ url, label })} style={ghostBtn}>Preview</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {campaign.notes && (
              <>
                {section('Notes')}
                <div style={{ fontSize: '13px', color: t.textMuted, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}><Linkify text={campaign.notes} dark={dark} /></div>
              </>
            )}

            {creatorLinks.length > 0 && (
              <>
                {section(`Assigned Talent · ${creatorLinks.length}`)}
                <div>
                  {creatorLinks.map((link, i) => (
                    <div key={link.id}>
                      <div onMouseEnter={() => setHoveredLink(link.id)} onMouseLeave={() => setHoveredLink(null)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderTop: i === 0 ? 'none' : `1px solid ${t.border}` }}>
                        {link.creator.photo_url
                          ? <img src={link.creator.photo_url} alt={link.creator.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                          : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: t.hover, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '13px', color: t.text, flexShrink: 0 }}>{link.creator.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: t.text }}>{link.creator.name}</div>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {link.creator.handles?.instagram && <a href={`https://instagram.com/${link.creator.handles.instagram}`} target='_blank' rel='noreferrer' onClick={e => e.stopPropagation()} style={{ fontSize: '12px', color: t.textMuted, textDecoration: 'none' }}>@{link.creator.handles.instagram}</a>}
                            {link.role && <span style={{ fontSize: '11px', color: accent }}>{link.role}</span>}
                          </div>
                          {(link.views || link.likes || link.reach) && (
                            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                              {link.views && <span style={{ fontSize: '11px', color: t.textFaint }}>{link.views.toLocaleString()} views</span>}
                              {link.likes && <span style={{ fontSize: '11px', color: t.textFaint }}>{link.likes.toLocaleString()} likes</span>}
                              {link.reach && <span style={{ fontSize: '11px', color: t.textFaint }}>{link.reach.toLocaleString()} reach</span>}
                            </div>
                          )}
                          {link.performance_notes && (
                            <div style={{ fontSize: '11px', color: t.textFaint, marginTop: '5px', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}><Linkify text={link.performance_notes} dark={dark} /></div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                          {link.payment_status === 'Paid' && link.payment_date && (
                            <span style={{ fontSize: '11px', color: t.textFaint }}>{formatPaymentDate(link.payment_date)}</span>
                          )}
                          {dotBadge(paymentColor(link.payment_status), link.payment_status || 'Pending')}
                          <button
                            onClick={() => setEditingLink(editingLink === link.id ? null : link.id)}
                            style={{ ...ghostBtn, padding: '4px 10px', opacity: (hoveredLink === link.id || editingLink === link.id) ? 1 : 0, transition: 'opacity 0.15s ease' }}>
                            {editingLink === link.id ? 'Cancel' : 'Edit'}
                          </button>
                        </div>
                      </div>
                      {editingLink === link.id && (
                        <TalentEditor
                          link={link}
                          dark={dark}
                          onSave={(form) => saveLink(link.id, form)}
                          onCancel={() => setEditingLink(null)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ borderTop: `1px solid ${t.border}`, marginTop: '36px', paddingTop: '20px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.text, opacity: 0.4, fontWeight: 400, marginBottom: '18px' }}>Comments{comments.length > 0 ? ` · ${comments.length}` : ''}</div>

              {loadingComments && <div style={{ fontSize: '12px', color: t.textFaint, padding: '6px 0' }}>Loading…</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                {comments.map(c => {
                  const author = members.find(m => m.id === c.user_id)
                  const authorName = author?.full_name || author?.email || 'Unknown'
                  const isMine = c.user_id === currentUserId
                  const isEditing = editingCommentId === c.id
                  return (
                    <div key={c.id} style={{ display: 'flex', gap: '10px' }}>
                      {author?.avatar_url ? (
                        <img src={author.avatar_url} alt='' style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#5b7c99', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, flexShrink: 0 }}>{initialFromName(authorName)}</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', color: t.text, fontWeight: 500 }}>{authorName}</span>
                          <span title={fullTime(c.created_at)} style={{ fontSize: '11px', color: t.textFaint }}>{timeAgo(c.created_at)}{c.edited_at ? ' · edited' : ''}</span>
                          {isMine && !isEditing && (
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                              <button onClick={() => { setEditingCommentId(c.id); setEditingBody(c.body) }} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '11px', padding: 0 }}>Edit</button>
                              <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: '11px', padding: 0 }}>Delete</button>
                            </div>
                          )}
                        </div>
                        {isEditing ? (
                          <div>
                            <textarea value={editingBody} onChange={e => setEditingBody(e.target.value)} style={{ width: '100%', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '4px', padding: '8px 10px', fontSize: '13px', color: t.text, outline: 'none', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                              <button onClick={() => saveCommentEdit(c.id)} style={{ padding: '5px 14px', fontSize: '12px', fontWeight: 500, background: accent, border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '3px' }}>Save</button>
                              <button onClick={() => { setEditingCommentId(null); setEditingBody('') }} style={{ padding: '5px 14px', fontSize: '12px', background: 'none', border: `1px solid ${t.border}`, color: t.textMuted, cursor: 'pointer', borderRadius: '3px' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', color: t.text, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><Linkify text={c.body} dark={dark} /></div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '16px', position: 'relative' }}>
                <textarea
                  value={newComment}
                  onChange={e => {
                    const val = e.target.value
                    setNewComment(val)
                    const match = val.match(/(?:^|\s)@([\w.]*)$/)
                    if (match) { setShowCommentMentions(true); setCommentMentionQuery(match[1]) }
                    else { setShowCommentMentions(false); setCommentMentionQuery('') }
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment() }}
                  onFocus={e => e.target.style.borderColor = t.borderStrong}
                  onBlur={e => e.target.style.borderColor = t.border}
                  placeholder='Add a comment… (use @ to mention, ⌘+Enter to post)'
                  style={{ width: '100%', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', padding: '11px 13px', fontSize: '13px', color: t.text, outline: 'none', resize: 'vertical', minHeight: '72px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '10px', transition: 'border-color 0.15s ease' }}
                />
                {showCommentMentions && members.filter(m => (m.full_name || m.email).toLowerCase().includes(commentMentionQuery.toLowerCase())).length > 0 && (
                  <div style={{ position: 'absolute', bottom: '54px', left: 0, right: 0, background: t.panel, border: `1px solid ${t.border}`, borderRadius: '6px', zIndex: 30, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.28)' }}>
                    {members.filter(m => (m.full_name || m.email).toLowerCase().includes(commentMentionQuery.toLowerCase())).map(m => (
                      <div key={m.id}
                        onClick={() => {
                          const name = (m.full_name || m.email).split(' ')[0]
                          const val = newComment.replace(/@[\w.]*$/, `@${name} `)
                          setNewComment(val)
                          setShowCommentMentions(false)
                          setCommentMentionQuery('')
                        }}
                        style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = t.hover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt='' style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#7A9B8E', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>{initialFromName(m.full_name || m.email)}</span>
                        )}
                        <span style={{ fontSize: '13px', color: t.text }}>{m.full_name || m.email}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={postComment} disabled={postingComment || !newComment.trim()} style={{ padding: '8px 18px', fontSize: '12px', fontWeight: 500, background: newComment.trim() ? accent : 'transparent', border: newComment.trim() ? 'none' : `1px solid ${t.border}`, color: newComment.trim() ? '#fff' : t.textMuted, cursor: newComment.trim() ? 'pointer' : 'default', borderRadius: '3px', opacity: postingComment ? 0.6 : 1 }}>
                  {postingComment ? 'Posting…' : 'Comment'}
                </button>
                {commentError && (
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#e74c3c', lineHeight: 1.5, padding: '8px 10px', background: 'rgba(231, 76, 60, 0.08)', border: '1px solid rgba(231, 76, 60, 0.3)', borderRadius: '4px' }}>{commentError}</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
