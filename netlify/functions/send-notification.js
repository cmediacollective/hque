const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  const { user_id, type, message } = JSON.parse(event.body)
  const { data: profile } = await supabase.from('profiles').select('email, email_notifications, full_name').eq('id', user_id).single()
  if (!profile || !profile.email_notifications) return { statusCode: 200, body: JSON.stringify({ skipped: true }) }
  const name = profile.full_name || profile.email
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.VITE_RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'HQue <support@hque.com>',
      to: profile.email,
      subject: type === 'assignment' ? "You've been assigned a task" : 'You were mentioned in a task',
      html: `<div style="font-family:Helvetica Neue,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;color:#1A1A1A;"><p style="font-size:16px;">Hi ${name},</p><p style="font-size:14px;color:#555;line-height:1.7;">${message}</p><a href="https://h-que.com" style="display:inline-block;margin-top:24px;padding:10px 24px;background:#5b7c99;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Open HQue</a><p style="margin-top:32px;font-size:11px;color:#aaa;">You can turn off email notifications in your HQue profile settings.</p></div>`
    })
  })
  return { statusCode: res.ok ? 200 : 500, body: JSON.stringify({ sent: res.ok }) }
}
