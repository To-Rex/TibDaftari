/**
 * Hududlar — the platform's activity folded by territory: country → region → district → clinic. A row is a territory
 * (click it to go one level down; the breadcrumb and the browser's back button go up) or, at the last level, a clinic.
 * Numbers only: cheques, money, new patients, approved results, SMS — never a patient. Work belongs to the territory
 * of the branch it was done at, so a clinic with branches in two districts shows in both and once in the total.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, Download, FlaskConical, GitBranch, LogIn, MapPinOff, MessageSquare, Receipt, ShieldCheck, UserPlus, Wallet } from 'lucide-react'
import type { CompanyListQuery, RegionGroupBy, TerritoryScope, UnitMetrics, UnitRow } from '@/domain'
import { useAuth } from '@/features/auth/store'
import { DateRangeFilter, initialRange, type RangeState } from '@/features/lab/DateRangeFilter'
import { countryLabel } from '@/features/org/LocationFields'
import { useCountries, useDistricts, useRegions } from '@/features/patients/queries'
import { TrendChart } from '@/features/reports/TrendChart'
import { downloadCsv } from '@/features/reports/csv'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, Segmented, Skeleton, Stat, toast, type Column } from '@/shared/ui'
import { useRegionStats } from './queries'
import { TerritoryFilter } from './TerritoryFilter'
import { useTerritoryParams } from './territory'

type SortKey = 'name' | keyof UnitMetrics
const METRIC_KEYS: (keyof UnitMetrics)[] = ['companies', 'branches', 'orders', 'revenue', 'patientsNew', 'resultsReady', 'smsSent']

export function RegionsView({ onShowClinics }: { onShowClinics: (filters: Partial<CompanyListQuery>) => void }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const setActiveCompany = useAuth((s) => s.setActiveCompany)
  const { scope, setScope } = useTerritoryParams()
  const countries = useCountries()
  // the platform's own country unless another one, or every country, was picked
  const home = countries.data?.find((c) => c.code === 'UZ')
  const effective: TerritoryScope = scope.countryId || scope.allCountries ? { countryId: scope.countryId, regionId: scope.regionId, districtId: scope.districtId } : { countryId: home?.id, regionId: scope.regionId, districtId: scope.districtId }
  const ready = scope.allCountries || !!effective.countryId
  const regions = useRegions(effective.countryId, { enabled: !!effective.countryId })
  const districts = useDistricts(effective.regionId, { enabled: !!effective.regionId })

  const [range, setRange] = useState<RangeState>(() => initialRange('last30'))
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'orders'>('revenue')
  const [sort, setSort] = useState<{ by: SortKey; dir: 'asc' | 'desc' }>({ by: 'revenue', dir: 'desc' })
  const q = useRegionStats({ dateFrom: range.range.from, dateTo: range.range.to, ...effective }, { enabled: ready })
  const data = q.data
  const level: RegionGroupBy = data?.groupBy ?? (effective.districtId ? 'company' : effective.regionId ? 'district' : 'region')

  const rows = useMemo(() => {
    const list = [...(data?.rows ?? [])]
    const dir = sort.dir === 'asc' ? 1 : -1
    list.sort((a, b) => (sort.by === 'name' ? a.name.localeCompare(b.name) * dir : (a[sort.by] - b[sort.by]) * dir || a.name.localeCompare(b.name)))
    return list
  }, [data, sort])
  const maxRevenue = Math.max(1, ...rows.map((r) => r.revenue))
  const onSort = (key: string) => setSort((s) => ({ by: key as SortKey, dir: s.by === key ? (s.dir === 'asc' ? 'desc' : 'asc') : key === 'name' ? 'asc' : 'desc' }))

  // breadcrumb: where we are, each step a way back up
  const countryName = effective.countryId ? (countries.data?.find((c) => c.id === effective.countryId) && countryLabel(countries.data!.find((c) => c.id === effective.countryId)!)) : t('admin.platform.regions.allCountries')
  const regionName = regions.data?.find((r) => r.id === effective.regionId)?.name
  const districtName = districts.data?.find((d) => d.id === effective.districtId)?.name
  const crumbs: { label: string; to?: () => void }[] = [
    { label: countryName ?? '…', to: effective.regionId ? () => setScope({ countryId: effective.countryId }, { allCountries: scope.allCountries }) : undefined },
    ...(effective.regionId ? [{ label: regionName ?? '…', to: effective.districtId ? () => setScope({ countryId: effective.countryId, regionId: effective.regionId }, { allCountries: scope.allCountries }) : undefined }] : []),
    ...(effective.districtId ? [{ label: districtName ?? '…' }] : []),
  ]

  const drill = (r: UnitRow) => {
    if (r.kind === 'country') setScope({ countryId: r.id })
    else if (r.kind === 'region') setScope({ countryId: effective.countryId, regionId: r.id }, { allCountries: scope.allCountries })
    else if (r.kind === 'district') setScope({ ...effective, districtId: r.id }, { allCountries: scope.allCountries })
  }
  const enter = (r: UnitRow) => { setActiveCompany(r.id); toast.success(t('admin.platform.switched', { name: r.name })); nav(routes.admin.root) }

  const metricLabel = (k: keyof UnitMetrics) => t(`admin.platform.regions.${k}`)
  const exportCsv = () => {
    if (!rows.length) return toast.info(t('common.empty'))
    const keys = METRIC_KEYS.filter((k) => level !== 'company' || k !== 'companies')
    downloadCsv(`hududlar-${level}-${range.range.from}_${range.range.to}`, [t(`admin.platform.regions.level_${level}`), ...keys.map(metricLabel)], rows.map((r) => [r.parentName ? `${r.name} (${r.parentName})` : r.name, ...keys.map((k) => r[k])]))
    toast.success(t('clinical.reports.exported'))
  }

  const num = (k: keyof UnitMetrics): Column<UnitRow> => ({ key: k, header: metricLabel(k), align: 'right', sortable: true, hideBelow: k === 'smsSent' || k === 'resultsReady' ? 'lg' : k === 'branches' || k === 'patientsNew' ? 'md' : undefined, card: 'field', cell: (r) => <span className={cn('tabular', r[k] === 0 && 'text-ink-3')}>{fmtNumber(r[k])}</span> })
  const columns: Column<UnitRow>[] = [
    { key: 'name', header: t(`admin.platform.regions.level_${level}`), sortable: true, card: 'title', cell: (r) => (
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', r.kind === 'company' ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-ink-3')}>{r.kind === 'company' ? <Building2 className="size-4" /> : <ChevronRight className="size-4" />}</span>
        <span className="min-w-0">
          <span className="flex items-center gap-2"><span className="truncate font-medium">{r.name}</span>{r.isActive === false && <Badge tone="neutral" size="sm">{t('admin.platform.inactive')}</Badge>}</span>
          {r.parentName && <span className="block truncate text-[12px] text-ink-3">{r.parentName}</span>}
        </span>
      </span>
    ) },
    ...(level === 'company' ? [] : [num('companies')]),
    num('branches'),
    num('orders'),
    { key: 'revenue', header: `${metricLabel('revenue')}, ${t('common.sum')}`, align: 'right', sortable: true, card: 'field', width: '200px', cell: (r) => (
      <span className="block min-w-[120px]">
        <span className="block font-semibold tabular">{fmtMoney(r.revenue, false)}</span>
        <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-brand" style={{ width: `${(r.revenue / maxRevenue) * 100}%` }} /></span>
      </span>
    ) },
    num('patientsNew'),
    num('resultsReady'),
    num('smsSent'),
    // the drill arrow is table-only (a card is tapped as a whole); the clinic's button stays in the card
    { key: 'actions', header: '', align: 'right', card: level === 'company' ? 'actions' : 'hidden', cell: (r) => r.kind === 'company'
      ? <span onClick={(e) => e.stopPropagation()}><Button size="xs" variant="soft" leftIcon={<LogIn className="size-3.5" />} onClick={() => enter(r)} data-region-enter={r.slug ?? r.id}>{t('admin.platform.impersonate')}</Button></span>
      : <ChevronRight className="ml-auto size-4 text-ink-3" /> },
  ]

  const missing = data ? data.coverage.companies - data.coverage.companiesLocated : 0
  const total = data?.total
  const tiles: { k: keyof UnitMetrics; icon: React.ReactNode; tone: 'brand' | 'ok' | 'info' | 'neutral' | 'accent' | 'warn'; money?: boolean }[] = [
    { k: 'companies', icon: <Building2 />, tone: 'brand' }, { k: 'branches', icon: <GitBranch />, tone: 'neutral' }, { k: 'orders', icon: <Receipt />, tone: 'info' },
    { k: 'revenue', icon: <Wallet />, tone: 'ok', money: true }, { k: 'patientsNew', icon: <UserPlus />, tone: 'accent' }, { k: 'resultsReady', icon: <FlaskConical />, tone: 'info' }, { k: 'smsSent', icon: <MessageSquare />, tone: 'neutral' },
  ]

  return (
    <div className="flex flex-col gap-4" data-regions-view data-level={level}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TerritoryFilter value={effective} allCountriesLabel={t('admin.platform.regions.allCountries')}
          onChange={(v) => setScope(v, { allCountries: !v.countryId })} />
        <DateRangeFilter value={range} onChange={setRange} presets={['today', 'last7', 'last30', 'thisMonth']} allowCustom size="sm" />
      </div>

      <nav className="flex flex-wrap items-center gap-1 text-[13px]" aria-label="breadcrumb" data-region-crumbs>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-ink-3" />}
            {c.to ? <button type="button" onClick={c.to} className="font-medium text-brand-ink hover:underline">{c.label}</button> : <span className="font-semibold text-ink">{c.label}</span>}
          </span>
        ))}
        <span className="ml-2 text-ink-3">· {t(`admin.platform.regions.level_${level}`)}</span>
      </nav>

      {q.isError ? (
        <Card><EmptyState title={t('common.error')} description={String((q.error as Error)?.message ?? '')} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map(({ k, icon, tone, money }) => total
              ? <Stat key={k} label={metricLabel(k)} value={money ? fmtMoney(total[k], false) : fmtNumber(total[k])} sub={money ? t('common.sum') : undefined} icon={icon} tone={tone} />
              : <Skeleton key={k} className="h-[92px]" />)}
          </div>

          {/* a data-quality hint, once — at the top level, where the whole platform is in view */}
          {missing > 0 && !effective.regionId && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius)] border border-warn/30 bg-warn-soft px-4 py-2.5 text-[13px] text-ink-2" data-region-coverage={missing}>
              <MapPinOff className="size-4 shrink-0 text-warn" />
              <span className="min-w-0 flex-1">{t('admin.platform.regions.coverage', { n: missing, total: data!.coverage.companies })}</span>
              <Button size="xs" variant="soft" onClick={() => onShowClinics({ unlocated: true })} data-region-show-unlocated>{t('admin.platform.regions.showThem')}</Button>
            </div>
          )}

          <Card>
            <CardHeader title={t('admin.platform.regions.trend')} description={`${crumbs.map((c) => c.label).join(' › ')} · ${range.range.from}${range.range.to !== range.range.from ? ` – ${range.range.to}` : ''}`}
              actions={<Segmented<'revenue' | 'orders'> size="sm" value={trendMetric} onChange={setTrendMetric} items={[{ value: 'revenue', label: metricLabel('revenue') }, { value: 'orders', label: metricLabel('orders') }]} />} />
            {data ? (
              <TrendChart points={data.trend.map((p) => ({ date: p.date, value: trendMetric === 'revenue' ? p.revenue : p.orders }))} format={(v) => (trendMetric === 'revenue' ? fmtMoney(v) : fmtNumber(v))} label={metricLabel(trendMetric)} height={200} />
            ) : <Skeleton className="h-[200px]" />}
          </Card>

          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <h3 className="text-[14px] font-semibold">{t(`admin.platform.regions.level_${level}`)} <span className="ml-1 text-ink-3 tabular">{rows.length || ''}</span></h3>
              <div className="flex items-center gap-2">
                <span className="hidden text-[12px] text-ink-3 sm:inline">{level === 'company' ? t('admin.platform.regions.privacy') : t('admin.platform.regions.drillHint')}</span>
                <Button size="xs" variant="ghost" leftIcon={<Download className="size-3.5" />} onClick={exportCsv} disabled={!rows.length}>CSV</Button>
              </div>
            </div>
            <div className="border-t border-line">
              <DataTable<UnitRow> columns={columns} rows={rows} rowKey={(r) => r.id} loading={q.isLoading && !data} sortBy={sort.by} sortDir={sort.dir} onSort={onSort} cardBelow="md"
                onRowClick={level === 'company' ? undefined : drill}
                empty={<EmptyState icon={<ShieldCheck />} title={t('admin.platform.regions.empty')} description={t('admin.platform.regions.emptyHint')} />} />
            </div>
            {data?.unassigned && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line bg-surface-2/50 px-4 py-3 text-[13px] sm:px-5" data-region-unassigned>
                <span className="inline-flex items-center gap-1.5 font-medium text-warn"><MapPinOff className="size-4" />{t('admin.platform.regions.unassigned')}</span>
                <span className="text-ink-3">{t('admin.platform.regions.unassignedHint', { level: t(`admin.platform.regions.level_${level}`).toLowerCase() })}</span>
                <span className="ml-auto flex flex-wrap gap-x-4 tabular text-ink-2">
                  <span>{metricLabel('branches')}: <b>{fmtNumber(data.unassigned.branches)}</b></span>
                  <span>{metricLabel('orders')}: <b>{fmtNumber(data.unassigned.orders)}</b></span>
                  <span>{metricLabel('revenue')}: <b>{fmtMoney(data.unassigned.revenue, false)}</b></span>
                </span>
                {level !== 'company' && <Button size="xs" variant="soft" onClick={() => onShowClinics({ ...effective, unlocated: true })}>{t('admin.platform.regions.showThem')}</Button>}
              </div>
            )}
          </Card>
          <p className="text-[12.5px] text-ink-3 sm:hidden">{t('admin.platform.regions.privacy')}</p>
        </>
      )}
    </div>
  )
}
