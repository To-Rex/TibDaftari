import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { BadgeCheck, FlaskConical, MessageSquare, Receipt, Users, Wallet } from 'lucide-react'
import { repos } from '@/data'
import { Card, CardHeader, Page, PageHeader, Segmented, Skeleton, Stat, fadeUp, stagger } from '@/shared/ui'
import { fmtDate, fmtMoney, fmtNumber } from '@/shared/lib/format'
import { presetRange, type DatePreset } from '@/shared/lib/dates'
import { useStaffSession } from '@/features/session/useSession'
import { TrendChart } from '@/features/dashboard/TrendChart'
import { CategoryBars } from '@/features/dashboard/CategoryBars'
import { QuickActions } from '@/features/dashboard/QuickActions'

type Preset = Extract<DatePreset, 'today' | 'last7' | 'last30'>
type Metric = 'revenue' | 'orders'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { staff, companyId, branchId } = useStaffSession()
  const [preset, setPreset] = useState<Preset>('last7')
  const [metric, setMetric] = useState<Metric>('revenue')
  const range = useMemo(() => presetRange(preset), [preset])

  const q = useQuery({
    queryKey: ['dashboard', companyId, branchId, range.from, range.to],
    queryFn: () => repos.reports.dashboard(companyId, { branchId: branchId ?? undefined, dateFrom: range.from, dateTo: range.to }),
    placeholderData: (prev) => prev,
  })
  const d = q.data
  const hour = new Date().getHours()
  const greet = hour < 12 ? t('staff.dashboard.morning') : hour < 18 ? t('staff.dashboard.afternoon') : t('staff.dashboard.evening')
  const firstName = staff.fullName.split(/\s+/)[0] ?? staff.fullName

  const trend = useMemo(() => (d?.trend ?? []).map((p) => ({ date: p.date, value: metric === 'revenue' ? p.revenue : p.orders })), [d, metric])
  const periodSum = trend.reduce((s, p) => s + p.value, 0)

  const stats = [
    { key: 'orders', label: t('staff.dashboard.todayOrders'), value: d ? fmtNumber(d.todayOrders) : null, icon: <Receipt />, tone: 'brand' as const },
    { key: 'revenue', label: t('staff.dashboard.todayRevenue'), value: d ? fmtMoney(d.todayRevenue, false) : null, sub: t('common.sum'), icon: <Wallet />, tone: 'ok' as const },
    { key: 'lab', label: t('staff.dashboard.pendingLab'), value: d ? fmtNumber(d.pendingLab) : null, icon: <FlaskConical />, tone: 'warn' as const },
    { key: 'approval', label: t('staff.dashboard.pendingApproval'), value: d ? fmtNumber(d.pendingApproval) : null, icon: <BadgeCheck />, tone: 'info' as const },
    { key: 'patients', label: t('staff.dashboard.patients'), value: d ? fmtNumber(d.patients) : null, icon: <Users />, tone: 'neutral' as const },
    { key: 'sms', label: t('staff.dashboard.smsQueued'), value: d ? fmtNumber(d.smsQueued) : null, icon: <MessageSquare />, tone: 'accent' as const },
  ]

  return (
    <Page>
      <PageHeader
        eyebrow={fmtDate(new Date().toISOString(), 'EEEE, d MMMM')}
        title={<span className="break-words">{`${greet}, ${firstName}`}</span>}
        description={t('staff.dashboard.subtitle', { role: staff.roleKey })}
        actions={<Segmented<Preset> value={preset} onChange={setPreset} className="max-w-full overflow-x-auto no-scrollbar" items={[{ value: 'today', label: t('common.today') }, { value: 'last7', label: t('common.last7') }, { value: 'last30', label: t('common.last30') }]} />}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,165px),1fr))] 3xl:gap-4">
        {stats.map((s) => (
          <motion.div key={s.key} variants={fadeUp}>
            {s.value == null ? (
              <Card className="flex flex-col gap-3 p-4 sm:p-5"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-24" /></Card>
            ) : (
              <Stat label={s.label} value={s.value} sub={s.sub} icon={s.icon} tone={s.tone} className="h-full transition-[box-shadow,transform] duration-250 ease-[var(--ease-out)] hover:-translate-y-px hover:shadow-2" />
            )}
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-6"><QuickActions pendingLab={d?.pendingLab} pendingApproval={d?.pendingApproval} /></div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] 3xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader className="max-xs:flex-col max-xs:items-stretch" title={t('staff.dashboard.trendTitle')} description={<span className="break-words">{`${fmtDate(range.from)} – ${fmtDate(range.to)} · ${metric === 'revenue' ? fmtMoney(periodSum) : `${fmtNumber(periodSum)} ${t('staff.dashboard.ordersUnit')}`}`}</span>}
            actions={<Segmented<Metric> size="sm" value={metric} onChange={setMetric} items={[{ value: 'revenue', label: t('staff.dashboard.metricRevenue') }, { value: 'orders', label: t('staff.dashboard.metricOrders') }]} />} />
          {q.isLoading ? <Skeleton className="h-[200px]" /> : (
            <TrendChart data={trend} label={t('staff.dashboard.trendTitle')} className="text-brand" format={(v) => (metric === 'revenue' ? fmtMoney(v, false) : fmtNumber(v))} />
          )}
        </Card>
        <Card className="min-w-0">
          <CardHeader title={t('staff.dashboard.byCategory')} description={t('staff.dashboard.byCategoryHint')} />
          {q.isLoading ? <div className="flex flex-col gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}</div> : <CategoryBars rows={d?.byCategory ?? []} />}
        </Card>
      </div>
    </Page>
  )
}
