import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Receipt } from 'lucide-react'
import type { Order, Page } from '@/domain'
import { Badge, DataTable, EmptyState, Pagination, type Column } from '@/shared/ui'
import { fmtDateTime, fmtMoney, fmtPhone } from '@/shared/lib/format'
import { routes } from '@/shared/config/routes'
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
    { key: 'number', header: t('staff.orders.colNumber'), sortable: true, cell: (o) => <span className="font-mono font-medium">{o.number}</span>, width: '130px' },
    ...(showPatient ? [{ key: 'patientName', header: t('staff.orders.colPatient'), sortable: true, cell: (o: Order) => <span className="flex flex-col"><span className="font-medium">{o.patientName}</span><span className="text-[12px] text-ink-3 tabular">{fmtPhone(o.patientPhone)}</span></span> }] : []),
    ...(branchName ? [{ key: 'branchId', header: t('common.branch'), cell: (o: Order) => <span className="text-ink-2">{branchName(o.branchId) ?? '—'}</span>, hideBelow: 'lg' as const }] : []),
    { key: 'createdAt', header: t('common.date'), sortable: true, cell: (o) => <span className="tabular text-ink-2">{fmtDateTime(o.createdAt)}</span>, hideBelow: 'md' },
    { key: 'itemCount', header: t('staff.orders.colItems'), align: 'center', cell: (o) => <span className="tabular">{o.itemCount}</span>, hideBelow: 'sm', width: '80px' },
    { key: 'total', header: t('common.total'), sortable: true, align: 'right', cell: (o) => <span className="font-semibold">{fmtMoney(o.total, false)}</span> },
    { key: 'paidAmount', header: t('staff.orders.colPaid'), sortable: true, align: 'right', cell: (o) => <span className={o.paidAmount < o.total ? 'text-ink-3' : ''}>{fmtMoney(o.paidAmount, false)}</span>, hideBelow: 'md' },
    { key: 'status', header: t('common.status'), cell: (o) => { const m = orderStatusMeta(o.status); return <Badge tone={m.tone} size="sm" dot>{m.label}</Badge> } },
    { key: 'payment', header: t('staff.orders.colPayment'), cell: (o) => { const m = paymentStatusMeta(o.payment); return <Badge tone={m.tone} size="sm">{m.label}</Badge> } },
  ]
  const sumTotal = rows.reduce((s, o) => s + o.total, 0)
  const sumPaid = rows.reduce((s, o) => s + o.paidAmount, 0)
  return (
    <>
      <DataTable columns={cols} rows={rows} rowKey={(o) => o.id} loading={loading} sortBy={sortBy} sortDir={sortDir} onSort={onSort} onRowClick={(o) => nav(routes.app.order(o.id))}
        empty={<EmptyState icon={<Receipt />} title={t('common.empty')} description={t('common.emptyHint')} />} />
      {footer && rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-line bg-surface-2/50 px-4 py-2.5 text-[13px] tabular">
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
