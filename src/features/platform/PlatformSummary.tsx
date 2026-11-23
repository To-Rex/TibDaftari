/**
 * The activity of the place the platform page stands in, kept quiet and readable: one card — where and when (with the
 * period to choose) on top, six numbers below in cells divided by hairlines. The cells follow the card's own width
 * (two, three or six in a row), a number never leaves its cell (sums are shown short — «1,99 mlrd so‘m» — with the
 * exact amount on hover), and what each number means is on hover too. The day-by-day chart is a card of its own.
 */
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, FlaskConical, Hospital, MessageSquare, Receipt, UserPlus, Wallet, type LucideIcon } from 'lucide-react'
import type { RegionStats, UnitMetrics } from '@/domain'
import { TrendChart } from '@/features/reports/TrendChart'
import { cn } from '@/shared/lib/cn'
import { fmtMoney, fmtMoneyShort, fmtNumber } from '@/shared/lib/format'
import { Card, CardHeader, Segmented, Skeleton } from '@/shared/ui'

const METRICS: { k: keyof UnitMetrics; icon: LucideIcon }[] = [
  { k: 'units', icon: Hospital }, { k: 'orders', icon: Receipt }, { k: 'revenue', icon: Wallet },
  { k: 'patientsNew', icon: UserPlus }, { k: 'resultsReady', icon: FlaskConical }, { k: 'smsSent', icon: MessageSquare },
]

export function PlatformSummary({ scopeLabel, period, total, stale, error, filter }: {
  /** where: «TibDaftari › O‘zbekiston», or the whole platform */
  scopeLabel: string
  period: string
  total?: UnitMetrics
  stale: boolean
  /** the numbers could not be loaded */
  error?: string | null
  /** the period picker, in the card's header */
  filter: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="platform-summary" data-platform-summary
      className="app-card overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-1">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 id="platform-summary" className="truncate text-[15px] font-semibold leading-6" title={scopeLabel}>{scopeLabel}</h2>
          <p className="text-[12.5px] text-ink-3">{t('admin.platform.periodLabel', { period })}</p>
        </div>
        {filter}
      </header>
      {error != null && !total ? (
        <p className="flex items-center gap-2.5 border-t border-line px-4 py-4 text-[13px] text-ink-2 sm:px-5" data-platform-stats-failed>
          <AlertTriangle className="size-4 shrink-0 text-warn" />
          <span className="min-w-0">{t('admin.platform.statsFailed')} <span className="text-ink-3">{error}</span></span>
        </p>
      ) : (
        // the hairlines are the grid's own gaps over the line colour, so they hold for two, three or six in a row
        <div className="@container border-t border-line">
          <dl className={cn('grid grid-cols-2 gap-px bg-line transition-opacity @xl:grid-cols-3 @5xl:grid-cols-6', stale && 'opacity-60')}>
            {METRICS.map(({ k, icon: Icon }) => {
              const money = k === 'revenue'
              const exact = total ? (money ? fmtMoney(total[k]) : fmtNumber(total[k])) : undefined
              return (
                <div key={k} className="min-w-0 bg-surface px-4 py-3.5 sm:px-5" title={t(`admin.platform.metricHints.${k}`)} data-metric={k}>
                  <dt className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-3">
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{t(`admin.platform.metrics.${k}`)}</span>
                  </dt>
                  <dd className="mt-1.5 flex min-w-0 items-baseline gap-1">
                    {total ? (
                      <>
                        <span className="truncate text-[22px] font-semibold leading-7 tracking-tight tabular" title={exact}>{money ? fmtMoneyShort(total[k]) : fmtNumber(total[k])}</span>
                        {money && <span className="shrink-0 text-[12.5px] text-ink-3">{t('common.sum')}</span>}
                      </>
                    ) : <Skeleton className="h-7 w-20" />}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}
    </section>
  )
}

export function PlatformTrend({ data, scopeLabel, period, stale, failed }: { data?: RegionStats; scopeLabel: string; period: string; stale: boolean; failed: boolean }) {
  const { t } = useTranslation()
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue')
  const label = t(`admin.platform.metrics.${metric}`)
  return (
    <Card className={cn('transition-opacity', stale && 'opacity-60')} data-platform-trend>
      <CardHeader title={t('admin.platform.trend')} description={`${scopeLabel} · ${period}`}
        actions={<Segmented<'revenue' | 'orders'> size="sm" value={metric} onChange={setMetric} items={[{ value: 'revenue', label: t('admin.platform.metrics.revenue') }, { value: 'orders', label: t('admin.platform.metrics.orders') }]} />} />
      {data ? (
        <TrendChart points={data.trend.map((p) => ({ date: p.date, value: metric === 'revenue' ? p.revenue : p.orders }))} format={(v) => (metric === 'revenue' ? fmtMoney(v) : fmtNumber(v))} label={label} height={200} />
      ) : failed ? <p className="py-10 text-center text-[13px] text-ink-3">{t('admin.platform.statsFailed')}</p> : <Skeleton className="h-[200px]" />}
    </Card>
  )
}
