// Skeleton loading placeholders that roughly match each section's real layout,
// so navigation feels like the page is arriving rather than flashing bare text.
// Plain .jsx + inline styles to match the rest of the app; the shimmer keyframe
// is injected once into <head>.

if (typeof document !== 'undefined' && !document.getElementById('hque-shimmer-kf')) {
  const el = document.createElement('style')
  el.id = 'hque-shimmer-kf'
  el.textContent = '@keyframes hqueShimmer{0%{background-position:-450px 0}100%{background-position:450px 0}}'
  document.head.appendChild(el)
}

function tones(dark) {
  return {
    base: dark ? '#1E1E1E' : '#ECE9E4',
    hi: dark ? '#2A2A2A' : '#F6F4F0',
    card: dark ? '#141414' : '#FFFFFF',
    border: dark ? '#2A2A2A' : '#DBD7D0',
  }
}

// One shimmering block. w/h accept numbers (px) or strings (%, etc.).
export function SkBlock({ dark, w = '100%', h = 12, r = 4, style }) {
  const { base, hi } = tones(dark)
  return (
    <div aria-hidden style={{
      width: typeof w === 'number' ? `${w}px` : w,
      height: typeof h === 'number' ? `${h}px` : h,
      borderRadius: typeof r === 'number' ? `${r}px` : r,
      background: `linear-gradient(90deg, ${base} 25%, ${hi} 37%, ${base} 63%)`,
      backgroundSize: '450px 100%',
      animation: 'hqueShimmer 1.4s ease infinite',
      flexShrink: 0,
      ...style,
    }} />
  )
}

// A single placeholder card: square thumbnail + a few text lines + a footer row.
function CardSkel({ dark }) {
  const { card, border } = tones(dark)
  return (
    <div style={{ background: card, padding: '18px', borderRadius: '6px', border: `0.5px solid ${border}` }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <SkBlock dark={dark} w={64} h={64} r={6} />
        <div style={{ flex: 1, minWidth: 0, paddingTop: '4px' }}>
          <SkBlock dark={dark} w={70} h={8} style={{ marginBottom: '10px' }} />
          <SkBlock dark={dark} w="80%" h={13} style={{ marginBottom: '8px' }} />
          <SkBlock dark={dark} w="55%" h={10} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '20px', paddingTop: '10px', borderTop: `0.5px solid ${border}` }}>
        <div style={{ flex: 1 }}>
          <SkBlock dark={dark} w="50%" h={12} style={{ marginBottom: '6px' }} />
          <SkBlock dark={dark} w={44} h={8} />
        </div>
        <div style={{ flex: 1 }}>
          <SkBlock dark={dark} w="60%" h={12} style={{ marginBottom: '6px' }} />
          <SkBlock dark={dark} w={44} h={8} />
        </div>
      </div>
    </div>
  )
}

// A responsive grid of placeholder cards — matches the Campaigns / Talent grids.
export function CardGridSkeleton({ dark, count = 8, minCol = 280, isMobile = false }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : `repeat(auto-fill, minmax(${minCol}px, 1fr))`,
      gap: isMobile ? '12px' : '16px',
      alignContent: 'start',
      padding: isMobile ? '14px 14px 100px' : '20px 20px 100px',
    }}>
      {Array.from({ length: count }).map((_, i) => <CardSkel key={i} dark={dark} />)}
    </div>
  )
}

// Placeholder rows — matches list views (Inquiries, list layouts).
export function ListSkeleton({ dark, rows = 6 }) {
  const { border } = tones(dark)
  return (
    <div style={{ padding: '8px 28px 100px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 4px', borderTop: i === 0 ? 'none' : `0.5px solid ${border}` }}>
          <SkBlock dark={dark} w={44} h={44} r={4} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <SkBlock dark={dark} w="30%" h={12} style={{ marginBottom: '8px' }} />
            <SkBlock dark={dark} w="50%" h={9} />
          </div>
          <SkBlock dark={dark} w={70} h={10} />
        </div>
      ))}
    </div>
  )
}

// Reports: a row of stat tiles plus a couple of chart blocks.
export function ReportsSkeleton({ dark }) {
  const { card, border } = tones(dark)
  const tile = (key) => (
    <div key={key} style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '8px', padding: '16px' }}>
      <SkBlock dark={dark} w={60} h={8} style={{ marginBottom: '12px' }} />
      <SkBlock dark={dark} w="55%" h={22} style={{ marginBottom: '8px' }} />
      <SkBlock dark={dark} w="40%" h={8} />
    </div>
  )
  const chart = (key) => (
    <div key={key} style={{ background: card, border: `0.5px solid ${border}`, borderRadius: '8px', padding: '18px' }}>
      <SkBlock dark={dark} w="35%" h={11} style={{ marginBottom: '18px' }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '140px' }}>
        {[60, 90, 45, 120, 80, 105, 70].map((h, i) => <SkBlock key={i} dark={dark} w="100%" h={h} r={3} />)}
      </div>
    </div>
  )
  return (
    <div style={{ flex: 1, overflow: 'hidden', background: dark ? '#0D0D0D' : '#FFFFFF', padding: '28px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }}>
        <SkBlock dark={dark} w={90} h={30} r={20} />
        <SkBlock dark={dark} w={90} h={30} r={20} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[0, 1, 2, 3].map(tile)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {[0, 1].map(chart)}
      </div>
    </div>
  )
}

// Workspace kanban: a few columns, each with placeholder task cards.
export function BoardSkeleton({ dark, cols = 4 }) {
  const { border } = tones(dark)
  const colPanel = dark ? '#111' : '#F4F2EE'
  const cardBg = dark ? '#1A1A1A' : '#FFFFFF'
  return (
    <div style={{ display: 'flex', gap: '14px', flex: 1, overflow: 'hidden', padding: '14px 16px' }}>
      {Array.from({ length: cols }).map((_, c) => (
        <div key={c} style={{ flex: '0 0 270px', minWidth: '270px', background: colPanel, border: `0.5px solid ${border}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkBlock dark={dark} w={80} h={10} />
            <SkBlock dark={dark} w={18} h={18} r={9} />
          </div>
          <div style={{ padding: '4px 12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Array.from({ length: 3 - (c % 2) }).map((_, i) => (
              <div key={i} style={{ background: cardBg, border: `0.5px solid ${border}`, borderRadius: '6px', padding: '12px' }}>
                <SkBlock dark={dark} w="85%" h={11} style={{ marginBottom: '10px' }} />
                <SkBlock dark={dark} w="45%" h={8} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
