import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowUpRight, Cake, Percent, Phone, Plus, Receipt, UserRound, Wallet, Pencil } from 'lucide-react'
import type { Id, Patient } from '@/domain'
import { Avatar, Badge, Button, Card, EmptyState, IconButton, Skeleton, fadeUp, stagger } from '@/shared/ui'
import { ageFrom, fmtDate, fmtDateTime, fmtMoney, fmtPhone } from '@/shared/lib/format'
import { routes } from '@/shared/config/routes'
import { useOrdersList } from '@/features/orders/queries'
import { orderStatusMeta, paymentStatusMeta } from '@/features/orders/status'

export function PatientSummary({ companyId, patient, onNewOrder, creating, canCreate, canEdit, onEdit }: { companyId: Id; patient: Patient; onNewOrder: () => void; creating: boolean; canCreate: boolean; canEdit: boolean; onEdit: () => void }) {
  const { t } = useTranslation()
  const orders = useOrdersList(companyId, { patientId: patient.id, pageSize: 6, sortBy: 'createdAt', sortDir: 'desc' })
  const age = ageFrom(patient.birthDate)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="flex h-full min-h-0 flex-col gap-4">
      <Card className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand/10 blur-2xl" />
        <div className="flex items-start gap-4">
          <Avatar name={patient.fullName} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={routes.app.patient(patient.id)} className="group inline-flex items-center gap-1 text-[18px] font-semibold tracking-tight hover:text-brand-ink">
                {patient.fullName}<ArrowUpRight className="size-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              {patient.tags.map((tg) => <Badge key={tg} size="sm" tone={tg === 'VIP' ? 'accent' : 'brand'}>{tg}</Badge>)}
              {patient.discountPercent > 0 && <Badge size="sm" tone="ok"><Percent className="size-3" />{patient.discountPercent}% {t('staff.reception.discount')}</Badge>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2 tabular">
              <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5 text-ink-3" />{fmtPhone(patient.phone)}</span>
              {patient.birthDate && <span className="inline-flex items-center gap-1.5"><Cake className="size-3.5 text-ink-3" />{fmtDate(patient.birthDate)} · {age} {t('staff.reception.yearsOld')}</span>}
              {patient.gender && <span className="inline-flex items-center gap-1.5"><UserRound className="size-3.5 text-ink-3" />{t(`common.${patient.gender}`)}</span>}
            </div>
          </div>
          {canEdit && <IconButton label={t('common.edit')} onClick={onEdit}><Pencil /></IconButton>}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { label: t('staff.reception.statOrders'), value: patient.stats.orders, icon: <Receipt /> },
            { label: t('staff.reception.statSpent'), value: fmtMoney(patient.stats.totalSpent, false), icon: <Wallet /> },
            { label: t('staff.reception.lastVisit'), value: patient.stats.lastVisitAt ? fmtDate(patient.stats.lastVisitAt) : '—', icon: <Cake /> },
          ].map((s) => (
            <div key={s.label} className="rounded-[var(--radius)] bg-surface-2/70 px-3 py-2.5">
              <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">{s.label}</div>
              <div className="mt-0.5 text-[16px] font-semibold tabular">{s.value}</div>
            </div>
          ))}
        </div>
        {canCreate && (
          <Button size="lg" block className="mt-5" leftIcon={<Plus className="size-4" />} loading={creating} onClick={onNewOrder}>{t('staff.reception.newOrder')}</Button>
        )}
      </Card>

      <Card padded={false} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5">
          <h3 className="text-[14px] font-semibold">{t('staff.reception.recentOrders')}</h3>
          <Link to={routes.app.patient(patient.id)} className="text-[12.5px] font-medium text-brand-ink hover:underline">{t('common.seeAll')}</Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-line">
          {orders.isLoading ? (
            <div className="flex flex-col gap-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : !orders.data?.items.length ? (
            <EmptyState icon={<Receipt />} title={t('staff.reception.noOrders')} className="py-10" />
          ) : (
            <motion.ul variants={stagger} initial="hidden" animate="show" className="divide-y divide-line/70">
              {orders.data.items.map((o) => {
                const st = orderStatusMeta(o.status)
                const pay = paymentStatusMeta(o.payment)
                return (
                  <motion.li key={o.id} variants={fadeUp}>
                    <Link to={routes.app.order(o.id)} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[13.5px]"><span className="font-mono font-medium">{o.number}</span><Badge size="sm" tone={st.tone}>{st.label}</Badge></span>
                        <span className="text-[12px] text-ink-3 tabular">{fmtDateTime(o.createdAt)} · {o.itemCount} {t('staff.reception.itemsShort')}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[13.5px] font-semibold tabular">{fmtMoney(o.total)}</span>
                        <Badge size="sm" tone={pay.tone}>{pay.label}</Badge>
                      </span>
                    </Link>
                  </motion.li>
                )
              })}
            </motion.ul>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
