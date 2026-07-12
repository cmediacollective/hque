const { createClient } = require('@supabase/supabase-js')

// Nightly: permanently wipe accounts whose 30-day grace period has run out.
//
// All the destructive work happens inside purge_expired_accounts() in the
// database, so it's one transaction per account and the ordering lives next to
// the schema it depends on. This function only triggers it on a schedule (see
// netlify.toml) using the service key — the RPC is not callable by app users.
//
// An account only becomes eligible when its owner closed it AND 30 days passed
// without anyone restoring it.
exports.handler = async () => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.log('[purge-accounts] missing SUPABASE_URL / SUPABASE_SERVICE_KEY — skipping.')
    return { statusCode: 200, body: 'skipped' }
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data, error } = await supabase.rpc('purge_expired_accounts')
  if (error) {
    console.log('[purge-accounts] failed:', error.message)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  const purged = data?.purged || 0
  if (purged > 0) console.log(`[purge-accounts] permanently deleted ${purged} account(s): ${(data.names || []).join(' | ')}`)
  else console.log('[purge-accounts] nothing due for deletion.')

  return { statusCode: 200, body: JSON.stringify(data) }
}
