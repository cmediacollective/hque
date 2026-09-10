// Builds the full-page talent one-pager — the media-kit sheet you send a brand
// when you're pitching one person: photo, bio, the numbers, what they'll deliver
// and what it costs.
//
// Same mechanism as the roster export in App.jsx: assemble a self-contained HTML
// page, open it in a tab and hand it to the browser's print dialog, where "Save
// as PDF" produces the file. No PDF library, so nothing to keep up to date, and
// what you see in the tab is exactly what prints.
//
// The talent record supplies the durable half (photo, bio, followers, metrics,
// audience). The pitch half — which brand it's for, the deliverables, the price
// — is passed in per export, because those change with every pitch and don't
// belong on the talent.

const INK = '#1A1A1A'
const PAPER = '#F8F7F3'
const MUTED = '#8A8A8A'
const RULE = '#DEDBD4'
const ACCENT = '#2E2A4A'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 116381 -> "116,381". Blank for anything that isn't a real number, so an
// unfilled metric drops out of the sheet instead of printing "0" or "NaN".
const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n !== 0 ? n.toLocaleString('en-US') : null
}

// 394000 -> "394K". Followers print short; everything else prints in full.
const compact = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n === 0) return null
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1000) return Math.round(n / 1000) + 'K'
  return n.toLocaleString('en-US')
}

const pct = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n !== 0 ? `${n}%` : null
}

const money = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n !== 0 ? '$' + n.toLocaleString('en-US') : null
}

const label = (t, color = MUTED) =>
  `<div style="font-size:8.5px;letter-spacing:0.19em;text-transform:uppercase;color:${color};font-weight:600;">${esc(t)}</div>`

// One big serif number over a small caps caption — the unit the whole sheet is
// built from.
const figure = (value, caption, size = '25px') => `
  <div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:${size};line-height:1.05;color:${ACCENT};font-variant-numeric:tabular-nums;letter-spacing:-0.01em;">${esc(value)}</div>
    <div style="font-size:7.5px;letter-spacing:0.19em;text-transform:uppercase;color:${MUTED};margin-top:5px;font-weight:600;">${esc(caption)}</div>
  </div>`

const card = (inner, pad = '20px 22px') =>
  `<div style="background:#fff;border:0.5px solid ${RULE};border-radius:9px;padding:${pad};box-shadow:0 1px 2px rgba(0,0,0,0.03);">${inner}</div>`

/**
 * @param creator  a row from `creators`
 * @param pitch    { client, deliverables: string[], terms: string[], investment, investmentNote, periodLabel }
 * @param brand    { agencyName, logoUrl, businessBrand }
 */
