// Generates public/sitemap.xml from the static marketing routes + every blog
// post in BlogData.js. Runs automatically before each build (npm "prebuild"),
// so new blog posts are always included in the sitemap with no manual step.
//
// Every entry gets a <lastmod> date: blog posts use their published date, and
// the static pages use the date their source file was last changed in git
// (falling back to today if git isn't available).
import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { POSTS } from '../src/BlogData.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'https://h-que.com'

const today = new Date().toISOString().slice(0, 10)

// Last git commit date (YYYY-MM-DD) that touched a file, or today as a fallback.
function gitDate(...files) {
  try {
    const out = execSync(`git log -1 --format=%cs -- ${files.join(' ')}`, { cwd: root })
      .toString().trim()
    return out || today
  } catch {
    return today
  }
}

// Turn a blog post's human date ("April 10, 2026") into YYYY-MM-DD.
function postDate(p) {
  try {
    const d = new Date(p.date)
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
  } catch { /* ignore */ }
  return today
}

// Static marketing routes → the source file that drives each one.
const staticEntries = [
  { path: '/', lastmod: gitDate('src/LandingPage.jsx') },
  { path: '/pricing', lastmod: gitDate('src/PricingPage.jsx', 'src/plans.js') },
  { path: '/faq', lastmod: gitDate('src/FAQPage.jsx', 'src/faqData.js') },
  { path: '/blog', lastmod: gitDate('src/BlogData.js') },
  { path: '/updates', lastmod: gitDate('src/ProductUpdates.jsx', 'roadmap-updates.json') },
  { path: '/privacy', lastmod: gitDate('src/LegalPage.jsx') },
  { path: '/terms', lastmod: gitDate('src/LegalPage.jsx') },
]

const blogEntries = POSTS.map(p => ({ path: `/blog/${p.slug}`, lastmod: postDate(p) }))

const entries = [...staticEntries, ...blogEntries]

const body = entries
  .map(e => `  <url>\n    <loc>${BASE}${e.path}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`)
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`

writeFileSync(join(root, 'public/sitemap.xml'), xml)
console.log(`sitemap.xml generated — ${entries.length} URLs (${blogEntries.length} blog posts) with lastmod dates`)
