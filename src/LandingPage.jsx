import useSEO from './useSEO'
import Cursor from './components/marketing/Cursor'
import HoverRevealList from './components/marketing/HoverRevealList'

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
      <nav className="fixed top-0 left-0 right-0 z-40 px-6 md:px-12 lg:px-20 py-6 flex items-baseline justify-between bg-cream/80 backdrop-blur-sm">
        <a href="/" className="font-display italic text-2xl leading-none tracking-tight">HQue</a>
        <div className="font-mono text-[14px] flex items-baseline gap-3 md:gap-5">
          <a href="#what" className="text-ink hover:text-accent transition-colors">talent</a>
          <span className="text-muted">/</span>
          <a href="#fees" className="text-ink hover:text-accent transition-colors">workspace</a>
          <span className="text-muted hidden md:inline mx-2">·</span>
          <button onClick={onSignIn} className="underline underline-offset-4 text-ink hover:text-accent transition-colors bg-transparent p-0 cursor-pointer font-mono">sign in</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col px-6 md:px-12 lg:px-20 pt-32 pb-12">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-8">
          <div className="md:col-span-3 flex items-end">
            <h1
              className="font-display italic leading-[0.95] tracking-tight text-ink"
              style={{ fontSize: 'clamp(48px, 11vw, 168px)' }}
            >
              a workspace for talent. and the people who book them.
            </h1>
          </div>
          <div className="md:col-span-2 flex flex-col justify-end gap-12">
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
        <div className="font-mono text-caption tracking-wide uppercase text-accent mb-12">01 / what it does</div>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-4xl">
            <HoverRevealList items={REVEALS} />
          </div>
        </div>
      </section>

      {/* SECTION 02 — full-bleed editorial image */}
      <section className="my-20 md:my-32">
        <img src="/marketing/editorial-01.jpg" alt="" className="w-full block" />
        <div className="px-6 md:px-12 lg:px-20 mt-4 font-mono text-caption tracking-wide uppercase text-muted">
          inside a talent agency on a tuesday morning. los angeles, march.
        </div>
      </section>

      {/* SECTION 03 — fees */}
      <section id="fees" className="px-6 md:px-12 lg:px-20 py-24 md:py-32">
        <div className="font-mono text-caption tracking-wide uppercase text-muted mb-16">fees</div>
        <div className="space-y-16">
          {PLANS.map(p => (
            <div key={p.name}>
              <div className="flex items-baseline justify-between gap-8">
                <div className="font-display italic leading-none" style={{ fontSize: 'clamp(36px, 5.5vw, 56px)' }}>{p.name}</div>
                <div className="font-display leading-none" style={{ fontSize: 'clamp(36px, 5.5vw, 56px)' }}>{p.price}</div>
              </div>
              <div className="font-mono text-[12px] tracking-wide text-muted mt-4">{p.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-20 font-mono text-[12px] tracking-wide flex flex-wrap items-baseline gap-3">
          <button onClick={onGetStarted} className="underline underline-offset-4 hover:text-accent transition-colors bg-transparent p-0 cursor-pointer font-mono uppercase">
            start fourteen days free
          </button>
          <span className="text-muted">/</span>
          <span className="text-muted uppercase">no card required.</span>
        </div>
      </section>

      {/* SECTION 04 — second editorial */}
      <section className="my-20 md:my-32">
        <img src="/marketing/editorial-02.jpg" alt="" className="w-full block" />
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-12 lg:px-20 pt-20 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 font-mono text-[12px] mb-20 md:mb-28">
          <div className="space-y-1">
            <a href="mailto:support@h-que.com" className="block hover:text-accent transition-colors">support@h-que.com</a>
            <a href="https://instagram.com/theofficialHQue" target="_blank" rel="noreferrer" className="block hover:text-accent transition-colors">@theofficialhque</a>
          </div>
          <div>designed and developed in los angeles.</div>
          <div className="space-y-1 md:text-right">
            <a href="/terms" className="block hover:text-accent transition-colors">terms</a>
            <a href="/privacy" className="block hover:text-accent transition-colors">privacy</a>
          </div>
        </div>
        <div
          className="font-display leading-[0.82]"
          style={{ fontSize: 'clamp(120px, 36vw, 640px)', letterSpacing: '-0.04em', marginLeft: '-0.03em' }}
        >
          HQue
        </div>
      </footer>
    </div>
  )
}
