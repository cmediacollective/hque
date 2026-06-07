// Generate a batch of unique AppSumo lifetime codes, insert them into Supabase,
// and write a CSV you can hand to AppSumo.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_KEY=eyJ... \
//   node scripts/generate-appsumo-codes.js 100
//
// The number (100) is how many codes to make. Default is 50.
// SUPABASE_SERVICE_KEY must be the service-role key (Supabase → Settings → API).
// Run the migration (supabase/migrations/20260607_appsumo_redemption.sql) first.

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_KEY (service-role key).')
  process.exit(1)
}

const count = parseInt(process.argv[2], 10) || 50

// Unambiguous alphabet — no O/0, I/1, etc. so codes are easy to read & type.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function segment(len) {
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)]
  return out
}

function makeCode() {
  return `HQUE-${segment(4)}-${segment(4)}-${segment(4)}`
}

async function main() {
  // Generate unique codes (dedupe within this batch).
  const codes = new Set()
  while (codes.size < count) codes.add(makeCode())
  const list = [...codes]

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Insert. The table's primary key guarantees global uniqueness — if a code
  // ever collided with an existing one, the insert would error and we'd retry.
  const rows = list.map(code => ({ code }))
  const { error } = await supabase.from('appsumo_codes').insert(rows)
  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }

  // Write CSV.
  const stamp = new Date().toISOString().split('T')[0]
  const file = path.join(process.cwd(), `appsumo-codes-${stamp}-${count}.csv`)
  const csv = ['code', ...list].join('\n')
  fs.writeFileSync(file, csv)

  console.log(`✓ Generated and stored ${count} codes.`)
  console.log(`✓ CSV written to: ${file}`)
  console.log('  Hand this CSV to AppSumo. Each code unlocks lifetime Pro exactly once.')
}

main().catch(err => { console.error(err); process.exit(1) })
