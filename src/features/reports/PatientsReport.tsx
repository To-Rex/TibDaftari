/** Reports › Patients: who came in the period — new vs returning, gender, age, districts, most frequent, debts. */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Download, HandCoins, MessageCircle, Repeat, UserPlus, Users, Wallet } from 'lucide-react'
import type { Id, PatientReport } from '@/domain'
import type { ReportRange } from '@/data/repositories'
import { routes } from '@/shared/config/routes'
import { fmtDate, fmtMoney, fmtNumber, fmtPhone } from '@/shared/lib/format'
import { Button, Card, CardHeader, DataTable, EmptyState, Segmented, Skeleton, Stat, toast, type Column } from '@/shared/ui'
import { downloadCsv } from './csv'
import { DonutChart } from './DonutChart'
import { OTHER_COLOR, useChartPalette } from './palette'
import { usePatientReport } from './queries'
import { BarList, pct } from './reportKit'
import { TrendChart } from './TrendChart'

type TrendKey = 'all' | 'new' | 'back'
type TopRow = PatientReport['topPatients'][number]
const R = 'clinical.reports.pat'

export function PatientsReport({ companyId, range, finance, canExport }: { companyId: Id; range: ReportRange; finance: boolean; canExport: boolean }) {
  const { t } = useTranslation()
  const palette = useChartPalette()
  const q = usePatientReport(companyId, range)
  const d = q.data
  const [trendKey, setTrendKey] = useState<TrendKey>('all')
  const trend = useMemo(() => (d?.trend ?? []).map((x) => ({ date: x.date, value: trendKey === 'all' ? x.patients : trendKey === 'new' ? x.new : x.patients - x.new })), [d, trendKey])

  const value = (v: number | null | undefined, f: (n: number) => string = fmtNumber) => (d && v != null ? f(v) : undefined)
  const stat = (label: string, v: string | undefined, icon: React.ReactNode, tone: 'brand' | 'ok' | 'warn' | 'info' | 'neutral' | 'danger', sub?: string) => (
    <Stat label={label} value={v ?? <Skeleton className="h-7 w-20" />} icon={icon} tone={tone} sub={sub} />
  )

  const genderSlices = useMemo(() => (d?.gender ?? []).filter((g) => g.count > 0).map((g, i) => ({ name: t(`${R}.${g.key}`), value: g.count, color: g.key === 'unknown' ? OTHER_COLOR : (palette[i] ?? OTHER_COLOR) })), [d, t, palette])
  const ages = useMemo(() => d?.ageGroups.map((a) => ({ key: a.key, label: a.key === 'unknown' ? t(`${R}.ageUnknown`) : t(`${R}.years`, { range: a.key }), value: a.count, color: a.key === 'unknown' ? OTHER_COLOR : undefined })), [d, t])
  const districts = useMemo(() => d?.districts.map((x, i) => ({ key: x.name || `none-${i}`, label: x.name || t(`${R}.noDistrict`), value: x.count, color: x.name ? palette[2] : OTHER_COLOR })), [d, t, palette])

  const columns: Column<TopRow>[] = [
    { key: 'name', header: t(`${R}.name`), card: 'title', cell: (r) => <Link to={routes.app.patient(r.patientId)} className="font-medium text-ink hover:text-brand-ink hover:underline">{r.name}</Link> },
    { key: 'phone', header: t(`${R}.phone`), card: 'meta', cell: (r) => <span className="tabular text-ink-2">{fmtPhone(r.phone)}</span> },
    { key: 'orders', header: t(`${R}.orders`), align: 'right', cell: (r) => <span className="tabular font-medium">{fmtNumber(r.orders)}</span> },
    ...(finance ? [{ key: 'paid', header: t(`${R}.paid`), align: 'right' as const, cell: (r: TopRow) => <span className="tabular">{fmtMoney(r.paid ?? 0, false)}</span> }] : []),
    { key: 'last', header: t(`${R}.lastVisit`), align: 'right', cell: (r) => <span className="tabular text-ink-2">{fmtDate(r.lastVisit)}</span> },
  ]

  const exportTop = () => {
    if (!d?.topPatients.length) return toast.info(t('common.empty'))
    downloadCsv(
      `patients-top-${range.dateFrom}_${range.dateTo}`,
      [t(`${R}.name`), t(`${R}.phone`), t(`${R}.orders`), ...(finance ? [t(`${R}.paid`)] : []), t(`${R}.lastVisit`)],
      d.topPatients.map((r) => [r.name, r.phone, r.orders, ...(finance ? [r.paid ?? 0] : []), fmtDate(r.lastVisit)]),
    )
    toast.success(t('clinical.reports.exported'))
  }

  return (
    <div className="flex flex-col gap-5" data-report="patients">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 max-xs:grid-cols-1">
        {stat(t(`${R}.patients`), value(d?.patients), <Users />, 'brand', t(`${R}.patientsSub`))}
        {stat(t(`${R}.newPatients`), value(d?.newPatients), <UserPlus />, 'ok', d ? t(`${R}.newSub`, { pct: pct(d.newPatients, d.patients) }) : undefined)}
        {stat(t(`${R}.returning`), value(d?.returningPatients), <Repeat />, 'info', d ? t(`${R}.returningSub`, { pct: pct(d.returningPatients, d.patients) }) : undefined)}
        {stat(t(`${R}.avgOrders`), value(d?.avgOrders), <Users />, 'neutral', d ? t(`${R}.avgOrdersSub`, { orders: fmtNumber(d.orders) }) : undefined)}
        {finance && stat(t(`${R}.avgCheck`), value(d?.avgCheck, (v) => fmtMoney(v, false)), <Wallet />, 'neutral', t(`${R}.avgCheckSub`))}
        {finance && stat(t(`${R}.debtors`), value(d?.debtors), <HandCoins />, 'warn', d ? t(`${R}.debtSub`, { sum: fmtMoney(d.debt ?? 0) }) : undefined)}
        {stat(t(`${R}.linked`), value(d?.telegramLinked), <MessageCircle />, 'neutral', d ? t(`${R}.linkedSub`, { n: fmtNumber(d.portalLinked) }) : undefined)}
      </div>

      <Card className="min-w-0">
        <CardHeader className="max-sm:flex-col max-sm:items-stretch max-sm:gap-3" title={t(`${R}.trend`)} description={t(`${R}.trendHint`)}
          actions={<Segmented<TrendKey> size="sm" value={trendKey} onChange={setTrendKey} items={[{ value: 'all', label: t(`${R}.all`) }, { value: 'new', label: t(`${R}.new`) }, { value: 'back', label: t(`${R}.back`) }]} />} />
        {q.isLoading ? <Skeleton className="h-[220px] w-full" /> : <TrendChart points={trend} format={fmtNumber} label={t(`${R}.trend`)} />}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader title={t(`${R}.gender`)} />
          {q.isLoading ? <Skeleton className="h-40 w-full" /> : genderSlices.length
            ? <DonutChart className="sm:flex-col sm:gap-5" slices={genderSlices} centerLabel={t(`${R}.patients`)} centerValue={fmtNumber(d?.patients ?? 0)} />
            : <p className="py-6 text-center text-[13px] text-ink-3">{t('clinical.reports.emptyHint')}</p>}
        </Card>
        <Card className="min-w-0">
          <CardHeader title={t(`${R}.ages`)} />
          <BarList rows={ages} loading={q.isLoading} empty={t('clinical.reports.emptyHint')} color={palette[0]} />
        </Card>
        <Card className="min-w-0">
          <CardHeader title={t(`${R}.districts`)} description={t(`${R}.districtsHint`)} />
          <BarList rows={districts} loading={q.isLoading} empty={t('clinical.reports.emptyHint')} />
        </Card>
      </div>

      <Card padded={false} className="min-w-0 overflow-hidden">
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <CardHeader className="max-sm:flex-col max-sm:items-start" title={t(`${R}.top`)} description={t(`${R}.topHint`)}
            actions={canExport && <Button size="sm" variant="ghost" leftIcon={<Download className="size-3.5" />} onClick={exportTop}>{t('clinical.reports.export')}</Button>} />
        </div>
        <DataTable<TopRow> columns={columns} rows={d?.topPatients ?? []} rowKey={(r) => r.patientId} loading={q.isLoading} dense stickyHeader={false}
          empty={<EmptyState icon={<Users />} title={t('common.empty')} description={t('clinical.reports.emptyHint')} />} />
      </Card>
    </div>
  )
}
