/**
 * Removing a service added by mistake from a (partly) paid cheque: shows what the cheque becomes and how much goes
 * back to the patient, asks for an optional reason. The backend does the refund (newest payments refunded, the rest
 * re-entered with the same method) and answers the exact amount; the estimate here mirrors its recompute.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Undo2 } from 'lucide-react'
import type { Order, OrderItem } from '@/domain'
import { fmtMoney } from '@/shared/lib/format'
import { errorMessage } from '@/shared/lib/errors'
import { Button, Field, Modal, Textarea, toast } from '@/shared/ui'
import { useRemoveItem } from '@/features/orders/queries'

/** The cheque without `item` (same rounding as the backend recompute) and what is then paid over its total. */
export function refundOnRemove(order: Pick<Order, 'subtotal' | 'discountPercent' | 'paidAmount'>, item: Pick<OrderItem, 'price'>) {
  const subtotal = Math.max(0, order.subtotal - item.price)
  const total = subtotal - Math.floor((subtotal * order.discountPercent) / 100 + 0.5)
  return { total, refund: Math.max(0, order.paidAmount - total) }
}

export function RemoveItemModal({ order, item, onClose }: { order: Order; item: OrderItem | null; onClose: () => void }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const remove = useRemoveItem(order.id)
  useEffect(() => { if (item) setReason('') }, [item])
  const est = item ? refundOnRemove(order, item) : null

  const submit = async () => {
    if (!item) return
    try {
      const r = await remove.mutateAsync({ itemId: item.id, reason: reason.trim() || undefined })
      if (r.refunded) toast.success(t('staff.reception.itemRemovedRefund', { amount: fmtMoney(r.refunded) }), item.serviceName)
      else toast.success(t('staff.reception.itemRemoved'), item.serviceName)
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Modal open={!!item} onClose={onClose} size="sm" title={t('staff.reception.removeItemTitle', { name: item?.serviceName ?? '' })} description={t('staff.reception.removeItemPaidHint')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.back')}</Button><Button variant="danger" loading={remove.isPending} onClick={() => void submit()} data-remove-item-confirm>{est && est.refund > 0 ? t('staff.reception.removeItemConfirmRefund') : t('staff.reception.removeItemConfirm')}</Button></>}>
      {est && (
        <div className="mb-4 flex flex-col gap-2 rounded-[var(--radius)] border border-line bg-surface-2/40 p-3.5 text-[13.5px]" data-remove-item-estimate>
          <div className="flex justify-between gap-3"><span className="text-ink-3">{t('staff.reception.paid')}</span><span className="tabular">{fmtMoney(order.paidAmount)}</span></div>
          <div className="flex justify-between gap-3"><span className="text-ink-3">{t('staff.reception.removeItemNewTotal')}</span><span className="tabular">{fmtMoney(est.total)}</span></div>
          {est.refund > 0 ? (
            <div className="flex items-center justify-between gap-3 border-t border-line pt-2 font-semibold text-warn" data-remove-item-refund={est.refund}>
              <span className="inline-flex items-center gap-1.5"><Undo2 className="size-4" />{t('staff.reception.removeItemRefund')}</span>
              <span className="tabular">{fmtMoney(est.refund)}</span>
            </div>
          ) : (
            <p className="border-t border-line pt-2 text-[12.5px] text-ink-3" data-remove-item-refund="0">{t('staff.reception.removeItemNoRefund')}</p>
          )}
        </div>
      )}
      <Field label={t('staff.reception.removeItemReason')} optionalText={t('common.optional')}>
        {(id) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder={t('staff.reception.removeItemReasonPh')} />}
      </Field>
    </Modal>
  )
}
