/** Patient reports — mirror of TibDaftari-Backend `app/modules/reports/schemas.py` (patients / results / services). */
import type { Id, IsoDate, IsoDateTime, Money } from './common'

export interface CountSlice { key: string; count: number }

/** Patients with a (non-cancelled) cheque in the period. Money fields are null without `reports.finance.read`. */
export interface PatientReport {
  patients: number
  newPatients: number
  returningPatients: number
  orders: number
  avgOrders: number
  avgCheck: Money | null
  debtors: number | null
  debt: Money | null
  telegramLinked: number
  portalLinked: number
  /** male | female | unknown */
  gender: CountSlice[]
  /** 0-17 | 18-29 | 30-44 | 45-59 | 60+ | unknown */
  ageGroups: CountSlice[]
  /** empty name = not filled in */
  districts: { name: string; count: number }[]
  trend: { date: IsoDate; patients: number; new: number }[]
  topPatients: { patientId: Id; name: string; phone: string; orders: number; paid: Money | null; lastVisit: IsoDateTime }[]
}

/** Results of the period's cheques: readiness and whether patients got them. */
export interface ResultsReport {
  items: number
  itemsWaiting: number
  itemsSubmitted: number
  itemsReady: number
  itemsOverdue: number
  patientsWaiting: number
  documents: number
  received: number
  receivedPatients: number
  notReceived: number
  notReceivedPatients: number
  /** opened by the patient (public link / portal) */
  viewed: number
  /** printed by staff (handed over) */
  printed: number
  /** sent as a PDF via Telegram */
  telegram: number
  smsSent: number
  avgHours: number | null
  onTime: number
  turnaround: { name: string; approved: number; avgHours: number | null; onTime: number }[]
  /** opens and prints are recorded from this day on */
  trackingSince: IsoDate
}

export type ResultListStatus = 'not_received' | 'received' | 'waiting'

/** `document` rows (ready results) or `order` rows (cheques whose results are not ready yet). */
export interface ResultRow {
  kind: 'document' | 'order'
  orderId: Id
  orderNumber: string
  patientId: Id
  patientName: string
  patientPhone: string
  title: string
  orderedAt: IsoDateTime
  documentId?: Id | null
  readyAt?: IsoDateTime | null
  viewedAt?: IsoDateTime | null
  viewCount: number
  printedAt?: IsoDateTime | null
  printCount: number
  telegram: boolean
  sms?: 'queued' | 'sent' | 'delivered' | 'failed' | null
  waiting: number
  submitted: number
  overdue: boolean
}

export interface ServiceUsageRow {
  serviceTypeId: Id
  name: string
  category: string
  count: number
  patients: number
  /** the same-length period right before */
  prevCount: number
  revenue: Money | null
  /** not ready yet */
  pending: number
  avgHours: number | null
}

/** Service usage in the period vs the period before; active services nobody ordered. */
export interface ServicesReport {
  prevFrom: IsoDate
  prevTo: IsoDate
  total: number
  prevTotal: number
  rows: ServiceUsageRow[]
  unused: { serviceTypeId: Id; name: string; category: string; prevCount: number }[]
}
