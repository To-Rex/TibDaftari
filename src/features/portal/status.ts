/** Presentation metadata for workflow / payment statuses in the portal. */
import type { ItemStatus, Order, PaymentStatus, ResultDocument } from '@/domain'
import type { Tone } from '@/shared/ui'

export const ITEM_STEPS: readonly ItemStatus[] = ['pending', 'entered', 'submitted', 'approved']

export const itemTone: Record<ItemStatus, Tone> = {
  pending: 'neutral',
  entered: 'info',
  submitted: 'warn',
  approved: 'ok',
  rejected: 'danger',
  cancelled: 'neutral',
}

export const paymentTone: Record<PaymentStatus, Tone> = {
  unpaid: 'warn',
  partial: 'info',
  paid: 'ok',
  refunded: 'neutral',
}

/** Index of the current step on the linear timeline (rejected → back to entered). */
export const stepIndex = (s: ItemStatus): number => {
  if (s === 'rejected') return 1
  if (s === 'cancelled') return -1
  return ITEM_STEPS.indexOf(s)
}

export const orderReadyCount = (o: Order) => o.progress.approved
export const orderActiveCount = (o: Order) => o.itemCount - o.progress.cancelled

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[1] ?? fullName

export const isRecent = (iso: string, days = 7) => Date.now() - new Date(iso).getTime() < days * 86_400_000

export const deliveredVia = (doc: ResultDocument, channel: 'sms' | 'portal') =>
  doc.deliveries.some((d) => d.channel === channel && (d.status === 'sent' || d.status === 'delivered'))
