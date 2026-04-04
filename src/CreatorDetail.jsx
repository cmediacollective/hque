import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import AddCreatorForm from './AddCreatorForm'

const METHODS = ['Email', 'Instagram DM', 'Phone', 'WhatsApp', 'Other']
const STATUSES = ['Contacted', 'Responded', 'Declined', 'Booked']


function OutreachForm({ creatorId, creatorEmail, campaigns, onSaved, onCancel, dark, orgId }) {
  const border = dark ? '#3A3A3A' : '#C4BFB8'
  const inputBg = dark ? '#141414' : '#F5F3EF'
  const text = dark ? '#F2EEE8' : '#1A1A1A'
  const subtle = dark ? '#777' : '#888'

  const [form, setForm] = useState({
    campaign_id: '',
    contacted_at: new Date().toISOString().split('T')[0],
    method: 'Email',
    status: 'Contacted',
    notes: ''
  })
  const [senderAccounts, setSenderAccounts] = useState([])
  const [selectedSender, setSelectedSender] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSenders() }, [])

  async function fetchSenders() {
    const { data } = await supabase.from('org_settings').select('sender_accounts').eq('org_id', orgId).single()
    const accounts = data?.sender_accounts || []
    setSenderAccounts(accounts)
    if (accounts.length) setSelectedSender(accounts[0])
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    await supabase.from('outreach_logs').insert([{
      creator_id: creatorId,
      campaign_id: form.campaign_id || null,
      contacted_at: form.contacted_at,
      method: form.method,
      status: form.status,
      notes: form.notes || null,
      org_id: orgId
    }])
    setSaving(false)
    onSaved()
  }

  function composeGmail() {
    const campaign = campaigns.find(c => c.id === form.campaign_id)
    const subject = campaign ? `Partnership Opportunity — ${campaign.name}` : 'Partnership Opportunity'
    const body = form.notes || ''
    const idx = selectedSender?.gmail_index ?? 0
    const to = creatorEmail || ''
    const url = `https://mail.google.com/mail/u/${idx}/#compose?to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(url, '_blank')
    save()
  }

  const inpStyle = { width: '100%', background: inputBg, border: `0.5px solid ${border}`, borderRadius: '1px', padding: '7px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ background: dark ? '#141414' : '#F8F6F2', border: `0.5px solid ${border}`, borderRadius: '1px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '5px' }}>Campaign</div>
          <select value={form.campaign_id} onChange={e => set('campaign_id', e.target.value)} style={inpStyle}>
            <option value=''>No campaign</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '5px' }}>Date</div>
          <input type='date' value={form.contacted_at} onChange={e => set('contacted_at', e.target.value)} style={inpStyle} />
        </div>
        <div>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '5px' }}>Method</div>
          <select value={form.method} onChange={e => set('method', e.target.value)} style={inpStyle}>
            {METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '5px' }}>Status</div>
          <select value={form.status} onChange={e => set('status', e.target.value)} style={inpStyle}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {form.method === 'Email' && senderAccounts.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '5px' }}>Send From</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {senderAccounts.map((a, i) => (
              <button key={i} onClick={() => setSelectedSender(a)} style={{
                padding: '5px 12px', fontSize: '10px',
                border: `0.5px solid ${selectedSender?.email === a.email ? '#5b7c99' : border}`,
                color: selectedSender?.email === a.email ? '#5b7c99' : subtle,
                background: 'none', cursor: 'pointer', borderRadius: '1px'
              }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{a.label}</div>
                <div style={{ fontSize: '10px', marginTop: '1px' }}>{a.email}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {form.method === 'Email' && senderAccounts.length === 0 && (
        <div style={{ fontSize: '11px', color: '#5b7c99', marginBottom: '10px', lineHeight: 1.6 }}>
          💡 Add sender accounts in Settings → Agency Info to enable Gmail compose.
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '5px' }}>Notes / Message Summary</div>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder='e.g. Pitched summer campaign, waiting to hear back...' style={{ ...inpStyle, height: '70px', resize: 'vertical', fontFamily: 'inherit' }} />
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        {form.method === 'Email' && senderAccounts.length > 0 && (
          <button onClick={composeGmail} style={{ padding: '6px 14px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>
            Open Gmail & Log
          </button>
        )}
        <button onClick={save} disabled={saving} style={{ padding: '6px 14px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', background: form.method === 'Email' && senderAccounts.length > 0 ? 'none' : '#5b7c99', border: `0.5px solid ${form.method === 'Email' && senderAccounts.length > 0 ? border : 'transparent'}`, color: form.method === 'Email' && senderAccounts.length > 0 ? subtle : '#fff', cursor: 'pointer', borderRadius: '1px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Log Only'}
        </button>
        <button onClick={onCancel} style={{ padding: '6px 14px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border}`, color: subtle, cursor: 'pointer', borderRadius: '1px' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function CreatorDetail({ creator, onClose, onSaved, onOpenCampaign, orgId }) {
  const [editing, setEditing] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [allCampaigns, setAllCampaigns] = useState([])
  const [outreachLogs, setOutreachLogs] = useState([])
  const [showOutreachForm, setShowOutreachForm] = useState(false)
  const [hoveredLog, setHoveredLog] = useState(null)
  const dark = true

  useEffect(() => { fetchCampaigns(); fetchAllCampaigns(); fetchOutreach() }, [creator.id])

  async function fetchCampaigns() {
    const { data: links } = await supabase
      .from('campaign_creators')
      .select('campaign_id, payment_status, payment_method, payment_date')
      .eq('creator_id', creator.id)
    if (!links || links.length === 0) return
    const ids = links.map(l => l.campaign_id)
    const { data: camps } = await supabase
      .from('campaigns')
      .select('id, name, brand, status, budget, start_date, end_date, deliverables, deliverables_link, timeline, brief_url, contract_url, notes, brand_logo_url')
      .in('id', ids)
    const merged = (camps || []).map(c => ({ ...c, ...links.find(l => l.campaign_id === c.id) }))
    setCampaigns(merged)
  }

  async function fetchAllCampaigns() {
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, brand')
      .eq('org_id', orgId)
      .eq('archived', false)
      .order('name')
    setAllCampaigns(data || [])
  }

  async function fetchOutreach() {
    const { data } = await supabase
      .from('outreach_logs')
      .select('*, campaigns(name, brand)')
      .eq('creator_id', creator.id)
      .order('contacted_at', { ascending: false })
    setOutreachLogs(data || [])
  }

  async function deleteOutreach(id) {
    await supabase.from('outreach_logs').delete().eq('id', id)
    fetchOutreach()
  }

  const statusColor = (s) => s === 'Active' ? '#5b7c99' : s === 'Completed' ? '#5C9E52' : '#888'
  const paymentColor = (s) => s === 'Paid' ? '#5C9E52' : '#888'
  const outreachStatusColor = (s) => {
    if (s === 'Booked') return '#5C9E52'
    if (s === 'Responded') return '#5b7c99'
    if (s === 'Declined') return '#c0392b'
    return '#888'
  }
  const formatPaymentDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  const displayType = (c) => {
    if (Array.isArray(c.types) && c.types.length) return c.types.join(' · ')
    return c.type || 'Influencer'
  }

  const row = (label, value, href) => value ? (
    <div style={{ display: 'flex', padding: '12px 0', borderBottom: '0.5px solid #2A2A2A' }}>
      <div style={{ width: '160px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#777', flexShrink: 0, paddingTop: '1px' }}>{label}</div>
      {href
        ? <a href={href} target='_blank' rel='noreferrer' style={{ fontSize: '13px', color: '#5b7c99', flex: 1, textDecoration: 'none', cursor: 'pointer' }} onMouseEnter={e => e.target.style.textDecoration = 'underline'} onMouseLeave={e => e.target.style.textDecoration = 'none'}>{value}</a>
        : <div style={{ fontSize: '13px', color: '#CCC9C3', flex: 1 }}>{value}</div>
      }
    </div>
  ) : null

  const stat = (label, value) => (
    <div style={{ flex: 1, padding: '14px', background: '#222', borderRadius: '1px' }}>
      <div style={{ fontSize: '18px', color: '#F0ECE6', fontWeight: 500, marginBottom: '4px' }}>{value || '—'}</div>
      <div style={{ fontSize: '8px', color: '#777', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )

  const rateRow = (label, value) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #2A2A2A' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#777' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#5b7c99', fontWeight: 500 }}>${value.toLocaleString()}</div>
    </div>
  ) : null

  const sectionHeader = (label, action) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666' }}>{label}</div>
      {action}
    </div>
  )

  return (
    <>
      {editing && (
        <AddCreatorForm
          existing={creator}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onSaved() }}
        />
      )}

      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ width: '560px', background: '#1A1A1A', height: '100vh', overflowY: 'auto', borderLeft: '0.5px solid #2A2A2A', display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '24px 28px', borderBottom: '0.5px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: '#1A1A1A', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {creator.photo_url
                ? <img src={creator.photo_url} alt={creator.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '0.5px solid #3A3A3A' }} onError={e => e.target.style.display = 'none'} />
                : <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#2A2A2A', border: '0.5px solid #3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F2EEE8', flexShrink: 0 }}>
                    {creator.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
              }
              <div>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '4px' }}>{displayType(creator)}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#F0ECE6', marginBottom: '2px' }}>{creator.name}</div>
                <div style={{ fontSize: '12px', color: '#777' }}>{creator.handles?.instagram ? `@${creator.handles.instagram}` : ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={() => setEditing(true)} style={{ padding: '6px 14px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px' }}>Edit</button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
          </div>

          <div style={{ padding: '28px', flex: 1 }}>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
              {stat('IG Followers', creator.ig_followers?.toLocaleString())}
              {stat('TikTok', creator.tiktok_followers?.toLocaleString())}
              {stat('YT Subs', creator.yt_subscribers?.toLocaleString())}
              {stat('Eng Rate', creator.engagement_rate ? `${creator.engagement_rate}%` : null)}
            </div>

            {Array.isArray(creator.niches) && creator.niches.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Niches</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {creator.niches.map(n => (
                    <span key={n} style={{ padding: '3px 10px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', border: '0.5px solid #3A3A3A', color: '#999', borderRadius: '1px' }}>{n}</span>
                  ))}
                </div>
              </div>
            )}

            {(creator.rates?.feed || creator.rates?.reel || creator.rates?.story || creator.rates?.tiktok || creator.rates?.youtube) && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Rates</div>
                {rateRow('IG Feed Post', creator.rates?.feed)}
                {rateRow('IG Story', creator.rates?.story)}
                {rateRow('IG Reel', creator.rates?.reel)}
                {rateRow('TikTok', creator.rates?.tiktok)}
                {rateRow('YouTube', creator.rates?.youtube)}
              </div>
            )}

            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Details</div>
              {row('Tier', creator.tier)}
              {row('Primary Platform', creator.primary_platform)}
              {row('Location', creator.location)}
              {creator.handles?.instagram && row('Instagram', `@${creator.handles.instagram}`, `https://instagram.com/${creator.handles.instagram}`)}
              {creator.handles?.tiktok && row('TikTok', `@${creator.handles.tiktok}`, `https://tiktok.com/@${creator.handles.tiktok}`)}
              {creator.handles?.youtube && row('YouTube', creator.handles.youtube, `https://youtube.com/${creator.handles.youtube}`)}
            </div>

            {(creator.contact_email || creator.manager_name || creator.manager_email) && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Contact</div>
                {row('Creator Email', creator.contact_email, `https://mail.google.com/mail/?view=cm&to=${creator.contact_email}`)}
                {row('Manager', creator.manager_name)}
                {row('Manager Email', creator.manager_email, `https://mail.google.com/mail/?view=cm&to=${creator.manager_email}`)}
              </div>
            )}

            {creator.notes && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Internal Notes</div>
                <div style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.7, padding: '14px', background: '#222', borderRadius: '1px' }}>{creator.notes}</div>
              </div>
            )}

            <div style={{ marginBottom: '28px' }}>
              {sectionHeader('Outreach Log',
                <button onClick={() => setShowOutreachForm(f => !f)} style={{ padding: '3px 10px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', background: showOutreachForm ? 'none' : '#5b7c99', border: `0.5px solid ${showOutreachForm ? '#3A3A3A' : 'none'}`, color: showOutreachForm ? '#777' : '#fff', cursor: 'pointer', borderRadius: '1px' }}>
                  {showOutreachForm ? 'Cancel' : '+ Log Outreach'}
                </button>
              )}

              {showOutreachForm && (
                <OutreachForm
                  creatorId={creator.id}
                  creatorEmail={creator.contact_email || creator.manager_email || ''}
                  campaigns={allCampaigns}
                  dark={dark}
                  orgId={orgId}
                  onSaved={() => { setShowOutreachForm(false); fetchOutreach() }}
                  onCancel={() => setShowOutreachForm(false)}
                />
              )}

              {outreachLogs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#2A2A2A', borderRadius: '1px', overflow: 'hidden' }}>
                  {outreachLogs.map(log => (
                    <div key={log.id}
                      style={{ background: hoveredLog === log.id ? '#222' : '#1A1A1A', padding: '12px 14px', position: 'relative' }}
                      onMouseEnter={() => setHoveredLog(log.id)}
                      onMouseLeave={() => setHoveredLog(null)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#CCC9C3' }}>{formatDate(log.contacted_at)}</span>
                          <span style={{ fontSize: '9px', color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{log.method}</span>
                          {log.campaigns && <span style={{ fontSize: '9px', color: '#5b7c99' }}>{log.campaigns.name}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{ padding: '2px 6px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', border: `0.5px solid ${outreachStatusColor(log.status)}`, color: outreachStatusColor(log.status), borderRadius: '1px' }}>{log.status}</span>
                          {hoveredLog === log.id && (
                            <button onClick={() => deleteOutreach(log.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px' }} title='Delete'>×</button>
                          )}
                        </div>
                      </div>
                      {log.notes && <div style={{ fontSize: '11px', color: '#777', lineHeight: 1.6 }}>{log.notes}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                !showOutreachForm && <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic' }}>No outreach logged yet.</div>
              )}
            </div>

            {campaigns.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>Campaigns</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#2A2A2A', borderRadius: '1px', overflow: 'hidden' }}>
                  {campaigns.map(c => (
                    <div key={c.id}
                      onClick={() => { onClose(); onOpenCampaign(c) }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#1A1A1A', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#222'}
                      onMouseLeave={e => e.currentTarget.style.background = '#1A1A1A'}>
                      <div>
                        <div style={{ fontSize: '13px', color: '#CCC9C3' }}>{c.name}</div>
                        {c.brand && <div style={{ fontSize: '10px', color: '#777', marginTop: '2px' }}>{c.brand}</div>}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '5px', alignItems: 'center' }}>
                          <span style={{ padding: '2px 6px', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', border: `0.5px solid ${paymentColor(c.payment_status)}`, color: paymentColor(c.payment_status), borderRadius: '1px' }}>{c.payment_status || 'Pending'}</span>
                          {c.payment_method && <span style={{ fontSize: '9px', color: '#666' }}>{c.payment_method}</span>}
                          {c.payment_date && <span style={{ fontSize: '9px', color: '#666' }}>{formatPaymentDate(c.payment_date)}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ padding: '2px 8px', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', border: `0.5px solid ${statusColor(c.status)}`, color: statusColor(c.status), borderRadius: '1px', flexShrink: 0 }}>{c.status}</span>
                        <span style={{ fontSize: '16px', color: '#444' }}>›</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
