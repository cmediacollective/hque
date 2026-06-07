const { createClient } = require('@supabase/supabase-js')

// Redeem an AppSumo lifetime code.
// Body: { code, orgId }
// - Verifies the code exists and is unused.
// - Claims it ATOMICALLY (UPDATE ... WHERE status='unused'), so the same code
//   can never be redeemed twice even under concurrent requests.
// - Upgrades the org to permanent lifetime Pro (no Stripe, no card).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch (e) {
    return json(400, { ok: false, reason: 'bad_request' })
  }

  const orgId = body.orgId
  const code = String(body.code || '').trim().toUpperCase()

  if (!code) return json(400, { ok: false, reason: 'invalid' })
  if (!orgId) return json(400, { ok: false, reason: 'no_org' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  // Atomic claim: only an 'unused' row can transition to 'redeemed'. The first
  // request to match wins; any second attempt finds no 'unused' row to update.
  const { data: claimed, error: claimErr } = await supabase
    .from('appsumo_codes')
    .update({ status: 'redeemed', redeemed_by: orgId, redeemed_at: new Date().toISOString() })
    .eq('code', code)
    .eq('status', 'unused')
    .select()

  if (claimErr) {
    console.error('appsumo claim error:', claimErr.message)
    return json(500, { ok: false, reason: 'server_error' })
  }

  // Nothing claimed → either the code doesn't exist, or it was already used.
  // Tell them apart so the page can show the right message.
  if (!claimed || claimed.length === 0) {
    const { data: existing } = await supabase
      .from('appsumo_codes')
      .select('status')
      .eq('code', code)
      .maybeSingle()
    if (existing && existing.status === 'redeemed') return json(409, { ok: false, reason: 'already_redeemed' })
    return json(404, { ok: false, reason: 'invalid' })
  }

  // Code is ours now — grant lifetime Pro. is_lifetime marks them so the Stripe
  // webhook never downgrades them; trial/past_due are cleared so no paywall.
  const { data: updatedOrg, error: orgErr } = await supabase
    .from('organizations')
    .update({
      stripe_plan: 'pro',
      is_lifetime: true,
      subscription_status: 'active',
      trial_ends_at: null,
      past_due_since: null
    })
    .eq('id', orgId)
    .select()

  if (orgErr || !updatedOrg || updatedOrg.length === 0) {
    // Upgrade failed (e.g. bad orgId) — release the code so it isn't burned.
    console.error('appsumo org upgrade failed, releasing code:', orgErr?.message)
    await supabase
      .from('appsumo_codes')
      .update({ status: 'unused', redeemed_by: null, redeemed_at: null })
      .eq('code', code)
    return json(500, { ok: false, reason: 'org_failed' })
  }

  return json(200, { ok: true })
}

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }
}
