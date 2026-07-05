// Prerender step — runs after `vite build`.
//
// Vite produces ONE empty SPA shell (dist/index.html). Crawlers that don't run
// JavaScript see nothing there. This script takes that built shell and writes a
// real, content-filled HTML file for every PUBLIC marketing route, so `curl`
// (and Google/AI crawlers) get a unique <title>, meta description, canonical,
// Open Graph / Twitter tags, JSON-LD, AND the visible page text.
//
// The app itself stays a normal SPA: app routes fall back to dist/app.html
// (a copy of the shell marked noindex) and boot React exactly as before.
//
// When a real browser opens a prerendered page, React's createRoot() REPLACES
// the contents of #root with the live app, so the static content is swapped out
// (never doubled). It sits on the same dark background, so there's no flash.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { POSTS } from '../src/BlogData.js'
import { FAQS } from '../src/faqData.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const BASE = 'https://h-que.com'
const OG_IMAGE = BASE + '/og-image.png'

// The freshly built shell — carries the correct hashed <script>/<link> tags,
// GA snippet, fonts, favicons, and the default noindex robots meta.
const shell = readFileSync(join(dist, 'index.html'), 'utf8')

// --- Pricing shown on the /pricing page. Prices are ALSO confirmed with Cherie
// before they go into JSON-LD structured data (Step 4). Visible text only here.
const PRICING = [
  { name: 'Starter', price: '$49', period: '/month', desc: 'For entrepreneurs and small teams who need a clean, simple way to manage talent and run campaigns.',
    features: ['Up to 50 talent', '2 team members', 'Campaign tracking & outreach', 'Payment tracking', 'Branded login page'] },
  { name: 'Pro', price: '$99', period: '/month', desc: 'For agencies and brand teams scaling their campaigns and ready for deeper analytics and workflows.',
    features: ['Everything in Starter', 'Unlimited talent', '5 team members', 'Reports & analytics', 'Priority support'] },
  { name: 'Business', price: '$199', period: '/month', desc: 'For established agencies running high-volume talent operations across multiple campaigns and clients.',
    features: ['Everything in Pro', 'Unlimited team members', 'Full white-label branding', 'Custom onboarding', 'Dedicated account support'] },
]

// ---------- tiny markdown → HTML ----------
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Inline: escape text first, then turn [text](url) and **bold** into real tags.
function mdInline(s) {
  let out = esc(s)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => `<a href="${u}">${t}</a>`)
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return out
}

// Block: split on blank lines. A paragraph that is entirely **bold** becomes an
// <h2> subheading (that's how the blog bodies use it); everything else is a <p>.
function mdToHtml(body) {
  return String(body).split(/\n\s*\n/).map((block) => {
    const t = block.trim()
    if (!t) return ''
    const boldOnly = t.match(/^\*\*(.+)\*\*$/)
    if (boldOnly) return `<h2>${esc(boldOnly[1])}</h2>`
    return `<p>${mdInline(t.replace(/\n/g, ' '))}</p>`
  }).filter(Boolean).join('\n')
}

// ---------- page shell assembly ----------
const WRAP_OPEN = '<div style="background:#1A1A1A;color:#DCDCDC;font-family:\'Inter Tight\',system-ui,sans-serif;line-height:1.7;max-width:760px;margin:0 auto;padding:64px 24px;">'
const WRAP_CLOSE = '</div>'

// Build one full HTML document for a public route.
function buildPage({ title, description, canonical, ogType = 'website', jsonLd, contentHtml }) {
  const head = [
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:site_name" content="HQue" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '',
  ].filter(Boolean).join('\n    ')

  let html = shell
  // Unique <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  // Public pages ARE indexable — flip the shell's default noindex.
  html = html.replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="index, follow" />')
  // Inject the SEO head block
  html = html.replace('</head>', `    ${head}\n  </head>`)
  // Inject crawlable content into #root (React replaces it on mount)
  html = html.replace('<div id="root"></div>', `<div id="root">${WRAP_OPEN}${contentHtml}${WRAP_CLOSE}</div>`)
  return html
}

function write(routePath, html) {
  const outDir = routePath === '/' ? dist : join(dist, routePath)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'index.html'), html)
}

