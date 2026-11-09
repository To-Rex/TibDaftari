/**
 * HTTP OrderRepository — cheques, items, payments, lab worklist, approvals, result documents.
 * Wire contract: TibDaftari-Backend `app/modules/orders` (router.py / schemas.py).
 *  - `employeeId` arguments are ignored: the backend takes the actor from the bearer token.
 *  - `ResultDocument.pdfUrl` comes back relative (`/api/v1/documents/{id}/pdf`) and is absolutised here.
 */
import type { Id, Order, OrderItem, Page, Payment, ResultDocument, ResultSms, OrderListFilters, OrderSummary } from '@/domain'
import type { OrderRepository, WorklistCounts } from '@/data/repositories'
import { absoluteUrl, api, ApiError, compact } from './client'

/** Worklist row: OrderItem + order/patient join columns (matches backend `WorklistItemOut`). */
export type WorklistRow = OrderItem & {
  orderNumber: string
  patientName: string
  patientPhone: string
  patientGender?: 'male' | 'female'
  patientBirthDate?: string
}

const withPdfUrl = (d: ResultDocument): ResultDocument => ({ ...d, pdfUrl: absoluteUrl(d.pdfUrl) })

/**
 * `listDocuments` has no scope in the interface but the backend route is unit-scoped
 * (`GET /units/{id}/documents`), so the working unit is read from the staff session (the facility when the staff
 * app has one, else the administrator's scope). Imported lazily to avoid a data → features → data import cycle.
 */
const currentScopeId = async (): Promise<Id> => {
  const { useAuth } = await import('@/features/auth/store')
  const { facilityId, scopeUnitId, staff } = useAuth.getState()
  const id = facilityId ?? scopeUnitId ?? staff?.unitId
  if (!id) throw new ApiError(401, 'unauthorized', 'Xodim sessiyasi topilmadi')
  return id
}

/** The list's extra filters as query params (arrays repeat the key, empty ones are skipped). */
const extraFilters = (q: OrderListFilters) => ({
  methods: q.methods, minTotal: q.minTotal, maxTotal: q.maxTotal, debt: q.debt, discount: q.discount,
  serviceTypeId: q.serviceTypeId, categoryIds: q.categoryIds, createdBy: q.createdBy,
  results: q.results, minItems: q.minItems, maxItems: q.maxItems, refunded: q.refunded,
})

