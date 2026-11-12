/**
 * Reports › SMS: how many messages went out from which territory (region → district → facility), what became of
 * them (delivered / failed / queued) and what they cost; by day, by kind, by provider, by operator; Excel and CSV.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ChevronDown, ChevronRight, Download, FileSpreadsheet, Hospital, Landmark, MapPin, MessageSquare, Send, ShieldAlert, Wallet } from 'lucide-react'
import type { Id, SmsCounts, SmsUnitRow } from '@/domain'
import type { ReportRange } from '@/data/repositories'
import { repos } from '@/data'
import { collationLocale } from '@/features/template-editor/galleryFilters'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { Button, Card, CardHeader, EmptyState, SearchInput, Segmented, Skeleton, Stat, toast } from '@/shared/ui'
import { downloadCsv } from './csv'
import { useSmsReport } from './queries'
import { BarList, fold, pct } from './reportKit'
import { TrendChart } from './TrendChart'

const R = 'clinical.reports.sms'
type Metric = 'total' | 'delivered' | 'failed' | 'cost'

interface Node { key: string; label: string; level: 'region' | 'district' | 'facility'; counts: SmsCounts; children: Node[]; unitId?: Id }

const empty = (): SmsCounts => ({ total: 0, queued: 0, sent: 0, delivered: 0, failed: 0, cancelled: 0, cost: 0 })
const add = (a: SmsCounts, b: SmsCounts): SmsCounts => ({ total: a.total + b.total, queued: a.queued + b.queued, sent: a.sent + b.sent, delivered: a.delivered + b.delivered, failed: a.failed + b.failed, cancelled: a.cancelled + b.cancelled, cost: a.cost + b.cost })

/** facilities → region › district › facility tree (a facility without a district hangs under its region) */
function buildTree(rows: SmsUnitRow[], unknown: string): Node[] {
  const regions = new Map<string, Node>()
  for (const r of rows) {
    const rName = r.regionName ?? unknown
    const region = regions.get(rName) ?? { key: `r:${rName}`, label: rName, level: 'region', counts: empty(), children: [] }
    regions.set(rName, region)
    region.counts = add(region.counts, r)
    const dName = r.districtName ?? unknown
    let district = region.children.find((c) => c.label === dName)
    if (!district) { district = { key: `d:${rName}:${dName}`, label: dName, level: 'district', counts: empty(), children: [] }; region.children.push(district) }
    district.counts = add(district.counts, r)
    district.children.push({ key: `f:${r.unitId}`, label: r.name, level: 'facility', counts: { total: r.total, queued: r.queued, sent: r.sent, delivered: r.delivered, failed: r.failed, cancelled: r.cancelled, cost: r.cost }, children: [], unitId: r.unitId })
  }
  const byTotal = (a: Node, b: Node) => b.counts.total - a.counts.total || a.label.localeCompare(b.label)
  const out = [...regions.values()].sort(byTotal)
  for (const reg of out) { reg.children.sort(byTotal); for (const d of reg.children) d.children.sort(byTotal) }
  return out
}

const LEVEL_ICON = { region: Landmark, district: MapPin, facility: Hospital }
/** the territory table's columns: name (with the stacked bar under it) · total · delivered · failed (sm+) · cost (xl+, when
 *  Eskiz priced anything) — the card is ~600px wide next to the side cards, so the name keeps the room */
const gridCols = (showCost: boolean) => cn(
  'grid items-center gap-2 sm:gap-3 grid-cols-[minmax(0,1fr)_64px_88px] sm:grid-cols-[minmax(0,1fr)_64px_92px_56px]',
  showCost && 'xl:grid-cols-[minmax(0,1fr)_64px_92px_56px_88px]',
)

function Bar({ c, max }: { c: SmsCounts; max: number }) {
  const w = (n: number) => `${max > 0 ? Math.max(0, (n / max) * 100) : 0}%`
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <span className="h-full bg-ok" style={{ width: w(c.delivered) }} />
      <span className="h-full bg-brand/50" style={{ width: w(c.sent) }} />
      <span className="h-full bg-warn" style={{ width: w(c.queued) }} />
      <span className="h-full bg-danger" style={{ width: w(c.failed) }} />
    </div>
  )
}

