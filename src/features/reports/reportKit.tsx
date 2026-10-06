/** Small building blocks shared by the patient / results / services reports. */
import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'
import { fmtNumber } from '@/shared/lib/format'
import { Skeleton } from '@/shared/ui'

const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'x',
}
/** Search normalisation like the API's `fold()`: lower case, Cyrillic → Latin, no apostrophes, h = x. */
export const fold = (s: string) => [...s.toLowerCase()].map((ch) => CYR[ch] ?? ch).join('').replace(/[ʻʼ'`‘’]/g, '').replace(/h/g, 'x').replace(/\s+/g, ' ').trim()

/** a / b as a whole percent (0 when b is 0). */
export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

/** Hours → "5,2 soat" below two days, else "3 kun" (rounded to a tenth). */
export function fmtDuration(hours: number | null | undefined, t: TFunction): string {
  if (hours == null) return '—'
  if (hours < 48) return t('clinical.reports.res.hours', { n: fmtNumber(Math.round(hours * 10) / 10) })
  return t('clinical.reports.res.days', { n: fmtNumber(Math.round((hours / 24) * 10) / 10) })
}

/** Change vs the previous period: ▲ 12% / ▼ 30% / "new" when there was nothing before. */
export function ChangeBadge({ now, before, newLabel }: { now: number; before: number; newLabel: string }) {
  if (before === 0 && now === 0) return <span className="text-ink-3">—</span>
  if (before === 0) return <span className="inline-flex items-center rounded-full bg-brand-soft px-1.5 text-[11.5px] font-medium text-brand-ink" data-change="new">{newLabel}</span>
  const d = Math.round(((now - before) / before) * 100)
  if (d === 0) return <span className="tabular text-ink-3" data-change="0">0%</span>
  return <span className={cn('whitespace-nowrap tabular text-[12.5px] font-medium', d > 0 ? 'text-ok' : 'text-danger')} data-change={d}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}%</span>
}

export interface BarRow { key: string; label: ReactNode; value: number; color?: string; sub?: ReactNode }

/** Horizontal share bars — label + value (+ share) on one line, the bar below. `total`: shares of that number (rows may
 * overlap, e.g. delivery channels) instead of the rows' sum, and bars scaled to it. */
export function BarList({ rows, loading, empty, format = fmtNumber, color = 'var(--c-brand)', total: of }: { rows: BarRow[] | undefined; loading?: boolean; empty?: ReactNode; format?: (v: number) => string; color?: string; total?: number }) {
  if (loading && !rows) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
  const total = of ?? rows?.reduce((s, r) => s + r.value, 0) ?? 0
  if (!rows?.length || total === 0) return <p className="py-6 text-center text-[13px] text-ink-3">{empty}</p>
  const max = of ?? Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="flex flex-col gap-3" data-bar-list>
      {rows.map((r, i) => (
        <li key={r.key} className="min-w-0">
          <div className="flex items-start justify-between gap-3 text-[13px]">
            <span className="min-w-0 break-words font-medium text-ink">{r.label}</span>
            <span className="shrink-0 tabular text-ink-2">{format(r.value)} <span className="text-[12px] text-ink-3">· {pct(r.value, total)}%</span></span>
          </div>
          {r.sub && <div className="text-[12px] text-ink-3">{r.sub}</div>}
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <motion.div className="h-full rounded-full" style={{ background: r.color ?? color }} initial={{ width: 0 }} animate={{ width: `${(r.value / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
