import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// A company can rename the "Brand/Client" section to whatever fits them
// (e.g. "Department", "Category"). The chosen words live on org_settings
// (client_label_singular / client_label_plural) and are edited in Settings →
// Agency Info or picked during onboarding. This hook reads them for the active
// company so every screen shows that company's word. Defaults keep any company
// that hasn't chosen exactly as before.
export const DEFAULT_CLIENT_LABEL = { singular: 'Brand/Client', plural: 'Brands/Clients' }

// "New" nudges (the Settings tab badge + the sidebar rename tooltip) stay up for
// two weeks after launch, then come down for everyone — our standard rule for
// any "New" flag. Launched 2026-07-18; comes down 2026-08-01.
export const PERSONALIZATION_NEW_UNTIL = Date.parse('2026-08-01T00:00:00Z')

// The ready-made choices shown at onboarding and in Settings. The first entry is
// the default (what every company sees unless they pick another). "Custom" is
// offered alongside these so a company can type their own singular + plural.
export const CLIENT_LABEL_PRESETS = [
  { singular: 'Brand/Client', plural: 'Brands/Clients' },
  { singular: 'Department', plural: 'Departments' },
  { singular: 'Team', plural: 'Teams' },
  { singular: 'Project', plural: 'Projects' },
  { singular: 'Category', plural: 'Categories' },
  { singular: 'Month', plural: 'Months' },
]

// Turn the singular a user typed into a sensible plural for the section heading,
// so they only have to type one word. Handles the common English patterns
// (Category → Categories, Class → Classes, Client → Clients).
export function pluralize(word) {
  const w = (word || '').trim()
  if (!w) return ''
  if (/[^aeiou]y$/i.test(w)) return w.slice(0, -1) + 'ies'
  if (/(s|x|z|ch|sh)$/i.test(w)) return w + 'es'
  return w + 's'
}

export function useClientLabel(orgId) {
  const [label, setLabel] = useState(DEFAULT_CLIENT_LABEL)
  useEffect(() => {
    if (!orgId) { setLabel(DEFAULT_CLIENT_LABEL); return }
    let cancelled = false
    supabase.from('org_settings').select('client_label_singular,client_label_plural').eq('org_id', orgId).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setLabel({
          singular: data?.client_label_singular?.trim() || DEFAULT_CLIENT_LABEL.singular,
          plural: data?.client_label_plural?.trim() || DEFAULT_CLIENT_LABEL.plural,
        })
      })
    return () => { cancelled = true }
  }, [orgId])
  return label
}
