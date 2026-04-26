export default function Marquee({ children, speed = 30, direction = 'left' }) {
  const cls = direction === 'right' ? 'hque-marquee-r' : 'hque-marquee-l'
  return (
    <div className="hque-marquee-wrap overflow-hidden w-full">
      <div className={`hque-marquee-track flex w-max ${cls}`} style={{ animationDuration: `${speed}s` }}>
        <div className="flex flex-shrink-0">{children}</div>
        <div className="flex flex-shrink-0" aria-hidden="true">{children}</div>
      </div>
      <style>{`
        .hque-marquee-wrap:hover .hque-marquee-track { animation-play-state: paused; }
        .hque-marquee-l { animation-name: hque-marquee-left; animation-timing-function: linear; animation-iteration-count: infinite; }
        .hque-marquee-r { animation-name: hque-marquee-right; animation-timing-function: linear; animation-iteration-count: infinite; }
        @keyframes hque-marquee-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes hque-marquee-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  )
}
