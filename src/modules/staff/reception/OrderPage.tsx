import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowUpRight, GitBranch, Plus, User, Wallet } from 'lucide-react'
import { repos } from '@/data'
import { Badge, Button, Card, EmptyState, Page, PageHeader, Skeleton, toast } from '@/shared/ui'
import { errorMessage } from '@/shared/lib/errors'
import { cn } from '@/shared/lib/cn'
import { fmtDateTime, fmtMoney, fmtPhone } from '@/shared/lib/format'
import { routes } from '@/shared/config/routes'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { useAddItems, useOrder, useRemoveItem } from '@/features/orders/queries'
import { orderStatusMeta, paymentStatusMeta } from '@/features/orders/status'
import { OrderItemsTable } from '@/features/reception/OrderItemsTable'
import { OrderTotals } from '@/features/reception/OrderTotals'
import { ServicePicker } from '@/features/reception/ServicePicker'
import { PayModal } from '@/features/reception/PayModal'
import { CancelOrderModal } from '@/features/reception/CancelOrderModal'
import { Receipt } from '@/features/reception/Receipt'

export default function OrderPage() {
  const { t } = useTranslation()
  const { orderId = '' } = useParams()
  const { companyId, employeeId, staff } = useStaffSession()
  const { can } = usePermissions()
  const q = useOrder(orderId)
  const addItems = useAddItems(orderId)
  const removeItem = useRemoveItem(orderId)
  const [payOpen, setPayOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const order = q.data?.order
  const items = useMemo(() => q.data?.items ?? [], [q.data])
  const payments = useMemo(() => q.data?.payments ?? [], [q.data])

  const company = useQuery({ queryKey: ['company', companyId], queryFn: () => repos.tenant.getCompany(companyId), staleTime: 300_000 })
  const branches = useQuery({ queryKey: ['branches', companyId], queryFn: () => repos.tenant.listBranches(companyId), staleTime: 300_000 })
  const creator = useQuery({ queryKey: ['employee', order?.createdByEmployeeId], queryFn: () => repos.staff.getEmployee(order!.createdByEmployeeId), enabled: !!order, staleTime: 300_000 })
  const branch = branches.data?.find((b) => b.id === order?.branchId)
  const inOrder = useMemo(() => new Set(items.filter((i) => i.status !== 'cancelled').map((i) => i.serviceTypeId)), [items])

  const onAdd = async (stId: string) => {
    setAdding(stId)
    try { await addItems.mutateAsync([stId]) } catch (e) { toast.error(errorMessage(e)) } finally { setAdding(null) }
  }
  const onRemove = async (itemId: string) => {
    setRemoving(itemId)
    try { await removeItem.mutateAsync(itemId) } catch (e) { toast.error(errorMessage(e)) } finally { setRemoving(null) }
  }

  if (q.isError) return <Page><EmptyState title={t('common.error')} description={errorMessage(q.error)} action={<Link to={routes.app.reception}><Button variant="secondary">{t('common.back')}</Button></Link>} /></Page>

  const st = order ? orderStatusMeta(order.status) : null
  const pay = order ? paymentStatusMeta(order.payment) : null
  const editable = !!order && order.status !== 'cancelled' && order.status !== 'completed' && can('reception.order.create')
  const remaining = order ? Math.max(0, order.total - order.paidAmount) : 0
  const payable = !!order && can('reception.payment.create') && order.status !== 'cancelled' && order.itemCount > 0 && remaining > 0

  return (
    <Page width="wide">
      <PageHeader
        breadcrumbs={[{ label: t('nav.reception'), to: routes.app.reception }, { label: t('nav.orders'), to: routes.app.orders }, { label: order?.number ?? '…' }]}
        title={order ? <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5"><span className="font-mono break-all">{order.number}</span>{st && <Badge tone={st.tone} dot>{st.label}</Badge>}{pay && <Badge tone={pay.tone}>{pay.label}</Badge>}</span> : <Skeleton className="h-8 w-48" />}
        description={order ? (
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px]">
            <Link to={routes.app.patient(order.patientId)} className="group inline-flex min-w-0 items-center gap-1.5 font-medium text-ink hover:text-brand-ink"><User className="size-4 shrink-0 text-ink-3" /><span className="break-words">{order.patientName}</span><ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" /></Link>
            <span className="tabular">{fmtPhone(order.patientPhone)}</span>
            <span className="inline-flex items-center gap-1.5"><GitBranch className="size-4 text-ink-3" />{branch?.name ?? '—'}</span>
            <span className="text-ink-3 tabular">{fmtDateTime(order.createdAt)}{creator.data ? ` · ${creator.data.fullName}` : ''}</span>
          </span>
        ) : undefined}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] 3xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-5"><h3 className="text-[14px] font-semibold">{t('staff.reception.items')} <span className="ml-1 text-ink-3 tabular">{items.length || ''}</span></h3></div>
            <div className="border-t border-line">
              <OrderItemsTable order={order} items={items} loading={q.isLoading} onRemove={(id) => void onRemove(id)} removing={removing} canRemove={can('reception.order.create')} />
            </div>
          </Card>

          {editable && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="flex h-[min(560px,80dvh)] min-w-0 flex-col max-sm:p-4">
                <div className="mb-3 flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand-ink"><Plus className="size-4" /></span><h3 className="text-[15px] font-semibold">{t('staff.reception.addService')}</h3></div>
                {order && <ServicePicker companyId={companyId} branchId={order.branchId} inOrder={inOrder} onAdd={(id) => void onAdd(id)} adding={adding} disabled={addItems.isPending} />}
              </Card>
            </motion.div>
          )}

          {/* < xl: totals live below the fold — keep remaining amount + pay reachable in a sticky bar */}
          {order && (
            <div className="sticky bottom-2 z-20 xl:hidden print:hidden">
              <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-bg-elevated/95 px-4 py-2.5 shadow-3 backdrop-blur">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">{remaining > 0 ? t('staff.reception.remaining') : t('common.total')}</div>
                  <div className={cn('truncate text-[16px] font-semibold tabular', remaining > 0 ? 'text-danger' : 'text-ink')}>{fmtMoney(remaining > 0 ? remaining : order.total)}</div>
                </div>
                {payable ? (
                  <Button leftIcon={<Wallet className="size-4" />} onClick={() => setPayOpen(true)}>{t('staff.reception.pay')}</Button>
                ) : pay ? (
                  <Badge tone={pay.tone} dot>{pay.label}</Badge>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="xl:sticky xl:top-20 xl:self-start">
          {order ? (
            <OrderTotals order={order} payments={payments} onPay={() => setPayOpen(true)} onPrint={() => window.print()} onCancel={() => setCancelOpen(true)} canPay={can('reception.payment.create')} canCancel={can('reception.order.cancel')} />
          ) : (
            <Card><Skeleton className="h-5 w-24" /><div className="mt-4 space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-4" />)}</div></Card>
          )}
        </div>
      </div>

      {order && <PayModal open={payOpen} onClose={() => setPayOpen(false)} order={order} employeeId={employeeId} onPaid={() => toast.success(t('staff.reception.paidOk'), order.number)} />}
      {order && <CancelOrderModal open={cancelOpen} onClose={() => setCancelOpen(false)} orderId={order.id} orderNumber={order.number} />}
      {order && <Receipt order={order} items={items} payments={payments} company={company.data} branch={branch} cashier={creator.data?.fullName ?? staff.fullName} />}
    </Page>
  )
}
