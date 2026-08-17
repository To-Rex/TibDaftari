/**
 * HTTP OrderRepository — cheques, items, payments, lab worklist, approvals, result documents.
 * Wire contract: TibDaftari-Backend `app/modules/orders` (router.py / schemas.py).
 *  - `employeeId` arguments are ignored: the backend takes the actor from the bearer token.
 *  - `ResultDocument.pdfUrl` comes back relative (`/api/v1/documents/{id}/pdf`) and is absolutised here.
 */
import type { Id, Order, OrderItem, Page, Payment, ResultDocument } from '@/domain'
import type { OrderRepository } from '@/data/repositories'
import { absoluteUrl, api, ApiError } from './client'

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
 * `listDocuments` has no companyId in the interface but the backend route is company-scoped
 * (`GET /companies/{cid}/documents`), so the company is read from the staff session.
 * Imported lazily to avoid a data → features → data import cycle.
 */
const currentCompanyId = async (): Promise<Id> => {
  const { useAuth } = await import('@/features/auth/store')
  const cid = useAuth.getState().staff?.companyId
  if (!cid) throw new ApiError(401, 'unauthorized', 'Xodim sessiyasi topilmadi')
  return cid
}

export const ordersHttp: OrderRepository = {
  list: (companyId, q) =>
    api.get<Page<Order>>(`/companies/${companyId}/orders`, {
      query: {
        page: q.page,
        pageSize: q.pageSize,
        search: q.search,
        sortBy: q.sortBy,
        sortDir: q.sortDir,
        branchId: q.branchId,
        status: q.status,
        payment: q.payment,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        patientId: q.patientId,
      },
    }),

  get: (id) => api.get<{ order: Order; items: OrderItem[]; payments: Payment[] }>(`/orders/${id}`),

  create: (companyId, _employeeId, input) =>
    api.post<{ order: Order; items: OrderItem[] }>(`/companies/${companyId}/orders`, {
      patientId: input.patientId,
      branchId: input.branchId,
      serviceTypeIds: input.serviceTypeIds,
      note: input.note,
    }),

  addItems: (orderId, serviceTypeIds) =>
    api.post<{ order: Order; items: OrderItem[] }>(`/orders/${orderId}/items`, { serviceTypeIds }),

  removeItem: (orderId, itemId) =>
    api.delete<{ order: Order; items: OrderItem[] }>(`/orders/${orderId}/items/${itemId}`),

  pay: (_employeeId, input) =>
    api.post<{ order: Order; payments: Payment[] }>(`/orders/${input.orderId}/pay`, {
      amount: input.amount,
      method: input.method,
      sendSms: input.sendSms,
    }),

  cancel: (orderId, reason) => api.post<Order>(`/orders/${orderId}/cancel`, { reason }),

  /** `categoryIds` / `status` are repeated query keys (`status=a&status=b`). */
  worklist: (companyId, q) =>
    api.get<Page<WorklistRow>>(`/companies/${companyId}/worklist`, {
      query: {
        page: q.page,
        pageSize: q.pageSize,
        search: q.search,
        sortBy: q.sortBy,
        sortDir: q.sortDir,
        branchId: q.branchId,
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

  listDocuments: async (q) => {
    const companyId = await currentCompanyId()
    const docs = await api.get<ResultDocument[]>(`/companies/${companyId}/documents`, {
      query: { orderId: q.orderId, patientId: q.patientId },
    })
    return docs.map(withPdfUrl)
  },

  getDocument: async (id) => withPdfUrl(await api.get<ResultDocument>(`/documents/${id}`)),
}