export function buildOnePagerHtml(creator, pitch = {}, brand = {}) {
  const c = creator || {}
  const m = c.metrics || {}
  const a = c.audience || {}

  const types = Array.isArray(c.types) && c.types.length ? c.types.join(' · ') : (c.type || '')
  const handle = c.handles?.instagram || c.handles?.tiktok || ''
  const handleUrl = c.handles?.instagram
    ? `https://instagram.com/${c.handles.instagram}`
    : (c.handles?.tiktok ? `https://tiktok.com/@${c.handles.tiktok}` : null)

  const initials = (c.name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const photo = c.photo_url
    ? `<img src="${esc(c.photo_url)}" alt="${esc(c.name)}" style="width:218px;height:218px;border-radius:50%;object-fit:cover;display:block;" />`
    : `<div style="width:218px;height:218px;border-radius:50%;background:#E8E6E0;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:58px;color:${MUTED};">${esc(initials)}</div>`

  // ---- Left rail: headline stats -------------------------------------------
  // Followers is the sum of what's filled in, so a TikTok-first talent isn't
  // shown as having no audience.
  const totalFollowers = ['ig_followers', 'tiktok_followers', 'yt_subscribers']
    .reduce((sum, k) => sum + (Number(c[k]) || 0), 0)

  const headline = [
    compact(totalFollowers) && { v: compact(totalFollowers), c: 'Followers' },
    // Reach-based engagement is the number brands ask for; fall back to the
    // follower-based rate on the talent record when reach isn't known.
    pct(m.reach_engagement_rate) ? { v: pct(m.reach_engagement_rate), c: 'Reach engagement rate' }
      : (pct(c.engagement_rate) ? { v: pct(c.engagement_rate), c: 'Engagement rate' } : null),
    num(m.avg_link_clicks) && { v: num(m.avg_link_clicks), c: 'Avg link clicks' },
  ].filter(Boolean)

  const headlineCard = headline.length
    ? card(headline.map((s, i) => `<div style="${i ? 'margin-top:22px;' : ''}">${figure(s.v, s.c, '27px')}</div>`).join(''))
    : ''

  // ---- Left rail: audience --------------------------------------------------
  const ages = Array.isArray(a.ages) ? a.ages.filter(x => x && x.label && Number(x.pct)) : []
  const maxAge = ages.reduce((mx, x) => Math.max(mx, Number(x.pct)), 0) || 1
  const genderRow = (pct(a.female) || pct(a.male)) ? `
    <div style="display:flex;justify-content:space-between;font-size:11.5px;color:${INK};margin-bottom:${ages.length ? '16px' : '0'};">
      ${pct(a.female) ? `<span>Female <strong style="font-weight:600;">${esc(pct(a.female))}</strong></span>` : '<span></span>'}
      ${pct(a.male) ? `<span>Male <strong style="font-weight:600;">${esc(pct(a.male))}</strong></span>` : ''}
    </div>` : ''

  const ageRows = ages.map(x => `
    <div style="margin-bottom:11px;">
      <div style="display:flex;justify-content:space-between;font-size:10.5px;color:${INK};margin-bottom:5px;">
        <span style="color:${MUTED};">${esc(x.label)}</span>
        <strong style="font-weight:600;">${esc(Number(x.pct))}%</strong>
      </div>
      <div style="height:3px;background:#EDEBE5;border-radius:2px;overflow:hidden;">
        <div style="height:3px;width:${(Number(x.pct) / maxAge * 100).toFixed(1)}%;background:${ACCENT};border-radius:2px;"></div>
      </div>
    </div>`).join('')

  const audienceCard = (genderRow || ageRows)
    ? card(`${label('Audience')}<div style="margin-top:14px;">${genderRow}${ageRows}</div>`)
    : ''

  // ---- Right column: metrics grid ------------------------------------------
  const grid = [
    num(m.avg_views) && { v: num(m.avg_views), c: 'Avg views' },
    num(m.avg_engagement) && { v: num(m.avg_engagement), c: 'Avg engagement' },
    num(m.avg_story_reach) && { v: num(m.avg_story_reach), c: 'Avg story reach' },
    num(m.avg_story_views) && { v: num(m.avg_story_views), c: 'Avg story views' },
  ].filter(Boolean)

  const period = pitch.periodLabel || m.period || 'Last 30 days'
  const metricsBlock = grid.length ? `
    <div style="margin-top:26px;">
      ${label(`Metrics · ${period}`)}
      <div style="margin-top:11px;">
        ${card(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px 20px;">${grid.map(s => figure(s.v, s.c, '23px')).join('')}</div>`, '22px 24px')}
      </div>
    </div>` : ''

  // ---- Right column: deliverables & terms ----------------------------------
  // Deliverables and terms interleave into one two-column list, which is how the
  // reference sheet reads: what they make on the left, the conditions on the right.
  const deliverables = (pitch.deliverables || []).filter(Boolean)
  const terms = (pitch.terms || []).filter(Boolean)
  const pairs = []
  for (let i = 0; i < Math.max(deliverables.length, terms.length); i++) {
    pairs.push([deliverables[i], terms[i]])
  }
  const termsBlock = pairs.length ? `
    <div style="margin-top:26px;">
      ${label('Deliverables and terms')}
      <div style="margin-top:8px;">
        ${pairs.map(([d, t]) => `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:9px 0;border-bottom:0.5px solid ${RULE};">
            <div style="font-size:11.5px;color:${INK};line-height:1.5;">${esc(d || '')}</div>
            <div style="font-size:11.5px;color:${INK};line-height:1.5;">${esc(t || '')}</div>
          </div>`).join('')}
      </div>
    </div>` : ''

  // ---- Footer: the price ----------------------------------------------------
  const investment = money(pitch.investment)
  const footer = investment ? `
    <div style="margin-top:auto;padding-top:22px;border-top:1.5px solid ${ACCENT};display:flex;justify-content:space-between;align-items:flex-end;gap:30px;">
      <div style="max-width:300px;line-height:1.6;">${label(pitch.investmentNote || 'Total investment · all deliverables, usage and ownership included')}</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:46px;line-height:1;color:${ACCENT};letter-spacing:-0.02em;">${esc(investment)}</div>
    </div>` : ''

  // ---- Header ---------------------------------------------------------------
  // Business tier prints their own logo; everyone else gets the HQue wordmark
  // and the "Powered by" line, matching the roster export's branding rule.
  const headerMark = brand.businessBrand && brand.logoUrl
    ? `<img src="${esc(brand.logoUrl)}" alt="${esc(brand.agencyName || '')}" style="max-height:34px;max-width:190px;object-fit:contain;display:block;" />`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;letter-spacing:0.24em;color:${ACCENT};text-transform:uppercase;">${esc(brand.agencyName || 'HQue')}</div>`

  const eyebrow = pitch.client || types
  const poweredBy = !brand.businessBrand
    ? `<div style="text-align:center;margin-top:18px;font-size:8px;letter-spacing:0.16em;text-transform:uppercase;color:#B4AFA6;">Powered by HQue · h-que.com</div>`
    : ''

  const bioBlock = c.bio ? `
    <div>
      ${label('About')}
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:13.5px;line-height:1.72;color:${INK};margin-top:10px;white-space:pre-wrap;">${esc(c.bio)}</div>
    </div>` : ''

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${esc(c.name || 'Talent')} — One-pager</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{size:letter;margin:0;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${INK};background:${PAPER};-webkit-font-smoothing:antialiased;}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:${PAPER};}
    .sheet{box-shadow:none;margin:0;}
  }
  @media screen{ body{padding:28px 0;} .sheet{margin:0 auto;box-shadow:0 4px 26px rgba(0,0,0,0.13);} }
