const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  const { user_id, type, message, task_id, campaign_id } = JSON.parse(event.body)
  const { data: profile } = await supabase.from('profiles').select('email, email_notifications, full_name').eq('id', user_id).single()
  if (!profile || !profile.email_notifications) return { statusCode: 200, body: JSON.stringify({ skipped: true }) }
  const name = profile.full_name || profile.email

  // Deep-link the button straight to the task or campaign this notification is about.
  const base = 'https://h-que.com'
  let link = base
  let label = 'Open HQue'
  if (task_id) { link = `${base}/?task=${encodeURIComponent(task_id)}`; label = 'Open task' }
  else if (campaign_id) { link = `${base}/?campaign=${encodeURIComponent(campaign_id)}`; label = 'Open campaign' }

  // Escape user-supplied text before injecting into HTML, then turn
  // newlines into <br> so multi-line messages (e.g. a quoted comment or
  // a list of field changes) render cleanly.
  const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  const messageHtml = escapeHtml(message).replace(/\n/g, '<br>')
  const safeName = escapeHtml(name)

  const subject =
    type === 'assignment' ? "You've been assigned a task" :
    type === 'comment' ? 'New comment on a task you follow' :
    type === 'watching' ? "You're now watching a task" :
    type === 'update' ? 'A task you follow was updated' :
    'You were mentioned in a task'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.VITE_RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'HQue <noreply@h-que.com>',
      to: profile.email,
      subject,
      html: `<div style="font-family:Helvetica Neue,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;color:#1A1A1A;"><p style="font-size:16px;">Hi ${safeName},</p><p style="font-size:14px;color:#555;line-height:1.7;">${messageHtml}</p><a href="${link}" style="display:inline-block;margin-top:24px;padding:10px 24px;background:#5b7c99;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">${label}</a><p style="margin-top:32px;font-size:11px;color:#aaa;">You can turn off email notifications in your HQue profile settings.</p></div>`
    })
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('send-notification: Resend error', res.status, body)
  }
  return { statusCode: res.ok ? 200 : 500, body: JSON.stringify({ sent: res.ok }) }
}
