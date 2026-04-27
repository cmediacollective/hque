import { useEffect, useRef, useState } from 'react'
import useSEO from './useSEO'
import Cursor from './components/marketing/Cursor'
import HoverRevealList from './components/marketing/HoverRevealList'

const VBASE = 'https://wxdxkbhnfaamxpbpulrg.supabase.co/storage/v1/object/public/talent-videos/'

const ALL_VIDEOS = [
  VBASE + 'Annie.mp4',
  VBASE + 'Brittk.mp4',
  VBASE + 'Delayna.mp4',
  VBASE + 'JackLeius.mp4',
  VBASE + 'Mariah.mp4',
  VBASE + 'Michelle.mp4',
  VBASE + 'Needed.mp4',
  VBASE + 'Olivia.mp4',
  VBASE + 'Sparks.mp4',
  VBASE + 'Traci.mp4',
]

const ALL_VIDEOS_REV = [...ALL_VIDEOS].reverse()

const TYPES = [
  { label: 'Influencer', video: VBASE + 'Mariah.mp4' },
  { label: 'UGC', video: VBASE + 'Brittk.mp4' },
  { label: 'Actor', video: VBASE + 'Olivia.mp4' },
  { label: 'Public Figure', video: VBASE + 'Traci.mp4' },
  { label: 'Sports', video: VBASE + 'Sparks.mp4' },
  { label: 'Athlete', video: VBASE + 'Michelle.mp4' },
  { label: 'Podcast', video: VBASE + 'JackLeius.mp4' },
  { label: 'Speaker / Host', video: VBASE + 'Delayna.mp4' },
]

const REVEALS = [
  { label: 'roster.', image: '/marketing/reveals/01.jpg', caption: 'profiles, rates, history. all of them, all the time.' },
  { label: 'campaigns.', image: '/marketing/reveals/02.jpg', caption: 'pitch to payment, in one thread.' },
  { label: 'workspace.', image: '/marketing/reveals/03.jpg', caption: 'a kanban for the team, brand by brand.' },
  { label: 'reports.', image: '/marketing/reveals/04.jpg', caption: 'who earned what, who still owes.' },
  { label: 'inquiries.', image: '/marketing/reveals/05.jpg', caption: 'the form clients actually fill in.' },
]

const PLANS = [
  { name: 'starter', price: '$49', desc: 'up to fifty talent, two seats. for the agency just getting started.' },
  { name: 'pro', price: '$99', desc: 'unlimited talent, five seats, reports. for the agency growing fast.' },
  { name: 'agency', price: '$199', desc: 'unlimited everything. for the agency running point on all of it.' },
]

function HeroVideoColumn({ videos, durationSec, reverse = false }) {
  return (
    <div className="hque-hero-vcol">
      <div className={reverse ? 'hque-vscroll-down' : 'hque-vscroll-up'} style={{ animationDuration: `${durationSec}s` }}>
        {[...videos, ...videos].map((v, i) => (
          <div key={i} className="hque-vtile" style={{ aspectRatio: '9 / 16' }}>
            <video src={v} autoPlay muted loop playsInline className="w-full h-full object-cover block" />
          </div>
        ))}
      </div>
    </div>
  )
}

