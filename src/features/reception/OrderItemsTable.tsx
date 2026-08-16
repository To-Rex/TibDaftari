import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { FlaskConical, Trash2 } from 'lucide-react'
import type { Order, OrderItem } from '@/domain'
import { Badge, EmptyState, IconButton, Skeleton } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { fmtMoney } from '@/shared/lib/format'
import { itemStatusMeta } from '@/features/orders/status'

export function OrderItemsTable({ order, items, loading, onRemove, removing, canRemove }: { order?: Order; items: OrderItem[]; loading?: boolean; onRemove: (id: string) => void; removing?: string | null; canRemove: boolean }) {
  const { t } = useTranslation()
  const removable = !!order && order.payment === 'unpaid' && order.status !== 'cancelled' && canRemove
  if (loading) return <div className="flex flex-col gap-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
  if (!items.length) return <EmptyState icon={<FlaskConical />} title={t('staff.reception.noItems')} description={t('staff.reception.noItemsHint')} className="py-12" />
  const th = 'px-4 py-2.5 text-left text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3'
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="bg-surface-2/70">
            <th className={cn(th, 'w-8 tabular')}>#</th>
            <th className={th}>{t('staff.reception.colService')}</th>
            <th className={cn(th, 'max-md:hidden')}>{t('staff.reception.colCategory')}</th>
            <th className={cn(th, 'text-right')}>{t('common.price')}</th>
            <th className={cn(th, 'text-right')}>{t('staff.reception.colFinal')}</th>
            <th className={th}>{t('common.status')}</th>
            {removable && <th className={cn(th, 'w-12')} />}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {items.map((it, i) => {
              const st = itemStatusMeta(it.status)
              const canDel = removable && it.status === 'pending'
              return (
                <motion.tr key={it.id} layout initial={{ opacity: 0, backgroundColor: 'color-mix(in oklab, var(--c-brand) 12%, transparent)' }} animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.45 }}
                  className={cn('border-b border-line/70 last:border-b-0', it.status === 'cancelled' && 'opacity-50 line-through')}>
                  <td className="px-4 py-3 text-ink-3 tabular">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{it.serviceName}</td>
                  <td className="px-4 py-3 text-ink-3 max-md:hidden">{it.categoryName}</td>
                  <td className="px-4 py-3 text-right text-ink-3 tabular">{fmtMoney(it.price, false)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular">{fmtMoney(it.finalPrice, false)}</td>
                  <td className="px-4 py-3"><Badge tone={st.tone} size="sm" dot>{st.label}</Badge></td>
                  {removable && (
                    <td className="px-2 py-2 text-right">
                      {canDel && <IconButton label={t('common.delete')} size="sm" onClick={() => onRemove(it.id)} disabled={removing === it.id} className="text-ink-3 hover:text-danger hover:bg-danger-soft"><Trash2 /></IconButton>}
                    </td>
                  )}
                </motion.tr>
              )
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}
