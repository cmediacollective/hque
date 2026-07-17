// Sends a branded "you've been invited" email when someone invites a teammate
// to their company. Replaces the old bare magic-link email so the recipient
// sees WHO invited them, to WHICH company, and gets a one-click sign-in button.
//
// The invitation row itself is created client-side (SettingsView.inviteUser);
// this function only generates a sign-in link and sends the email.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (to mint the link), VITE_RESEND_API_KEY.

const { createClient } = require('@supabase/supabase-js')

const RESEND_KEY = process.env.VITE_RESEND_API_KEY
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

const SITE = 'https://h-que.com'
const esc = (s) => String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))

// One-click sign-in link that works for both existing and brand-new users:
// try a magic link (existing user) first, fall back to an invite link (new user).
async function buildSignInLink(email) {
  let r = await supabase.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: SITE } })
  if (r.error || !r.data?.properties?.action_link) {
    r = await supabase.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: SITE } })
  }
  return r.data?.properties?.action_link || SITE
}

function inviteHtml({ companyName, inviterName, role, link }) {
  const company = esc(companyName) || 'their company'
  const inviter = esc(inviterName) || 'A teammate'
  const roleLine = role ? `as ${esc(role)}` : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f4f1ec;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
      <div style="background:#5b7c99;border-radius:8px 8px 0 0;padding:20px 28px;">
        <img src="https://h-que.com/logo-email.png" alt="HQue" width="128" style="display:block;height:auto;border:0;" />
      </div>
      <div style="background:#ffffff;border:0.5px solid #e4ded6;border-top:none;border-radius:0 0 8px 8px;padding:30px 28px;">
        <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#5b7c99;margin-bottom:14px;">You're invited</div>
        <div style="font-family:Georgia,serif;font-size:24px;line-height:1.35;color:#1a1a1a;margin-bottom:18px;">
          ${inviter} invited you to<br><strong>${company}</strong> on HQue ${roleLine}
        </div>
        <div style="font-size:14px;line-height:1.65;color:#444;margin-bottom:26px;">
          HQue is the workspace ${company} uses to run campaigns, talent, and clients.
          Click below to sign in and join their team — no password needed. If you already
          have an HQue account, this simply adds ${company} to your account, and you can
          switch between companies any time from the top of the app.
        </div>
        <a href="${link}" style="display:inline-block;background:#5b7c99;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;padding:13px 30px;border-radius:4px;">Accept invitation</a>
        <div style="font-size:12px;color:#999;line-height:1.6;margin-top:26px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${link}" style="color:#5b7c99;word-break:break-all;">${link}</a>
        </div>
      </div>
      <div style="text-align:center;font-size:11px;color:#b0a99e;margin-top:18px;">
        Sent by HQue · <a href="${SITE}" style="color:#b0a99e;">h-que.com</a>
      </div>
    </div>
  </body></html>`
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  try {
    const { email, companyName, inviterName, role } = JSON.parse(event.body || '{}')
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'email required' }) }
    if (!RESEND_KEY) { console.error('send-invite: missing Resend API key'); return { statusCode: 500, body: JSON.stringify({ error: 'email not configured' }) } }

    const link = await buildSignInLink(email)
    const subject = `${inviterName || 'Someone'} invited you to ${companyName || 'their company'} on HQue`
    const html = inviteHtml({ companyName, inviterName, role, link })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({ from: 'HQue <noreply@h-que.com>', to: email, subject, html }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('send-invite: Resend error', res.status, body)
      return { statusCode: 502, body: JSON.stringify({ error: 'email failed' }) }
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e) {
    console.error('send-invite error', e)
    return { statusCode: 500, body: JSON.stringify({ error: 'error' }) }
  }
}
