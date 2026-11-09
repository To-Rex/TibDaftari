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
}

export interface Notification {
  id: Id
  title: string
  body: string
  kind: 'info' | 'success' | 'warning' | 'error'
  createdAt: IsoDateTime
  read: boolean
  link?: string
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
