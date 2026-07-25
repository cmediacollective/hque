import { useState, useEffect, useRef, useCallback } from 'react'
import { cacheGet, cacheHas, cacheSet, cacheAge } from './dataCache'

// Cached, stale-while-revalidate data with an explicit status machine.
//
//   status: 'loading'  — no data yet, show a skeleton
//           'success'  — we have data (fresh or cached); render it
//           'error'    — the FIRST load failed and we have nothing to show
//
// Behavior:
//   • First load with an empty cache → 'loading' (skeleton), then fetch.
//   • Cache already holds this key → return it INSTANTLY as 'success' and run a
//     silent background refetch (no skeleton, no flicker) when the cached copy
//     is older than `staleMs`.
//   • A failed or empty background refetch never wipes what's already on screen.
//
// The status only becomes 'error' when there was nothing cached to fall back to,
// so the UI never flashes a false empty/zero state while a request is in flight.
//
// Params:
//   key      stable string; pass null to disable (e.g. before orgId loads)
//   fetcher  async () => data   (return the data; don't set state yourself)
//   opts     { enabled = true, staleMs = 30000 }
export function useCachedResource(key, fetcher, { enabled = true, staleMs = 30000 } = {}) {
  const active = enabled && key != null
  const hasCache = active && cacheHas(key)

  const [data, setData] = useState(() => (hasCache ? cacheGet(key) : null))
  const [status, setStatus] = useState(hasCache ? 'success' : 'loading')
  const [error, setError] = useState(null)

  const fetcherRef = useRef(fetcher)
  useEffect(() => { fetcherRef.current = fetcher })

  const load = useCallback(async (background) => {
    if (!active) return
    if (!background && !cacheHas(key)) setStatus('loading')
    try {
      const result = await fetcherRef.current()
      cacheSet(key, result)
      setData(result)
      setStatus('success')
      setError(null)
    } catch (e) {
      setError(e)
      // Keep any cached data visible; only surface an error if we have nothing.
      setStatus(cacheHas(key) ? 'success' : 'error')
    }
  }, [key, active])

  useEffect(() => {
    if (!active) return
    if (cacheHas(key)) {
      // Paint cached data immediately; refresh quietly only if it's gone stale.
      setData(cacheGet(key))
      setStatus('success')
      if (cacheAge(key) > staleMs) load(true)
    } else {
      load(false)
    }
  }, [key, active, staleMs, load])

  return { data, status, error, refetch: () => load(true), setData }
}
