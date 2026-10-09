import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarRange } from 'lucide-react'
import { repos } from '@/data'
import type { OrderStatus, PaymentStatus } from '@/domain'
import { Card, Input, Page, PageHeader, SearchInput, Segmented, Select, Toolbar } from '@/shared/ui'
import { presetRange, type DatePreset, type DateRange } from '@/shared/lib/dates'
import { fmtNumber } from '@/shared/lib/format'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useStaffSession } from '@/features/session/useSession'
import { useOrdersList } from '@/features/orders/queries'
import { OrdersTable } from '@/features/orders/OrdersTable'
import { ORDER_STATUSES, PAYMENT_STATUSES, orderStatusMeta, paymentStatusMeta } from '@/features/orders/status'

/** 'custom' = any day to any day (either end may be left empty: "from that day on" / "up to that day") */
type Range = 'all' | DatePreset | 'custom'

export default function OrdersPage() {
  const { t } = useTranslation()
  const { companyId, branchId } = useStaffSession()
  const [search, setSearch] = useState('')
  const dq = useDebounce(search.trim(), 300)
  const [status, setStatus] = useState<'all' | OrderStatus>('all')
  const [payment, setPayment] = useState<'all' | PaymentStatus>('all')
  const [range, setRange] = useState<Range>('all')
  const [custom, setCustom] = useState<DateRange>(() => presetRange('last7'))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const dates = useMemo(() => {
    if (range === 'all') return {}
    if (range === 'custom') {
      // a reversed range is read the other way round
      const [from, to] = custom.from && custom.to && custom.from > custom.to ? [custom.to, custom.from] : [custom.from, custom.to]
      return { dateFrom: from || undefined, dateTo: to || undefined }
    }
    return { dateFrom: presetRange(range).from, dateTo: presetRange(range).to }
  }, [range, custom])
  const params = useMemo(() => ({ page, pageSize, search: dq || undefined, sortBy, sortDir, branchId: branchId ?? undefined, status: status === 'all' ? undefined : status, payment: payment === 'all' ? undefined : payment, ...dates }), [page, pageSize, dq, sortBy, sortDir, branchId, status, payment, dates])
  const q = useOrdersList(companyId, params)
  const branches = useQuery({ queryKey: ['branches', companyId], queryFn: () => repos.tenant.listBranches(companyId), staleTime: 300_000 })

  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1) }
  // "Oraliq" starts from the period shown so far (the last 7 days after "all")
  const pickRange = (r: Range) => { if (r === 'custom' && range !== 'custom' && range !== 'all') setCustom(presetRange(range)); setRange(r); setPage(1) }
  const setDay = (end: keyof DateRange) => (value: string) => { setCustom((c) => ({ ...c, [end]: value })); setPage(1) }
  const onSort = (key: string) => { if (key === sortBy) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortBy(key); setSortDir('desc') }; setPage(1) }

  return (
    <Page>
      <PageHeader title={t('staff.orders.title')} description={q.data ? t('staff.orders.count', { n: fmtNumber(q.data.total) }) : t('staff.orders.subtitle')} />
      <Toolbar className="min-w-0 [&>div]:min-w-0 [&>div]:max-w-full"
        actions={
          <div className="flex min-w-0 max-w-full flex-col items-start gap-2 md:items-end">
            <Segmented<Range> size="sm" value={range} onChange={pickRange} className="max-w-full flex-wrap" items={[{ value: 'all', label: t('common.all') }, { value: 'today', label: t('common.today') }, { value: 'yesterday', label: t('common.yesterday') }, { value: 'last7', label: t('common.last7') }, { value: 'last30', label: t('common.last30') }, { value: 'thisMonth', label: t('common.thisMonth') }, { value: 'custom', label: t('clinical.reports.custom'), icon: <CalendarRange /> }]} />
            <AnimatePresence initial={false}>
              {range === 'custom' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5" data-orders-range>
                  <Input type="date" aria-label={t('staff.orders.dateFrom')} title={t('staff.orders.dateFrom')} value={custom.from} max={custom.to || undefined} onChange={(e) => setDay('from')(e.target.value)} className="h-8 w-[150px] max-w-full px-2 text-[13px] tabular" data-orders-from />
                  <span className="text-ink-3">–</span>
                  <Input type="date" aria-label={t('staff.orders.dateTo')} title={t('staff.orders.dateTo')} value={custom.to} min={custom.from || undefined} onChange={(e) => setDay('to')(e.target.value)} className="h-8 w-[150px] max-w-full px-2 text-[13px] tabular" data-orders-to />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
