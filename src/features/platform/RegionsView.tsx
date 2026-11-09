/**
 * Hududlar — activity of the organisation tree folded by territory: country → region → district → facility. A row is
 * a territory (click it to go one level down; the breadcrumb and the browser's back button go up) or, at the last
 * level, a facility — "Ochish" scopes the admin panel to it. Numbers only: cheques, money, new patients, approved
 * results, SMS — never a patient. The superadmin sees every country; an administrator sees the subtree of their own
 * unit (`unitId`) with the levels above it fixed.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Download, FlaskConical, FolderOpen, Hospital, MessageSquare, Receipt, ShieldCheck, UserPlus, Wallet } from 'lucide-react'
import type { RegionGroupBy, TerritoryScope, UnitLevel, UnitMetrics, UnitRow } from '@/domain'
import { useAdminScope, useAuth, usePermissions } from '@/features/auth/store'
import { DateRangeFilter, initialRange, type RangeState } from '@/features/lab/DateRangeFilter'
import { countryLabel } from '@/features/org/LocationFields'
import { useUnitTree, useUnitTreeShape } from '@/features/org/queries'
import { useCountries, useDistricts, useRegions } from '@/features/patients/queries'
import { TrendChart } from '@/features/reports/TrendChart'
import { downloadCsv } from '@/features/reports/csv'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, Segmented, Skeleton, Stat, toast, type Column, type Tone } from '@/shared/ui'
import { useRegionStats } from './queries'
import { TerritoryFilter, type TerritoryLevel } from './TerritoryFilter'
import { useTerritoryParams } from './territory'

type SortKey = 'name' | keyof UnitMetrics
const METRIC_KEYS: (keyof UnitMetrics)[] = ['units', 'orders', 'revenue', 'patientsNew', 'resultsReady', 'smsSent']
/** the selects an administrator still gets: the levels under their own unit */
const FILTER_LEVELS: Record<UnitLevel, TerritoryLevel[]> = { country: ['region', 'district'], region: ['district'], district: [], facility: [] }

