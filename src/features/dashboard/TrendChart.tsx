/**
 * Inline SVG area chart (no chart lib). Single series, one axis, smooth
 * monotone path, faint grid, gradient fill from currentColor, hover crosshair
 * + tooltip. Colour comes from the parent via `text-brand`/`text-*` (currentColor).
 */
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from 'react'
import { motion } from 'motion/react'
import { fmtDate } from '@/shared/lib/format'

export interface TrendPoint { date: string; value: number }

/** the SVG is drawn in CSS pixels: width follows the container (ResizeObserver), height grows gently with it — text never scales */
const heightFor = (w: number) => Math.round(Math.min(320, Math.max(190, w * 0.28)))
const PAD = { top: 12, right: 12, bottom: 24, left: 8 }

function monotonePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0]!.x},${pts[0]!.y}` : ''
  const n = pts.length
  const dx = pts.map((p, i) => (i < n - 1 ? pts[i + 1]!.x - p.x : 0))
  const dy = pts.map((p, i) => (i < n - 1 ? pts[i + 1]!.y - p.y : 0))
  const m = pts.map((_, i) => {
    if (i === 0) return dy[0]! / (dx[0]! || 1)
    if (i === n - 1) return dy[n - 2]! / (dx[n - 2]! || 1)
    const s0 = dy[i - 1]! / (dx[i - 1]! || 1)
    const s1 = dy[i]! / (dx[i]! || 1)
    return s0 * s1 <= 0 ? 0 : (s0 + s1) / 2
  })
  let d = `M${pts[0]!.x},${pts[0]!.y}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i]!, p1 = pts[i + 1]!
    const h = (p1.x - p0.x) / 3
    d += ` C${p0.x + h},${p0.y + m[i]! * h} ${p1.x - h},${p1.y - m[i + 1]! * h} ${p1.x},${p1.y}`
  }
  return d
}

const nice = (max: number) => {
  if (max <= 0) return 4
  const p = 10 ** Math.floor(Math.log10(max))
  const f = max / p
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return step * p
}

export function TrendChart({ data, format, className, label }: { data: TrendPoint[]; format: (v: number) => string; className?: string; label: string }) {
  const gid = useId()
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(600)
  const H = heightFor(W)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => { const w = Math.round(e?.contentRect.width ?? 0); if (w > 0) setW(Math.max(200, w)) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const geo = useMemo(() => {
    const max = nice(Math.max(0, ...data.map((d) => d.value)))
    const iw = W - PAD.left - PAD.right
    const ih = H - PAD.top - PAD.bottom
    const step = data.length > 1 ? iw / (data.length - 1) : 0
    const pts = data.map((d, i) => ({ x: PAD.left + (data.length > 1 ? i * step : iw / 2), y: PAD.top + ih - (d.value / max) * ih }))
    const line = monotonePath(pts)
    const area = pts.length ? `${line} L${pts[pts.length - 1]!.x},${PAD.top + ih} L${pts[0]!.x},${PAD.top + ih} Z` : ''
    const ticks = [0, 0.5, 1].map((f) => ({ y: PAD.top + ih - f * ih, v: max * f }))
    const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 56))))
    const xLabels = data.map((d, i) => ({ x: pts[i]!.x, label: fmtDate(d.date, 'dd.MM'), show: i % every === 0 || i === data.length - 1 }))
    return { pts, area, line, ticks, xLabels }
  }, [data, W, H])
  const { pts, area, line, ticks, xLabels } = geo

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r || !pts.length) return
    const x = ((e.clientX - r.left) / r.width) * W
    let best = 0
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i]!.x - x) < Math.abs(pts[best]!.x - x)) best = i
    setHover(best)
  }

  const h = hover != null ? { p: pts[hover]!, d: data[hover]! } : null
  const tipLeft = h ? Math.min(Math.max((h.p.x / W) * 100, 12), 88) : 0

  return (
    <div className={className}>
      <div ref={boxRef} className="relative w-full min-w-0">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full overflow-visible touch-pan-y" role="img" aria-label={label} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tk) => (
            <g key={tk.y}>
              <line x1={PAD.left} x2={W - PAD.right} y1={tk.y} y2={tk.y} className="stroke-line" strokeDasharray="2 4" strokeWidth="1" />
              <text x={W - PAD.right} y={tk.y - 4} textAnchor="end" className="fill-ink-3 tabular" fontSize="10">{format(tk.v)}</text>
            </g>
          ))}
          {xLabels.filter((l) => l.show).map((l) => (
            <text key={l.x} x={l.x} y={H - 6} textAnchor="middle" className="fill-ink-3 tabular" fontSize="10">{l.label}</text>
          ))}
          <motion.path d={area} fill={`url(#${gid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
          <motion.path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
          {h && (
            <g>
              <line x1={h.p.x} x2={h.p.x} y1={PAD.top} y2={H - PAD.bottom} className="stroke-line-strong" strokeWidth="1" />
              <circle cx={h.p.x} cy={h.p.y} r="5" fill="currentColor" className="stroke-surface" strokeWidth="2" />
            </g>
          )}
        </svg>
        {h && (
          <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border border-line bg-bg-elevated px-2.5 py-1.5 text-[12px] shadow-2 whitespace-nowrap" style={{ left: `${tipLeft}%`, top: `${(h.p.y / H) * 100}%` }}>
            <div className="text-ink-3">{fmtDate(h.d.date, 'dd MMM')}</div>
            <div className="font-semibold text-ink tabular">{format(h.d.value)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
