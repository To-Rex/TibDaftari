/**
 * Platforma — the organisation tree walked from the top, one level at a time, the way it is built:
 * Kompaniya → Davlat → Viloyat → Tuman / shahar → Muassasa. The steps on top show where the page stands and lead
 * back up; the list below holds what is inside the current place (cards for companies and countries, a sortable
 * table for regions, districts and facilities); the numbers are the activity of that place in the chosen period —
 * numbers only, never a patient.
 *
 * Entering a card or a row goes one level down; «Boshqarish» opens the admin panel for that unit instead. What can be
 * added is offered where it belongs: a company at the top, a country inside a company, a facility (the quick start,
 * which also opens the missing region / district) deeper down.
 *
 * The superadmin starts at the companies and may look at every company together (`company=all`, folded by territory);
 * an administrator starts at their own unit — the levels above it are fixed. The place is kept in the address
 * (`usePlatformPath`), so a step is a link and Back walks up.
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowLeft, Download, Info, Plus, Rocket, ShieldCheck } from 'lucide-react'
import type { OrgUnit, UnitMetrics, UnitRow } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { DateRangeFilter, initialRange, type RangeState } from '@/features/lab/DateRangeFilter'
import { countryLabel } from '@/features/org/LocationFields'
import { QuickStartDialog } from '@/features/org/quickstart/QuickStartDialog'
import { downloadCsv } from '@/features/reports/csv'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDate } from '@/shared/lib/format'
import { storage } from '@/shared/lib/storage'
import { Button, Card, EmptyState, PageHeader, SearchInput, Skeleton, toast } from '@/shared/ui'
import { AddCard, AllCompaniesLink, CompanyCard, CountryCard, type StatsState } from './PlatformCards'
import { CompanyModal, CountryModal } from './PlatformModals'
import { PlatformSummary, PlatformTrend } from './PlatformSummary'
import { PlatformTable } from './PlatformTable'
import { LADDER, LEVEL_ICON, PathStepper, type PathStep } from './PathStepper'
import { GROUP_BY, METRIC_KEYS, NO_COUNTS, buildEntries, type Entry, type SortKey } from './platformModel'
import { useRegionStats } from './queries'
import { ALL } from './territory'
import { usePlatformPlace } from './usePlatformPlace'

/** the "how to use" note was read and put away — per browser */
const TIP_KEY = 'clinic.platform.tip'