export function RegionsView() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { isSuperAdmin } = usePermissions()
  const { scopeId } = useAdminScope()
  const setScopeUnit = useAuth((s) => s.setScopeUnit)
  // an administrator's view is folded under their own unit; the territory above it is fixed
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)
  const root = isSuperAdmin ? undefined : shape.byId.get(scopeId)
  const { scope, setScope } = useTerritoryParams()
  const countries = useCountries()
  // the platform's own country unless another one, or every country, was picked
  const home = countries.data?.find((c) => c.code === 'UZ')
  const effective: TerritoryScope = isSuperAdmin
    ? scope.countryId || scope.allCountries
      ? { countryId: scope.countryId, regionId: scope.regionId, districtId: scope.districtId }
      : { countryId: home?.id, regionId: scope.regionId, districtId: scope.districtId }
    : { countryId: root?.countryId, regionId: scope.regionId ?? root?.regionId ?? undefined, districtId: scope.districtId ?? root?.districtId ?? undefined }
  const ready = isSuperAdmin ? scope.allCountries || !!effective.countryId : !!root
  // one level below the narrowest territory: nothing / country → regions, region → districts, district → facilities
  const level: RegionGroupBy = effective.districtId ? 'unit' : effective.regionId ? 'district' : effective.countryId ? 'region' : 'country'
  const regions = useRegions(effective.countryId, { enabled: !!effective.countryId })
  const districts = useDistricts(effective.regionId, { enabled: !!effective.regionId })

  const [range, setRange] = useState<RangeState>(() => initialRange('last30'))
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'orders'>('revenue')
  const [sort, setSort] = useState<{ by: SortKey; dir: 'asc' | 'desc' }>({ by: 'revenue', dir: 'desc' })
  const q = useRegionStats({ dateFrom: range.range.from, dateTo: range.range.to, ...effective, unitId: isSuperAdmin ? undefined : scopeId, groupBy: level }, { enabled: ready })
  const data = q.data

  const rows = useMemo(() => {
    const list = [...(data?.rows ?? [])]
    const dir = sort.dir === 'asc' ? 1 : -1
    list.sort((a, b) => (sort.by === 'name' ? a.name.localeCompare(b.name) * dir : (a[sort.by] - b[sort.by]) * dir || a.name.localeCompare(b.name)))
    return list
  }, [data, sort])
  const maxRevenue = Math.max(1, ...rows.map((r) => r.revenue))
  const onSort = (key: string) => setSort((s) => ({ by: key as SortKey, dir: s.by === key ? (s.dir === 'asc' ? 'desc' : 'asc') : key === 'name' ? 'asc' : 'desc' }))

  // breadcrumb: where we are, each step a way back up; an administrator's root is their own unit
  const keepCountry: TerritoryScope = { countryId: isSuperAdmin ? effective.countryId : undefined }
  const country = countries.data?.find((c) => c.id === effective.countryId)
  const regionName = regions.data?.find((r) => r.id === effective.regionId)?.name
  const districtName = districts.data?.find((d) => d.id === effective.districtId)?.name
  const showRegionCrumb = !!effective.regionId && (isSuperAdmin || root?.level === 'country')
  const showDistrictCrumb = !!effective.districtId && (isSuperAdmin || root?.level === 'country' || root?.level === 'region')
  const crumbs: { label: string; to?: () => void }[] = [
    isSuperAdmin
      ? { label: effective.countryId ? (country ? countryLabel(country) : '…') : t('admin.platform.regions.allCountries'), to: effective.regionId ? () => setScope(keepCountry, { allCountries: scope.allCountries }) : undefined }
      : { label: root?.name ?? '…', to: scope.regionId || scope.districtId ? () => setScope({}) : undefined },
    ...(showRegionCrumb ? [{ label: regionName ?? '…', to: effective.districtId ? () => setScope({ ...keepCountry, regionId: effective.regionId }) : undefined }] : []),
    ...(showDistrictCrumb ? [{ label: districtName ?? '…' }] : []),
  ]

  const drill = (r: UnitRow) => {
    if (r.kind === 'country') setScope({ countryId: r.id })
    else if (r.kind === 'region') setScope({ ...keepCountry, regionId: r.id })
    else if (r.kind === 'district') setScope({ ...keepCountry, regionId: effective.regionId, districtId: r.id })
  }
  /** a facility row: the admin panel scoped to it (the shell re-picks the working facility inside) */
  const open = (r: UnitRow) => { setScopeUnit(r.id); toast.success(t('admin.platform.switched', { name: r.name })); nav(routes.admin.root) }
  const filterLevels: TerritoryLevel[] = isSuperAdmin ? ['country', 'region', 'district'] : root ? FILTER_LEVELS[root.level] : []
  const onFilter = (v: TerritoryScope) => (isSuperAdmin ? setScope(v, { allCountries: !v.countryId }) : setScope({ regionId: v.regionId, districtId: v.districtId }))

  const metricLabel = (k: keyof UnitMetrics) => t(`admin.platform.regions.${k}`)
  const levelLabel = t(`admin.platform.regions.level_${level}`)
  const exportCsv = () => {
    if (!rows.length) return toast.info(t('common.empty'))
    const keys = METRIC_KEYS.filter((k) => level !== 'unit' || k !== 'units')
    downloadCsv(`hududlar-${level}-${range.range.from}_${range.range.to}`, [levelLabel, ...keys.map(metricLabel)], rows.map((r) => [r.parentName ? `${r.name} (${r.parentName})` : r.name, ...keys.map((k) => r[k])]))
    toast.success(t('clinical.reports.exported'))
  }

  const num = (k: keyof UnitMetrics): Column<UnitRow> => ({ key: k, header: metricLabel(k), align: 'right', sortable: true, hideBelow: k === 'smsSent' || k === 'resultsReady' ? 'lg' : k === 'units' || k === 'patientsNew' ? 'md' : undefined, card: 'field', cell: (r) => <span className={cn('tabular', r[k] === 0 && 'text-ink-3')}>{fmtNumber(r[k])}</span> })
  const columns: Column<UnitRow>[] = [
    { key: 'name', header: levelLabel, sortable: true, card: 'title', cell: (r) => (
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', r.kind === 'unit' ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-ink-3')}>{r.kind === 'unit' ? <Hospital className="size-4" /> : <ChevronRight className="size-4" />}</span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{r.name}</span>
            {r.code && <span className="shrink-0 font-mono text-[11px] text-ink-3">{r.code}</span>}
            {r.isActive === false && <Badge tone="neutral" size="sm">{t('admin.platform.inactive')}</Badge>}
          </span>
          {r.parentName && <span className="block truncate text-[12px] text-ink-3">{r.parentName}</span>}
        </span>
      </span>
    ) },
    ...(level === 'unit' ? [] : [num('units')]),
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
    // the drill arrow is table-only (a card is tapped as a whole); the facility's button stays in the card
    { key: 'actions', header: '', align: 'right', card: level === 'unit' ? 'actions' : 'hidden', cell: (r) => r.kind === 'unit'
      ? <span onClick={(e) => e.stopPropagation()}><Button size="xs" variant="soft" leftIcon={<FolderOpen className="size-3.5" />} onClick={() => open(r)} title={t('admin.platform.regions.openHint')} data-region-open={r.code ?? r.id}>{t('admin.platform.open')}</Button></span>
      : <ChevronRight className="ml-auto size-4 text-ink-3" /> },
  ]

  const total = data?.total
  const tiles: { k: keyof UnitMetrics; icon: ReactNode; tone: Tone; money?: boolean }[] = [
    { k: 'units', icon: <Hospital />, tone: 'brand' }, { k: 'orders', icon: <Receipt />, tone: 'info' }, { k: 'revenue', icon: <Wallet />, tone: 'ok', money: true },
    { k: 'patientsNew', icon: <UserPlus />, tone: 'accent' }, { k: 'resultsReady', icon: <FlaskConical />, tone: 'info' }, { k: 'smsSent', icon: <MessageSquare />, tone: 'neutral' },
  ]

  if (!isSuperAdmin && tree.isSuccess && !root) {
    // the administered unit is not in the tree the API returned — the shell corrects the scope on its next pass
    return <Card><EmptyState icon={<ShieldCheck />} title={t('common.error')} description={t('common.noAccess')} /></Card>
  }

  return (
    <div className="flex flex-col gap-4" data-regions-view data-level={level}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TerritoryFilter value={effective} levels={filterLevels} allCountriesLabel={t('admin.platform.regions.allCountries')} onChange={onFilter} />
        <DateRangeFilter value={range} onChange={setRange} presets={['today', 'last7', 'last30', 'thisMonth']} allowCustom size="sm" className={filterLevels.length ? undefined : 'lg:ml-auto'} />
      </div>

      <nav className="flex flex-wrap items-center gap-1 text-[13px]" aria-label="breadcrumb" data-region-crumbs>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-ink-3" />}
            {c.to ? <button type="button" onClick={c.to} className="font-medium text-brand-ink hover:underline">{c.label}</button> : <span className="font-semibold text-ink">{c.label}</span>}
          </span>
        ))}
        <span className="ml-2 text-ink-3">· {levelLabel}</span>
      </nav>

      {q.isError ? (
        <Card><EmptyState title={t('common.error')} description={String((q.error as Error)?.message ?? '')} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {tiles.map(({ k, icon, tone, money }) => total
              ? <Stat key={k} label={metricLabel(k)} value={money ? fmtMoney(total[k], false) : fmtNumber(total[k])} sub={money ? t('common.sum') : undefined} icon={icon} tone={tone} />
              : <Skeleton key={k} className="h-[92px]" />)}
          </div>

          <Card>
            <CardHeader title={t('admin.platform.regions.trend')} description={`${crumbs.map((c) => c.label).join(' › ')} · ${range.range.from}${range.range.to !== range.range.from ? ` – ${range.range.to}` : ''}`}
              actions={<Segmented<'revenue' | 'orders'> size="sm" value={trendMetric} onChange={setTrendMetric} items={[{ value: 'revenue', label: metricLabel('revenue') }, { value: 'orders', label: metricLabel('orders') }]} />} />
            {data ? (
              <TrendChart points={data.trend.map((p) => ({ date: p.date, value: trendMetric === 'revenue' ? p.revenue : p.orders }))} format={(v) => (trendMetric === 'revenue' ? fmtMoney(v) : fmtNumber(v))} label={metricLabel(trendMetric)} height={200} />
            ) : <Skeleton className="h-[200px]" />}
          </Card>

          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <h3 className="text-[14px] font-semibold">{levelLabel} <span className="ml-1 text-ink-3 tabular">{rows.length || ''}</span></h3>
              <div className="flex items-center gap-2">
                <span className="hidden text-[12px] text-ink-3 sm:inline">{level === 'unit' ? t('admin.platform.regions.privacy') : t('admin.platform.regions.drillHint')}</span>
                <Button size="xs" variant="ghost" leftIcon={<Download className="size-3.5" />} onClick={exportCsv} disabled={!rows.length}>CSV</Button>
              </div>
            </div>
            <div className="border-t border-line">
              <DataTable<UnitRow> columns={columns} rows={rows} rowKey={(r) => r.id} loading={q.isLoading && !data} sortBy={sort.by} sortDir={sort.dir} onSort={onSort} cardBelow="md"
                onRowClick={level === 'unit' ? undefined : drill}
                empty={<EmptyState icon={<ShieldCheck />} title={t('admin.platform.regions.empty')} description={t('admin.platform.regions.emptyHint')} />} />
            </div>
          </Card>
          <p className="text-[12.5px] text-ink-3 sm:hidden">{t('admin.platform.regions.privacy')}</p>
        </>
      )}
    </div>
  )
}
