// Generates public/sitemap.xml from the static marketing routes + every blog
// post in BlogData.js. Runs automatically before each build (npm "prebuild"),
// so new blog posts are always included in the sitemap with no manual step.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { POSTS } from '../src/BlogData.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'https://h-que.com'

const staticPaths = ['/', '/pricing', '/faq', '/blog', '/updates', '/privacy', '/terms']
const blogPaths = POSTS.map(p => `/blog/${p.slug}`)
const paths = [...staticPaths, ...blogPaths]

const body = paths
  .map(p => `  <url>\n    <loc>${BASE}${p}</loc>\n  </url>`)
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`

writeFileSync(join(root, 'public/sitemap.xml'), xml)
console.log(`sitemap.xml generated — ${paths.length} URLs (${blogPaths.length} blog posts)`)
