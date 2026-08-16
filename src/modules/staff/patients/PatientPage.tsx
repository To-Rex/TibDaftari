import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Cake, FileText, Info, Pencil, Percent, Phone, Plus, Receipt, UserRound } from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, Page, PageHeader, Skeleton, Tabs } from '@/shared/ui'
import { ageFrom, fmtDate, fmtMoney, fmtPhone, fmtRelative } from '@/shared/lib/format'
import { errorMessage } from '@/shared/lib/errors'
import { routes } from '@/shared/config/routes'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { usePatient } from '@/features/patients/queries'
import { PatientDrawer } from '@/features/patients/PatientDrawer'
import { PatientDetails, PatientDocuments } from '@/features/patients/PatientDetails'
import { useDocuments, useOrdersList } from '@/features/orders/queries'
import { OrdersTable } from '@/features/orders/OrdersTable'
import { useNewOrder } from '@/features/reception/useNewOrder'
import { BranchPickerModal } from '@/features/reception/BranchPickerModal'

type Tab = 'orders' | 'results' | 'info'

export default function PatientPage() {
  const { t } = useTranslation()
  const { patientId = '' } = useParams()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const q = usePatient(patientId)
  const [tab, setTab] = useState<Tab>('orders')
  const [edit, setEdit] = useState(false)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const params = useMemo(() => ({ patientId, page, pageSize: 10, sortBy, sortDir }), [patientId, page, sortBy, sortDir])
  const orders = useOrdersList(companyId, params, !!patientId)
  const docs = useDocuments({ patientId }, tab === 'results')
  const newOrder = useNewOrder()
  const p = q.data

  if (q.isError) return <Page><EmptyState title={t('common.error')} description={errorMessage(q.error)} action={<Link to={routes.app.patients}><Button variant="secondary">{t('common.back')}</Button></Link>} /></Page>

  const onSort = (key: string) => { if (key === sortBy) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortBy(key); setSortDir('desc') }; setPage(1) }

  return (
    <Page>
      <PageHeader breadcrumbs={[{ label: t('nav.patients'), to: routes.app.patients }, { label: p?.fullName ?? '…' }]}
        title={p ? (
          <span className="flex items-center gap-4 max-xs:flex-col max-xs:items-start max-xs:gap-3">
            <Avatar name={p.fullName} size="xl" className="max-xs:size-12 max-xs:text-[16px]" />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="break-words">{p.fullName}</span>
                {p.tags.map((tg) => <Badge key={tg} size="sm" tone={tg === 'VIP' ? 'accent' : 'brand'}>{tg}</Badge>)}
                {p.discountPercent > 0 && <Badge size="sm" tone="ok"><Percent className="size-3" />{p.discountPercent}%</Badge>}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] font-normal tracking-normal text-ink-2 tabular">
                <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5 text-ink-3" />{fmtPhone(p.phone)}</span>
                {p.birthDate && <span className="inline-flex items-center gap-1.5"><Cake className="size-3.5 text-ink-3" />{fmtDate(p.birthDate)} · {ageFrom(p.birthDate)} {t('staff.reception.yearsOld')}</span>}
                {p.gender && <span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5 text-ink-3" />{t(`common.${p.gender}`)}</span>}
              </span>
            </span>
          </span>
        ) : <span className="flex items-center gap-4"><Skeleton className="size-16 rounded-full" /><span className="space-y-2"><Skeleton className="h-6 w-56" /><Skeleton className="h-4 w-40" /></span></span>}
        actions={p && (
          <>
            {can('reception.patient.write') && <Button variant="secondary" leftIcon={<Pencil className="size-4" />} onClick={() => setEdit(true)}>{t('common.edit')}</Button>}
            {can('reception.order.create') && <Button leftIcon={<Plus className="size-4" />} loading={newOrder.creating} onClick={() => newOrder.start(p.id)}>{t('staff.reception.newOrder')}</Button>}
          </>
        )}
      />

      {p && (
        <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show" className="mb-6 grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))]">
          {[
            { label: t('staff.reception.statOrders'), value: p.stats.orders },
            { label: t('staff.reception.statSpent'), value: fmtMoney(p.stats.totalSpent, false), sub: t('common.sum') },
            { label: t('staff.reception.lastVisit'), value: p.stats.lastVisitAt ? fmtRelative(p.stats.lastVisitAt) : '—' },
            { label: t('staff.patients.portal'), value: p.portal.linked ? t('staff.patients.portalLinked') : t('staff.patients.portalNotLinked') },
          ].map((s) => (
            <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
              <Card className="p-4">
                <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">{s.label}</div>
                <div className="mt-1 text-[20px] font-semibold tabular tracking-tight break-words">{s.value}{s.sub && <span className="ml-1 text-[12px] font-normal text-ink-3">{s.sub}</span>}</div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Tabs<Tab> value={tab} onChange={setTab} className="mb-4 -mx-3 px-3 xs:-mx-4 xs:px-4 sm:mx-0 sm:px-0" items={[
        { value: 'orders', label: t('staff.patients.tabOrders'), icon: <Receipt />, count: orders.data?.total },
        { value: 'results', label: t('staff.patients.tabResults'), icon: <FileText />, count: docs.data?.length },
        { value: 'info', label: t('staff.patients.tabInfo'), icon: <Info /> },
      ]} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
          {tab === 'orders' && (
            <Card padded={false} className="overflow-hidden">
              <OrdersTable page={orders.data} loading={orders.isFetching} sortBy={sortBy} sortDir={sortDir} onSort={onSort} onPage={setPage} showPatient={false} />
            </Card>
          )}
          {tab === 'results' && <PatientDocuments docs={docs.data} loading={docs.isLoading} />}
          {tab === 'info' && p && <PatientDetails patient={p} />}
        </motion.div>
      </AnimatePresence>

      {p && <PatientDrawer open={edit} onClose={() => setEdit(false)} companyId={companyId} patient={p} onSaved={() => setEdit(false)} />}
      <BranchPickerModal open={newOrder.pickerOpen} onClose={newOrder.closePicker} companyId={companyId} onPick={newOrder.pickBranch} loading={newOrder.creating} />
    </Page>
  )
}
