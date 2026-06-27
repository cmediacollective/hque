import { useEffect } from 'react'

const BASE = 'https://h-que.com'
const DEFAULT_IMAGE = BASE + '/og-image.png'

export default function useSEO({ title, description, image, canonical, type = 'website', jsonLd }) {
  useEffect(() => {
    const fullTitle = title ? title + ' | HQue' : 'HQue — Agency OS for Talent & Influencer Agencies'
    const desc = description || 'HQue is the operating system for talent and influencer agencies. Manage your roster, campaigns, payments, and team — all in one place.'
    const img = image || DEFAULT_IMAGE
    const url = canonical || BASE + window.location.pathname

    document.title = fullTitle

    const set = (sel, attr, val) => {
      let el = document.querySelector(sel)
      if (!el) {
        el = document.createElement('meta')
        const parts = sel.match(/\[([^\]]+)="([^"]+)"\]/)
        if (parts) el.setAttribute(parts[1], parts[2])
        document.head.appendChild(el)
      }
      el.setAttribute(attr, val)
    }

    set('meta[name="description"]', 'content', desc)
    set('meta[name="robots"]', 'content', 'index, follow')

    // Open Graph
    set('meta[property="og:title"]', 'content', fullTitle)
    set('meta[property="og:description"]', 'content', desc)
    set('meta[property="og:image"]', 'content', img)
    set('meta[property="og:url"]', 'content', url)
    set('meta[property="og:type"]', 'content', type)
    set('meta[property="og:site_name"]', 'content', 'HQue')

    // Twitter Card
    set('meta[name="twitter:card"]', 'content', 'summary_large_image')
    set('meta[name="twitter:title"]', 'content', fullTitle)
    set('meta[name="twitter:description"]', 'content', desc)
    set('meta[name="twitter:image"]', 'content', img)

    // Canonical
    let link = document.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', url)

    // JSON-LD structured data (helps Google rich results + gives AI engines
    // a clear, machine-readable description of the page).
    let ld = document.getElementById('seo-jsonld')
    if (jsonLd) {
      if (!ld) {
        ld = document.createElement('script')
        ld.id = 'seo-jsonld'
        ld.type = 'application/ld+json'
        document.head.appendChild(ld)
      }
      ld.textContent = JSON.stringify(jsonLd)
    } else if (ld) {
      ld.remove()
    }
  }, [title, description, image, canonical, type, JSON.stringify(jsonLd || null)])
}
