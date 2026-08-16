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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
      {/* ---------- cards (< md) ---------- */}
      <ul className="flex flex-col divide-y divide-line/70 md:hidden">
        {sorted.map((r, i) => {
          const share = val(r) / total
          return (
            <li key={r.name} className="py-2.5 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-[13.5px] font-medium"><span className="size-2 shrink-0 rounded-full" style={{ background: colorOf(r.name) }} /><span className="min-w-0 break-words">{r.name}</span></span>
                <span className="shrink-0 text-[12px] tabular text-ink-3">{(share * 100).toFixed(1)}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <motion.div className="h-full rounded-full" style={{ background: colorOf(r.name) }} initial={{ width: 0 }} animate={{ width: `${(val(r) / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[12.5px] text-ink-3">
                <span>{t('clinical.reports.count')}: <span className="tabular text-ink">{fmtNumber(r.count)}</span></span>
                {showRevenue && <span>{t('clinical.reports.revenue')}: <span className="tabular font-medium text-ink">{fmtMoney(r.revenue, false)}</span></span>}
              </div>
            </li>
          )
        })}
        <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t border-line pt-2.5 text-[13px] font-semibold">
          <span>{t('common.total')}</span>
          <span className="flex flex-wrap items-center gap-x-4 tabular">
            <span>{fmtNumber(rows.reduce((s, r) => s + r.count, 0))}</span>
            {showRevenue && <span>{fmtMoney(rows.reduce((s, r) => s + r.revenue, 0), false)}</span>}
          </span>
        </li>
      </ul>

      {/* ---------- table (≥ md) ---------- */}
      <div className="overflow-x-auto max-md:hidden">
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
      <div className="min-w-0 border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <DonutChart className="lg:flex-col lg:items-stretch" slices={slices} centerLabel={metric === 'revenue' ? t('clinical.reports.revenue') : t('clinical.reports.count')} centerValue={fmt(total)} format={fmt} />
      </div>
    </div>
  )
}
