// Fires when a visitor submits a Product Updates / feature request. Does two
// things, both best-effort so a failure never affects the visitor's submission:
//   1. Drops an in-app bell notification for every master admin (platform_admins).
//   2. Emails the submission to support@h-que.com.
//
// The request row itself is already saved by the submit_feature_request RPC on
// the client; this only handles the alerts.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, VITE_RESEND_API_KEY.

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})
const RESEND_KEY = process.env.VITE_RESEND_API_KEY
const SUPPORT_TO = 'support@h-que.com'
const esc = (s) => String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  try {
    const { title, description, name, email, category, area, screenshotUrl } = JSON.parse(event.body || '{}')
    if (!title || !String(title).trim()) return { statusCode: 400, body: JSON.stringify({ error: 'title required' }) }
    const who = (name && name.trim()) || (email && email.trim()) || 'a visitor'

    // 1) In-app bell notifications for every master admin.
    try {
      const { data: admins } = await supabase.from('platform_admins').select('user_id')
      const ids = (admins || []).map(a => a.user_id).filter(Boolean)
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, org_id').in('id', ids)
        const message = `New Product Updates submission: "${String(title).trim()}" — from ${who}. Open Product Updates to review.`
        const rows = (profs || [])
          .filter(p => p.org_id)   // notifications require an org_id
          .map(p => ({ org_id: p.org_id, user_id: p.id, type: 'update', message }))
        if (rows.length) {
          const { error } = await supabase.from('notifications').insert(rows)
          if (error) console.error('notify-feature-request: notification insert error', error.message)
        }
      }
    } catch (e) { console.error('notify-feature-request: in-app notify failed', e) }

    // 2) Email the submission to support.
    if (RESEND_KEY) {
      const rows = [
        ['Idea', title],
        ['Details', description],
        ['Category', category],
        ['Area', area],
        ['From', name],
        ['Email', email],
      ].filter(([, v]) => v && String(v).trim())
      const rowsHtml = rows.map(([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#888;font-size:12px;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:6px 0;font-size:13px;color:#1a1a1a;">${esc(v).replace(/\n/g, '<br>')}</td></tr>`
      ).join('')
      const shot = screenshotUrl ? `<div style="margin-top:16px;"><a href="${esc(screenshotUrl)}" style="color:#5b7c99;font-size:12px;">View attached screenshot</a></div>` : ''
      const html = `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
        <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#5b7c99;margin-bottom:8px;">New Product Updates submission</div>
        <div style="font-family:Georgia,serif;font-size:20px;margin-bottom:20px;">${esc(title)}</div>
        <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
        ${shot}
        <div style="margin-top:24px;"><a href="https://h-que.com/updates" style="display:inline-block;background:#5b7c99;color:#fff;text-decoration:none;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;padding:11px 24px;border-radius:4px;">Open Product Updates</a></div>
      </div>`
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({ from: 'HQue <noreply@h-que.com>', to: SUPPORT_TO, subject: `New submission: ${String(title).trim()}`, html }),
      })
      if (!res.ok) console.error('notify-feature-request: Resend error', res.status, await res.text().catch(() => ''))
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e) {
    console.error('notify-feature-request error', e)
    // Never surface an error to the visitor — the submission already succeeded.
    return { statusCode: 200, body: JSON.stringify({ ok: false }) }
  }
}
