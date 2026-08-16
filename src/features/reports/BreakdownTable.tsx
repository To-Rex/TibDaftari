/** Breakdown rows with share bars + donut for the top 6. */
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { BarChart3 } from 'lucide-react'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { EmptyState, Skeleton } from '@/shared/ui'
import { DonutChart } from './DonutChart'
import { OTHER_COLOR, useChartPalette } from './palette'

export interface BreakdownRow { name: string; count: number; revenue: number }

export function BreakdownTable({ rows, loading, metric, showRevenue = true }: { rows: BreakdownRow[] | undefined; loading?: boolean; metric: 'revenue' | 'count'; showRevenue?: boolean }) {
  const { t } = useTranslation()
  const palette = useChartPalette()
  if (loading && !rows) return <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div><Skeleton className="h-40 w-full" /></div>
  if (!rows?.length) return <EmptyState icon={<BarChart3 />} title={t('common.empty')} description={t('clinical.reports.emptyHint')} />
  const val = (r: BreakdownRow) => (metric === 'revenue' ? r.revenue : r.count)
  const fmt = (v: number) => (metric === 'revenue' ? fmtMoney(v, false) : fmtNumber(v))
  const total = rows.reduce((s, r) => s + val(r), 0) || 1
  const sorted = [...rows].sort((a, b) => val(b) - val(a))
  const top = sorted.slice(0, 6)
  const rest = sorted.slice(6)
  const slices = top.map((r, i) => ({ name: r.name, value: val(r), color: palette[i] ?? OTHER_COLOR }))
  if (rest.length) slices.push({ name: t('clinical.reports.other'), value: rest.reduce((s, r) => s + val(r), 0), color: OTHER_COLOR })
  const colorOf = (name: string) => { const i = top.findIndex((r) => r.name === name); return i >= 0 ? (palette[i] ?? OTHER_COLOR) : OTHER_COLOR }
  const max = val(sorted[0]!) || 1

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-[0.05em] text-ink-3">
              <th className="pb-2 font-medium">{t('common.name')}</th>
              <th className="w-[38%] pb-2 font-medium">{t('clinical.reports.share')}</th>
              <th className="pb-2 text-right font-medium">{t('clinical.reports.count')}</th>
              {showRevenue && <th className="pb-2 text-right font-medium">{t('clinical.reports.revenue')}</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const share = val(r) / total
              return (
                <tr key={r.name} className="border-t border-line/70">
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2"><span className="size-2 shrink-0 rounded-full" style={{ background: colorOf(r.name) }} />{r.name}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <motion.div className="h-full rounded-full" style={{ background: colorOf(r.name) }} initial={{ width: 0 }} animate={{ width: `${(val(r) / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }} />
                      </div>
                      <span className="w-10 text-right text-[12px] tabular text-ink-3">{(share * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2 text-right tabular">{fmtNumber(r.count)}</td>
                  {showRevenue && <td className="py-2 text-right tabular font-medium">{fmtMoney(r.revenue, false)}</td>}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line text-[13px] font-semibold">
              <td className="pt-2" colSpan={2}>{t('common.total')}</td>
              <td className="pt-2 text-right tabular">{fmtNumber(rows.reduce((s, r) => s + r.count, 0))}</td>
              {showRevenue && <td className="pt-2 text-right tabular">{fmtMoney(rows.reduce((s, r) => s + r.revenue, 0), false)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="lg:border-l lg:border-line lg:pl-6">
        <DonutChart slices={slices} centerLabel={metric === 'revenue' ? t('clinical.reports.revenue') : t('clinical.reports.count')} centerValue={fmt(total)} format={fmt} />
      </div>
    </div>
  )
}
