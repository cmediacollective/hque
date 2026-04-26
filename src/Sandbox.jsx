import Cursor from './components/marketing/Cursor'
import HoverRevealList from './components/marketing/HoverRevealList'
import Marquee from './components/marketing/Marquee'

const REVEAL_ITEMS = [
  { label: 'Mineral Beauty', image: 'https://images.unsplash.com/photo-1522335789203-aaa3a0b1a4f5?w=600&h=800&fit=crop', caption: 'Spring 2026 — 4 talent' },
  { label: 'High Athletics', image: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600&h=800&fit=crop', caption: 'In-store activation — 3 talent' },
  { label: 'New Skin', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&h=800&fit=crop', caption: 'Oceanside launch — 2 talent' },
  { label: 'Earth Foods', image: 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=600&h=800&fit=crop', caption: 'Creator series — 5 talent' },
  { label: 'Lumière Studio', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=800&fit=crop', caption: 'Holiday capsule — 6 talent' },
]

const LOGOS = ['Mineral', 'High Athletics', 'New Skin', 'Earth Foods', 'Lumière', 'Maven', 'Nord', 'Dusk Beauty']

function Section({ label, title, children }) {
  return (
    <section className="border-t border-ink/15 py-20 md:py-28 px-6 md:px-12 lg:px-20">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-baseline gap-6 mb-12">
          <span className="font-mono text-caption tracking-wide text-muted uppercase">{label}</span>
          <span className="font-mono text-caption tracking-wide text-muted">— {title}</span>
        </div>
        {children}
      </div>
    </section>
  )
}

export default function Sandbox() {
  return (
    <div className="bg-cream text-ink font-sans min-h-screen">
      <Cursor />

      <header className="px-6 md:px-12 lg:px-20 pt-16 pb-8 max-w-[1440px] mx-auto">
        <div className="font-mono text-caption tracking-wide text-muted uppercase mb-4">Component sandbox</div>
        <h1 className="font-display italic text-h2 leading-[1.05] tracking-tight">
          Marketing primitives, in isolation.
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Three components from phase 2 of the marketing redesign. Hover to test the cursor and the reveal list.
          Reduce window width to see the mobile fallback.
        </p>
      </header>

      <Section label="01" title="Cursor — replaces system cursor on this page">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-muted mb-6">Move your cursor anywhere on the page. It's an 8px ink dot by default. Hover any of the items below — the dot expands into a 40px outlined circle.</p>
            <ul className="space-y-4">
              <li><a href="#" className="font-display italic text-2xl underline underline-offset-4">A regular link</a></li>
              <li data-cursor="hover" className="font-display italic text-2xl">An item with data-cursor="hover"</li>
              <li data-cursor="hover" className="font-display italic text-2xl">Another reveal-style row</li>
              <li><a href="#" className="font-display italic text-2xl underline underline-offset-4">One more link, for good measure</a></li>
            </ul>
          </div>
          <div className="font-mono text-caption tracking-wide text-muted uppercase leading-relaxed">
            <div>· position: transform translate3d only</div>
            <div>· lerp 0.18 toward target each frame</div>
            <div>· no useState on mousemove (refs only)</div>
            <div>· hidden when (hover: none)</div>
            <div>· body cursor:none only while mounted</div>
          </div>
        </div>
      </Section>

      <Section label="02" title="HoverRevealList — artworld.agency pattern">
        <div className="max-w-3xl">
          <HoverRevealList items={REVEAL_ITEMS} />
        </div>
      </Section>

      <Section label="03" title="Marquee — pause on hover, two directions">
        <div className="space-y-12">
          <div>
            <div className="font-mono text-caption tracking-wide text-muted uppercase mb-4">Default — 30s, left</div>
            <Marquee>
              {LOGOS.map(l => (
                <span key={l} className="font-display italic text-4xl px-10 whitespace-nowrap">{l}</span>
              ))}
            </Marquee>
          </div>
          <div>
            <div className="font-mono text-caption tracking-wide text-muted uppercase mb-4">Faster — 18s, right</div>
            <Marquee speed={18} direction="right">
              {LOGOS.map(l => (
                <span key={l} className="font-mono text-caption tracking-wide uppercase px-8 whitespace-nowrap">{l}</span>
              ))}
            </Marquee>
          </div>
          <div>
            <div className="font-mono text-caption tracking-wide text-muted uppercase mb-4">Pull-quote — 45s, left</div>
            <Marquee speed={45}>
              <span className="font-display italic text-h2 leading-none px-12 whitespace-nowrap">Run your roster, not your inbox.</span>
              <span className="font-display italic text-h2 leading-none px-12 whitespace-nowrap text-muted">— a working tagline</span>
              <span className="font-display italic text-h2 leading-none px-12 whitespace-nowrap">Run your roster, not your inbox.</span>
              <span className="font-display italic text-h2 leading-none px-12 whitespace-nowrap text-muted">— a working tagline</span>
            </Marquee>
          </div>
        </div>
      </Section>

      <footer className="border-t border-ink/15 py-12 px-6 md:px-12 lg:px-20">
        <div className="max-w-[1440px] mx-auto font-mono text-caption tracking-wide text-muted uppercase">
          End of sandbox · Not wired into any production page
        </div>
      </footer>
    </div>
  )
}
