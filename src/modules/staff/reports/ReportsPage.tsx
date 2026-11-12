/** Reports: finance & operations (KPIs, trend, breakdowns, CSV) + patients, results and services sections (`?tab=`). */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet, Receipt, Wallet, FlaskConical, BadgeCheck, Users, Hospital } from 'lucide-react'
import { repos } from '@/data'
import { useWorkspace } from '@/app/layouts/AppShell'
import { usePermissions, useStaffScope } from '@/features/auth/store'
import { DateRangeFilter, initialRange, type RangeState } from '@/features/lab/DateRangeFilter'
import { presetRange } from '@/shared/lib/dates'
import { errorMessage } from '@/shared/lib/errors'
import { BreakdownTable } from '@/features/reports/BreakdownTable'
import { PatientsReport } from '@/features/reports/PatientsReport'
import { ResultsReport } from '@/features/reports/ResultsReport'
import { ServicesReport } from '@/features/reports/ServicesReport'
import { SmsReport } from '@/features/reports/SmsReport'
import { TrendChart } from '@/features/reports/TrendChart'
import { downloadCsv } from '@/features/reports/csv'
import { useBreakdown, useDashboard, type BreakdownBy } from '@/features/reports/queries'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { Button, Card, CardHeader, Page, PageHeader, Segmented, Select, Skeleton, Stat, Tabs, toast } from '@/shared/ui'

const BYS: BreakdownBy[] = ['category', 'service', 'unit', 'employee']
const SECTIONS = ['overview', 'patients', 'results', 'services', 'sms'] as const
type Section = (typeof SECTIONS)[number]

