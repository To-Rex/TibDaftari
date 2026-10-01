/** Compact list view of the template gallery — one row per template, sortable columns, the same row actions. */
import { useTranslation } from 'react-i18next'
import { Check, MoreHorizontal } from 'lucide-react'
import type { Branch, Category, ResultTemplate, ServiceType } from '@/domain'
import type { GallerySort, SortDir } from '@/features/template-editor/galleryFilters'
import { isGeneric } from '@/features/template-editor/galleryFilters'
import type { TemplateKind } from '@/features/template-editor/kind'
import { templateMenuItems, type TemplateActions } from '@/features/template-editor/templateMenu'
import { cn } from '@/shared/lib/cn'
import { fmtDate, fmtRelative } from '@/shared/lib/format'
import { Badge, DataTable, Menu, type Column } from '@/shared/ui'

const TONE = { draft: 'warn', active: 'ok', archived: 'neutral' } as const
const SORT_COLUMN: Partial<Record<GallerySort, string>> = { name: 'name', usage: 'usage', updated: 'updated' }

export function TemplateListView({ rows, loading, kind, serviceTypes, categories, branches, canWrite, canPublish, actionsFor, selecting, selected, onToggle, sort, dir, onSort, empty }: {
  rows: ResultTemplate[]
  loading?: boolean
  kind: TemplateKind
  serviceTypes: ServiceType[]
  categories: Category[]
  branches: Branch[]
  canWrite: boolean
  canPublish: boolean
  actionsFor: (tpl: ResultTemplate) => TemplateActions
  selecting: boolean
  selected: Set<string>
  onToggle: (id: string) => void
  sort: GallerySort
  dir: SortDir
  onSort: (sort: GallerySort) => void
  empty?: React.ReactNode
}) {
  const { t } = useTranslation()
  const C = 'catalog.templates.col'
  const svcName = new Map(serviceTypes.map((s) => [s.id, s.name]))
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const branchName = new Map(branches.map((b) => [b.id, b.name]))
  const paperLabel = (tpl: ResultTemplate) => (tpl.doc.paper.startsWith('Receipt') ? t('catalog.editor.receiptPaper', { mm: tpl.doc.paper.slice(7) }) : tpl.doc.paper)
  const scopeLabel = (tpl: ResultTemplate) => (tpl.scope === 'item' ? t('catalog.services.scopeItem') : tpl.scope === 'receipt' ? t('catalog.services.scopeReceipt') : t('catalog.services.scopeOrder'))

  const columns: Column<ResultTemplate>[] = [
    ...(selecting ? [{
      key: 'select', header: <span className="sr-only">{t('catalog.templates.bulk.select')}</span>, width: '44px', card: 'hidden' as const,
      cell: (r: ResultTemplate) => (
        <span role="checkbox" aria-checked={selected.has(r.id)} className={cn('grid size-5 place-items-center rounded-[5px] border-2', selected.has(r.id) ? 'border-brand bg-brand text-white' : 'border-line-strong')}>
          {selected.has(r.id) && <Check className="size-3.5" />}
        </span>
      ),
    }] : []),
    {
      key: 'name', header: t(`${C}.name`), sortable: true, card: 'title',
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="break-words font-medium">{r.name}</span>
          <span className="text-[12px] font-normal text-ink-3">{paperLabel(r)} · {r.language.toUpperCase()} · v{r.version}</span>
        </span>
      ),
    },
    { key: 'status', header: t(`${C}.status`), width: '120px', card: 'meta', cell: (r) => <Badge tone={TONE[r.status]} dot size="sm">{t(`catalog.templates.status.${r.status}`)}</Badge> },
    ...(kind === 'result' ? [
      { key: 'scope', header: t(`${C}.scope`), width: '140px', hideBelow: 'lg' as const, card: 'meta' as const, cell: (r: ResultTemplate) => <span className="text-ink-2">{scopeLabel(r)}</span> },
      {
        key: 'bindings', header: t(`${C}.bindings`), card: 'field' as const,
        cell: (r: ResultTemplate) => {
          if (isGeneric(r)) return <span className="text-ink-3">{t('catalog.services.generic')}</span>
          const names = [...r.serviceTypeIds.map((id) => svcName.get(id)), ...r.categoryIds.map((id) => catName.get(id))].filter(Boolean) as string[]
          return (
            <span className="flex flex-wrap items-center gap-1" title={names.join(', ')}>
              {names.slice(0, 2).map((n) => <span key={n} className="h-6 max-w-[180px] truncate rounded-full bg-surface-2 px-2 text-[11.5px] leading-6 text-ink-2">{n}</span>)}
              {names.length > 2 && <span className="text-[11.5px] text-ink-3">+{names.length - 2}</span>}
            </span>
          )
        },
      },
    ] : []),
    {
      key: 'branches', header: t(`${C}.branches`), hideBelow: 'lg', card: 'field',
      cell: (r) => {
        const names = r.branchIds.map((id) => branchName.get(id)).filter(Boolean) as string[]
        if (!names.length) return <span className="text-ink-3">{t('catalog.templates.allBranches')}</span>
        return <span className="text-ink-2" title={names.join(' · ')}>{names.length > 2 ? t('catalog.templates.nBranches', { n: names.length }) : names.join(' · ')}</span>
      },
    },
    { key: 'usage', header: t(`${C}.usage`), sortable: true, align: 'right', width: '110px', hideBelow: 'md', card: 'meta', cell: (r) => <span className="tabular text-ink-2">{t('catalog.templates.usage', { n: r.usage })}</span> },
    { key: 'updated', header: t(`${C}.updated`), sortable: true, width: '150px', card: 'meta', cell: (r) => <span className="text-ink-2" title={fmtDate(r.updatedAt, 'dd.MM.yyyy HH:mm')}>{fmtRelative(r.updatedAt)}</span> },
    {
      key: 'actions', header: <span className="sr-only">{t(`${C}.actions`)}</span>, width: '52px', align: 'right', card: 'actions',
      cell: (r) => (
        <span onClick={(e) => e.stopPropagation()} className="inline-flex">
          <Menu trigger={() => <span className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"><MoreHorizontal className="size-4" /></span>}
            items={templateMenuItems(r, t, { canWrite, canPublish }, actionsFor(r))} />
        </span>
      ),
    },
  ]

  return (
    <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={loading} dense empty={empty}
      sortBy={SORT_COLUMN[sort]} sortDir={dir} onSort={(k) => onSort(k as GallerySort)}
      onRowClick={(r) => (selecting ? onToggle(r.id) : actionsFor(r).onOpen())}
      rowClassName={(r) => (selecting && selected.has(r.id) ? 'bg-brand-soft/40 border-brand' : undefined)} />
  )
}
