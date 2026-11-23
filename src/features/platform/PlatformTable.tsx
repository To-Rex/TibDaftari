/**
 * The regions, districts or facilities of the place the platform page stands in, as a sortable table (cards on a
 * phone): what each one did in the period, a bar for its money, a way in (the row) and «Boshqarish» where the
 * unit can be managed.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Settings2 } from 'lucide-react'
import type { Id, UnitMetrics } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { Badge, Button, Card, DataTable, type Column } from '@/shared/ui'
import { LEVEL_ICON, type PlatformLevel } from './PathStepper'
import type { Entry, SortKey } from './platformModel'

export function PlatformTable({ level, rows, loading, stale, sort, onSort, onOpen, canManage, onManage, empty }: {
  level: Exclude<PlatformLevel, 'company' | 'country'>
  rows: Entry[]
  loading: boolean
  /** the rows of the place left a moment ago, while this one loads */
  stale: boolean
  sort: { by: SortKey; dir: 'asc' | 'desc' }
  onSort: (key: string) => void
  /** one level down (none for facilities — the last level) */
  onOpen?: (row: Entry) => void
  canManage: (unitId?: Id | null) => boolean
  onManage: (unitId: Id) => void
  empty: ReactNode
}) {
  const { t } = useTranslation()
  const metricLabel = (k: keyof UnitMetrics) => t(`admin.platform.metrics.${k}`)
  const maxRevenue = Math.max(1, ...rows.map((r) => r.revenue))
  const RowIcon = LEVEL_ICON[level]
  const num = (k: keyof UnitMetrics): Column<Entry> => ({
    key: k, header: metricLabel(k), align: 'right', sortable: true, card: 'field',
    hideBelow: k === 'smsSent' || k === 'resultsReady' ? 'lg' : k === 'units' || k === 'patientsNew' ? 'md' : undefined,
    cell: (r) => <span className={cn('tabular', r[k] === 0 && 'text-ink-3')}>{fmtNumber(r[k])}</span>,
  })
  const columns: Column<Entry>[] = [
    { key: 'name', header: t(`admin.platform.levels.${level}`), sortable: true, card: 'title', cell: (r) => (
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', level === 'facility' ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-ink-3')}><RowIcon className="size-4" /></span>
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
    ...(level === 'facility' ? [] : [num('units')]),
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
    { key: 'actions', header: '', align: 'right', card: 'actions', cell: (r) => (
      <span className="inline-flex items-center justify-end gap-1">
        {canManage(r.unitId) && (
          <Button size="xs" variant={level === 'facility' ? 'soft' : 'ghost'} leftIcon={<Settings2 className="size-3.5" />} title={t('admin.platform.manageHint')}
            onClick={(e) => { e.stopPropagation(); onManage(r.unitId as Id) }} data-platform-manage={r.code ?? r.id}>
            {t('admin.platform.manage')}
          </Button>
        )}
        {/* the table shows the way in as an arrow; a card on a phone says where it leads */}
        {level !== 'facility' && <ChevronRight className="size-4 text-ink-3 max-md:hidden" />}
        {level !== 'facility' && <span className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-ink md:hidden">{t(`admin.platform.drill.${level}`)}<ChevronRight className="size-4" /></span>}
      </span>
    ) },
  ]
  return (
    <Card padded={false} className={cn('overflow-hidden transition-opacity', stale && 'opacity-60')} data-platform-table>
      <DataTable<Entry> columns={columns} rows={rows} rowKey={(r) => r.id} loading={loading} sortBy={sort.by} sortDir={sort.dir} onSort={onSort} cardBelow="md" onRowClick={onOpen} empty={empty} />
    </Card>
  )
}
