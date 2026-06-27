import { supabase } from './supabase'

// Turn a name into a clean URL slug: "Summer Wellness!" → "summer-wellness".
export function slugify(name, fallback = 'item') {
  return ((name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)) || fallback
}

// Ensure a row has a unique slug, claiming a name-based one (bumping -2, -3… on
// collisions) if it doesn't already have one. Returns the slug, or null on failure.
export async function ensureSlug(table, row, fallback = 'item') {
  if (!row || !row.id) return null
  if (row.slug) return row.slug
  const base = slugify(row.name, fallback)
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`
    const { error } = await supabase.from(table).update({ slug: candidate }).eq('id', row.id)
    if (!error) return candidate
    if (error.code !== '23505') return null
  }
  return null
}
