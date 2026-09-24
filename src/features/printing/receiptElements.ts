/**
 * The cheque as TPrints elements — the same content and order as the printable `<Receipt>` (80mm sheet),
 * so a thermal printer and the browser print dialog produce the same document.
 */
import type { TFunction } from 'i18next'
import type { ReceiptProps } from '@/features/reception/Receipt'
import { paymentMethodLabel } from '@/features/orders/status'
import { fmtDateTime, fmtMoney, fmtPhone } from '@/shared/lib/format'
import type { PrintElement } from './tprints'

export function buildReceiptElements({ order, items, payments, company, branch, cashier }: ReceiptProps, t: TFunction): PrintElement[] {
  const live = items.filter((i) => i.status !== 'cancelled')
  const remaining = Math.max(0, order.total - order.paidAmount)
  const phone = branch?.phone ?? company?.phone
  const el: PrintElement[] = []
  if (company?.name) el.push({ type: 'title', value: company.name, size: 2 })
  if (branch) el.push({ type: 'text', value: `${branch.name}${branch.address ? `, ${branch.address}` : ''}`, align: 'center' })
  if (phone) el.push({ type: 'text', value: fmtPhone(phone), align: 'center' })
  el.push({ type: 'line', char: '=' })
  el.push({ type: 'row', left: t('staff.reception.receipt.number'), right: order.number, bold: true })
  el.push({ type: 'row', left: t('common.date'), right: fmtDateTime(order.createdAt) })
  el.push({ type: 'row', left: t('staff.reception.receipt.patient'), right: order.patientName })
  el.push({ type: 'row', left: t('common.phone'), right: fmtPhone(order.patientPhone) })
  if (cashier) el.push({ type: 'row', left: t('staff.reception.receipt.cashier'), right: cashier })
  el.push({ type: 'line' })
  live.forEach((it, i) => el.push({ type: 'row', left: `${i + 1}. ${it.serviceName}`, right: fmtMoney(it.finalPrice, false) }))
  el.push({ type: 'line' })
  el.push({ type: 'row', left: t('staff.reception.subtotal'), right: fmtMoney(order.subtotal, false) })
  if (order.discountPercent > 0) el.push({ type: 'row', left: `${t('staff.reception.discount')} ${order.discountPercent}%`, right: `-${fmtMoney(order.discountAmount, false)}` })
  el.push({ type: 'row', left: t('common.total'), right: fmtMoney(order.total), bold: true, size: 2 })
  el.push({ type: 'row', left: t('staff.reception.paid'), right: fmtMoney(order.paidAmount, false) })
  if (remaining > 0) el.push({ type: 'row', left: t('staff.reception.remaining'), right: fmtMoney(remaining, false), bold: true })
  if (payments.length) {
    el.push({ type: 'line' })
    payments.forEach((p) => el.push({ type: 'row', left: `${fmtDateTime(p.createdAt)} · ${paymentMethodLabel(p.method)}`, right: fmtMoney(p.amount, false) }))
  }
  el.push({ type: 'line', char: '=' })
  el.push({ type: 'text', value: t('staff.reception.receipt.footer'), align: 'center' })
  el.push({ type: 'feed', lines: 1 })
  return el
}
