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
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'insurance'

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
  orderItemId?: Id // absent when documentScope === 'order'
  templateId: Id
  templateVersion: number
  title: string
  status: 'draft' | 'final'
  pdfUrl?: string
  deliveries: DocumentDelivery[]
}

export interface DocumentDelivery {
  channel: 'sms' | 'telegram' | 'portal' | 'print'
  status: 'queued' | 'sent' | 'delivered' | 'failed'
  at: IsoDateTime
  detail?: string
}
