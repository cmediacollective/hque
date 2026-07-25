// A tiny module-level cache for section data (Workspace, Campaigns, Talent,
// Reports, Inquiries). It lives OUTSIDE React on purpose, so it survives
// component unmount/remount and sidebar navigation — revisiting a section can
// paint instantly from here instead of showing a spinner.
//
// Keys are caller-chosen strings and MUST include the org id, so switching
// companies never shows another company's cached rows. Example keys:
//   `campaigns:${orgId}:${view}`   `talent:${orgId}:${archived}`
//
// Values are whatever the fetcher returns (usually an array or an object).

const store = new Map() // key -> { data, ts }

export function cacheHas(key) {
  return key != null && store.has(key)
}

export function cacheGet(key) {
  const hit = key != null ? store.get(key) : undefined
  return hit ? hit.data : undefined
}

export function cacheSet(key, data) {
  if (key != null) store.set(key, { data, ts: Date.now() })
}

// Milliseconds since this key was last written (Infinity if never). Callers use
// it to decide whether a background refetch is worth doing.
export function cacheAge(key) {
  const hit = key != null ? store.get(key) : undefined
  return hit ? Date.now() - hit.ts : Infinity
}

// Drop cached data. With no argument, clears everything (e.g. on sign-out /
// company switch). With a prefix, clears only matching keys (e.g. an org id, or
// `campaigns:${orgId}` after a create/edit so the next view refetches fresh).
export function cacheInvalidate(prefix) {
  if (!prefix) { store.clear(); return }
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) store.delete(k)
  }
}