// ---------- content builders ----------
function homeContent() {
  const features = [
    ['Roster management', 'Every creator, rate, and relationship in one organized place.'],
    ['Campaign tracking', 'Follow every campaign from pitch to paid, with nothing slipping.'],
    ['Payments', 'Know what\'s owed, what\'s paid, and what\'s overdue at a glance.'],
    ['Team & tasks', 'Assign work, track deliverables, and keep everyone in sync.'],
  ]
  return `
    <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#5b7c99;">The platform built for talent-driven work</p>
    <h1 style="font-family:'Fraunces',Georgia,serif;font-size:44px;color:#F0ECE6;line-height:1.1;margin:12px 0 20px;">Run your roster. Not your inbox.</h1>
    <p style="font-size:16px;">Whether you run an agency, manage talent campaigns in-house, or are building something on your own — HQue is how you manage your talent, track every campaign, and close deals without the chaos.</p>
    <p style="font-size:13px;color:#9a9a9a;">14-day free trial · No credit card required</p>
    <h2 style="font-family:'Fraunces',Georgia,serif;color:#F0ECE6;">Everything your agency runs on, in one place</h2>
    <ul>${features.map(([h, d]) => `<li><strong style="color:#F0ECE6;">${h}.</strong> ${d}</li>`).join('')}</ul>`
}

function pricingContent() {
  return `
    <h1 style="font-family:'Fraunces',Georgia,serif;font-size:40px;color:#F0ECE6;margin-bottom:12px;">Simple, transparent pricing</h1>
    <p style="font-size:16px;">Pricing for agencies, brand teams, and entrepreneurs who work with talent. Start free, upgrade as you grow. Every plan includes a 14-day free trial — no credit card required.</p>
    ${PRICING.map((p) => `
    <div style="border-top:1px solid #2a2a2a;padding-top:20px;margin-top:20px;">
      <h2 style="color:#F0ECE6;margin-bottom:4px;">${p.name} — <span style="color:#5b7c99;">${p.price}</span><span style="font-size:13px;color:#9a9a9a;">${p.period}</span></h2>
      <p>${esc(p.desc)}</p>
      <ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    </div>`).join('')}`
}

function faqContent() {
  return `
    <h1 style="font-family:'Fraunces',Georgia,serif;font-size:40px;color:#F0ECE6;margin-bottom:20px;">Frequently asked questions</h1>
    ${FAQS.map((f) => `
    <div style="border-top:1px solid #2a2a2a;padding:18px 0;">
      <h2 style="font-family:'Fraunces',Georgia,serif;font-size:18px;color:#F0ECE6;margin-bottom:8px;">${esc(f.q)}</h2>
      <p>${mdInline(f.a)}</p>
    </div>`).join('')}`
}

function blogIndexContent() {
  return `
    <h1 style="font-family:'Fraunces',Georgia,serif;font-size:40px;color:#F0ECE6;margin-bottom:12px;">The Pitch</h1>
    <p style="font-size:16px;">Playbooks, strategies, and operations for agencies, brand teams, and entrepreneurs who work with talent.</p>
    ${POSTS.map((p) => `
    <div style="border-top:1px solid #2a2a2a;padding:20px 0;">
      <h2 style="font-family:'Fraunces',Georgia,serif;font-size:20px;margin-bottom:6px;"><a href="/blog/${p.slug}" style="color:#F0ECE6;text-decoration:none;">${esc(p.title)}</a></h2>
      <p style="font-size:12px;color:#9a9a9a;">${esc(p.category)} · ${esc(p.date)} · ${esc(p.readTime)}</p>
      <p>${esc(p.excerpt)}</p>
    </div>`).join('')}`
}

function blogPostContent(p) {
  return `
    <p style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#5b7c99;">${esc(p.category)} · ${esc(p.date)} · ${esc(p.readTime)}</p>
    <h1 style="font-family:'Fraunces',Georgia,serif;font-size:38px;color:#F0ECE6;line-height:1.15;margin:8px 0 24px;">${esc(p.title)}</h1>
    <article>${mdToHtml(p.body)}</article>`
}

function legalContent(kind) {
  const title = kind === 'privacy' ? 'Privacy Policy' : 'Terms of Service'
  const intro = kind === 'privacy'
    ? 'How HQue collects, uses, and protects your personal information.'
    : 'The terms that govern your use of the HQue platform.'
  return `
    <h1 style="font-family:'Fraunces',Georgia,serif;font-size:36px;color:#F0ECE6;margin-bottom:12px;">${title}</h1>
    <p style="font-size:16px;">${intro}</p>
    <p>Read the full ${title.toLowerCase()} on this page, or contact us at support@h-que.com with any questions.</p>`
}

