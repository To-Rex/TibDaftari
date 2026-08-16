import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { repos } from '@/data'
import type { CreateOrderInput, Id, PageQuery, PayOrderInput } from '@/domain'

export type OrderListParams = PageQuery & { branchId?: Id; status?: string; payment?: string; dateFrom?: string; dateTo?: string; patientId?: Id }

export const orderKeys = {
  all: ['orders'] as const,
  list: (companyId: Id, q: OrderListParams) => ['orders', companyId, q] as const,
  detail: (id: Id) => ['order', id] as const,
  documents: (q: { orderId?: Id; patientId?: Id }) => ['documents', q] as const,
}

export const useOrdersList = (companyId: Id, q: OrderListParams, enabled = true) =>
  useQuery({ queryKey: orderKeys.list(companyId, q), queryFn: () => repos.orders.list(companyId, q), enabled, placeholderData: (prev) => prev })

export const useOrder = (id: Id | undefined) =>
  useQuery({ queryKey: orderKeys.detail(id ?? ''), queryFn: () => repos.orders.get(id!), enabled: !!id })

export const useDocuments = (q: { orderId?: Id; patientId?: Id }, enabled = true) =>
  useQuery({ queryKey: orderKeys.documents(q), queryFn: () => repos.orders.listDocuments(q), enabled })

/** Invalidate everything an order mutation may have touched. */
function useInvalidateOrders() {
  const qc = useQueryClient()
  return (orderId?: Id) => {
    void qc.invalidateQueries({ queryKey: orderKeys.all })
    void qc.invalidateQueries({ queryKey: ['patients'] })
    void qc.invalidateQueries({ queryKey: ['patient'] })
    void qc.invalidateQueries({ queryKey: ['dashboard'] })
    void qc.invalidateQueries({ queryKey: ['shell-badges'] })
    if (orderId) void qc.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
  }
}

export function useCreateOrder(companyId: Id, employeeId: Id) {
  const inv = useInvalidateOrders()
  return useMutation({
    mutationFn: (input: CreateOrderInput) => repos.orders.create(companyId, employeeId, input),
    onSuccess: (r) => inv(r.order.id),
  })
}

export function useAddItems(orderId: Id) {
  const inv = useInvalidateOrders()
  return useMutation({ mutationFn: (serviceTypeIds: Id[]) => repos.orders.addItems(orderId, serviceTypeIds), onSuccess: () => inv(orderId) })
}

export function useRemoveItem(orderId: Id) {
  const inv = useInvalidateOrders()
  return useMutation({ mutationFn: (itemId: Id) => repos.orders.removeItem(orderId, itemId), onSuccess: () => inv(orderId) })
}

export function usePayOrder(employeeId: Id) {
  const inv = useInvalidateOrders()
  return useMutation({ mutationFn: (input: PayOrderInput) => repos.orders.pay(employeeId, input), onSuccess: (r) => inv(r.order.id) })
}

export function useCancelOrder(orderId: Id) {
  const inv = useInvalidateOrders()
  return useMutation({ mutationFn: (reason: string) => repos.orders.cancel(orderId, reason), onSuccess: () => inv(orderId) })
}
