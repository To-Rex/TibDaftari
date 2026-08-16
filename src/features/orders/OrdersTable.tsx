import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Receipt } from 'lucide-react'
import type { Order, Page } from '@/domain'
import { Badge, DataTable, EmptyState, Pagination, type Column } from '@/shared/ui'
import { fmtDateTime, fmtMoney, fmtPhone } from '@/shared/lib/format'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { orderStatusMeta, paymentStatusMeta } from './status'

export interface OrdersTableProps {
  page?: Page<Order>
  loading: boolean
  sortBy: string
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
  onPage: (p: number) => void
  onPageSize?: (s: number) => void
  showPatient?: boolean
  branchName?: (id: string) => string | undefined
  footer?: boolean
}

export function OrdersTable({ page, loading, sortBy, sortDir, onSort, onPage, onPageSize, showPatient = true, branchName, footer }: OrdersTableProps) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const rows = page?.items ?? []
  const cols: Column<Order>[] = [
    { key: 'number', header: t('staff.orders.colNumber'), sortable: true, cell: (o) => <span className="font-mono font-medium whitespace-nowrap">{o.number}</span>, width: '112px', card: 'title' },
    ...(showPatient ? [{ key: 'patientName', header: t('staff.orders.colPatient'), sortable: true, cell: (o: Order) => <span className="flex min-w-0 flex-col"><span className="font-medium break-words">{o.patientName}</span><span className="text-[12px] text-ink-3 tabular whitespace-nowrap">{fmtPhone(o.patientPhone)}</span></span>, card: 'meta' as const }] : []),
    ...(branchName ? [{ key: 'branchId', header: t('common.branch'), cell: (o: Order) => <span className="text-ink-2">{branchName(o.branchId) ?? '—'}</span>, hideBelow: 'lg' as const, className: 'max-xl:hidden', card: 'field' as const }] : []),
    { key: 'createdAt', header: t('common.date'), sortable: true, cell: (o) => <span className="tabular text-ink-2 xl:whitespace-nowrap">{fmtDateTime(o.createdAt)}</span>, hideBelow: 'md', card: 'meta' },
    { key: 'itemCount', header: t('staff.orders.colItems'), align: 'center', cell: (o) => <span className="tabular">{o.itemCount}</span>, hideBelow: 'sm', width: '80px', className: showPatient ? 'max-xl:hidden' : undefined },
    { key: 'total', header: t('common.total'), sortable: true, align: 'right', cell: (o) => <span className="font-semibold whitespace-nowrap">{fmtMoney(o.total, false)}</span> },
    { key: 'paidAmount', header: t('staff.orders.colPaid'), sortable: true, align: 'right', cell: (o) => <span className={cn('whitespace-nowrap', o.paidAmount < o.total && 'text-ink-3')}>{fmtMoney(o.paidAmount, false)}</span>, hideBelow: 'md', className: showPatient ? 'max-xl:hidden' : undefined },
    { key: 'status', header: t('common.status'), cell: (o) => { const m = orderStatusMeta(o.status); return <Badge tone={m.tone} size="sm" dot>{m.label}</Badge> }, card: 'actions' },
    { key: 'payment', header: t('staff.orders.colPayment'), cell: (o) => { const m = paymentStatusMeta(o.payment); return <Badge tone={m.tone} size="sm">{m.label}</Badge> }, card: 'actions' },
  ]
  const sumTotal = rows.reduce((s, o) => s + o.total, 0)
  const sumPaid = rows.reduce((s, o) => s + o.paidAmount, 0)
  return (
    <>
      <DataTable columns={cols} rows={rows} rowKey={(o) => o.id} loading={loading} cardBelow={showPatient ? 'lg' : 'md'} sortBy={sortBy} sortDir={sortDir} onSort={onSort} onRowClick={(o) => nav(routes.app.order(o.id))}
        empty={<EmptyState icon={<Receipt />} title={t('common.empty')} description={t('common.emptyHint')} />} />
      {footer && rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t max-sm:justify-start max-sm:flex-col max-sm:items-stretch max-sm:gap-y-1.5 border-line bg-surface-2/50 px-4 py-2.5 text-[13px] tabular">
          <span className="text-ink-3">{t('staff.orders.pageSum')}</span>
          <span>{t('common.total')}: <b>{fmtMoney(sumTotal)}</b></span>
          <span>{t('staff.orders.colPaid')}: <b className="text-ok">{fmtMoney(sumPaid)}</b></span>
          {sumTotal - sumPaid > 0 && <span>{t('staff.orders.remaining')}: <b className="text-danger">{fmtMoney(sumTotal - sumPaid)}</b></span>}
        </div>
      )}
      {page && page.total > 0 && (
        <div className="border-t border-line px-4 py-3">
          <Pagination page={page.page} totalPages={page.totalPages} total={page.total} pageSize={page.pageSize} onPage={onPage} onPageSize={onPageSize} labels={{ perPage: t('common.perPage'), of: t('common.of'), rows: t('common.rows') }} />
        </div>
      )}
    </>
  )
}
