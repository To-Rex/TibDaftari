/**
 * Order / payment / item status presentation helpers.
 * Labels come from the `staff.common` i18n namespace; tones map to Badge tones.
 */
import i18n from '@/shared/i18n'
import type { ItemStatus, OrderStatus, PaymentMethod, PaymentStatus } from '@/domain'
import type { Tone } from '@/shared/ui'

export interface StatusMeta { label: string; tone: Tone }

const ORDER_TONE: Record<OrderStatus, Tone> = { draft: 'neutral', open: 'info', in_progress: 'warn', completed: 'ok', cancelled: 'danger' }
const PAYMENT_TONE: Record<PaymentStatus, Tone> = { unpaid: 'danger', partial: 'warn', paid: 'ok', refunded: 'neutral' }
const ITEM_TONE: Record<ItemStatus, Tone> = { pending: 'neutral', entered: 'info', submitted: 'warn', approved: 'ok', rejected: 'danger', cancelled: 'neutral' }

export const orderStatusMeta = (s: OrderStatus): StatusMeta => ({ label: i18n.t(`staff.common.orderStatus.${s}`), tone: ORDER_TONE[s] })
export const paymentStatusMeta = (s: PaymentStatus): StatusMeta => ({ label: i18n.t(`staff.common.paymentStatus.${s}`), tone: PAYMENT_TONE[s] })
export const itemStatusMeta = (s: ItemStatus): StatusMeta => ({ label: i18n.t(`staff.common.itemStatus.${s}`), tone: ITEM_TONE[s] })
export const paymentMethodLabel = (m: PaymentMethod): string => i18n.t(`staff.common.paymentMethod.${m}`)

export const ORDER_STATUSES: OrderStatus[] = ['draft', 'open', 'in_progress', 'completed', 'cancelled']
export const PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'partial', 'paid', 'refunded']
export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer', 'insurance']
