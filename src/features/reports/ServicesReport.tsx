/** Reports › Services: which services are used most / least (vs the previous equal period) and which nobody ordered. */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Ban, Download, Layers, PackageCheck, TrendingUp } from 'lucide-react'
import type { Id, ServiceUsageRow, ServicesReport as ServicesReportData } from '@/domain'
import type { ReportRange } from '@/data/repositories'
import { collationLocale } from '@/features/template-editor/galleryFilters'
import { fmtDate, fmtMoney, fmtNumber } from '@/shared/lib/format'
import { Button, Card, CardHeader, DataTable, EmptyState, SearchInput, Segmented, Skeleton, Stat, toast, type Column } from '@/shared/ui'
import { downloadCsv } from './csv'
import { useServicesReport } from './queries'
import { ChangeBadge, fmtDuration, fold, pct } from './reportKit'

const R = 'clinical.reports.svc'
type Order = 'most' | 'least'
type Unused = ServicesReportData['unused'][number]
const UNUSED_PREVIEW = 12

export function ServicesReport({ companyId, range, finance, canExport }: { companyId: Id; range: ReportRange; finance: boolean; canExport: boolean }) {
  const { t, i18n } = useTranslation()
  const q = useServicesReport(companyId, range)
  const d = q.data
  const [order, setOrder] = useState<Order>('most')
  const [search, setSearch] = useState('')
  const [allUnused, setAllUnused] = useState(false)

  const rows = useMemo(() => {
    const needle = fold(search)
    const list = (d?.rows ?? []).filter((r) => !needle || fold(`${r.name} ${r.category}`).includes(needle))
    const coll = new Intl.Collator(collationLocale(i18n.language))
    return [...list].sort((a, b) => (order === 'most' ? b.count - a.count : a.count - b.count) || coll.compare(a.name, b.name))
  }, [d, search, order, i18n.language])
  const unused = useMemo(() => {
    const needle = fold(search)
    return (d?.unused ?? []).filter((r) => !needle || fold(`${r.name} ${r.category}`).includes(needle))
  }, [d, search])
  const max = Math.max(1, ...(d?.rows ?? []).map((r) => r.count))
  const top = d?.rows.reduce<ServiceUsageRow | undefined>((best, r) => (!best || r.count > best.count ? r : best), undefined)
  const delta = d && d.prevTotal > 0 ? Math.round(((d.total - d.prevTotal) / d.prevTotal) * 100) : undefined

  const columns: Column<ServiceUsageRow>[] = [
    {
      key: 'name', header: t(`${R}.service`), card: 'title',
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="break-words font-medium text-ink">{r.name}</span>
          <span className="text-[12px] text-ink-3">{r.category}</span>
        </span>
      ),
    },
    {
      key: 'count', header: t(`${R}.count`), width: '22%',
      cell: (r) => (
        <span className="flex min-w-[120px] items-center gap-2">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <motion.span className="block h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${(r.count / max) * 100}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
          </span>
          <span className="w-10 shrink-0 text-right tabular font-semibold">{fmtNumber(r.count)}</span>
          <span className="w-10 shrink-0 text-right tabular text-[12px] text-ink-3">{pct(r.count, d?.total ?? 0)}%</span>
        </span>
      ),
    },
    { key: 'patients', header: t(`${R}.patients`), align: 'right', cell: (r) => <span className="tabular">{fmtNumber(r.patients)}</span> },
    { key: 'change', header: t(`${R}.change`), align: 'right', cell: (r) => <ChangeBadge now={r.count} before={r.prevCount} newLabel={t(`${R}.isNew`)} /> },
    { key: 'pending', header: t(`${R}.pending`), align: 'right', hideBelow: 'lg', cell: (r) => <span className={r.pending ? 'tabular text-warn' : 'tabular text-ink-3'}>{fmtNumber(r.pending)}</span> },
    { key: 'avg', header: t(`${R}.avgTime`), align: 'right', hideBelow: 'lg', cell: (r) => <span className="tabular whitespace-nowrap text-ink-2">{fmtDuration(r.avgHours, t)}</span> },
    ...(finance ? [{ key: 'revenue', header: t(`${R}.revenue`), align: 'right' as const, cell: (r: ServiceUsageRow) => <span className="tabular whitespace-nowrap">{fmtMoney(r.revenue ?? 0, false)}</span> }] : []),
  ]

  const exportRows = () => {
    if (!d || (!d.rows.length && !d.unused.length)) return toast.info(t('common.empty'))
    downloadCsv(
      `services-${range.dateFrom}_${range.dateTo}`,
      [t(`${R}.service`), t('clinical.reports.by_category'), t(`${R}.count`), t(`${R}.patients`), `${t(`${R}.count`)} (${fmtDate(d.prevFrom)} – ${fmtDate(d.prevTo)})`, t(`${R}.pending`), ...(finance ? [t(`${R}.revenue`)] : [])],
      [
        ...rows.map((r) => [r.name, r.category, r.count, r.patients, r.prevCount, r.pending, ...(finance ? [r.revenue ?? 0] : [])]),
        ...unused.map((r) => [r.name, r.category, 0, 0, r.prevCount, 0, ...(finance ? [0] : [])]),
      ],
    )
    toast.success(t('clinical.reports.exported'))
  }

  const stat = (label: string, v: string | undefined, icon: React.ReactNode, tone: 'brand' | 'ok' | 'warn' | 'neutral', sub?: string, dlt?: number) => (
    <Stat label={label} value={v ?? <Skeleton className="h-7 w-20" />} icon={icon} tone={tone} sub={sub} delta={dlt} />
  )

  return (
    <div className="flex flex-col gap-5" data-report="services">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 max-xs:grid-cols-1">
        {stat(t(`${R}.total`), d && fmtNumber(d.total), <Layers />, 'brand', d ? t(`${R}.totalSub`, { n: fmtNumber(d.prevTotal) }) : undefined, delta)}
        {stat(t(`${R}.used`), d && fmtNumber(d.rows.length), <PackageCheck />, 'ok', t(`${R}.usedSub`))}
        {stat(t(`${R}.unused`), d && fmtNumber(d.unused.length), <Ban />, 'warn', t(`${R}.unusedSub`))}
        <Stat label={t(`${R}.top`)} icon={<TrendingUp />} tone="neutral" sub={top ? t(`${R}.topSub`, { n: fmtNumber(top.count) }) : undefined}
          value={d ? <span className="line-clamp-2 block break-words text-[17px] leading-snug" title={top?.name}>{top?.name ?? '—'}</span> : <Skeleton className="h-7 w-20" />} />
      </div>

      <Card padded={false} className="min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <CardHeader className="mb-0 max-sm:flex-col max-sm:items-start" title={t(`${R}.table`)}
            description={d ? t(`${R}.tableHint`, { from: fmtDate(d.prevFrom), to: fmtDate(d.prevTo) }) : undefined}
            actions={canExport && <Button size="sm" variant="ghost" leftIcon={<Download className="size-3.5" />} onClick={exportRows}>{t('clinical.reports.export')}</Button>} />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Segmented<Order> size="sm" value={order} onChange={setOrder} items={[{ value: 'most', label: t(`${R}.most`) }, { value: 'least', label: t(`${R}.least`) }]} />
            <SearchInput value={search} onChange={setSearch} placeholder={t(`${R}.search`)} className="md:w-72" data-service-search />
          </div>
        </div>
        <div className="mt-3 border-t border-line">
          <DataTable<ServiceUsageRow> columns={columns} rows={rows} rowKey={(r) => r.serviceTypeId} loading={q.isLoading} dense stickyHeader={false}
            empty={<EmptyState icon={<Layers />} title={t('common.empty')} description={t('clinical.reports.emptyHint')} />} />
        </div>
      </Card>

      <Card className="min-w-0" data-unused-services>
        <CardHeader title={t(`${R}.unusedTitle`)} description={t(`${R}.unusedHint`)} />
        {q.isLoading ? <Skeleton className="h-24 w-full" /> : unused.length === 0
          ? <p className="py-4 text-center text-[13px] text-ink-3">{t(`${R}.noneUnused`)}</p>
          : (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(allUnused ? unused : unused.slice(0, UNUSED_PREVIEW)).map((r: Unused) => (
                <li key={r.serviceTypeId} className="flex min-w-0 flex-col rounded-[var(--radius)] border border-line bg-surface-2/40 px-3 py-2">
                  <span className="break-words text-[13.5px] font-medium text-ink">{r.name}</span>
                  <span className="text-[12px] text-ink-3">{r.category}{r.prevCount > 0 && <> · <span className="text-warn">{t(`${R}.prevCount`, { n: fmtNumber(r.prevCount) })}</span></>}</span>
                </li>
              ))}
            </ul>
          )}
        {unused.length > UNUSED_PREVIEW && (
          <div className="mt-3 flex justify-center">
            <Button size="sm" variant="ghost" onClick={() => setAllUnused((v) => !v)} data-unused-toggle>{allUnused ? t(`${R}.showLess`) : t(`${R}.showMore`, { n: fmtNumber(unused.length - UNUSED_PREVIEW) })}</Button>
          </div>
        )}
      </Card>
    </div>
  )
}