function updatesContent() {
  return `
    <h1 style="font-family:'Fraunces',Georgia,serif;font-size:40px;color:#F0ECE6;margin-bottom:12px;">Product updates &amp; roadmap</h1>
    <p style="font-size:16px;">See everything we've shipped — new features, improvements, and bug fixes — plus what we're building now and what's planned next. Submit a feature request or report an issue right from this page.</p>`
}

// JSON-LD for a blog post (mirrors the client-side BlogPostPage schema).
function articleJsonLd(p) {
  let published
  try { published = new Date(p.date).toISOString() } catch { published = undefined }
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.title,
    description: p.excerpt,
    image: p.image,
    ...(published ? { datePublished: published } : {}),
    author: { '@type': 'Organization', name: 'HQue', url: BASE },
    publisher: { '@type': 'Organization', name: 'HQue', logo: { '@type': 'ImageObject', url: BASE + '/logo.svg' } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE}/blog/${p.slug}` },
  }
}

// SoftwareApplication with the confirmed pricing offer ($49–$199/mo). Used on
// the homepage and /pricing.
function softwareAppJsonLd(url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'HQue',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url,
    description: 'HQue is the operating system for talent and influencer agencies — manage your roster, track campaigns, handle payments, and run your team in one place.',
    offers: { '@type': 'AggregateOffer', priceCurrency: 'USD', lowPrice: '49', highPrice: '199', offerCount: 3 },
    publisher: { '@type': 'Organization', name: 'HQue', url: BASE, logo: { '@type': 'ImageObject', url: BASE + '/logo.svg' } },
  }
}

// FAQPage schema built from the real questions & answers.
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

// ---------- routes ----------
const routes = [
  { path: '/', title: 'HQue — Talent & Campaign Management for Agencies, Brands & Entrepreneurs',
    description: 'HQue is how you manage your talent, track every campaign, and close deals without the chaos. Built for agencies, brands, and entrepreneurs.',
    canonical: BASE + '/', jsonLd: softwareAppJsonLd(BASE + '/'), contentHtml: homeContent() },
  { path: '/pricing', title: 'HQue Pricing — Plans for Agencies, Brands & Entrepreneurs',
    description: 'Simple, transparent pricing for agencies, brand teams, and entrepreneurs who work with talent. Start free, upgrade as you grow.',
    canonical: BASE + '/pricing', jsonLd: softwareAppJsonLd(BASE + '/pricing'), contentHtml: pricingContent() },
  { path: '/faq', title: 'FAQ — HQue',
    description: 'Answers to the most common questions about HQue, the agency OS built for talent and influencer agencies.',
    canonical: BASE + '/faq', jsonLd: faqJsonLd, contentHtml: faqContent() },
  { path: '/blog', title: 'The Pitch — Strategy, Operations & Playbooks for Agencies, Brands & Entrepreneurs',
    description: 'Playbooks, strategies, and operations for agencies, brand teams, and entrepreneurs who work with talent.',
    canonical: BASE + '/blog', contentHtml: blogIndexContent() },
  { path: '/updates', title: 'Product Updates & Roadmap — HQue',
    description: "See what's new in HQue, what we're building now, and what's coming next. Ship notes, roadmap, and feature requests in one place.",
    canonical: BASE + '/updates', contentHtml: updatesContent() },
  { path: '/privacy', title: 'Privacy Policy — HQue',
    description: 'HQue Privacy Policy — how we collect, use, and protect your personal information.',
    canonical: BASE + '/privacy', contentHtml: legalContent('privacy') },
  { path: '/terms', title: 'Terms of Service — HQue',
    description: 'HQue Terms of Service — the terms governing your use of the HQue platform.',
    canonical: BASE + '/terms', contentHtml: legalContent('terms') },
]

// Blog posts
for (const p of POSTS) {
  routes.push({
    path: `/blog/${p.slug}`,
    title: `${p.title} | hque`,
    description: p.excerpt,
    canonical: `${BASE}/blog/${p.slug}`,
    ogType: 'article',
    jsonLd: articleJsonLd(p),
    contentHtml: blogPostContent(p),
  })
}

// ---------- write everything ----------
for (const r of routes) write(r.path, buildPage(r))

// App fallback shell: same built shell, kept noindex (the shell's default),
// empty #root. Every non-public route rewrites to this (see netlify.toml).
writeFileSync(join(dist, 'app.html'), shell)

console.log(`prerender: wrote ${routes.length} public pages + app.html (${POSTS.length} blog posts)`)