function TerritoryRow({ node, depth, max, open, toggle, showCost }: { node: Node; depth: number; max: number; open: Set<string>; toggle: (k: string) => void; showCost: boolean }) {
  const { t } = useTranslation()
  const Icon = LEVEL_ICON[node.level]
  const isOpen = open.has(node.key)
  const branch = node.children.length > 0
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
        className={cn(gridCols(showCost), 'border-b border-line/60 py-2 pl-2 pr-1', node.level === 'region' && 'bg-surface-2/40')}
        data-sms-territory={node.level}>
        {/* the depth indents the name only — the number columns stay aligned; the stacked bar sits under the name */}
        <div className="flex min-w-0 flex-col gap-1" style={{ paddingLeft: depth * 18 }}>
          <button type="button" onClick={() => branch && toggle(node.key)} className={cn('flex min-w-0 items-center gap-2 text-left', branch ? 'cursor-pointer' : 'cursor-default')} aria-expanded={branch ? isOpen : undefined}>
            {branch ? (isOpen ? <ChevronDown className="size-4 shrink-0 text-ink-3" /> : <ChevronRight className="size-4 shrink-0 text-ink-3" />) : <span className="size-4 shrink-0" />}
            <Icon className={cn('size-4 shrink-0', node.level === 'region' ? 'text-brand' : node.level === 'district' ? 'text-info' : 'text-ok')} />
            <span className={cn('truncate text-[13.5px]', node.level !== 'facility' && 'font-medium')} title={node.label}>{node.label}</span>
            {branch && <span className="shrink-0 text-[11.5px] text-ink-3 max-md:hidden">{t(node.level === 'region' ? `${R}.districtsCount` : `${R}.facilitiesCount`, { count: node.children.length })}</span>}
          </button>
          <div className="pl-12 pr-2 max-sm:hidden"><Bar c={node.counts} max={max} /></div>
        </div>
        <div className="text-right text-[13.5px] font-semibold tabular">{fmtNumber(node.counts.total)}</div>
        <div className="text-right text-[12.5px] tabular text-ok">{fmtNumber(node.counts.delivered)} <span className="text-ink-3">· {pct(node.counts.delivered, node.counts.total)}%</span></div>
        <div className={cn('text-right text-[12.5px] tabular max-sm:hidden', node.counts.failed ? 'text-danger' : 'text-ink-3')}>{fmtNumber(node.counts.failed)}</div>
        {showCost && <div className="text-right text-[12.5px] tabular text-ink-2 max-xl:hidden">{node.counts.cost ? fmtMoney(Math.round(node.counts.cost), false) : '—'}</div>}
      </motion.div>
      {branch && isOpen && node.children.map((c) => <TerritoryRow key={c.key} node={c} depth={depth + 1} max={max} open={open} toggle={toggle} showCost={showCost} />)}
    </>
  )
}

