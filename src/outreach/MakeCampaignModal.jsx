import { useState } from 'react'
import { formatMoney } from './constants'
import { Modal, ModalTitle, Field } from './ui'
import { tokens, UI } from './theme'

// The deal is real: turn this pitch or lead into a campaign. Three choices
// (name, type, starting status); everything else comes from the pitch.

const TYPES = ['Paid', 'Non-paid', 'Gifting', 'Media']
const START_STATUSES = ['Contract Pending', 'Active']

function defaultName(pitch) {
  const what = (pitch.campaign || '').trim()
  return what ? `${pitch.brand} — ${what}` : `${pitch.brand} × ${pitch.client_name}`
}

function defaultType(pitch) {
  if (pitch.is_lead) return 'Paid'
  if (pitch.status === 'Offered gifting') return 'Gifting'
  if (pitch.type === 'Editorial / press' || pitch.type === 'Podcast') return 'Media'
  return 'Paid'
}

export default function MakeCampaignModal({ pitch, memberName, dark, onClose, onCreate }) {
  const t = tokens(dark)
  const [name, setName] = useState(() => defaultName(pitch))
  const [type, setType] = useState(() => defaultType(pitch))
  const [status, setStatus] = useState(START_STATUSES[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) { setError('Give the campaign a name.'); return }
    setSaving(true); setError('')
    try {
      await onCreate({ name, campaign_type: type, status })
    } catch (e) {
      setSaving(false)
      setError(e.message || 'Something went wrong.')
    }
  }

  const row = (label, value) => (
    <div style={{ display: 'flex', gap: 12, fontSize: 12.5, lineHeight: 1.6, fontFamily: UI }}>
      <span style={{ ...t.uppLbl, width: 78, flex: 'none', paddingTop: 3 }}>{label}</span>
      <span style={{ color: value ? t.body : t.mut2 }}>{value || '—'}</span>
    </div>
  )

  return (
    <Modal onClose={() => !saving && onClose()} label="Make it a campaign" dark={dark} width={520}>
      <ModalTitle eyebrow={`${pitch.brand} · for ${pitch.client_name}`} lead="Make it" accent="a campaign." dark={dark} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Campaign name" span dark={dark}>
          <input value={name} onChange={(e) => setName(e.target.value)} style={t.inputStyle} autoFocus />
        </Field>
        <Field label="Type" dark={dark}>
          <select value={type} onChange={(e) => setType(e.target.value)} style={t.inputStyle}>
            {TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Starts at" dark={dark}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={t.inputStyle}>
            {START_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
      </div>

      <div style={{ marginTop: 18, padding: '14px 16px', border: `1px solid ${t.hair}`, borderRadius: 1, background: t.bandBg, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ ...t.uppLbl, marginBottom: 6 }}>Carried across</div>
        {row('Brand', pitch.brand + (pitch.website ? ` · ${pitch.website}` : ''))}
        {row('Contact', [pitch.contact, pitch.contact_email].filter(Boolean).join(' · '))}
        {row('Talent', pitch.client_name)}
        {row('Pitched by', memberName(pitch.pitched_by))}
        {pitch.is_lead && row('Budget', formatMoney(pitch.amount))}
      </div>

      <div style={{ fontSize: 11.5, color: t.mut, marginTop: 12, lineHeight: 1.6, fontFamily: UI }}>
        The brand and contact are added to HQue if they aren’t there yet. This pitch is marked Success
        {pitch.is_lead ? ' and the lead Closed won' : ''}; the campaign links back here.
      </div>

      {error && <div style={{ fontSize: 11.5, color: t.copper, marginTop: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button type="button" onClick={handleCreate} disabled={saving} style={{ ...t.btnSolid, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Creating…' : 'Create campaign'}
        </button>
        <button type="button" onClick={onClose} disabled={saving} style={t.btnGhost}>Cancel</button>
      </div>
    </Modal>
  )
}
