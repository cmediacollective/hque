import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import CampaignForm from './CampaignForm'

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

export default function CampaignDetail({ campaign, onClose, onSaved, dark = true }) {
  const [editing, setEditing] = useState(false)
  const [creators, setCreators] = useState([])
  const [preview, setPreview] = useState(null)

  useEffect(() => { fetchCreators() }, [campaign.id])

  async function fetchCreators() {
    const { data } = await supabase
      .from('campaign_creators')
      .select('creator_id, creators(id, name, photo_url, handles)')
      .eq('campaign_id', campaign.id)
    setCreators((data || []).map(d => d.creators).filter(Boolean))
  }

  const statusColor = (s) => s === 'Active' ? '#5b7c99' : s === 'Completed' ? '#5C9E52' : '#888'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

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
              <div>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5b7c99', marginBottom: '6px' }}>{campaign.brand || 'Campaign'}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#F0ECE6', marginBottom: '12px' }}>{campaign.name}</div>
                <span style={{ padding: '3px 10px', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', border: `0.5px solid ${statusColor(campaign.status)}`, color: statusColor(campaign.status), borderRadius: '1px' }}>{campaign.status}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

            {creators.length > 0 && (
              <>
                {section(`Assigned Talent (${creators.length})`)}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#2A2A2A', borderRadius: '1px', overflow: 'hidden' }}>
                  {creators.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#1A1A1A' }}>
                      {c.photo_url
                        ? <img src={c.photo_url} alt={c.name} style={{ width: '36px', height: '36px', borderRadius: '2px', objectFit: 'cover', border: '0.5px solid #3A3A3A', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                        : <div style={{ width: '36px', height: '36px', borderRadius: '2px', background: '#2A2A2A', border: '0.5px solid #3A3A3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontSize: '12px', color: '#F2EEE8', flexShrink: 0 }}>{c.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                      }
                      <div>
                        <div style={{ fontSize: '13px', color: '#F0ECE6' }}>{c.name}</div>
                        {c.handles?.instagram && <div style={{ fontSize: '10px', color: '#777', marginTop: '2px' }}>@{c.handles.instagram}</div>}
                      </div>
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
