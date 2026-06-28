// Auto-sync shipped roadmap items into the product_updates table on every deploy.
//
// Source of truth: roadmap-updates.json (repo root). To announce a shipped
// feature, add an entry there — on the next deploy it's posted to the public
// Product Updates roadmap automatically. No manual admin step needed.
//
// Safety: idempotent (only inserts titles that don't already exist), never
// updates or deletes existing rows, and never fails the build (always exits 0).
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.log('[sync-roadmap] SUPABASE_URL / SUPABASE_SERVICE_KEY not set — skipping (this is normal for local builds).')
    return
  }

  const here = dirname(fileURLToPath(import.meta.url))
  const file = join(here, '..', 'roadmap-updates.json')
  let items
  try {
    items = JSON.parse(await readFile(file, 'utf8'))
  } catch (e) {
    console.log('[sync-roadmap] could not read roadmap-updates.json — skipping.', e.message)
    return
  }
  if (!Array.isArray(items) || items.length === 0) {
    console.log('[sync-roadmap] no items in roadmap-updates.json.')
    return
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data: existing, error: readErr } = await supabase.from('product_updates').select('title')
  if (readErr) {
    console.log('[sync-roadmap] could not read existing updates — skipping.', readErr.message)
    return
  }
  const have = new Set((existing || []).map(r => (r.title || '').trim()))

  const toInsert = items
    .filter(it => it && it.title && !have.has(it.title.trim()))
    .map(it => ({
      title: it.title.trim(),
      description: it.description ? String(it.description).trim() : null,
      category: ['Feature', 'Improvement', 'Fix'].includes(it.category) ? it.category : 'Feature',
      status: 'shipped',
      shipped_at: it.shipped_at || new Date().toISOString().slice(0, 10),
    }))

  if (toInsert.length === 0) {
    console.log('[sync-roadmap] all roadmap items already present — nothing to insert.')
    return
  }

  const { error: insErr } = await supabase.from('product_updates').insert(toInsert)
  if (insErr) {
    console.log('[sync-roadmap] insert failed:', insErr.message)
    return
  }
  console.log(`[sync-roadmap] inserted ${toInsert.length} new shipped item(s): ${toInsert.map(i => i.title).join(' | ')}`)
}

main().catch(e => { console.log('[sync-roadmap] unexpected error (ignored):', e?.message) })