export const ordersHttp: OrderRepository = {
  list: (scopeId, q) =>
    api.get<Page<Order>>(`/units/${scopeId}/orders`, {
      query: {
        page: q.page,
        pageSize: q.pageSize,
        search: q.search,
        sortBy: q.sortBy,
        sortDir: q.sortDir,
        unitId: q.unitId,
        status: q.status,
        payment: q.payment,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        patientId: q.patientId,
        ...extraFilters(q),
      },
    }),

  exportXlsx: (scopeId, q) =>
    api.get<Blob>(`/units/${scopeId}/orders/export.xlsx`, {
      blob: true,
      query: { search: q.search, sortBy: q.sortBy, sortDir: q.sortDir, unitId: q.unitId, status: q.status, payment: q.payment, dateFrom: q.dateFrom, dateTo: q.dateTo, patientId: q.patientId, ...extraFilters(q), lang: q.lang, caption: q.caption },
    }),

  summary: (scopeId, q) =>
    api.get<OrderSummary>(`/units/${scopeId}/orders/summary`, {
      query: { search: q.search, unitId: q.unitId, status: q.status, payment: q.payment, dateFrom: q.dateFrom, dateTo: q.dateTo, patientId: q.patientId, ...extraFilters(q) },
    }),

  get: (id) => api.get<{ order: Order; items: OrderItem[]; payments: Payment[] }>(`/orders/${id}`),

  create: (scopeId, _employeeId, input) =>
    api.post<{ order: Order; items: OrderItem[] }>(`/units/${scopeId}/orders`, compact({
      patientId: input.patientId,
      unitId: input.unitId,
      serviceTypeIds: input.serviceTypeIds,
      note: input.note,
    })),

  addItems: (orderId, serviceTypeIds) =>
    api.post<{ order: Order; items: OrderItem[] }>(`/orders/${orderId}/items`, { serviceTypeIds }),

  removeItem: (orderId, itemId, reason) =>
    api.delete<{ order: Order; items: OrderItem[]; refunded?: number }>(`/orders/${orderId}/items/${itemId}`, { query: { reason } }),

  pay: (_employeeId, input) =>
    api.post<{ order: Order; payments: Payment[] }>(`/orders/${input.orderId}/pay`, {
      amount: input.amount,
      method: input.method,
      sendSms: input.sendSms,
      parts: input.parts,
    }),

  changePaymentMethod: (paymentId, input) =>
    api.put<{ order: Order; payments: Payment[] }>(`/payments/${paymentId}/method`, { parts: input.parts, reason: input.reason }),

  cancel: (orderId, reason) => api.post<Order>(`/orders/${orderId}/cancel`, { reason }),

  delete: (orderId) => api.delete<Order>(`/orders/${orderId}`),

  worklistCounts: (scopeId, q) =>
    api.get<WorklistCounts>(`/units/${scopeId}/worklist/counts`, {
      query: { search: q.search, unitId: q.unitId, categoryIds: q.categoryIds, dateFrom: q.dateFrom, dateTo: q.dateTo },
    }),

  /** `categoryIds` / `status` are repeated query keys (`status=a&status=b`). */
  worklist: (scopeId, q) =>
    api.get<Page<WorklistRow>>(`/units/${scopeId}/worklist`, {
      query: {
        page: q.page,
        pageSize: q.pageSize,
        search: q.search,
        sortBy: q.sortBy,
        sortDir: q.sortDir,
        unitId: q.unitId,
        categoryIds: q.categoryIds,
        status: q.status,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
      },
    }),

  getItem: (itemId) => api.get<OrderItem>(`/items/${itemId}`),

  saveValues: (itemId, _employeeId, values, labNote) => api.put<OrderItem>(`/items/${itemId}/values`, { values, labNote }),

  /** Backend toggles submitted ↔ entered. */
  submitItem: (itemId) => api.post<OrderItem>(`/items/${itemId}/submit`),

  approveItem: async (itemId, _employeeId, templateId) => {
    const r = await api.post<{ item: OrderItem; document: ResultDocument }>(`/items/${itemId}/approve`, { templateId })
    return { item: r.item, document: withPdfUrl(r.document) }
  },

  approveOrder: async (orderId, _employeeId, templateId, itemIds) => {
    const r = await api.post<{ items: OrderItem[]; document: ResultDocument }>(`/orders/${orderId}/approve`, { templateId, itemIds })
    return { items: r.items, document: withPdfUrl(r.document) }
  },

  orderScopeItems: (orderId, templateId) => api.get<OrderItem[]>(`/orders/${orderId}/scope-items`, { query: { templateId } }),

  rejectItem: (itemId, _employeeId, reason) => api.post<OrderItem>(`/items/${itemId}/reject`, { reason }),

  revokeItem: (itemId, reason) => api.post<{ item: OrderItem; items: OrderItem[]; documentId?: string | null }>(`/items/${itemId}/revoke`, { reason }),

  listDocuments: async (q) => {
    const scopeId = await currentScopeId()
    const docs = await api.get<ResultDocument[]>(`/units/${scopeId}/documents`, {
      query: { orderId: q.orderId, patientId: q.patientId, unitId: q.unitId },
    })
    return docs.map(withPdfUrl)
  },

  getDocument: async (id) => withPdfUrl(await api.get<ResultDocument>(`/documents/${id}`)),

  resendResultSms: (documentId, input) => api.post<ResultSms>(`/documents/${documentId}/sms`, compact({ to: input?.to, dryRun: input?.dryRun })),
}
