// Daily job: move owners whose free trial just expired WITHOUT paying into the
// Klaviyo "Winback" list.
//
// A never-paid org keeps its trial_ends_at (checkout/lifetime clear it to null),
// so "expired trial, never paid" = trial_ends_at in the past, not null, not
// lifetime. We only look at the last few days so each org is caught right after
// it lapses (moving to winback is idempotent, so a little overlap is harmless).
//
// Cancellations of PAID subscriptions are handled live by the Stripe webhook.

const { createClient } = require('@supabase/supabase-js')
const { syncStage } = require('./klaviyo-lib')

exports.handler = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  const windowStart = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString()

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id')
    .lt('trial_ends_at', nowIso)
    .gt('trial_ends_at', windowStart)
    .neq('is_lifetime', true)
    .is('deleted_at', null)

  if (error) {
    console.error('klaviyo-winback query error', error.message)
    return { statusCode: 500, body: 'query error' }
  }

  let moved = 0
  for (const org of orgs || []) {
    try {
      const { data: m } = await supabase.from('org_members').select('user_id').eq('org_id', org.id).eq('role', 'owner').maybeSingle()
      if (!m) continue
      const { data: p } = await supabase.from('profiles').select('email').eq('id', m.user_id).maybeSingle()
      let email = p?.email
      if (!email) { const { data: u } = await supabase.auth.admin.getUserById(m.user_id).catch(() => ({ data: null })); email = u?.user?.email }
      if (email) { await syncStage(email, 'winback'); moved++ }
    } catch (e) {
      console.error('klaviyo-winback org failed', org.id, e)
    }
  }

  console.log('klaviyo-winback moved', moved)
  return { statusCode: 200, body: `moved ${moved}` }
}
