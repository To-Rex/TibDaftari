/** Horizontal bar list — magnitude by category, single hue, direct labels. */
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { DashboardSummary } from '@/domain'
import { EmptyState } from '@/shared/ui'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { PieChart } from 'lucide-react'

export function CategoryBars({ rows }: { rows: DashboardSummary['byCategory'] }) {
  const { t } = useTranslation()
  const max = Math.max(1, ...rows.map((r) => r.revenue))
  const total = rows.reduce((s, r) => s + r.revenue, 0)
  if (!rows.length) return <EmptyState icon={<PieChart />} title={t('common.empty')} className="py-8" />
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.slice(0, 8).map((r, i) => {
        const pct = total ? Math.round((r.revenue / total) * 100) : 0
        return (
          <li key={r.name} className="group">
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate font-medium">{r.name}</span>
              <span className="shrink-0 text-ink-3 tabular">{fmtNumber(r.count)} · <span className="text-ink font-medium">{fmtMoney(r.revenue, false)}</span> <span className="opacity-70">({pct}%)</span></span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <motion.div className="h-full rounded-full bg-brand group-hover:bg-brand-strong transition-colors" initial={{ width: 0 }} animate={{ width: `${(r.revenue / max) * 100}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
