/** Inline-SVG area/line trend chart with crosshair tooltip. Single series, one axis. */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'
import { fmtDate } from '@/shared/lib/format'

export interface TrendPoint { date: string; value: number }

export function TrendChart({ points, format, color = 'var(--c-brand)', height = 220, className, label }: {
  points: TrendPoint[]
  format: (v: number) => string
  color?: string
  height?: number
  className?: string
  label: string
}) {
  const gid = useId()
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  // measured plot width → how many x labels fit without overlapping (≈ 56px each)
  const [plotW, setPlotW] = useState(800)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => { const w = e?.contentRect.width ?? 0; if (w > 0) setPlotW(w) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const W = 800, H = height, PL = 8, PR = 8, PT = 16, PB = 28
  const max = Math.max(1, ...points.map((p) => p.value))
  const niceMax = niceCeil(max)
  const n = points.length
  const x = (i: number) => (n <= 1 ? W / 2 : PL + (i * (W - PL - PR)) / (n - 1))
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / niceMax)

  const path = useMemo(() => {
    if (!n) return { line: '', area: '' }
    const pts = points.map((p, i) => [x(i), y(p.value)] as const)
    let d = `M${pts[0]![0]},${pts[0]![1]}`
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]!, [x1, y1] = pts[i]!
      const cx = (x0 + x1) / 2
      d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`
    }
    const area = `${d} L${pts[pts.length - 1]![0]},${H - PB} L${pts[0]![0]},${H - PB} Z`
    return { line: d, area }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, niceMax, H])

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax)
  // narrow plots: compact tick labels ("8.5M") so the y axis never clips
  const longestTick = Math.max(...ticks.map((tv) => format(tv).length))
  const tickFmt = plotW < 480 || longestTick > 7 ? (v: number) => (v === 0 ? '0' : compactNumber.format(v)) : format
  const maxLabels = Math.max(2, Math.min(8, Math.floor(plotW / 56)))
  const labelEvery = Math.max(1, Math.ceil(n / maxLabels))
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || !n) return
    const px = ((e.clientX - rect.left) / rect.width) * W
    let best = 0, bd = Infinity
    for (let i = 0; i < n; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i } }
    setHover(best)
  }
  const hp = hover != null ? points[hover] : undefined

  return (
    <div className={cn('relative w-full min-w-0 pl-12', className)}>
      {/* y labels (HTML so they don't stretch) */}
      <div className="pointer-events-none absolute left-0 flex w-11 flex-col items-end justify-between text-[10.5px] tabular text-ink-3" style={{ top: PT - 7, bottom: PB - 7 }}>
        {[...ticks].reverse().map((tv) => <span key={tv}>{tickFmt(tv)}</span>)}
      </div>
      <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={label}>
        <defs>
          <linearGradient id={`${gid}-g`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((tv) => (
          <line key={tv} x1={PL} x2={W - PR} y1={y(tv)} y2={y(tv)} stroke="var(--c-line)" strokeWidth="1" strokeDasharray={tv === 0 ? undefined : '3 5'} vectorEffect="non-scaling-stroke" />
        ))}
        {n > 0 && (
          <>
            <motion.path d={path.area} fill={`url(#${gid}-g)`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
            <motion.path d={path.line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
          </>
        )}
        {hp && hover != null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} stroke="var(--c-ink-3)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <circle cx={x(hover)} cy={y(hp.value)} r="5" fill={color} stroke="var(--c-surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between gap-2 overflow-hidden px-1 text-[10.5px] tabular text-ink-3">
        {points.map((p, i) => (i % labelEvery === 0 || (i === n - 1 && (n - 1) % labelEvery >= labelEvery / 2) ? <span key={p.date} className="whitespace-nowrap">{fmtDate(p.date, 'dd.MM')}</span> : null))}
      </div>
      {hp && hover != null && (
        <div className="pointer-events-none absolute -translate-x-1/2 rounded-md border border-line bg-bg-elevated px-2.5 py-1.5 text-[12px] shadow-2" style={{ left: `${(x(hover) / W) * 100}%`, top: Math.max(0, y(hp.value) - 52) }}>
          <div className="text-ink-3">{fmtDate(hp.date, 'dd MMM')}</div>
          <div className="font-semibold tabular text-ink">{format(hp.value)}</div>
        </div>
      )}
      </div>
    </div>
  )
}

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

function niceCeil(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / p
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nf * p
}
