import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'



export default function SettingsView({ dark = true, user, orgId, onAgencyNameChange, onAvatarChange }) {
  const bg = dark ? '#1A1A1A' : '#F5F3EF'
  const card = dark ? '#222' : '#FFFFFF'
  const border = dark ? '#2A2A2A' : '#D4CFC8'
  const border2 = dark ? '#3A3A3A' : '#C4BFB8'
  const inputBg = dark ? '#141414' : '#F5F3EF'
  const text = dark ? '#F0ECE6' : '#1A1A1A'
  const muted = dark ? '#999' : '#666'
  const subtle = dark ? '#777' : '#888'

  const [activeTab, setActiveTab] = useState('profile')
  const [agencyForm, setAgencyForm] = useState({ agency_name: '', agency_email: '', agency_phone: '', agency_website: '', agency_logo_url: '' })
  const [senderAccounts, setSenderAccounts] = useState([])
  const [newSender, setNewSender] = useState({ label: '', email: '', gmail_index: '0' })
  const [agencySaving, setAgencySaving] = useState(false)
  const [agencySaved, setAgencySaved] = useState(false)

  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef(null)

  const [pwForm, setPwForm] = useState({ newPw: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [currentUserRole, setCurrentUserRole] = useState('member')

  useEffect(() => { fetchAgency(); fetchTeam(); fetchAvatar() }, [])

  async function fetchAvatar() {
    const { data } = await supabase.from('profiles').select('avatar_url, role').eq('id', user.id).single()
    if (data?.avatar_url) { setAvatarUrl(data.avatar_url); onAvatarChange?.(data.avatar_url) }
    if (data?.role) setCurrentUserRole(data.role)
  }

  async function fetchAgency() {
    const { data } = await supabase.from('org_settings').select('*').eq('org_id', orgId).single()
    if (data) {
      setAgencyForm({ agency_name: data.agency_name || '', agency_email: data.agency_email || '', agency_phone: data.agency_phone || '', agency_website: data.agency_website || '', agency_logo_url: data.agency_logo_url || '' })
      setSenderAccounts(data.sender_accounts || [])
    }
  }

  async function fetchTeam() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
    setTeamMembers(data || [])
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return setUploadMsg('File must be under 5MB')
    setUploading(true)
    setUploadMsg('')
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { setUploading(false); return setUploadMsg('Upload failed: ' + uploadError.message) }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithBust = `${publicUrl}?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: urlWithBust }).eq('id', user.id)
    setAvatarUrl(urlWithBust)
    onAvatarChange?.(urlWithBust)
    setUploading(false)
    setUploadMsg('Photo updated!')
    setTimeout(() => setUploadMsg(''), 3000)
  }

  async function saveAgency() {
    setAgencySaving(true)
    const { data: existing } = await supabase.from('org_settings').select('id').eq('org_id', orgId).single()
    const payload = { ...agencyForm, sender_accounts: senderAccounts }
    if (existing) { await supabase.from('org_settings').update(payload).eq('org_id', orgId) }
    else { await supabase.from('org_settings').insert([{ ...payload, org_id: orgId }]) }
    if (agencyForm.agency_name) onAgencyNameChange?.(agencyForm.agency_name)
    setAgencySaving(false)
    setAgencySaved(true)
    setTimeout(() => setAgencySaved(false), 2000)
  }

  function addSender() {
    if (!newSender.email.trim() || !newSender.label.trim()) return
    setSenderAccounts(s => [...s, { ...newSender, gmail_index: parseInt(newSender.gmail_index) }])
    setNewSender({ label: '', email: '', gmail_index: '0' })
  }

  function removeSender(idx) { setSenderAccounts(s => s.filter((_, i) => i !== idx)) }

  async function changePassword() {
    setPwError('')
    setPwSuccess(false)
    if (!pwForm.newPw) return setPwError('Enter a new password')
    if (pwForm.newPw.length < 8) return setPwError('Password must be at least 8 characters')
    if (pwForm.newPw !== pwForm.confirm) return setPwError('Passwords do not match')
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    setPwSaving(false)
    if (error) return setPwError(error.message)
    setPwSuccess(true)
    setPwForm({ newPw: '', confirm: '' })
    setTimeout(() => setPwSuccess(false), 3000)
  }

  async function inviteUser() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg('')
    const { error } = await supabase.auth.signInWithOtp({ email: inviteEmail, options: { shouldCreateUser: true } })
    setInviting(false)
    if (error) return setInviteMsg(`Error: ${error.message}`)
    setInviteMsg(`Invite sent to ${inviteEmail}`)
    setInviteEmail('')
    setTimeout(() => setInviteMsg(''), 4000)
  }

  async function updateRole(id, role) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    fetchTeam()
  }

  const roleColor = (r) => r === 'owner' ? '#5b7c99' : r === 'admin' ? '#888' : '#666'

  const field = (label, children) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: subtle, marginBottom: '6px' }}>{label}</div>
      {children}
    </div>
  )

  const inp = (props) => (
    <input {...props} style={{ width: '100%', background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box' }} />
  )

  const sectionTitle = (t) => (
    <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '20px' }}>{t}</div>
  )

  const sectionDivider = (t) => (
    <div style={{ fontSize: '7px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#5b7c99', margin: '24px 0 14px' }}>{t}</div>
  )

  const tabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'agency', label: 'Agency Info' },
    { key: 'team', label: 'Team' },
    { key: 'password', label: 'Password' },
    { key: 'billing', label: 'Billing' }
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: bg, display: 'flex' }}>

      <div style={{ width: '180px', borderRight: `0.5px solid ${border}`, padding: '24px 0', flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            width: '100%', textAlign: 'left', padding: '9px 20px',
            fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
            background: 'none', border: 'none',
            borderLeft: activeTab === t.key ? '1.5px solid #5b7c99' : '1.5px solid transparent',
            color: activeTab === t.key ? text : muted, cursor: 'pointer',
            fontWeight: activeTab === t.key ? '500' : '400'
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '32px 40px', maxWidth: '600px' }}>

        {activeTab === 'profile' && (
          <div>
            {sectionTitle('Profile')}
            <div style={{ padding: '28px', background: card, border: `0.5px solid ${border}`, borderRadius: '1px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt='avatar' style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `0.5px solid ${border2}`, flexShrink: 0 }} />
                  : <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#5b7c99', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#fff', fontFamily: 'Georgia, serif', flexShrink: 0 }}>
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                }
                <div>
                  <div style={{ fontSize: '14px', color: text, marginBottom: '4px' }}>{user?.email}</div>
                  <div style={{ fontSize: '10px', color: roleColor(currentUserRole), letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>{currentUserRole}</div>
                  <input ref={fileRef} type='file' accept='image/*' onChange={uploadAvatar} style={{ display: 'none' }} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: uploading ? 0.7 : 1 }}>
                    {uploading ? 'Uploading...' : avatarUrl ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {uploadMsg && <div style={{ fontSize: '11px', color: uploadMsg.startsWith('Upload failed') ? '#e74c3c' : '#5C9E52', marginTop: '8px' }}>{uploadMsg}</div>}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: subtle, lineHeight: 1.6 }}>JPG, PNG or GIF. Max 5MB. Your photo appears in the sidebar and team list.</div>
            </div>
          </div>
        )}

        {activeTab === 'agency' && (
          <div>
            {sectionTitle('Agency Info')}
            {field('Agency Name', inp({ value: agencyForm.agency_name, onChange: e => setAgencyForm(f => ({ ...f, agency_name: e.target.value })), placeholder: 'e.g. cMedia Collective' }))}
            {field('Email', inp({ value: agencyForm.agency_email, onChange: e => setAgencyForm(f => ({ ...f, agency_email: e.target.value })), placeholder: 'hello@agency.com', type: 'email' }))}
            {field('Phone', inp({ value: agencyForm.agency_phone, onChange: e => setAgencyForm(f => ({ ...f, agency_phone: e.target.value })), placeholder: '+1 (000) 000-0000' }))}
            {field('Website', inp({ value: agencyForm.agency_website, onChange: e => setAgencyForm(f => ({ ...f, agency_website: e.target.value })), placeholder: 'https://yoursite.com' }))}
            {field('Logo URL', inp({ value: agencyForm.agency_logo_url, onChange: e => setAgencyForm(f => ({ ...f, agency_logo_url: e.target.value })), placeholder: 'https://...' }))}
            {agencyForm.agency_logo_url && (
              <div style={{ marginTop: '-8px', marginBottom: '16px' }}>
                <img src={agencyForm.agency_logo_url} alt='logo preview' style={{ height: '40px', objectFit: 'contain', border: `0.5px solid ${border}` }} onError={e => e.target.style.display = 'none'} />
              </div>
            )}

            {sectionDivider('Sender Email Accounts')}
            <div style={{ fontSize: '11px', color: subtle, marginBottom: '14px', lineHeight: 1.6 }}>
              Add the Gmail accounts you send outreach from. The Gmail Index is which account slot it's in — check by going to mail.google.com and switching accounts. First account = 0, second = 1, etc.
            </div>

            {senderAccounts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: border, borderRadius: '1px', overflow: 'hidden', marginBottom: '12px' }}>
                {senderAccounts.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: card }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', color: text }}>{s.label}</div>
                      <div style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>{s.email} · Gmail account #{s.gmail_index}</div>
                    </div>
                    <button onClick={() => removeSender(i)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '8px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '5px' }}>Label</div>
                <input value={newSender.label} onChange={e => setNewSender(s => ({ ...s, label: e.target.value }))} placeholder='e.g. cMedia' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '5px' }}>Gmail Address</div>
                <input value={newSender.email} onChange={e => setNewSender(s => ({ ...s, email: e.target.value }))} placeholder='you@gmail.com' type='email' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '5px' }}>Index</div>
                <input value={newSender.gmail_index} onChange={e => setNewSender(s => ({ ...s, gmail_index: e.target.value }))} placeholder='0' type='number' min='0' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '8px 10px', fontSize: '12px', color: text, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <button onClick={addSender} style={{ padding: '7px 14px', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${border2}`, color: muted, cursor: 'pointer', borderRadius: '1px', marginBottom: '24px' }}>+ Add Account</button>
            <button onClick={saveAgency} disabled={agencySaving} style={{ padding: '9px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: agencySaved ? '#5C9E52' : '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: agencySaving ? 0.7 : 1, display: 'block' }}>
              {agencySaved ? 'Saved!' : agencySaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {activeTab === 'team' && (
          <div>
            {sectionTitle('Team')}
            <div style={{ marginBottom: '20px', padding: '20px', background: card, border: `0.5px solid ${border}`, borderRadius: '1px' }}>
              <div style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: subtle, marginBottom: '12px' }}>Invite a team member</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && inviteUser()} placeholder='teammate@email.com' type='email' style={{ flex: 1, background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none' }} />
                <button onClick={inviteUser} disabled={inviting} style={{ padding: '9px 16px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: inviting ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
              {inviteMsg && <div style={{ fontSize: '11px', color: inviteMsg.startsWith('Error') ? '#e74c3c' : '#5C9E52', marginTop: '10px' }}>{inviteMsg}</div>}
              <div style={{ fontSize: '11px', color: subtle, marginTop: '10px', lineHeight: 1.6 }}>They'll receive a magic link to sign in. No password needed on their end.</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: border, borderRadius: '1px', overflow: 'hidden' }}>
              {teamMembers.map(member => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: card }}>
                  {member.avatar_url
                    ? <img src={member.avatar_url} alt={member.email} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: `0.5px solid ${border2}`, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                    : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: member.role === 'owner' ? '#5b7c99' : dark ? '#2A2A2A' : '#E0DCD6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#fff', fontFamily: 'Georgia, serif', flexShrink: 0 }}>
                        {member.email?.charAt(0).toUpperCase()}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</div>
                    {member.id === user?.id && <div style={{ fontSize: '10px', color: subtle, marginTop: '2px' }}>You</div>}
                  </div>
                  {member.role === 'owner' ? (
                    <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5b7c99', border: '0.5px solid #5b7c99', padding: '3px 8px', borderRadius: '1px' }}>Owner</span>
                  ) : (
                    <select
                      value={member.role || 'member'}
                      onChange={e => updateRole(member.id, e.target.value)}
                      disabled={currentUserRole !== 'owner' && currentUserRole !== 'admin'}
                      style={{ background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '4px 8px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, outline: 'none', cursor: 'pointer' }}>
                      <option value='admin'>Admin</option>
                      <option value='member'>Member</option>
                    </select>
                  )}
                </div>
              ))}
              {teamMembers.length === 0 && <div style={{ padding: '20px', background: card, fontSize: '12px', color: subtle }}>No team members yet.</div>}
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div>
            {sectionTitle('Change Password')}
            <div style={{ padding: '24px', background: card, border: `0.5px solid ${border}`, borderRadius: '1px' }}>
              {field('New Password', <input type='password' value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} placeholder='Min 8 characters' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box' }} />)}
              {field('Confirm Password', <input type='password' value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder='Repeat new password' style={{ width: '100%', background: inputBg, border: `0.5px solid ${border2}`, borderRadius: '1px', padding: '9px 12px', fontSize: '13px', color: text, outline: 'none', boxSizing: 'border-box' }} />)}
              {pwError && <div style={{ fontSize: '11px', color: '#e74c3c', marginBottom: '12px' }}>{pwError}</div>}
              {pwSuccess && <div style={{ fontSize: '11px', color: '#5C9E52', marginBottom: '12px' }}>Password updated successfully.</div>}
              <button onClick={changePassword} disabled={pwSaving} style={{ padding: '9px 20px', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', background: '#5b7c99', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '1px', opacity: pwSaving ? 0.7 : 1 }}>
                {pwSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div>
            {sectionTitle('Billing')}
            <div style={{ padding: '32px', background: card, border: `0.5px solid ${border}`, borderRadius: '1px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💳</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: text, marginBottom: '8px' }}>Billing coming soon</div>
              <div style={{ fontSize: '12px', color: muted, lineHeight: 1.7, maxWidth: '320px', margin: '0 auto' }}>Stripe integration is on the roadmap. Once connected, you'll be able to manage your subscription and payment method here.</div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
