/** Inline-SVG donut for the top-N share with a legend and hover highlight. */
import { useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'
import { fmtNumber } from '@/shared/lib/format'

export interface DonutSlice { name: string; value: number; color: string }

export function DonutChart({ slices, centerLabel, centerValue, format = fmtNumber, className }: {
  slices: DonutSlice[]
  centerLabel: string
  centerValue: string
  format?: (v: number) => string
  className?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const total = slices.reduce((s, x) => s + x.value, 0) || 1
  const R = 60, r = 42, C = 2 * Math.PI * R
  let acc = 0
  const arcs = slices.map((s, i) => {
    const frac = s.value / total
    const start = acc
    acc += frac
    return { ...s, i, frac, start }
  })
  const active = hover != null ? arcs[hover] : null
  return (
    <div className={cn('flex flex-col items-center gap-5 sm:flex-row sm:gap-6', className)}>
      <div className="relative shrink-0 self-center">
        <svg viewBox="0 0 140 140" className="size-[150px]" role="img" aria-label={centerLabel}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--c-surface-2)" strokeWidth={R - r} />
          {arcs.map((a) => (
            <motion.circle
              key={a.name}
              cx="70" cy="70" r={R} fill="none"
              stroke={a.color}
              strokeWidth={hover === a.i ? R - r + 4 : R - r}
              strokeDasharray={`${Math.max(0, a.frac * C - 2)} ${C}`}
              strokeDashoffset={-a.start * C}
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
              initial={{ opacity: 0 }}
              animate={{ opacity: hover == null || hover === a.i ? 1 : 0.35 }}
              transition={{ duration: 0.25 }}
              onMouseEnter={() => setHover(a.i)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer transition-[stroke-width] duration-200"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[17px] font-semibold tabular leading-tight">{active ? `${Math.round(active.frac * 100)}%` : centerValue}</span>
          <span className="max-w-[80px] truncate text-[11px] text-ink-3">{active ? active.name : centerLabel}</span>
        </div>
      </div>
      <ul className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
        {arcs.map((a) => (
          <li key={a.name} onMouseEnter={() => setHover(a.i)} onMouseLeave={() => setHover(null)} className={cn('flex items-center gap-2 rounded-md px-1.5 py-0.5 text-[12.5px] transition-colors', hover === a.i && 'bg-surface-2')}>
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: a.color }} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{a.name}</span>
            <span className="tabular text-ink-3">{Math.round(a.frac * 100)}%</span>
            <span className="min-w-16 shrink-0 text-right tabular font-medium text-ink sm:min-w-24">{format(a.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
