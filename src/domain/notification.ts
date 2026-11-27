import type { AuditStamp, Id, IsoDateTime } from './common'

export type MessageChannel = 'sms' | 'telegram' | 'portal'
export type MessageStatus = 'scheduled' | 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled'
export type MessageKind = 'payment_receipt' | 'result_ready' | 'reminder' | 'broadcast' | 'otp' | 'portal_access'

/**
 * Outbox message — the backend owns scheduling/idempotency because the external SMS provider (Xabarchi)
 * has neither. providerMessageId is the Xabarchi bigint id returned by POST /public/messages.
 * `unitId` = the facility the message went out from (its SMS account, or an inherited one, sent it).
 */
export interface OutboxMessage extends AuditStamp {
  id: Id
  unitId?: Id | null
  unitName?: string | null
  patientId?: Id
  orderId?: Id
  channel: MessageChannel
  kind: MessageKind
  to: string
  text: string
  status: MessageStatus
  scheduledAt?: IsoDateTime
  sentAt?: IsoDateTime
  attempts: number
  providerMessageId?: string
  error?: string
  /** a number abroad: the ISO-2 country it was sent to */
  countryCode?: string | null
  /** Eskiz: parts and cost (so‘m) once Eskiz said so; the provider's own state word */
  parts?: number | null
  cost?: number | null
  providerStatus?: string | null
  /** who the message is for and which cheque it is about, by name (the ids are above) */
  patientName?: string | null
  orderNumber?: string | null
  /** the employee who wrote it or sent it again; empty = the system sent it on its own (a receipt, a result, a code) */
  sentByName?: string | null
  /** a message waiting for another try after a provider hiccup: when that try is due */
  nextAttemptAt?: IsoDateTime | null
  /** the text is a credential (a code, a password): the journal keeps it masked and it is never sent again */
  secret?: boolean
  /** the message this one repeats (it was sent again from the journal) */
  resendOf?: Id | null
  /** what the reader may do with it right now — their permission and the message's state together */
  canCancel?: boolean
  canResend?: boolean
}

export interface Notification {
  id: Id
  title: string
  body: string
  kind: 'info' | 'success' | 'warning' | 'error'
  createdAt: IsoDateTime
  read: boolean
  link?: string
  /** a notice the system wrote: what it is about (`training.passed` …) and its values — said in the reader's
   *  language when the interface knows the code (`features/notifications`), else `title` / `body` as they are */
  code?: string | null
  params?: Record<string, string | number | null> | null
}

export interface DashboardSummary {
  todayOrders: number
  todayRevenue: number
  pendingLab: number
  pendingApproval: number
  patients: number
  smsQueued: number
  trend: { date: string; orders: number; revenue: number }[]
  byCategory: { name: string; count: number; revenue: number; color?: string }[]
}
