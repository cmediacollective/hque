import { useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useCachedResource } from '../useCachedResource'
import { cacheSet } from '../dataCache'

// Every pitch and lead for one company, kept in the section cache like the
// other views and refreshed live: three people work this board at once, and
// Bailey (the Slack agent) will write to the same table.
//
// Rows are used as-is (snake_case, straight from Postgres). A lead is a row
// with is_lead = true; the lead columns sit on the same row.

const COLUMNS =
  'id, org_id, creator_id, client_name, brand, website, contact, contact_email, type, status, pitched_by, sent_on, follow_up, note_entries, is_lead, campaign, amount, stage, likelihood, timing, next_step, lost_reason, campaign_id, created_by, source_ref, created_at, updated_at'

/** Empty strings are how a form says "not set"; the database wants null. */
export const orNull = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : value
  return trimmed === '' || trimmed === undefined ? null : trimmed
}

export function usePitches(orgId, { focusVersion = 0 } = {}) {
  const cacheKey = orgId ? `pitches:${orgId}` : null
  const { data, status, error, refetch, setData } = useCachedResource(cacheKey, async () => {
    const { data, error } = await supabase
      .from('pitches')
      .select(COLUMNS)
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data || []
  })
  const pitches = data || []

  // Refetch on tab focus, like the other sections.
  useEffect(() => { if (focusVersion > 0) refetch() }, [focusVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live updates. Any change to the table by anyone (or Bailey) refreshes the
  // list; the writes below also patch local state so your own edits never
  // wait on the round trip.
  useEffect(() => {
    if (!orgId) return
    const channel = supabase
      .channel(`pitches:${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitches', filter: `org_id=eq.${orgId}` }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Functional so two quick saves can't clobber each other with a stale list.
  const patchLocal = useCallback((fn) => {
    setData((prev) => {
      const next = fn(prev || [])
      if (cacheKey) cacheSet(cacheKey, next)
      return next
    })
  }, [cacheKey, setData])

  /** Insert one row. Returns the saved row, or throws with a readable message. */
  const addPitch = async (fields) => {
    const { data: row, error } = await supabase
      .from('pitches')
      .insert({ ...fields, org_id: orgId })
      .select(COLUMNS)
      .single()
    if (error) throw new Error(error.message)
    patchLocal((list) => [row, ...list])
    return row
  }

  /** Update one row by id with a partial patch. Returns the saved row. */
  const updatePitch = async (id, patch) => {
    const { data: row, error } = await supabase
      .from('pitches')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(COLUMNS)
      .single()
    if (error) throw new Error(error.message)
    patchLocal((list) => list.map((p) => (p.id === id ? row : p)))
    return row
  }

  const removePitch = async (id) => {
    const { error } = await supabase.from('pitches').delete().eq('id', id)
    if (error) throw new Error(error.message)
    patchLocal((list) => list.filter((p) => p.id !== id))
  }

  return { pitches, status, error, refetch, addPitch, updatePitch, removePitch }
}