export default function ReportsPage() {
  const { t, i18n } = useTranslation()
  const { scopeId } = useStaffScope()
  const { scopeUnit, facility, facilities } = useWorkspace()
  const { can } = usePermissions()
  const financeFull = can('reports.finance.read')
  const financeRecent = can('reports.finance.recent')
  const finance = financeFull || financeRecent
  // `reports.finance.recent` without finance.read: revenue of the last 7 days only (the registrar role has both now)
  const recentOnly = financeRecent && !financeFull
  const minDate = recentOnly ? presetRange('last7').from : undefined
  const [params, setParams] = useSearchParams()
  const section: Section = (SECTIONS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Section) : 'overview'
  const setSection = (s: Section) => setParams((p) => { const n = new URLSearchParams(p); if (s === 'overview') n.delete('tab'); else n.set('tab', s); return n }, { replace: true })
  const [range, setRange] = useState<RangeState>(() => initialRange(recentOnly ? 'last7' : 'last30'))
  const [by, setBy] = useState<BreakdownBy>('category')
  const [metric, setMetric] = useState<'revenue' | 'count'>(finance ? 'revenue' : 'count')
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'orders'>(finance ? 'revenue' : 'orders')

  // an administrator of a region / district reports on the whole scope and may narrow it to one facility;
  // a facility (the usual staff app) reports on itself and needs no picker
  const wide = !!scopeUnit && scopeUnit.level !== 'facility' && facilities.length > 1
  const [pickedUnit, setPickedUnit] = useState<string>(() => facility?.id ?? '')
  const reportScopeId = wide && scopeUnit ? scopeUnit.id : scopeId
  const unitId = wide && facilities.some((f) => f.id === pickedUnit) ? pickedUnit : undefined
  const bys = wide ? BYS : BYS.filter((b) => b !== 'unit')
  const byShown: BreakdownBy = bys.includes(by) ? by : 'category'

  const q = { unitId, dateFrom: range.range.from, dateTo: range.range.to }
  const dash = useDashboard(reportScopeId, q)
  const bd = useBreakdown(reportScopeId, { by: byShown, ...q })

  const d = dash.data
  const totals = useMemo(() => ({
    orders: d?.trend.reduce((s, x) => s + x.orders, 0) ?? 0,
    revenue: d?.trend.reduce((s, x) => s + x.revenue, 0) ?? 0,
  }), [d])
  const trendPoints = useMemo(() => (d?.trend ?? []).map((x) => ({ date: x.date, value: trendMetric === 'revenue' ? x.revenue : x.orders })), [d, trendMetric])

  const exportCsv = () => {
    if (!bd.data?.length) return toast.info(t('common.empty'))
    downloadCsv(
      `report-${byShown}-${range.range.from}_${range.range.to}`,
      finance ? [t(`clinical.reports.by_${byShown}`), t('clinical.reports.count'), t('clinical.reports.revenue')] : [t(`clinical.reports.by_${byShown}`), t('clinical.reports.count')],
      bd.data.map((r) => (finance ? [r.name, r.count, r.revenue] : [r.name, r.count])),
    )
    toast.success(t('clinical.reports.exported'))
  }

  const [exporting, setExporting] = useState(false)
  const exportExcel = async () => {
    setExporting(true)
    try {
      const lang = (['uz', 'ru', 'en'] as const).find((l) => i18n.language?.startsWith(l)) ?? 'uz'
      const blob = await repos.reports.exportXlsx(reportScopeId, { ...q, lang })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hisobot-${range.range.from}${range.range.to !== range.range.from ? `_${range.range.to}` : ''}.xlsx`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      toast.success(t('clinical.reports.excelExported'))
    } catch (e) { toast.error(errorMessage(e)) } finally { setExporting(false) }
  }

  const stat = (label: string, value: string | undefined, icon: React.ReactNode, tone: 'brand' | 'ok' | 'warn' | 'info' | 'neutral' = 'neutral', sub?: string) => (
    <Stat label={label} value={value ?? <Skeleton className="h-7 w-24" />} icon={icon} tone={tone} sub={sub} />
  )

  return (
    <Page>
      <PageHeader
        title={t('clinical.reports.title')}
        description={t('clinical.reports.subtitle')}
        actions={can('reports.export') && (
          <div className="flex flex-wrap items-center gap-2">
            {section === 'overview' && <Button variant="secondary" leftIcon={<Download className="size-4" />} onClick={exportCsv}>{t('clinical.reports.export')}</Button>}
            <Button variant="secondary" leftIcon={<FileSpreadsheet className="size-4" />} loading={exporting} onClick={() => void exportExcel()}>{t('clinical.reports.exportExcel')}</Button>
          </div>
        )}
      />
      <Tabs<Section> className="mb-4" value={section} onChange={setSection} items={SECTIONS.map((s) => ({ value: s, label: t(`clinical.reports.sections.${s}`) }))} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <DateRangeFilter value={range} onChange={setRange} allowCustom presets={recentOnly ? ['today', 'last7'] : undefined} min={minDate} />
        {wide && (
          <label className="inline-flex min-w-0 items-center gap-2" data-report-unit>
            <Hospital className="size-4 shrink-0 text-ink-3" />
            <Select value={unitId ?? ''} onChange={(e) => setPickedUnit(e.target.value)} aria-label={t('clinical.reports.unit')} className="h-8 w-60 max-w-full text-[13px]">
              <option value="">{t('clinical.reports.allUnits')}</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </label>
        )}
      </div>

      {section === 'patients' && <PatientsReport scopeId={reportScopeId} range={q} finance={financeFull} canExport={can('reports.export')} />}
      {section === 'results' && <ResultsReport scopeId={reportScopeId} range={q} canExport={can('reports.export')} />}
      {section === 'services' && <ServicesReport scopeId={reportScopeId} range={q} finance={financeFull} canExport={can('reports.export')} />}
      {section === 'sms' && <SmsReport scopeId={reportScopeId} range={q} canExport={can('reports.export')} wide={wide} />}

      {section === 'overview' && (<>

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
          <Tabs<BreakdownBy> size="sm" className="min-w-0 border-b-0" value={byShown} onChange={setBy} items={bys.map((b) => ({ value: b, label: t(`clinical.reports.by_${b}`) }))} />
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
      </>)}
    </Page>
  )
}
