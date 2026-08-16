import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { repos } from '@/data'
import type { OrderStatus, PaymentStatus } from '@/domain'
import { Card, Page, PageHeader, SearchInput, Segmented, Select, Toolbar } from '@/shared/ui'
import { presetRange, type DatePreset } from '@/shared/lib/dates'
import { fmtNumber } from '@/shared/lib/format'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useStaffSession } from '@/features/session/useSession'
import { useOrdersList } from '@/features/orders/queries'
import { OrdersTable } from '@/features/orders/OrdersTable'
import { ORDER_STATUSES, PAYMENT_STATUSES, orderStatusMeta, paymentStatusMeta } from '@/features/orders/status'

type Range = 'all' | DatePreset

export default function OrdersPage() {
  const { t } = useTranslation()
  const { companyId, branchId } = useStaffSession()
  const [search, setSearch] = useState('')
  const dq = useDebounce(search.trim(), 300)
  const [status, setStatus] = useState<'all' | OrderStatus>('all')
  const [payment, setPayment] = useState<'all' | PaymentStatus>('all')
  const [range, setRange] = useState<Range>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const dates = useMemo(() => (range === 'all' ? {} : { dateFrom: presetRange(range).from, dateTo: presetRange(range).to }), [range])
  const params = useMemo(() => ({ page, pageSize, search: dq || undefined, sortBy, sortDir, branchId: branchId ?? undefined, status: status === 'all' ? undefined : status, payment: payment === 'all' ? undefined : payment, ...dates }), [page, pageSize, dq, sortBy, sortDir, branchId, status, payment, dates])
  const q = useOrdersList(companyId, params)
  const branches = useQuery({ queryKey: ['branches', companyId], queryFn: () => repos.tenant.listBranches(companyId), staleTime: 300_000 })

  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1) }
  const onSort = (key: string) => { if (key === sortBy) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortBy(key); setSortDir('desc') }; setPage(1) }

  return (
    <Page>
      <PageHeader title={t('staff.orders.title')} description={q.data ? t('staff.orders.count', { n: fmtNumber(q.data.total) }) : t('staff.orders.subtitle')} />
      <Toolbar className="min-w-0 [&>div]:min-w-0 [&>div]:max-w-full"
        actions={
          <Segmented<Range> size="sm" value={range} onChange={reset(setRange)} className="max-w-full flex-wrap" items={[{ value: 'all', label: t('common.all') }, { value: 'today', label: t('common.today') }, { value: 'yesterday', label: t('common.yesterday') }, { value: 'last7', label: t('common.last7') }, { value: 'last30', label: t('common.last30') }, { value: 'thisMonth', label: t('common.thisMonth') }]} />
        }>
        <SearchInput value={search} onChange={reset(setSearch)} placeholder={t('staff.orders.searchPh')} className="w-full sm:w-72 3xl:w-96" />
        <Segmented<'all' | OrderStatus> size="sm" value={status} onChange={reset(setStatus)} className="max-w-full flex-wrap" items={[{ value: 'all', label: t('common.all') }, ...ORDER_STATUSES.filter((s) => s !== 'draft').map((s) => ({ value: s, label: orderStatusMeta(s).label }))]} />
        <Select value={payment} onChange={(e) => reset(setPayment)(e.target.value as 'all' | PaymentStatus)} className="h-8 w-auto text-[13px]">
          <option value="all">{t('staff.orders.allPayments')}</option>
          {PAYMENT_STATUSES.map((p) => <option key={p} value={p}>{paymentStatusMeta(p).label}</option>)}
        </Select>
      </Toolbar>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card padded={false} className="overflow-hidden">
          <OrdersTable page={q.data} loading={q.isFetching} sortBy={sortBy} sortDir={sortDir} onSort={onSort} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1) }} footer
            branchName={branchId ? undefined : (id) => branches.data?.find((b) => b.id === id)?.name} />
        </Card>
      </motion.div>
    </Page>
  )
}
