import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import CampaignForm from './CampaignForm'

const PAYMENT_METHODS = ['PayPal', 'Venmo', 'Wire Transfer', 'Check', 'ACH', 'Other']
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

function TalentEditor({ link, onSave, onCancel }) {
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
    <div style={{ background: '#141414', border: '0.5px solid #3A3A3A', padding: '16px', marginTop: '1px' }}>

      <div style={{ fontSize: '7px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px' }}>Payment</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', marginBottom: '5px' }}>Status</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['Pending', 'Paid'].map(s => (
              <button key={s} onClick={() => setForm(f => ({ ...f, payment_status: s }))} style={{
                padding: '3px 10px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase',
                border: `0.5px solid ${form.payment_status === s ? '#5b7c99' : '#3A3A3A'}`,
                color: form.payment_status === s ? '#5b7c99' : '#777',
                background: 'none', cursor: 'pointer', borderRadius: '1px'
              }}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', marginBottom: '5px' }}>Method</div>
          <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} style={{ width: '100%', background: '#1A1A1A', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: '#F2EEE8', outline: 'none' }}>
            <option value=''>Select...</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', marginBottom: '5px' }}>Date Paid</div>
          <input type='date' value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} style={{ width: '100%', background: '#1A1A1A', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: '#F2EEE8', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ fontSize: '7px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '12px' }}>Role & Performance</div>
      <div>
        <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', marginBottom: '5px' }}>Role</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
          {ROLES.map(r => (
            <button key={r} onClick={() => setForm(f => ({ ...f, role: f.role === r ? '' : r }))} style={{
              padding: '3px 10px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase',
              border: `0.5px solid ${form.role === r ? '#5b7c99' : '#3A3A3A'}`,
              color: form.role === r ? '#5b7c99' : '#777',
              background: 'none', cursor: 'pointer', borderRadius: '1px'
            }}>{r}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {[['Views', 'views'], ['Likes', 'likes'], ['Reach', 'reach']].map(([lbl, key]) => (
          <div key={key}>
            <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', marginBottom: '5px' }}>{lbl}</div>
            <input type='number' value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder='0' style={{ width: '100%', background: '#1A1A1A', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '5px 8px', fontSize: '11px', color: '#F2EEE8', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', marginBottom: '5px' }}>Performance Notes</div>
        <textarea value={form.performance_notes} onChange={e => setForm(f => ({ ...f, performance_notes: e.target.value }))} placeholder='e.g. Strong engagement, comment section very positive...' style={{ width: '100%', background: '#1A1A1A', border: '0.5px solid #3A3A3A', borderRadius: '1px', padding: '8px', fontSize: '11px', color: '#F2EEE8', outline: 'none', height: '70px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => onSave(form)} style={{ padding: '5px 14px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Save</button>
        <button onClick={onCancel} style={{ padding: '5px 14px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #3A3A3A', color: '#777', cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function CampaignDetail({ campaign: initialCampaign, onClose, onSaved, dark = true }) {
  const [campaign, setCampaign] = useState(initialCampaign)
  const [editing, setEditing] = useState(false)
  const [creatorLinks, setCreatorLinks] = useState([])
  const [preview, setPreview] = useState(null)
  const [editingLink, setEditingLink] = useState(null)

  useEffect(() => { fetchCampaign(); fetchCreators() }, [initialCampaign.id])

  async function fetchCampaign() {
    const { data } = await supabase.from('campaigns').select('*').eq('id', initialCampaign.id).single()
    if (data) setCampaign(data)
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

  const statusColor = (s) => s === 'Active' ? '#5b7c99' : s === 'Completed' ? '#5C9E52' : '#888'
  const paymentColor = (s) => s === 'Paid' ? '#5C9E52' : '#888'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const formatPaymentDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

  const section = (label) => (
    <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px', marginTop: '28px' }}>{label}</div>
  )

  return (
    <>
      {editing && (
        <CampaignForm
          existing={campaign}
          dark={dark}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onSaved() }}
        />
      )}

      {preview && <DocPreview url={preview.url} label={preview.label} onClose={() => setPreview(null)} />}

      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ width: '580px', background: '#1A1A1A', height: '100vh', overflowY: 'auto', borderLeft: '0.5px solid #2A2A2A', display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #2A2A2A', position: 'sticky', top: 0, background: '#1A1A1A', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {campaign.brand_logo_url
                  ? <img src={campaign.brand_logo_url} alt={campaign.brand} style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '2px', border: '0.5px solid #3A3A3A', background: '#fff', padding: '4px', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ width: '56px', height: '56px', borderRadius: '2px', background: '#2A2A2A', border: '0.5px solid #3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🏷</div>
                }
                <div>
                  <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '4px' }}>{campaign.brand || 'Campaign'}{campaign.brand_website && (<a href={campaign.brand_website.startsWith('http') ? campaign.brand_website : 'https://' + campaign.brand_website} target='_blank' rel='noreferrer' style={{ marginLeft: '8px', fontSize: '10px', color: '#5b7c99', opacity: 0.7, textDecoration: 'none' }}>↗ Visit site</a>)}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F0ECE6', marginBottom: '10px' }}>{campaign.name}</div>
                  <span style={{ padding: '3px 10px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', border: `0.5px solid ${statusColor(campaign.status)}`, color: statusColor(campaign.status), borderRadius: '1px' }}>{campaign.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => setEditing(true)} style={{ padding: '6px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Edit</button>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
              </div>
            </div>
          </div>

          <div style={{ padding: '28px', flex: 1 }}>

            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                ['Budget', campaign.budget ? `$${Number(campaign.budget).toLocaleString()}` : null],
                ['Start', formatDate(campaign.start_date)],
                ['End', formatDate(campaign.end_date)]
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ flex: 1, padding: '14px', background: '#222', borderRadius: '1px' }}>
                  <div style={{ fontSize: '15px', color: '#F0ECE6', fontWeight: 500, marginBottom: '4px' }}>{val || '—'}</div>
                  <div style={{ fontSize: '8px', color: '#777', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{lbl}</div>
                </div>
              ))}
            </div>

            {campaign.deliverables && (
              <>
                {section('Deliverables')}
                <div style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.7, padding: '14px', background: '#222', borderRadius: '1px' }}>{campaign.deliverables}</div>
              </>
            )}

            {campaign.deliverables_link && (
              <>
                {section('Deliverables Link')}
                <a href={campaign.deliverables_link} target='_blank' rel='noreferrer' style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#222', border: '0.5px solid #2A2A2A', borderRadius: '1px', fontSize: '12px', color: '#5b7c99', textDecoration: 'none' }}>
                  <span>🔗</span> View Deliverables Folder
                </a>
              </>
            )}

            {campaign.timeline && (
              <>
                {section('Timeline')}
                <div style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.7, padding: '14px', background: '#222', borderRadius: '1px' }}>{campaign.timeline}</div>
              </>
            )}

            {(campaign.brief_url || campaign.contract_url) && (
              <>
                {section('Documents')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {campaign.brief_url && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#222', border: '0.5px solid #2A2A2A', borderRadius: '1px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>📄</span>
                        <span style={{ fontSize: '12px', color: '#CCC9C3' }}>Campaign Brief</span>
                      </div>
                      <button onClick={() => setPreview({ url: campaign.brief_url, label: 'Campaign Brief' })} style={{ padding: '5px 12px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #3A3A3A', color: '#5b7c99', cursor: 'pointer', borderRadius: '1px' }}>Preview</button>
                    </div>
                  )}
                  {campaign.contract_url && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#222', border: '0.5px solid #2A2A2A', borderRadius: '1px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>📋</span>
                        <span style={{ fontSize: '12px', color: '#CCC9C3' }}>Contract</span>
                      </div>
                      <button onClick={() => setPreview({ url: campaign.contract_url, label: 'Contract' })} style={{ padding: '5px 12px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #3A3A3A', color: '#5b7c99', cursor: 'pointer', borderRadius: '1px' }}>Preview</button>
                    </div>
                  )}
                </div>
              </>
            )}

            {campaign.notes && (
              <>
                {section('Notes')}
                <div style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.7, padding: '14px', background: '#222', borderRadius: '1px' }}>{campaign.notes}</div>
              </>
            )}

            {creatorLinks.length > 0 && (
              <>
                {section(`Assigned Talent (${creatorLinks.length})`)}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#2A2A2A', borderRadius: '1px', overflow: 'hidden' }}>
                  {creatorLinks.map(link => (
                    <div key={link.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#1A1A1A' }}>
                        {link.creator.photo_url
                          ? <img src={link.creator.photo_url} alt={link.creator.name} style={{ width: '36px', height: '36px', borderRadius: '2px', objectFit: 'cover', border: '0.5px solid #3A3A3A', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                          : <div style={{ width: '36px', height: '36px', borderRadius: '2px', background: '#2A2A2A', border: '0.5px solid #3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '12px', color: '#F2EEE8', flexShrink: 0 }}>{link.creator.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                        }
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', color: '#F0ECE6' }}>{link.creator.name}</div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                            {link.creator.handles?.instagram && <span style={{ fontSize: '10px', color: '#777' }}>@{link.creator.handles.instagram}</span>}
                            {link.role && <span style={{ fontSize: '9px', color: '#5b7c99', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{link.role}</span>}
                          </div>
                          {(link.views || link.likes || link.reach) && (
                            <div style={{ display: 'flex', gap: '12px', marginTop: '5px' }}>
                              {link.views && <span style={{ fontSize: '10px', color: '#777' }}>{link.views.toLocaleString()} views</span>}
                              {link.likes && <span style={{ fontSize: '10px', color: '#777' }}>{link.likes.toLocaleString()} likes</span>}
                              {link.reach && <span style={{ fontSize: '10px', color: '#777' }}>{link.reach.toLocaleString()} reach</span>}
                            </div>
                          )}
                          {link.performance_notes && (
                            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>{link.performance_notes}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {link.payment_status === 'Paid' && link.payment_date && (
                            <span style={{ fontSize: '9px', color: '#777' }}>{formatPaymentDate(link.payment_date)}</span>
                          )}
                          {link.payment_status === 'Paid' && link.payment_method && (
                            <span style={{ fontSize: '9px', color: '#777' }}>{link.payment_method}</span>
                          )}
                          <span style={{ padding: '2px 8px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${paymentColor(link.payment_status)}`, color: paymentColor(link.payment_status), borderRadius: '1px' }}>{link.payment_status || 'Pending'}</span>
                          <button
                            onClick={() => setEditingLink(editingLink === link.id ? null : link.id)}
                            style={{ padding: '2px 8px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'none', border: '0.5px solid #3A3A3A', color: '#666', cursor: 'pointer', borderRadius: '1px' }}>
                            {editingLink === link.id ? 'Cancel' : 'Edit'}
                          </button>
                        </div>
                      </div>
                      {editingLink === link.id && (
                        <TalentEditor
                          link={link}
                          onSave={(form) => saveLink(link.id, form)}
                          onCancel={() => setEditingLink(null)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
