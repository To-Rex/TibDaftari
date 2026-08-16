/** Finance & operations reports: KPIs, trend, breakdowns, CSV export. */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Receipt, Wallet, FlaskConical, BadgeCheck, Users } from 'lucide-react'
import { useStaffSession } from '@/features/session/useSession'
import { usePermissions } from '@/features/auth/store'
import { DateRangeFilter, initialRange, type RangeState } from '@/features/lab/DateRangeFilter'
import { BreakdownTable } from '@/features/reports/BreakdownTable'
import { TrendChart } from '@/features/reports/TrendChart'
import { downloadCsv } from '@/features/reports/csv'
import { useBreakdown, useDashboard, type BreakdownBy } from '@/features/reports/queries'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { Button, Card, CardHeader, Page, PageHeader, Segmented, Skeleton, Stat, Tabs, toast } from '@/shared/ui'

const BYS: BreakdownBy[] = ['category', 'service', 'branch', 'employee']

export default function ReportsPage() {
  const { t } = useTranslation()
  const { companyId, branchId } = useStaffSession()
  const { can } = usePermissions()
  const finance = can('reports.finance.read')
  const [range, setRange] = useState<RangeState>(() => initialRange('last30'))
  const [by, setBy] = useState<BreakdownBy>('category')
  const [metric, setMetric] = useState<'revenue' | 'count'>(finance ? 'revenue' : 'count')
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'orders'>(finance ? 'revenue' : 'orders')

  const q = { branchId: branchId ?? undefined, dateFrom: range.range.from, dateTo: range.range.to }
  const dash = useDashboard(companyId, q)
  const bd = useBreakdown(companyId, { by, ...q })

  const d = dash.data
  const totals = useMemo(() => ({
    orders: d?.trend.reduce((s, x) => s + x.orders, 0) ?? 0,
    revenue: d?.trend.reduce((s, x) => s + x.revenue, 0) ?? 0,
  }), [d])
  const trendPoints = useMemo(() => (d?.trend ?? []).map((x) => ({ date: x.date, value: trendMetric === 'revenue' ? x.revenue : x.orders })), [d, trendMetric])

  const exportCsv = () => {
    if (!bd.data?.length) return toast.info(t('common.empty'))
    downloadCsv(
      `report-${by}-${range.range.from}_${range.range.to}`,
      finance ? [t('common.name'), t('clinical.reports.count'), t('clinical.reports.revenue')] : [t('common.name'), t('clinical.reports.count')],
      bd.data.map((r) => (finance ? [r.name, r.count, r.revenue] : [r.name, r.count])),
    )
    toast.success(t('clinical.reports.exported'))
  }

  const stat = (label: string, value: string | undefined, icon: React.ReactNode, tone: 'brand' | 'ok' | 'warn' | 'info' | 'neutral' = 'neutral', sub?: string) => (
    <Stat label={label} value={value ?? <Skeleton className="h-7 w-24" />} icon={icon} tone={tone} sub={sub} />
  )

  return (
    <Page>
      <PageHeader
        title={t('clinical.reports.title')}
        description={t('clinical.reports.subtitle')}
        actions={can('reports.export') && <Button variant="secondary" leftIcon={<Download className="size-4" />} onClick={exportCsv}>{t('clinical.reports.export')}</Button>}
      />
      <div className="mb-5"><DateRangeFilter value={range} onChange={setRange} allowCustom /></div>

      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 max-xs:grid-cols-1">
        {stat(t('clinical.reports.kpiOrders'), d && fmtNumber(totals.orders), <Receipt />, 'brand', t('clinical.reports.inRange'))}
        {finance && stat(t('clinical.reports.kpiRevenue'), d && fmtMoney(totals.revenue, false), <Wallet />, 'ok', t('common.sum'))}
        {stat(t('clinical.reports.kpiToday'), d && fmtNumber(d.todayOrders), <Receipt />, 'neutral', finance && d ? fmtMoney(d.todayRevenue) : undefined)}
        {stat(t('clinical.reports.kpiPendingLab'), d && fmtNumber(d.pendingLab), <FlaskConical />, 'warn')}
        {stat(t('clinical.reports.kpiPendingApproval'), d && fmtNumber(d.pendingApproval), <BadgeCheck />, 'info')}
        {stat(t('clinical.reports.kpiPatients'), d && fmtNumber(d.patients), <Users />, 'neutral', d ? t('clinical.reports.smsQueued', { n: d.smsQueued }) : undefined)}
      </div>

      <Card className="mb-5 min-w-0">
        <CardHeader
          className="max-sm:flex-col max-sm:items-stretch max-sm:gap-3"
          title={t('clinical.reports.trend')}
          description={t('clinical.reports.trendHint')}
          actions={finance && <Segmented<'revenue' | 'orders'> size="sm" value={trendMetric} onChange={setTrendMetric} items={[{ value: 'revenue', label: t('clinical.reports.revenue') }, { value: 'orders', label: t('clinical.reports.orders') }]} />}
        />
        {dash.isLoading ? <Skeleton className="h-[220px] w-full" /> : (
          <TrendChart points={trendPoints} format={(v) => (trendMetric === 'revenue' ? fmtMoney(v, false) : fmtNumber(v))} label={t('clinical.reports.trend')} />
        )}
      </Card>

      <Card padded={false} className="min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-3 pt-3 sm:px-5 md:flex-row md:items-center md:justify-between">
          <Tabs<BreakdownBy> size="sm" className="min-w-0 border-b-0" value={by} onChange={setBy} items={BYS.map((b) => ({ value: b, label: t(`clinical.reports.by_${b}`) }))} />
          {finance && (
            <div className="min-w-0 max-w-full overflow-x-auto no-scrollbar mb-2 md:mb-0">
              <Segmented<'revenue' | 'count'> size="sm" value={metric} onChange={setMetric} items={[{ value: 'revenue', label: t('clinical.reports.revenue') }, { value: 'count', label: t('clinical.reports.count') }]} />
            </div>
          )}
        </div>
        <div className="p-3 sm:p-5">
          <BreakdownTable rows={bd.data} loading={bd.isLoading} metric={metric} showRevenue={finance} />
        </div>
      </Card>
    </Page>
  )
}