function TypesGrid() {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [stableIdx, setStableIdx] = useState(0)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (min-width: 768px)')
    const update = () => setEnabled(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (hoverIdx !== null) setStableIdx(hoverIdx)
  }, [hoverIdx])

  useEffect(() => {
    if (!enabled) return
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0
    const onMove = e => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      tx = e.clientX - rect.left
      ty = e.clientY - rect.top
    }
    const tick = () => {
      cx += (tx - cx) * 0.12
      cy += (ty - cy) * 0.12
      const el = videoRef.current
      if (el) el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('mousemove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
    }
  }, [enabled])

  return (
    <section ref={containerRef} className="relative px-6 md:px-12 lg:px-20 py-24 md:py-32">
      <div className="text-[12px] tracking-[0.18em] uppercase text-muted mb-12">02 / talent we work with</div>

      <div className="flex flex-wrap gap-x-8 md:gap-x-10 gap-y-3">
        {TYPES.map((t, i) => {
          const dim = hoverIdx !== null && hoverIdx !== i
          return (
            <div
              key={t.label}
              data-cursor="hover"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(prev => (prev === i ? null : prev))}
              className="font-display italic text-ink leading-[0.95] tracking-tight cursor-pointer transition-opacity duration-300"
              style={{
                fontSize: 'clamp(36px, 5.5vw, 80px)',
                opacity: dim ? 0.25 : 1,
              }}
            >
              {t.label}.
            </div>
          )
        })}
      </div>

      {!enabled && (
        <div className="mt-12 grid grid-cols-2 gap-3">
          {TYPES.map(t => (
            <div key={t.label} className="relative" style={{ aspectRatio: '9 / 16' }}>
              <video src={t.video} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {enabled && (
        <div
          ref={videoRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: '300px',
            aspectRatio: '9 / 16',
            opacity: hoverIdx !== null ? 1 : 0,
            transition: 'opacity 0.4s ease',
            willChange: 'transform',
          }}
          aria-hidden="true"
        >
          {TYPES.map((t, i) => (
            <video
              key={t.label}
              src={t.video}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: i === stableIdx ? 1 : 0, transition: 'opacity 0.3s ease' }}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default function LandingPage({ onGetStarted, onSignIn }) {
  useSEO({
    title: 'HQue. Agency OS for talent and the people who book them.',
    description: 'HQue is the operating system for talent agencies and the brands that book them. Roster, campaigns, contracts, payments, reports. All in one place.',
    canonical: 'https://h-que.com',
  })

  return (
    <div className="bg-cream text-ink font-sans min-h-screen">
      <Cursor />

      <style>{`
        .hque-hero-vcol { overflow: hidden; height: 100%; }
        .hque-hero-vcol > div { display: flex; flex-direction: column; gap: 8px; will-change: transform; }
        .hque-vscroll-up { animation: hque-vscroll-up linear infinite; }
        .hque-vscroll-down { animation: hque-vscroll-down linear infinite; }
        @keyframes hque-vscroll-up { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @keyframes hque-vscroll-down { from { transform: translateY(-50%); } to { transform: translateY(0); } }
        .hque-vtile { width: 100%; overflow: hidden; flex-shrink: 0; filter: grayscale(100%); transition: filter 0.4s ease; }
        .hque-vtile:hover { filter: grayscale(0%); }
      `}</style>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-6 md:px-12 lg:px-20 py-5 flex items-center justify-between bg-cream/85 backdrop-blur-sm">
        <a href="/" className="block">
          <img src="/logo-dark.svg" alt="HQue" className="w-20 md:w-[100px] h-auto" />
        </a>
        <div className="flex items-center gap-5 md:gap-7 text-[14px]">
          <button
            onClick={onSignIn}
            className="underline underline-offset-4 hover:text-accent transition-colors bg-transparent p-0 cursor-pointer"
          >
            Sign in
          </button>
          <button
            onClick={onGetStarted}
            className="hover:text-accent transition-colors bg-transparent p-0 cursor-pointer font-medium"
          >
            Start free
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col px-6 md:px-12 lg:px-20 pt-28 md:pt-32 pb-12">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-10 min-h-0">
          <div className="md:col-span-8 flex items-end">
            <h1
              className="font-display italic leading-[1.02] tracking-tight text-ink"
              style={{ fontSize: 'clamp(34px, 6.2vw, 88px)' }}
            >
              <span className="block whitespace-nowrap">Every talent.</span>
              <span className="block whitespace-nowrap">Every campaign.</span>
              <span className="block whitespace-nowrap">Every conversation.</span>
              <span className="block whitespace-nowrap text-accent">One place.</span>
            </h1>
          </div>
          <div className="md:col-span-4 flex flex-col gap-6 min-h-0">
            <div className="flex-1 grid grid-cols-2 gap-2 min-h-[280px] md:min-h-0">
              <HeroVideoColumn videos={ALL_VIDEOS} durationSec={70} />
              <HeroVideoColumn videos={ALL_VIDEOS_REV} durationSec={85} reverse />
            </div>
            <p className="text-[14px] leading-[1.7] max-w-md">
              HQue is the operating system for talent agencies and the brands that book them. Roster, campaigns, contracts, payments, reports. Every conversation, every deliverable, every line item, kept in one place. Built by a working agency, not a venture-funded committee, and shaped by the way real bookings actually happen. Free for fourteen days. No card required, no contracts.
            </p>
            <div className="text-[12px] tracking-[0.18em] uppercase text-muted">
              (scroll) ↓
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 01 — what it does */}
      <section id="what" className="min-h-screen px-6 md:px-12 lg:px-20 py-20 flex flex-col">
        <div className="text-[12px] tracking-[0.18em] uppercase text-muted mb-12">01 / what it does</div>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-4xl">
            <HoverRevealList items={REVEALS} />
          </div>
        </div>
      </section>

      {/* SECTION 02 — talent types */}
      <TypesGrid />

      {/* SECTION 03 — fees */}
      <section id="fees" className="px-6 md:px-12 lg:px-20 py-20 md:py-24">
        <div className="max-w-4xl">
          <div className="text-[12px] tracking-[0.18em] uppercase text-muted mb-10">03 / fees</div>
          <div className="space-y-10">
            {PLANS.map(p => (
              <a
                key={p.name}
                href="/pricing"
                className="block group transition-colors"
              >
                <div className="flex items-baseline justify-between gap-8">
                  <div className="font-display italic leading-none" style={{ fontSize: 'clamp(36px, 5.5vw, 56px)' }}>{p.name}</div>
                  <div className="flex items-baseline gap-4">
                    <div className="font-display leading-none" style={{ fontSize: 'clamp(36px, 5.5vw, 56px)' }}>{p.price}</div>
                    <span className="text-[24px] text-ink/30 group-hover:text-accent transition-all duration-300 group-hover:translate-x-1 inline-block">→</span>
                  </div>
                </div>
                <div className="text-[12px] tracking-wide text-muted mt-3 group-hover:text-ink transition-colors">{p.desc}</div>
              </a>
            ))}
          </div>
          <div className="mt-12 text-[12px] tracking-[0.14em] uppercase flex flex-wrap items-baseline gap-4">
            <button onClick={onGetStarted} className="underline underline-offset-4 hover:text-accent transition-colors bg-transparent p-0 cursor-pointer uppercase">
              start fourteen days free
            </button>
            <span className="text-muted">/</span>
            <span className="text-muted">no card required.</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-12 lg:px-20 pt-16 md:pt-20 pb-8 border-t border-ink/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-12 mb-12">
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="block mb-4"><img src="/logo-dark.svg" alt="HQue" className="w-[100px] h-auto" /></a>
            <div className="text-[12px] text-muted leading-relaxed max-w-xs">
              the operating system for talent agencies and the brands that book them.
            </div>
            <div className="flex gap-3 mt-5">
              <a href="https://instagram.com/theofficialHQue" target="_blank" rel="noreferrer" aria-label="Instagram" className="text-ink hover:text-accent transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
              </a>
              <a href="https://www.linkedin.com/company/h-que" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="text-ink hover:text-accent transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>
          <div>
            <div className="text-[12px] tracking-[0.18em] uppercase text-muted mb-3">product</div>
            <a href="#what" className="block text-[12px] mb-2 hover:text-accent transition-colors">features</a>
            <a href="/pricing" className="block text-[12px] mb-2 hover:text-accent transition-colors">pricing</a>
          </div>
          <div>
            <div className="text-[12px] tracking-[0.18em] uppercase text-muted mb-3">resources</div>
            <a href="/faq" className="block text-[12px] mb-2 hover:text-accent transition-colors">faq</a>
            <a href="/blog" className="block text-[12px] mb-2 hover:text-accent transition-colors">the pitch</a>
          </div>
          <div>
            <div className="text-[12px] tracking-[0.18em] uppercase text-muted mb-3">legal</div>
            <a href="/privacy" className="block text-[12px] mb-2 hover:text-accent transition-colors">privacy</a>
            <a href="/terms" className="block text-[12px] mb-2 hover:text-accent transition-colors">terms</a>
            <a href="mailto:support@h-que.com" className="block text-[12px] hover:text-accent transition-colors">support@h-que.com</a>
          </div>
        </div>
        <div className="border-t border-ink/10 pt-6 flex flex-col md:flex-row justify-between gap-2 text-[11px] text-muted">
          <span>© 2026 hque. all rights reserved.</span>
          <span>designed and developed in los angeles.</span>
        </div>
      </footer>
    </div>
  )
}
