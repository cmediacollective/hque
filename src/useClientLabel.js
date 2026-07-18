import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// A company can rename the "Brand/Client" section to whatever fits them
// (e.g. "Department", "Category"). The chosen words live on org_settings
// (client_label_singular / client_label_plural) and are edited in Settings →
// Agency Info or picked during onboarding. This hook reads them for the active
// company so every screen shows that company's word. Defaults keep any company
// that hasn't chosen exactly as before.
export const DEFAULT_CLIENT_LABEL = { singular: 'Brand/Client', plural: 'Brands/Clients' }

// The ready-made choices shown at onboarding and in Settings. The first entry is
// the default (what every company sees unless they pick another). "Custom" is
// offered alongside these so a company can type their own singular + plural.
export const CLIENT_LABEL_PRESETS = [
  { singular: 'Brand/Client', plural: 'Brands/Clients' },
  { singular: 'Department', plural: 'Departments' },
  { singular: 'Category', plural: 'Categories' },
  { singular: 'Team', plural: 'Teams' },
  { singular: 'Project', plural: 'Projects' },
  { singular: 'Client', plural: 'Clients' },
]

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
