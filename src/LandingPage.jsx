import { useEffect, useRef, useState } from 'react'
import useSEO from './useSEO'
import Cursor from './components/marketing/Cursor'
import HoverRevealList from './components/marketing/HoverRevealList'

const VBASE = 'https://wxdxkbhnfaamxpbpulrg.supabase.co/storage/v1/object/public/talent-videos/'

const HERO_VIDEOS = [VBASE + 'Annie.mp4', VBASE + 'Brittk.mp4', VBASE + 'Olivia.mp4']

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

function PinnedTypes() {
  const sectionRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const sec = sectionRef.current
      if (!sec) return
      const rect = sec.getBoundingClientRect()
      const total = sec.offsetHeight - window.innerHeight
      if (total <= 0) return
      const scrolled = -rect.top
      const progress = Math.max(0, Math.min(0.999, scrolled / total))
      setActiveIdx(Math.floor(progress * TYPES.length))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section ref={sectionRef} style={{ height: `${TYPES.length * 70}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col bg-cream">
        <div className="px-6 md:px-12 lg:px-20 pt-24 md:pt-28">
          <div className="font-mono text-caption tracking-wide uppercase text-muted">02 / talent we work with</div>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-8 items-center px-6 md:px-12 lg:px-20 pb-24">
          <div className="md:col-span-3 order-2 md:order-1">
            <div
              className="font-display italic text-ink leading-[0.95] tracking-tight"
              style={{ fontSize: 'clamp(56px, 11vw, 168px)' }}
            >
              {TYPES[activeIdx].label}.
            </div>
            <div className="mt-6 font-mono text-caption tracking-wide uppercase text-muted">
              {String(activeIdx + 1).padStart(2, '0')} / {String(TYPES.length).padStart(2, '0')}
            </div>
          </div>
          <div className="md:col-span-2 order-1 md:order-2 relative w-full" style={{ aspectRatio: '7 / 9' }}>
            {TYPES.map((t, i) => (
              <video
                key={t.label}
                src={t.video}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                style={{ opacity: i === activeIdx ? 1 : 0 }}
              />
            ))}
          </div>
        </div>
      </div>
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

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-6 md:px-12 lg:px-20 py-5 flex items-center justify-between bg-cream/85 backdrop-blur-sm">
        <a href="/" className="block">
          <img src="/logo-dark.svg" alt="HQue" className="h-6 md:h-7 w-auto" />
        </a>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={onSignIn}
            className="px-4 md:px-5 py-2 font-mono text-[10px] tracking-[0.18em] uppercase border border-ink/30 text-ink hover:border-ink hover:bg-ink hover:text-cream transition-colors"
          >
            sign in
          </button>
          <button
            onClick={onGetStarted}
            className="px-4 md:px-5 py-2 font-mono text-[10px] tracking-[0.18em] uppercase bg-accent text-cream hover:bg-ink transition-colors"
          >
            start free
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col px-6 md:px-12 lg:px-20 pt-28 md:pt-32 pb-12">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-8">
          <div className="md:col-span-3 flex items-end">
            <h1
              className="font-display italic leading-[0.95] tracking-tight text-ink"
              style={{ fontSize: 'clamp(48px, 11vw, 168px)' }}
            >
              Every talent.<br />
              Every campaign.<br />
              Every conversation.<br />
              <span className="text-accent">One place.</span>
            </h1>
          </div>
          <div className="md:col-span-2 flex flex-col justify-end gap-8">
            <div className="grid grid-cols-3 gap-2">
              {HERO_VIDEOS.map(v => (
                <div key={v} className="relative overflow-hidden" style={{ aspectRatio: '7 / 9' }}>
                  <video src={v} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-[14px] leading-[1.7] max-w-md">
              HQue is the operating system for talent agencies and the brands that book them. Roster, campaigns, contracts, payments, reports. Every conversation, every deliverable, every line item, kept in one place. Built by a working agency, not a venture-funded committee, and shaped by the way real bookings actually happen. Free for fourteen days. No card required, no contracts.
            </p>
            <div className="font-mono text-caption tracking-wide uppercase text-muted">
              (scroll) ↓
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 01 — what it does */}
      <section id="what" className="min-h-screen px-6 md:px-12 lg:px-20 py-20 flex flex-col">
        <div className="font-mono text-caption tracking-wide uppercase text-muted mb-12">01 / what it does</div>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-4xl">
            <HoverRevealList items={REVEALS} />
          </div>
        </div>
      </section>

      {/* SECTION 02 — pinned-scroll talent types */}
      <PinnedTypes />

      {/* SECTION 03 — fees */}
      <section id="fees" className="px-6 md:px-12 lg:px-20 py-20 md:py-24">
        <div className="max-w-4xl">
          <div className="font-mono text-caption tracking-wide uppercase text-muted mb-10">03 / fees</div>
          <div className="space-y-10">
            {PLANS.map(p => (
              <div key={p.name}>
                <div className="flex items-baseline justify-between gap-8">
                  <div className="font-display italic leading-none" style={{ fontSize: 'clamp(36px, 5.5vw, 56px)' }}>{p.name}</div>
                  <div className="font-display leading-none" style={{ fontSize: 'clamp(36px, 5.5vw, 56px)' }}>{p.price}</div>
                </div>
                <div className="font-mono text-[12px] tracking-wide text-muted mt-3">{p.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-12 font-mono text-[12px] tracking-[0.14em] uppercase flex flex-wrap items-baseline gap-4">
            <a href="/pricing" className="underline underline-offset-4 hover:text-accent transition-colors">→ see all features</a>
            <span className="text-muted">/</span>
            <button onClick={onGetStarted} className="underline underline-offset-4 hover:text-accent transition-colors bg-transparent p-0 cursor-pointer font-mono uppercase">
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
            <a href="/" className="block mb-4"><img src="/logo-dark.svg" alt="HQue" className="h-7 w-auto" /></a>
            <div className="font-mono text-[12px] text-muted leading-relaxed max-w-xs">
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
            <div className="font-mono text-caption tracking-wide uppercase text-muted mb-3">product</div>
            <a href="#what" className="block font-mono text-[12px] mb-2 hover:text-accent transition-colors">features</a>
            <a href="/pricing" className="block font-mono text-[12px] mb-2 hover:text-accent transition-colors">pricing</a>
          </div>
          <div>
            <div className="font-mono text-caption tracking-wide uppercase text-muted mb-3">resources</div>
            <a href="/faq" className="block font-mono text-[12px] mb-2 hover:text-accent transition-colors">faq</a>
            <a href="/blog" className="block font-mono text-[12px] mb-2 hover:text-accent transition-colors">the pitch</a>
          </div>
          <div>
            <div className="font-mono text-caption tracking-wide uppercase text-muted mb-3">legal</div>
            <a href="/privacy" className="block font-mono text-[12px] mb-2 hover:text-accent transition-colors">privacy</a>
            <a href="/terms" className="block font-mono text-[12px] mb-2 hover:text-accent transition-colors">terms</a>
            <a href="mailto:support@h-que.com" className="block font-mono text-[12px] hover:text-accent transition-colors">support@h-que.com</a>
          </div>
        </div>
        <div className="border-t border-ink/10 pt-6 flex flex-col md:flex-row justify-between gap-2 font-mono text-[11px] text-muted">
          <span>© 2026 hque. all rights reserved.</span>
          <span>designed and developed in los angeles.</span>
        </div>
      </footer>
    </div>
  )
}
