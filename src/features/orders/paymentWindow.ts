/**
 * Payment edit window — mirror of the backend (`orders/service.PAYMENT_EDIT_WINDOW`). Reception changes a payment
 * (money back on a removed service, deleting the cheque with it) only within a day of taking it; later only
 * `reception.payment.late_edit` (admin and rahbar roles; superadmin). The backend has the last word (403
 * payment_locked) — this only greys the buttons out ahead of time.
 */
import type { Order, OrderItem, Payment } from '@/domain'

export const LATE_EDIT = 'reception.payment.late_edit' as const
export const PAYMENT_EDIT_HOURS = 24

export const paymentLocked = (createdAt: string, now = Date.now()) => now - Date.parse(createdAt) >= PAYMENT_EDIT_HOURS * 3_600_000

/** The cheque without `item` (same rounding as the backend recompute) and what is then paid over its total. */
export function refundOnRemove(order: Pick<Order, 'subtotal' | 'discountPercent' | 'paidAmount'>, item: Pick<OrderItem, 'price'>) {
  const subtotal = Math.max(0, order.subtotal - item.price)
  const total = subtotal - Math.floor((subtotal * order.discountPercent) / 100 + 0.5)
  return { total, refund: Math.max(0, order.paidAmount - total) }
}

/** The payments a removed service gives money back from: the newest live ones until the excess is covered. */
export function refundedBy(payments: Payment[], excess: number): Payment[] {
  const live = payments.filter((p) => !p.refundedAt).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || (b.id < a.id ? -1 : 1))
  const out: Payment[] = []
  let covered = 0
  for (const p of live) {
    if (covered >= excess) break
    out.push(p)
    covered += p.amount
  }
  return out
}

/** Whether removing `item` would give back money taken more than a day ago (dropping it from the debt never is). */
export function removeLocked(order: Order, payments: Payment[], item: OrderItem, now = Date.now()) {
  const { refund } = refundOnRemove(order, item)
  return refund > 0 && refundedBy(payments, refund).some((p) => paymentLocked(p.createdAt, now))
}

/** Whether deleting the cheque would take away a payment older than a day (refunded ones count — they leave the reports too). */
export const deleteLocked = (order: Pick<Order, 'firstPaidAt'>, now = Date.now()) => !!order.firstPaidAt && paymentLocked(order.firstPaidAt, now)