export function SmsReport({ scopeId, range, canExport, wide: wideScope }: { scopeId: Id; range: ReportRange; canExport: boolean; /** the scope sits above the facility: group by territory */ wide: boolean }) {
  const { t, i18n } = useTranslation()
  const q = useSmsReport(scopeId, range)
  const d = q.data
  const [metric, setMetric] = useState<Metric>('total')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [touched, setTouched] = useState(false)
  const showCost = !!d && d.totals.cost > 0
  // the territory tree earns its place with more than one facility in the answer
  const wide = wideScope && (d?.byUnit.length ?? 0) > 1
  const unknown = t(`${R}.unknownTerritory`)

  const tree = useMemo(() => {
    const needle = fold(search)
    const rows = (d?.byUnit ?? []).filter((r) => !needle || fold(`${r.name} ${r.regionName ?? ''} ${r.districtName ?? ''}`).includes(needle))
    const coll = new Intl.Collator(collationLocale(i18n.language))
    return buildTree([...rows].sort((a, b) => b.total - a.total || coll.compare(a.name, b.name)), unknown)
  }, [d, search, i18n.language, unknown])
  // everything open by default while the tree is small; the user's clicks win after that
  const opened = useMemo(() => {
    if (touched) return open
    const all = new Set<string>()
    const facilities = d?.byUnit.length ?? 0
    for (const r of tree) { all.add(r.key); if (facilities <= 12 || tree.length === 1) for (const dd of r.children) all.add(dd.key) }
    return all
  }, [tree, open, touched, d])
  const toggle = (k: string) => { setTouched(true); setOpen((prev) => { const n = new Set(touched ? prev : opened); if (n.has(k)) n.delete(k); else n.add(k); return n }) }
  const expandAll = (yes: boolean) => { setTouched(true); setOpen(yes ? new Set(tree.flatMap((r) => [r.key, ...r.children.map((c) => c.key)])) : new Set()) }
  const max = Math.max(1, ...tree.map((n) => n.counts.total))

  const trend = useMemo(() => (d?.byDay ?? []).map((p) => ({ date: p.date, value: metric === 'cost' ? Math.round(p.cost) : p[metric] })), [d, metric])
  const kindLabel = (k: string) => t(`clinical.messages.kind_${k}`, { defaultValue: k })
  const providerLabel = (k: string) => ({ eskiz: 'Eskiz.uz', xabarchi: 'Xabarchi', none: t(`${R}.noProvider`) }[k] ?? k)
  const slice = (rows: { key: string; total: number; delivered: number; failed: number; cost: number }[] | undefined, label: (k: string) => string) =>
    rows?.map((r) => ({ key: r.key, label: label(r.key), value: r.total, sub: `${t(`${R}.deliveredShort`)} ${pct(r.delivered, r.total)}%${r.failed ? ` · ${t(`${R}.failedShort`)} ${fmtNumber(r.failed)}` : ''}${r.cost ? ` · ${fmtMoney(Math.round(r.cost), false)}` : ''}` }))

  const [exporting, setExporting] = useState(false)
  const exportExcel = async () => {
    setExporting(true)
    try {
      const lang = (['uz', 'ru', 'en'] as const).find((l) => i18n.language?.startsWith(l)) ?? 'uz'
      const blob = await repos.reports.exportSmsXlsx(scopeId, { ...range, lang })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `sms-hisobot-${range.dateFrom}${range.dateTo !== range.dateFrom ? `_${range.dateTo}` : ''}.xlsx`
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000)
      toast.success(t('clinical.reports.excelExported'))
    } catch (e) { toast.error(errorMessage(e)) } finally { setExporting(false) }
  }
  const exportCsv = () => {
    if (!d?.byUnit.length) return toast.info(t('common.empty'))
    downloadCsv(`sms-${range.dateFrom}_${range.dateTo}`, [t(`${R}.unit`), t(`${R}.region`), t(`${R}.district`), t(`${R}.total`), t(`${R}.delivered`), t(`${R}.failed`), t(`${R}.queued`), t(`${R}.cost`)],
      d.byUnit.map((r) => [r.name, r.regionName ?? '', r.districtName ?? '', r.total, r.delivered, r.failed, r.queued, Math.round(r.cost)]))
    toast.success(t('clinical.reports.exported'))
  }

  const stat = (label: string, value: string | undefined, icon: React.ReactNode, tone: 'brand' | 'ok' | 'warn' | 'info' | 'neutral' | 'danger', sub?: string) => (
    <Stat label={label} value={value ?? <Skeleton className="h-7 w-20" />} icon={icon} tone={tone} sub={sub} />
  )
  const tot = d?.totals

  return (
    <div className="flex flex-col gap-5" data-sms-report>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-ink-3">{t(`${R}.subtitle`)}</p>
        {canExport && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" leftIcon={<Download className="size-4" />} onClick={exportCsv}>CSV</Button>
            <Button size="sm" variant="secondary" leftIcon={<FileSpreadsheet className="size-4" />} loading={exporting} onClick={() => void exportExcel()} data-sms-export>Excel</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 max-xs:grid-cols-1">
        {stat(t(`${R}.total`), tot && fmtNumber(tot.total), <MessageSquare />, 'brand', t('clinical.reports.inRange'))}
        {stat(t(`${R}.delivered`), tot && fmtNumber(tot.delivered), <Send />, 'ok', tot ? `${pct(tot.delivered, tot.total)}%` : undefined)}
        {stat(t(`${R}.failed`), tot && fmtNumber(tot.failed), <ShieldAlert />, tot?.failed ? 'danger' : 'neutral', tot ? `${pct(tot.failed, tot.total)}%` : undefined)}
        {stat(t(`${R}.queued`), tot && fmtNumber(tot.queued + tot.sent), <Hospital />, 'info', t(`${R}.queuedSub`))}
        {stat(t(`${R}.cost`), tot && (tot.cost > 0 ? fmtMoney(Math.round(tot.cost), false) : '—'), <Wallet />, 'warn', tot && tot.cost > 0 ? t('common.sum') : t(`${R}.costHint`))}
      </div>

      <Card className="min-w-0">
        <CardHeader className="max-sm:flex-col max-sm:items-stretch max-sm:gap-3" title={t(`${R}.trend`)} description={t(`${R}.trendHint`)}
          actions={<Segmented<Metric> size="sm" value={metric} onChange={setMetric} items={[{ value: 'total', label: t(`${R}.total`) }, { value: 'delivered', label: t(`${R}.delivered`) }, { value: 'failed', label: t(`${R}.failed`) }, ...(showCost ? [{ value: 'cost' as const, label: t(`${R}.cost`) }] : [])]} />} />
        {q.isLoading ? <Skeleton className="h-[220px] w-full" /> : <TrendChart points={trend} format={(v) => (metric === 'cost' ? fmtMoney(v, false) : fmtNumber(v))} label={t(`${R}.trend`)} color={metric === 'failed' ? 'var(--c-danger)' : metric === 'delivered' ? 'var(--c-ok)' : 'var(--c-brand)'} />}
      </Card>

      <div className={cn('grid gap-5', wide ? 'xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]' : 'lg:grid-cols-2')}>
        <Card padded={false} className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[14px] font-semibold">{t(wide ? `${R}.byTerritory` : `${R}.byFacility`)}</h3>
              <p className="text-[12px] text-ink-3">{t(`${R}.byTerritoryHint`)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {wide && <SearchInput value={search} onChange={setSearch} placeholder={t(`${R}.search`)} className="w-48" />}
              {wide && tree.some((n) => n.children.length) && (
                <div className="flex gap-1 text-[12px]">
                  <button type="button" className="text-brand-ink hover:underline" onClick={() => expandAll(true)}>{t(`${R}.expandAll`)}</button>
                  <span className="text-ink-3">·</span>
                  <button type="button" className="text-brand-ink hover:underline" onClick={() => expandAll(false)}>{t(`${R}.collapseAll`)}</button>
                </div>
              )}
            </div>
          </div>
          <div className={cn(gridCols(showCost), 'pl-4 pr-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3')}>
            <span>{t(`${R}.territory`)}</span><span className="text-right">{t(`${R}.total`)}</span><span className="text-right">{t(`${R}.delivered`)}</span><span className="text-right max-sm:hidden">{t(`${R}.failed`)}</span>{showCost && <span className="text-right max-xl:hidden">{t(`${R}.cost`)}</span>}
          </div>
          <div className="px-2 pb-2 sm:px-3">
            {q.isLoading ? <div className="space-y-2 p-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}</div>
              : !tree.length ? <EmptyState icon={<MessageSquare />} title={t(`${R}.empty`)} description={t(`${R}.emptyHint`)} className="min-h-[200px]" />
              : wide ? tree.map((n) => <TerritoryRow key={n.key} node={n} depth={0} max={max} open={opened} toggle={toggle} showCost={showCost} />)
              : tree.flatMap((r) => r.children.flatMap((dd) => dd.children)).map((n) => <TerritoryRow key={n.key} node={n} depth={0} max={max} open={opened} toggle={toggle} showCost={showCost} />)}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-[11.5px] text-ink-3">
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-ok" />{t(`${R}.delivered`)}</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand/50" />{t(`${R}.sentOnly`)}</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-warn" />{t(`${R}.queued`)}</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-danger" />{t(`${R}.failed`)}</span>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card className="min-w-0"><CardHeader title={t(`${R}.byKind`)} description={t(`${R}.byKindHint`)} /><BarList rows={slice(d?.byKind, kindLabel)} loading={q.isLoading} empty={t('common.empty')} total={tot?.total} /></Card>
          <Card className="min-w-0"><CardHeader title={t(`${R}.byProvider`)} description={t(`${R}.byProviderHint`)} /><BarList rows={slice(d?.byProvider, providerLabel)} loading={q.isLoading} empty={t('common.empty')} total={tot?.total} color="var(--c-info)" /></Card>
          {!!d?.byOperator.length && <Card className="min-w-0"><CardHeader title={t(`${R}.byOperator`)} description={t(`${R}.byOperatorHint`)} /><BarList rows={slice(d.byOperator, (k) => k)} loading={q.isLoading} empty={t('common.empty')} total={tot?.total} color="var(--c-accent)" /></Card>}
        </div>
      </div>
    </div>
  )
}