export function PlatformExplorer() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const place = usePlatformPlace()
  const { isSuperAdmin, tree, shape, countries, go, root, rootIdx, inRoot, companies, countryNodes, allCompanies, companyId, co, sel, level, idx, down, upTo, upLevel, geoOf, nameAt, canManage, manage } = place
  const cards = level === 'company' || level === 'country'

  // ---- the numbers of the place ------------------------------------------------------------------------------------

  const [range, setRange] = useState<RangeState>(() => initialRange('last30'))
  const q = useRegionStats({
    dateFrom: range.range.from, dateTo: range.range.to, groupBy: GROUP_BY[level],
    companyId: isSuperAdmin ? companyId : undefined,
    unitId: isSuperAdmin ? undefined : root?.id,
    countryId: idx >= 2 ? sel.country : undefined,
    regionId: idx >= 3 ? sel.region : undefined,
    districtId: idx >= 4 ? sel.district : undefined,
  }, { enabled: isSuperAdmin || !!root })
  // the answer of another level (kept on screen while the new one loads) is never read as this one's
  const data = q.data && q.data.groupBy === GROUP_BY[level] ? q.data : undefined
  const stale = !!data && q.isPlaceholderData
  const stats: StatsState = data && !stale ? 'ready' : q.isError ? 'failed' : 'loading'
  const rowsById = useMemo(() => new Map((data?.rows ?? []).map((r) => [r.id, r] as const)), [data])
  const total = data?.total

  // ---- what is inside: the list --------------------------------------------------------------------------------------

  const entries = useMemo(() => buildEntries({
    level, companies, countryNodes, units: shape.units, allCompanies, companyId, inRoot, sel: { country: sel.country, region: sel.region, district: sel.district }, rows: data?.rows, stale,
    geoOf: (id) => { const c = countries.data?.find((x) => x.id === id); return c ? { name: c.name, code: c.code, label: countryLabel(c) } : undefined },
  }), [level, companies, countryNodes, shape.units, allCompanies, companyId, inRoot, sel.country, sel.region, sel.district, data, stale, countries.data])

  const [query, setQuery] = useState('')
  // a new list starts unfiltered
  useEffect(() => { setQuery('') }, [level, companyId, sel.country, sel.region, sel.district])
  const [sort, setSort] = useState<{ by: SortKey; dir: 'asc' | 'desc' }>({ by: 'revenue', dir: 'desc' })
  const shown = useMemo(() => {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
    const text = (e: Entry) => [e.name, e.code, e.parentName, ...(e.nodes ?? []).map((n) => shape.byId.get(n.parentId ?? '')?.name)].filter(Boolean).join(' ').toLocaleLowerCase()
    const list = words.length ? entries.filter((e) => { const s = text(e); return words.every((w) => s.includes(w)) }) : [...entries]
    if (cards) return list
    const dir = sort.dir === 'asc' ? 1 : -1
    return list.sort((a, b) => (sort.by === 'name' ? a.name.localeCompare(b.name) * dir : (a[sort.by] - b[sort.by]) * dir || a.name.localeCompare(b.name)))
  }, [entries, query, sort, cards, shape.byId])
  const onSort = (key: string) => setSort((s) => ({ by: key as SortKey, dir: s.by === key ? (s.dir === 'asc' ? 'desc' : 'asc') : key === 'name' ? 'asc' : 'desc' }))

  // ---- the steps on top ----------------------------------------------------------------------------------------------

  const listReady = cards ? tree.isSuccess && (level === 'company' || !allCompanies || !!data) : !!data
  const first = isSuperAdmin ? 0 : Math.max(0, rootIdx)
  const steps: PathStep[] = LADDER.slice(first).map((lvl) => {
    const i = LADDER.indexOf(lvl)
    if (i < idx) return { level: lvl, state: 'done', value: nameAt(lvl), onClick: () => upTo(!isSuperAdmin && i === rootIdx ? LADDER[rootIdx + 1]! : lvl) }
    if (i > idx) return { level: lvl, state: 'next' }
    return { level: lvl, state: 'current', value: !listReady ? '…' : entries.length === 0 ? t('admin.platform.path.none') : level === 'facility' ? t('admin.platform.path.count', { count: entries.length }) : t('admin.platform.path.choose', { count: entries.length }) }
  })
  const scopeLabel = steps.filter((s) => s.state === 'done').map((s) => s.value).join(' › ') || t('admin.platform.wholePlatform')
  const period = range.range.from === range.range.to ? fmtDate(range.range.from) : `${fmtDate(range.range.from)} – ${fmtDate(range.range.to)}`

  // ---- adding where it belongs ---------------------------------------------------------------------------------------

  const [modal, setModal] = useState<'company' | 'country' | null>(null)
  const [quick, setQuick] = useState(false)
  const canQuickStart = isSuperAdmin || (can('admin.unit.manage') && can('admin.employee.write'))
  // the company's unit of the place looked at — where a new facility opens
  const hereNode = useMemo<OrgUnit | undefined>(() => {
    if (!companyId || idx < 2) return undefined
    const mine = (u: OrgUnit) => u.companyId === companyId && (!inRoot || inRoot.has(u.id))
    if (level === 'region') return shape.units.find((u) => u.level === 'country' && u.countryId === sel.country && mine(u))
    if (level === 'district') return shape.units.find((u) => u.level === 'region' && u.regionId === sel.region && mine(u))
    return shape.units.find((u) => u.level === 'district' && u.districtId === sel.district && mine(u))
  }, [companyId, idx, level, inRoot, shape.units, sel.country, sel.region, sel.district])
  const qsParents = useMemo(() => {
    const base = root?.id ?? companyId
    return base ? shape.under(base).filter((u) => u.level !== 'facility' && u.isActive) : []
  }, [root, companyId, shape])
  const add: 'company' | 'country' | 'facility' | null = level === 'company' ? (isSuperAdmin ? 'company' : null)
    : level === 'country' ? (isSuperAdmin ? 'country' : null)
      : hereNode?.isActive && canQuickStart ? 'facility' : null
  const openAdd = () => (add === 'facility' ? setQuick(true) : add && setModal(add))
  const addLabel = add === 'company' ? t('admin.platform.companies.add') : add === 'country' ? t('admin.platform.countries.add') : t('admin.platform.addFacility')

  const [tip, setTip] = useState(() => !storage.get<boolean>(TIP_KEY, false))
  const closeTip = () => { storage.set(TIP_KEY, true); setTip(false) }

  // ---- export -------------------------------------------------------------------------------------------------------

  const metricLabel = (k: keyof UnitMetrics) => t(`admin.platform.metrics.${k}`)
  const exportCsv = () => {
    if (!shown.length) return toast.info(t('common.empty'))
    const keys = METRIC_KEYS.filter((k) => level !== 'facility' || k !== 'units')
    downloadCsv(`platforma-${level}-${range.range.from}_${range.range.to}`, [t(`admin.platform.levels.${level}`), ...keys.map(metricLabel)], shown.map((r) => [r.parentName ? `${r.name} (${r.parentName})` : r.name, ...keys.map((k) => r[k])]))
    toast.success(t('clinical.reports.exported'))
  }

  const RowIcon = LEVEL_ICON[level]
  const share = (r?: UnitRow) => (r && total && total.revenue > 0 ? Math.round((r.revenue / total.revenue) * 100) : undefined)

  // ---- page ---------------------------------------------------------------------------------------------------------

  const header = (
    <PageHeader
      eyebrow={isSuperAdmin ? 'Superadmin' : root?.name}
      title={isSuperAdmin ? t('admin.platform.title') : t('admin.platform.scopedTitle')}
      description={isSuperAdmin ? t('admin.platform.subtitle') : t('admin.platform.scopedSubtitle', { name: root?.name ?? '' })}
      actions={add && <Button data-hotkey="n" leftIcon={add === 'facility' ? <Rocket className="size-4" /> : <Plus className="size-4" />} onClick={openAdd} data-platform-add={add} data-tour="territory-add">{addLabel}</Button>} />
  )
  if (!isSuperAdmin && !root) {
    // the administered unit is not in the tree yet (loading) or not at all (the shell corrects the scope on its next pass)
    return <>{header}{tree.isSuccess ? <Card><EmptyState icon={<ShieldCheck />} title={t('common.error')} description={t('common.noAccess')} /></Card> : <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-28" /><Skeleton className="h-64" /></div>}</>
  }

  const listTitle = (
    <div className="flex min-w-0 items-start gap-2.5">
      {upLevel && (
        <Button size="sm" variant="secondary" className="mt-0.5 shrink-0" leftIcon={<ArrowLeft className="size-4" />} onClick={() => upTo(upLevel)} title={t('admin.platform.path.backTo', { level: t(`admin.platform.levels.${upLevel}`) })} data-platform-up>
          <span className="max-sm:hidden">{t('admin.platform.path.back')}</span>
        </Button>
      )}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-[17px] font-semibold tracking-[-0.01em]">{allCompanies && level === 'country' ? t('admin.platform.allCountries') : t(`admin.platform.levels.${level}`)}</h2>
          {listReady && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-ink-2 tabular">{query ? `${shown.length} / ${entries.length}` : entries.length}</span>}
        </div>
        <p className="text-[12.5px] text-ink-3" data-platform-hint>{t(`admin.platform.hint.${allCompanies && level === 'country' ? 'allCountries' : level}`)}</p>
      </div>
    </div>
  )

  return (
    <>
      {header}
      <div className="flex flex-col gap-4" data-platform data-level={level} data-all={allCompanies || undefined}>
        {tip && (
          <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-line bg-surface-2/40 px-4 py-3" data-platform-tip>
            <Info className="mt-0.5 size-4 shrink-0 text-brand" />
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-2"><span className="font-semibold text-ink">{t('admin.platform.tip.title')}</span> {t('admin.platform.tip.body')}</p>
            <Button size="xs" variant="ghost" className="shrink-0" onClick={closeTip} data-platform-tip-ok>{t('admin.platform.tip.ok')}</Button>
          </div>
        )}

        <PathStepper steps={steps} />

        {/* the numbers of the place, for the period */}
        <PlatformSummary scopeLabel={scopeLabel} period={period} total={total} stale={stale} error={q.isError ? errorMessage(q.error) : null}
          filter={<DateRangeFilter value={range} onChange={setRange} presets={['today', 'last7', 'last30', 'thisMonth']} allowCustom size="sm" />} />

        {/* what is inside */}
        <section aria-label={t(`admin.platform.levels.${level}`)} className="flex flex-col gap-3" data-platform-list>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">{listTitle}</div>
            {entries.length > 6 && <SearchInput value={query} onChange={setQuery} placeholder={t('admin.platform.search')} aria-label={t('admin.platform.search')} className="order-last w-full sm:order-none sm:w-64" data-platform-search />}
            <Button size="sm" variant="ghost" className="shrink-0" leftIcon={<Download className="size-4" />} onClick={exportCsv} disabled={!shown.length} data-platform-csv data-tour="territory-csv">CSV</Button>
          </div>

          {cards ? (
            !tree.isSuccess || (allCompanies && !data && !q.isError) ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[19rem] rounded-[var(--radius-lg)]" />)}</div>
            ) : entries.length === 0 && !add ? (
              <Card><EmptyState icon={<RowIcon />} title={t(`admin.platform.empty.${level}`)} description={t(`admin.platform.empty.${level}Hint`)} /></Card>
            ) : shown.length === 0 && query ? (
              <Card><EmptyState title={t('admin.platform.noMatches')} /></Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" data-platform-cards data-tour="territory-cards">
                {level === 'company' && shown.map((e) => (
                  <CompanyCard key={e.id} unit={e.node!} countries={countryNodes.filter((n) => n.parentId === e.id)} row={stats === 'ready' ? rowsById.get(e.id) : undefined} share={stats === 'ready' ? share(rowsById.get(e.id)) : undefined} stats={stats}
                    onOpen={() => down(e.id)} onManage={canManage(e.unitId) ? () => manage(e.unitId!) : undefined} />
                ))}
                {level === 'country' && shown.map((e) => {
                  const geo = geoOf(e.id)
                  const row = stats === 'ready' ? rowsById.get(e.id) : undefined
                  return (
                    <CountryCard key={e.id} title={e.name} code={e.code} inactive={e.isActive === false} counts={e.counts ?? NO_COUNTS} row={row} share={share(row)} stats={stats}
                      subtitle={allCompanies ? t('admin.platform.companiesCount', { count: e.nodes?.length ?? 0 }) : geo && countryLabel(geo) !== e.name ? countryLabel(geo) : undefined}
                      onOpen={() => down(e.id)} onManage={canManage(e.unitId) ? () => manage(e.unitId!) : undefined}
                      companies={allCompanies ? (e.nodes ?? []).map((n) => ({ id: n.parentId ?? n.id, name: shape.byId.get(n.parentId ?? '')?.name ?? n.companyName ?? '—', onOpen: () => go({ company: n.parentId ?? undefined, country: e.id }) })) : undefined} />
                  )
                })}
                {add && !query && (
                  <AddCard title={addLabel} hint={t(add === 'company' ? 'admin.platform.companies.addCard' : 'admin.platform.countries.addCard')} onClick={openAdd} data-platform-add-card={add} />
                )}
              </div>
            )
          ) : (
            <PlatformTable level={level as 'region' | 'district' | 'facility'} rows={shown} loading={!data && !q.isError} stale={stale} sort={sort} onSort={onSort}
              onOpen={level === 'facility' ? undefined : (e) => down(e.id)} canManage={canManage} onManage={manage}
              empty={q.isError
                ? <EmptyState icon={<AlertTriangle />} title={t('admin.platform.statsFailed')} description={errorMessage(q.error)} />
                : query ? <EmptyState title={t('admin.platform.noMatches')} />
                  : <EmptyState icon={<RowIcon />} title={t(`admin.platform.empty.${level}`)} description={t(`admin.platform.empty.${level}Hint`)}
                    action={add === 'facility' && <Button leftIcon={<Rocket className="size-4" />} onClick={openAdd} data-platform-add-empty>{addLabel}</Button>} />} />
          )}

          {level === 'company' && isSuperAdmin && companies.length > 1 && !query && <AllCompaniesLink onClick={() => go({ company: ALL })} />}
        </section>

        {/* day by day */}
        <PlatformTrend data={data} scopeLabel={scopeLabel} period={period} stale={stale} failed={q.isError} />

        <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3"><ShieldCheck className="size-3.5 shrink-0" />{t('admin.platform.privacy')}</p>
      </div>

      <CompanyModal open={modal === 'company'} onClose={() => setModal(null)} countries={countries.data ?? []} onCreated={(c) => go({ company: c.id })} />
      <CountryModal open={modal === 'country'} onClose={() => setModal(null)} countries={countries.data ?? []} companies={companies} nodes={countryNodes} companyId={companyId}
        onCreated={(n) => go({ company: n.parentId ?? co, country: n.countryId ?? undefined })} />
      {add === 'facility' && hereNode && (
        <QuickStartDialog open={quick} onClose={() => setQuick(false)} parent={hereNode} parents={qsParents} units={tree.data ?? []} />
      )}
    </>
  )
}
