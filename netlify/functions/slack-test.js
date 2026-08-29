// Sends a test message to a company's connected Slack channel.
//
// This lives on the server because the browser can never see the webhook URL —
// org_integrations is locked away behind RLS with no policies. The caller
// proves who they are with their Supabase access token, and we re-check here
// that they're an owner or admin of the org they're asking about rather than
// trusting the org_id in the request body.
const { createClient } = require('@supabase/supabase-js')
const { getSlackConfig, postSlack } = require('./slack-lib')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  try {
    const { access_token, org_id } = JSON.parse(event.body || '{}')
    if (!access_token || !org_id) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing details' }) }

    const { data: auth } = await supabase.auth.getUser(access_token)
    const uid = auth && auth.user && auth.user.id
    if (!uid) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Not signed in' }) }

    const { data: membership } = await supabase
      .from('org_members').select('role').eq('org_id', org_id).eq('user_id', uid).maybeSingle()
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'Only an owner or admin can do that' }) }
    }

    const cfg = await getSlackConfig(supabase, org_id)
    if (!cfg) return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Slack is not connected, or is switched off' }) }

    const ok = await postSlack(cfg.webhook_url,
      ':wave: *HQue is connected.* Task assignments and overdue tasks will show up here.\n<https://h-que.com|Open HQue →>')

    return {
      statusCode: 200,
      body: JSON.stringify(ok ? { ok: true } : { ok: false, error: 'Slack rejected the message — check the webhook URL is still valid.' })
    }
  } catch (e) {
    console.error('slack-test: exception', e)
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Something went wrong sending the test.' }) }
  }
}
