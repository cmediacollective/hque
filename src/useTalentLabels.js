import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Reads a company's own Type and Niche label lists (Settings > Talent Labels).
// Used by the roster filters and the Add/Edit-Talent form so both reflect the
// company's customized labels instead of a hardcoded list.
export function useTalentLabels(orgId) {
  const [types, setTypes] = useState([])
  const [niches, setNiches] = useState([])
  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    supabase.from('org_talent_labels').select('kind,label,position').eq('org_id', orgId).order('position')
      .then(({ data }) => {
        if (cancelled) return
        setTypes((data || []).filter(r => r.kind === 'type').map(r => r.label))
        setNiches((data || []).filter(r => r.kind === 'niche').map(r => r.label))
      })
    return () => { cancelled = true }
  }, [orgId])
  return { types, niches }
}
