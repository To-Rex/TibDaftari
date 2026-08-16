import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ExternalLink, FlaskConical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { AttributeSchema, Category, Id, ResultTemplate, ServiceType } from '@/domain'
import { routes } from '@/shared/config/routes'
import { fmtMoney } from '@/shared/lib/format'
import { Badge, DataTable, EmptyState, Menu, Switch, type Column } from '@/shared/ui'

export function ServiceTypeTable({ rows, loading, schemas, templates, categories = [], canWrite, onEdit, onDelete, onToggleActive, emptyAction }: {
  rows: ServiceType[]; loading: boolean; schemas: AttributeSchema[]; templates: ResultTemplate[]; categories?: Category[]; canWrite: boolean
  onEdit: (s: ServiceType) => void; onDelete: (s: ServiceType) => void; onToggleActive: (s: ServiceType, v: boolean) => void; emptyAction?: ReactNode
}) {
  const { t } = useTranslation()
  const schemaOf = (id: Id | null) => schemas.find((s) => s.id === id)
  const tplOf = (id: Id | null) => templates.find((s) => s.id === id)
  const catOf = (id: Id) => categories.find((c) => c.id === id)
  const schemaLink = (s: ServiceType) => {
    const sc = schemaOf(s.schemaId)
    return sc ? <Link to={routes.admin.schema(sc.id)} onClick={(e) => e.stopPropagation()} className="inline-flex max-w-full items-center gap-1 text-[13px] text-brand-ink hover:underline"><span className="min-w-0 truncate md:max-w-[140px] 2xl:max-w-[200px] 3xl:max-w-[280px]">{sc.name}</span><ExternalLink className="size-3 shrink-0" /></Link> : <span className="text-ink-3">—</span>
  }
  const tplLink = (s: ServiceType) => {
    const tp = tplOf(s.defaultTemplateId)
    return tp ? <Link to={routes.admin.template(tp.id)} onClick={(e) => e.stopPropagation()} className="text-[13px] text-brand-ink hover:underline truncate max-w-full md:max-w-[140px] 2xl:max-w-[200px] 3xl:max-w-[280px] inline-block align-bottom">{tp.name}</Link> : <span className="text-ink-3">—</span>
  }
  const columns: Column<ServiceType>[] = [
    { key: 'name', header: t('common.name'), card: 'title', cell: (s) => (
      <div className="min-w-0 md:max-w-[200px] 2xl:max-w-[280px] 3xl:max-w-[400px]">
        <p className="font-medium text-ink break-words md:truncate">{s.name}</p>
        {s.code && <p className="text-[12px] font-mono text-ink-3">{s.code}</p>}
      </div>
    ) },
    // category is only meaningful in card mode (the table is already scoped by the tree) — hidden in the table on every width
    { key: 'category', header: t('catalog.services.category'), card: 'meta', className: 'hidden', cell: (s) => <span className="truncate">{catOf(s.categoryId)?.name ?? '—'}</span> },
    { key: 'price', header: t('common.price'), align: 'right', card: 'meta', cell: (s) => {
      const n = Object.keys(s.branchPrices).length
      return (
        <div className="md:text-right">
          <span className="tabular font-medium whitespace-nowrap text-ink">{fmtMoney(s.price)}</span>
          {n > 0 && <span className="block text-[11.5px] text-ink-3">{t('catalog.services.overrides', { n })}</span>}
          {/* table mode below 2xl: turnaround & 30-day count fold under the price (their own columns appear from 2xl) */}
          <span className="hidden md:block 2xl:hidden text-[11.5px] text-ink-3 tabular whitespace-nowrap">{s.turnaroundDays} {t('common.days')} · {s.stats?.ordered30d ?? 0}</span>
        </div>
      )
    } },
    { key: 'tat', header: t('catalog.services.turnaroundShort'), align: 'center', hideBelow: 'md', className: 'max-2xl:hidden', cell: (s) => <span className="tabular text-ink-2">{s.turnaroundDays} {t('common.days')}</span> },
    // schema + default template share one column in the table (stacked); separate rows in card mode
    { key: 'schema', header: <span className="md:whitespace-normal md:leading-tight md:inline-block md:max-w-[150px]">{t('catalog.services.schema')}<span className="hidden md:inline text-ink-3"> / {t('catalog.services.defaultTemplateShort')}</span></span>, hideBelow: 'md', cell: (s) => (
      <div className="flex flex-col gap-0.5 min-w-0">
        {schemaLink(s)}
        <span className="hidden md:block leading-tight">{tplLink(s)}</span>
      </div>
    ) },
    { key: 'tpl', header: t('catalog.services.defaultTemplateShort'), className: 'hidden', cell: (s) => tplLink(s) },
    { key: 'ordered', header: t('catalog.services.ordered30d'), align: 'right', hideBelow: 'md', className: 'max-2xl:hidden', cell: (s) => <span className="tabular text-ink-2">{s.stats?.ordered30d ?? 0}</span> },
    { key: 'active', header: t('common.status'), align: 'center', cell: (s) => (
      <span onClick={(e) => e.stopPropagation()} className="inline-flex">
        {canWrite ? <Switch size="sm" checked={s.isActive} onChange={(v) => onToggleActive(s, v)} /> : <Badge tone={s.isActive ? 'ok' : 'neutral'} dot>{s.isActive ? t('common.active') : t('common.inactive')}</Badge>}
      </span>
    ) },
    ...(canWrite ? [{ key: 'menu', header: '', width: '48px', card: 'actions' as const, cell: (s: ServiceType) => (
      <span onClick={(e) => e.stopPropagation()} className="inline-flex">
        <Menu trigger={() => <span className="grid size-10 place-items-center rounded-lg border border-line text-ink-3 hover:bg-surface-2 hover:text-ink md:size-8 md:rounded-full md:border-0"><MoreHorizontal className="size-4" /></span>}
          items={[
            { key: 'edit', label: t('common.edit'), icon: <Pencil />, onSelect: () => onEdit(s) },
            { key: 'del', label: t('common.delete'), icon: <Trash2 />, danger: true, onSelect: () => onDelete(s), separatorBefore: true },
          ]} />
      </span>
    ) }] : []),
  ]
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(s) => s.id}
      loading={loading}
      onRowClick={canWrite ? onEdit : undefined}
      empty={<EmptyState icon={<FlaskConical />} title={t('catalog.services.emptyTitle')} description={t('catalog.services.emptyHint')} action={emptyAction} />}
    />
  )
}