</style></head>
<body>
  <div class="sheet" style="width:8.5in;min-height:11in;background:${PAPER};padding:0.62in 0.66in 0.5in;display:flex;flex-direction:column;">

    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
      <div>
        ${eyebrow ? label(eyebrow) : ''}
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:41px;line-height:1.08;color:${ACCENT};margin-top:${eyebrow ? '9px' : '0'};letter-spacing:-0.015em;">${esc(c.name || '')}</div>
      </div>
      <div style="padding-top:6px;flex-shrink:0;">${headerMark}</div>
    </div>

    <div style="height:1px;background:${RULE};margin:20px 0 26px;"></div>

    <div style="display:grid;grid-template-columns:236px 1fr;gap:34px;align-items:start;">
      <div>
        <div style="margin-bottom:14px;">${photo}</div>
        ${(handle || c.location) ? `<div style="text-align:center;margin-bottom:20px;line-height:1.7;">
          ${handle ? `<a href="${esc(handleUrl || '#')}" style="font-size:11.5px;color:${MUTED};text-decoration:underline;">@${esc(handle)}</a>` : ''}
          ${c.location ? `<div style="font-size:10.5px;color:${MUTED};">${esc(c.location)}</div>` : ''}
        </div>` : ''}
        ${headlineCard}
        ${audienceCard ? `<div style="margin-top:14px;">${audienceCard}</div>` : ''}
      </div>

      <div>
        ${bioBlock}
        ${metricsBlock}
        ${termsBlock}
      </div>
    </div>

    ${footer}
  </div>
  ${poweredBy}
</body></html>`
}

// Opens the sheet in a new tab and triggers the print dialog. Called straight
// from a click so the browser doesn't treat the tab as a popup.
export function printOnePager(creator, pitch, brand) {
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(buildOnePagerHtml(creator, pitch, brand))
  win.document.close()
  // Give the photo a moment to load, or it prints as a blank circle.
  setTimeout(() => { try { win.focus(); win.print() } catch (e) { /* user closed the tab */ } }, 700)
  return true
}
