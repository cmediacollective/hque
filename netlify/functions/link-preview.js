const TIMEOUT_MS = 6000
const MAX_BYTES = 200_000

exports.handler = async (event) => {
  const url = event.queryStringParameters?.url
  if (!url) return json(400, { error: 'missing url' })
  if (!isPublicHttpUrl(url)) return json(400, { error: 'invalid url' })

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HQueLinkPreview/1.0; +https://h-que.com)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.8'
      }
    })
    if (!res.ok) return json(200, { url, error: `status ${res.status}` })
    const ct = res.headers.get('content-type') || ''
    if (!/text\/html|application\/xhtml/i.test(ct)) return json(200, { url, error: 'not html' })

    const text = await readCapped(res, MAX_BYTES)
    const finalUrl = res.url || url
    const meta = parseMeta(text, finalUrl)
    return json(200, { url: finalUrl, ...meta }, { 'Cache-Control': 'public, max-age=86400' })
  } catch (err) {
    return json(200, { url, error: err.name === 'AbortError' ? 'timeout' : 'fetch failed' })
  } finally {
    clearTimeout(timer)
  }
}

async function readCapped(res, max) {
  const reader = res.body?.getReader?.()
  if (!reader) return (await res.text()).slice(0, max)
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
    if (total >= max) { try { await reader.cancel() } catch (_) {} ; break }
  }
  const buf = Buffer.concat(chunks.map(c => Buffer.from(c)))
  return buf.toString('utf8').slice(0, max)
}

function parseMeta(html, baseUrl) {
  const head = html.split(/<\/head>/i)[0] || html
  const title = getMeta(head, ['og:title', 'twitter:title']) || matchTag(head, /<title[^>]*>([^<]+)<\/title>/i)
  const description = getMeta(head, ['og:description', 'twitter:description', 'description'])
  let image = getMeta(head, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src'])
  const siteName = getMeta(head, ['og:site_name']) || hostnameOf(baseUrl)
  if (image) image = absolutize(image, baseUrl)
  return {
    title: clean(title),
    description: clean(description),
    image: image || null,
    siteName: clean(siteName)
  }
}

function getMeta(html, names) {
  for (const name of names) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${escapeRe(name)}["'][^>]+content=["']([^"']*)["']`, 'i')
    const m1 = html.match(re1); if (m1) return m1[1]
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapeRe(name)}["']`, 'i')
    const m2 = html.match(re2); if (m2) return m2[1]
  }
  return null
}

function matchTag(html, re) { const m = html.match(re); return m ? m[1] : null }

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function clean(s) {
  if (!s) return null
  return decodeEntities(s).replace(/\s+/g, ' ').trim().slice(0, 400) || null
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
}

function absolutize(u, base) {
  try { return new URL(u, base).href } catch { return u }
}

function hostnameOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, '') } catch { return null }
}

function isPublicHttpUrl(u) {
  try {
    const url = new URL(u)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false
    if (/^10\./.test(host)) return false
    if (/^192\.168\./.test(host)) return false
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) return false
    if (/^169\.254\./.test(host)) return false
    if (/^0\./.test(host)) return false
    return true
  } catch { return false }
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...extraHeaders },
    body: JSON.stringify(body)
  }
}
