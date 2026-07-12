// Auto-sync shipped roadmap items into the product_updates table on every deploy.
//
// Source of truth: roadmap-updates.json (repo root). To announce a shipped
// feature, add an entry there — on the next deploy it's posted to the public
// Product Updates roadmap automatically. No manual admin step needed.
//
// Two things happen on deploy, both driven only by titles listed in that file:
//   1. New titles are inserted as 'shipped'.
//   2. Titles that already exist but aren't shipped yet (e.g. a customer's own
//      feature request sitting in 'under_review' or 'planned') are PROMOTED to
//      'shipped'. This keeps the submitter's name and votes on the original row
//      instead of creating a duplicate — and means shipping a requested feature
//      needs no manual admin step.
// Safety: idempotent, never deletes, never touches rows whose titles aren't in
// the file, and never fails the build (always exits 0).
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

  const { data: existing, error: readErr } = await supabase.from('product_updates').select('id, title, status')
  if (readErr) {
    console.log('[sync-roadmap] could not read existing updates — skipping.', readErr.message)
    return
  }
  const byTitle = new Map((existing || []).map(r => [(r.title || '').trim(), r]))
  const today = new Date().toISOString().slice(0, 10)

  const wanted = items.filter(it => it && it.title)

  // 1. Promote anything already in the table that we've now shipped (typically a
  //    customer's own request, still sitting in under_review/planned).
  const toPromote = wanted
    .map(it => ({ it, row: byTitle.get(it.title.trim()) }))
    .filter(({ row }) => row && row.status !== 'shipped')

  for (const { it, row } of toPromote) {
    const { error: upErr } = await supabase
      .from('product_updates')
      .update({ status: 'shipped', shipped_at: it.shipped_at || today })
      .eq('id', row.id)
    if (upErr) console.log(`[sync-roadmap] could not promote "${row.title}":`, upErr.message)
    else console.log(`[sync-roadmap] promoted to shipped (was ${row.status}): ${row.title}`)
  }

  // 2. Insert titles we've never seen before.
  const toInsert = wanted
    .filter(it => !byTitle.has(it.title.trim()))
    .map(it => ({
      title: it.title.trim(),
      description: it.description ? String(it.description).trim() : null,
      category: ['Feature', 'Improvement', 'Fix'].includes(it.category) ? it.category : 'Feature',
      status: 'shipped',
      shipped_at: it.shipped_at || today,
    }))

  if (toInsert.length === 0) {
    console.log(`[sync-roadmap] nothing new to insert (${toPromote.length} promoted).`)
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
