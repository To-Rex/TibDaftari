import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ExternalLink, FlaskConical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { AttributeSchema, Id, ResultTemplate, ServiceType } from '@/domain'
import { routes } from '@/shared/config/routes'
import { fmtMoney } from '@/shared/lib/format'
import { Badge, DataTable, EmptyState, Menu, Switch, type Column } from '@/shared/ui'

export function ServiceTypeTable({ rows, loading, schemas, templates, canWrite, onEdit, onDelete, onToggleActive, emptyAction }: {
  rows: ServiceType[]; loading: boolean; schemas: AttributeSchema[]; templates: ResultTemplate[]; canWrite: boolean
  onEdit: (s: ServiceType) => void; onDelete: (s: ServiceType) => void; onToggleActive: (s: ServiceType, v: boolean) => void; emptyAction?: ReactNode
}) {
  const { t } = useTranslation()
  const schemaOf = (id: Id | null) => schemas.find((s) => s.id === id)
  const tplOf = (id: Id | null) => templates.find((s) => s.id === id)
  const columns: Column<ServiceType>[] = [
    { key: 'name', header: t('common.name'), cell: (s) => (
      <div className="min-w-0">
        <p className="font-medium text-ink truncate">{s.name}</p>
        {s.code && <p className="text-[12px] font-mono text-ink-3">{s.code}</p>}
      </div>
    ) },
    { key: 'price', header: t('common.price'), align: 'right', cell: (s) => {
      const n = Object.keys(s.branchPrices).length
      return <div><span className="tabular font-medium">{fmtMoney(s.price)}</span>{n > 0 && <p className="text-[11.5px] text-ink-3">{t('catalog.services.overrides', { n })}</p>}</div>
    } },
    { key: 'tat', header: t('catalog.services.turnaroundShort'), align: 'center', hideBelow: 'md', cell: (s) => <span className="tabular text-ink-2">{s.turnaroundDays} {t('common.days')}</span> },
    { key: 'schema', header: t('catalog.services.schema'), hideBelow: 'lg', cell: (s) => {
      const sc = schemaOf(s.schemaId)
      return sc ? <Link to={routes.admin.schema(sc.id)} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[13px] text-brand-ink hover:underline"><span className="truncate max-w-[180px]">{sc.name}</span><ExternalLink className="size-3" /></Link> : <span className="text-ink-3">—</span>
    } },
    { key: 'tpl', header: t('catalog.services.defaultTemplateShort'), hideBelow: 'lg', cell: (s) => {
      const tp = tplOf(s.defaultTemplateId)
      return tp ? <Link to={routes.admin.template(tp.id)} onClick={(e) => e.stopPropagation()} className="text-[13px] text-brand-ink hover:underline truncate max-w-[180px] inline-block">{tp.name}</Link> : <span className="text-ink-3">—</span>
    } },
    { key: 'ordered', header: t('catalog.services.ordered30d'), align: 'right', hideBelow: 'md', cell: (s) => <span className="tabular text-ink-2">{s.stats?.ordered30d ?? 0}</span> },
    { key: 'active', header: t('common.status'), align: 'center', cell: (s) => (
      <span onClick={(e) => e.stopPropagation()} className="inline-flex">
        {canWrite ? <Switch size="sm" checked={s.isActive} onChange={(v) => onToggleActive(s, v)} /> : <Badge tone={s.isActive ? 'ok' : 'neutral'} dot>{s.isActive ? t('common.active') : t('common.inactive')}</Badge>}
      </span>
    ) },
    ...(canWrite ? [{ key: 'menu', header: '', width: '48px', cell: (s: ServiceType) => (
      <span onClick={(e) => e.stopPropagation()} className="inline-flex">
        <Menu trigger={() => <span className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"><MoreHorizontal className="size-4" /></span>}
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
