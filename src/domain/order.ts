import type { AuditStamp, Id, IsoDateTime, Money } from './common'
import type { ValueMap } from './catalog'

/* ------------------------------------------------------------------
   Order (chek / visit) → OrderItem (one service) → Result (dynamic values)
   Explicit status enums instead of nullable timestamps.
------------------------------------------------------------------- */

export type OrderStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'
export type ItemStatus =
  | 'pending' // waiting for the lab
  | 'entered' // values saved by technician
  | 'submitted' // sent to doctor
  | 'approved' // doctor confirmed → document generated
  | 'rejected' // doctor sent back
  | 'cancelled'

export interface Order extends AuditStamp {
  id: Id
  companyId: Id
  branchId: Id
  number: string // human-readable e.g. UR-000123
  patientId: Id
  patientName: string // denormalised for lists
  patientPhone: string
  createdByEmployeeId: Id
  status: OrderStatus
  payment: PaymentStatus
  subtotal: Money
  discountPercent: number
  discountAmount: Money
  total: Money
  paidAmount: Money
  itemCount: number
  /** counts by item status, for badges */
  progress: Record<ItemStatus, number>
  note?: string
  /** Cancellation (reason kept separately; `note` is never overwritten). */
  cancelReason?: string
  cancelledAt?: IsoDateTime
}

export interface OrderItem extends AuditStamp {
  id: Id
  orderId: Id
  companyId: Id
  branchId: Id
  serviceTypeId: Id
  serviceName: string
  categoryId: Id
  categoryName: string
  price: Money // list price at time of order
  finalPrice: Money // after discount
  status: ItemStatus
  schemaId: Id | null
  schemaVersion?: number
  values: ValueMap
  technicianId?: Id
  technicianName?: string
  enteredAt?: IsoDateTime
  submittedAt?: IsoDateTime
  doctorId?: Id
  doctorName?: string
  approvedAt?: IsoDateTime
  rejectReason?: string
  documentId?: Id // generated result document
  labNote?: string
  /** the result's trail, oldest first (never sent to the patient portal) */
  history?: ItemEvent[]
}

/** One step of a result's trail. `returned` = sent back before approval, `revoked` = approval taken back,
 * `reopened` = back to approval because the order document it shared was revoked. */
export interface ItemEvent {
  type: 'submitted' | 'unsubmitted' | 'returned' | 'approved' | 'revoked' | 'reopened'
  at: IsoDateTime
  byId?: Id | null
  byName?: string | null
  reason?: string | null
  documentId?: Id | null
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'insurance'

/** The cheque list's extra filters (all optional; combine with the basic ones). */
export interface OrderListFilters {
  /** cheques with a (non-refunded) payment of any of these methods */
  methods?: PaymentMethod[]
  minTotal?: Money
  maxTotal?: Money
  /** true: something is still to pay; false: nothing is */
  debt?: boolean
  /** true: with a discount; false: without */
  discount?: boolean
  serviceTypeId?: Id
  /** a category and its sub-categories */
  categoryIds?: Id[]
  /** the employee who opened the cheque */
  createdBy?: Id
}

/** The filtered cheques at a glance (money over the non-cancelled ones). */
export interface OrderSummary {
  count: number
  total: Money
  paid: Money
  debt: Money
  methods: { method: PaymentMethod; amount: Money }[]
  /** who opened the filtered cheques (ignores the createdBy filter) */
  cashiers: { id: Id; name: string; count: number }[]
}

export interface Payment extends AuditStamp {
  id: Id
  orderId: Id
  companyId: Id
  branchId: Id
  amount: Money
  method: PaymentMethod
  employeeId: Id
  note?: string
  refundedAt?: IsoDateTime
}

export interface CreateOrderInput {
  patientId: Id
  branchId: Id
  serviceTypeIds: Id[]
  note?: string
}

export interface PayOrderInput {
  orderId: Id
  amount: Money
  method: PaymentMethod
  sendSms: boolean
}

/** Result document delivered to the patient (PDF), rendered from a template. */
export interface ResultDocument extends AuditStamp {
  id: Id
  companyId: Id
  orderId: Id
  orderItemId?: Id // primary item (item-scoped documents)
  /** all items covered by an order-scoped document (e.g. hepatitis panel) */
  orderItemIds?: Id[]
  templateId: Id
  templateVersion: number
  title: string
  status: 'draft' | 'final'
  pdfUrl?: string
  deliveries: DocumentDelivery[]
}

/** The "result ready" SMS that was (or, on a dry run, would be) queued again. */
export interface ResultSms {
  to: string
  text: string
  /** the company has an SMS provider; without one the message is only recorded as failed */
  configured: boolean
  queued: boolean
  status?: string | null
  messageId?: string | null
}

export interface DocumentDelivery {
  channel: 'sms' | 'telegram' | 'portal' | 'print'
  status: 'queued' | 'sent' | 'delivered' | 'failed'
  at: IsoDateTime
  detail?: string
}
