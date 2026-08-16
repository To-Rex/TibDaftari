import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { FlaskConical, Trash2 } from 'lucide-react'
import type { Order, OrderItem } from '@/domain'
import { Badge, EmptyState, IconButton, Skeleton } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { fmtMoney } from '@/shared/lib/format'
import { itemStatusMeta } from '@/features/orders/status'

/**
 * Order line items. ≥ md → classic table; < md → one card per item (nothing hidden:
 * category, list price, final price, status and the remove action are all present).
 */
export function OrderItemsTable({ order, items, loading, onRemove, removing, canRemove }: { order?: Order; items: OrderItem[]; loading?: boolean; onRemove: (id: string) => void; removing?: string | null; canRemove: boolean }) {
  const { t } = useTranslation()
  const removable = !!order && order.payment === 'unpaid' && order.status !== 'cancelled' && canRemove
  if (loading) return <div className="flex flex-col gap-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
  if (!items.length) return <EmptyState icon={<FlaskConical />} title={t('staff.reception.noItems')} description={t('staff.reception.noItemsHint')} className="py-12" />
  const th = 'px-4 py-2.5 text-left text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3'
  const enter = { opacity: 0, backgroundColor: 'color-mix(in oklab, var(--c-brand) 12%, transparent)' }
  const shown = { opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }
  return (
    <>
      {/* ---------- table (≥ md) ---------- */}
      <div className="overflow-x-auto max-md:hidden">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-surface-2/70">
              <th className={cn(th, 'w-8 tabular')}>#</th>
              <th className={th}>{t('staff.reception.colService')}</th>
              <th className={cn(th, 'max-lg:hidden')}>{t('staff.reception.colCategory')}</th>
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
                  <motion.tr key={it.id} layout initial={enter} animate={shown} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.45 }}
                    className={cn('border-b border-line/70 last:border-b-0', it.status === 'cancelled' && 'opacity-50 line-through')}>
                    <td className="px-4 py-3 text-ink-3 tabular">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      {it.serviceName}
                      <span className="block text-[12px] font-normal text-ink-3 lg:hidden">{it.categoryName}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-3 max-lg:hidden">{it.categoryName}</td>
                    <td className="px-4 py-3 text-right text-ink-3 tabular whitespace-nowrap">{fmtMoney(it.price, false)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular whitespace-nowrap">{fmtMoney(it.finalPrice, false)}</td>
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

      {/* ---------- cards (< md) ---------- */}
      <ul className="flex flex-col divide-y divide-line/70 md:hidden">
        <AnimatePresence initial={false}>
          {items.map((it, i) => {
            const st = itemStatusMeta(it.status)
            const canDel = removable && it.status === 'pending'
            return (
              <motion.li key={it.id} layout initial={enter} animate={shown} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.45 }}
                className={cn('flex gap-3 px-4 py-3', it.status === 'cancelled' && 'opacity-50 line-through')}>
                <span className="w-5 shrink-0 pt-0.5 text-[12.5px] text-ink-3 tabular">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-[14px] font-medium leading-5">{it.serviceName}</span>
                  <span className="mt-0.5 block text-[12px] text-ink-3">{it.categoryName}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] tabular">
                    <span className="text-ink-3">{t('common.price')}: <span className="text-ink-2">{fmtMoney(it.price, false)}</span></span>
                    <span className="text-ink-3">{t('staff.reception.colFinal')}: <span className="font-semibold text-ink">{fmtMoney(it.finalPrice, false)}</span></span>
                  </span>
                  <span className="mt-2 flex items-center gap-2"><Badge tone={st.tone} size="sm" dot>{st.label}</Badge></span>
                </span>
                {removable && (
                  <span className="shrink-0 self-start">
                    {canDel && <IconButton label={t('common.delete')} size="md" onClick={() => onRemove(it.id)} disabled={removing === it.id} className="text-ink-3 hover:text-danger hover:bg-danger-soft"><Trash2 /></IconButton>}
                  </span>
                )}
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </>
  )
}
