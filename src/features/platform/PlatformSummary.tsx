/** The activity of the place the platform page stands in: six numbers for the period, and the same day by day. */
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, FlaskConical, Hospital, MessageSquare, Receipt, UserPlus, Wallet } from 'lucide-react'
import type { RegionStats, UnitMetrics } from '@/domain'
import { TrendChart } from '@/features/reports/TrendChart'
import { cn } from '@/shared/lib/cn'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { Card, CardHeader, Segmented, Skeleton, Stat, type Tone } from '@/shared/ui'

const TILES: { k: keyof UnitMetrics; icon: ReactNode; tone: Tone }[] = [
  { k: 'units', icon: <Hospital />, tone: 'brand' }, { k: 'orders', icon: <Receipt />, tone: 'info' }, { k: 'revenue', icon: <Wallet />, tone: 'ok' },
  { k: 'patientsNew', icon: <UserPlus />, tone: 'accent' }, { k: 'resultsReady', icon: <FlaskConical />, tone: 'info' }, { k: 'smsSent', icon: <MessageSquare />, tone: 'neutral' },
]

export function PlatformSummary({ scopeLabel, period, total, stale, error }: {
  /** where: «TibDaftari › O‘zbekiston», or the whole platform */
  scopeLabel: string
  period: string
  total?: UnitMetrics
  stale: boolean
  /** the numbers could not be loaded */
  error?: string | null
}) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="platform-summary" className={cn('@container transition-opacity', stale && 'opacity-60')} data-platform-summary>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2 id="platform-summary" className="text-[14px] font-semibold">{scopeLabel}</h2>
        <span className="text-[12.5px] text-ink-3">{t('admin.platform.periodLabel', { period })}</span>
      </div>
      {error != null && !total ? (
        <div className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-warn/40 bg-warn-soft/40 px-4 py-3 text-[13px] text-ink-2" data-platform-stats-failed>
          <AlertTriangle className="size-4 shrink-0 text-warn" />{t('admin.platform.statsFailed')} <span className="text-ink-3">{error}</span>
        </div>
      ) : (
        // six in a row only where each tile still holds a sum of money in full; three, then two, below
        <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @[68rem]:grid-cols-6">
          {TILES.map(({ k, icon, tone }) => total
            ? <Stat key={k} label={t(`admin.platform.metrics.${k}`)} value={k === 'revenue' ? fmtMoney(total[k], false) : fmtNumber(total[k])} sub={t(`admin.platform.metricHints.${k}`)} icon={icon} tone={tone} />
            : <Skeleton key={k} className="h-[118px] rounded-[var(--radius-lg)]" />)}
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
