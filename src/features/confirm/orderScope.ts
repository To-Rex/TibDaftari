/**
 * Order-scoped documents ("chek bo'yicha hujjat"): one template renders several
 * order items on a single sheet (e.g. hepatitis panel). Everything here is
 * data-driven — which template applies is decided by the template's own bindings.
 */
import { useMemo } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AttributeSchema, Id, OrderItem, ResultTemplate } from '@/domain'
import { repos } from '@/data'

/** Active order-scope templates that cover this item (by service type or category). */
export function useOrderScopeTemplates(companyId: Id, item: Pick<OrderItem, 'serviceTypeId' | 'categoryId'> | undefined) {
  return useQuery({
    queryKey: ['templates', companyId, 'order-scope', item?.serviceTypeId, item?.categoryId],
    queryFn: async () => {
      const all = await repos.templates.list(companyId, { status: 'active' })
      return all.filter((t) => t.scope === 'order' && (t.serviceTypeIds.includes(item!.serviceTypeId) || t.categoryIds.includes(item!.categoryId)))
    },
    enabled: !!item,
    staleTime: 60_000,
  })
}

/** Items of the order covered by the template + their schemas + service codes → ready for buildRenderContext. */
export function useOrderScopeItems(companyId: Id, orderId: Id | undefined, template: ResultTemplate | undefined) {
  const covered = useQuery({
    queryKey: ['order-scope-items', orderId, template?.id, template?.version],
    queryFn: () => repos.orders.orderScopeItems(orderId!, template!.id),
    enabled: !!orderId && !!template,
  })
  const services = useQuery({ queryKey: ['service-types', companyId, 'all'], queryFn: () => repos.catalog.listServiceTypes(companyId, {}), staleTime: 5 * 60_000 })
  const schemaIds = useMemo(() => [...new Set((covered.data ?? []).map((i) => i.schemaId).filter(Boolean) as string[])], [covered.data])
  const schemas = useQueries({ queries: schemaIds.map((id) => ({ queryKey: ['schema', id], queryFn: () => repos.catalog.getSchema(id), staleTime: 5 * 60_000 })) })
  const schemaMap = useMemo(() => {
    const m = new Map<string, AttributeSchema>()
    schemas.forEach((q) => { if (q.data) m.set(q.data.id, q.data) })
    return m
  }, [schemas])
  const items = useMemo(() => {
    const codes = new Map((services.data ?? []).map((s) => [s.id, s.code ?? s.id]))
    return (covered.data ?? []).map((item) => ({ item, schema: item.schemaId ? (schemaMap.get(item.schemaId) ?? null) : null, code: codes.get(item.serviceTypeId) ?? item.serviceTypeId }))
  }, [covered.data, schemaMap, services.data])
  const loading = covered.isLoading || services.isLoading || schemas.some((q) => q.isLoading)
  return { items, covered: covered.data ?? [], loading }
}

export function useApproveOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { orderId: Id; employeeId: Id; templateId: Id; itemIds?: Id[] }) => repos.orders.approveOrder(p.orderId, p.employeeId, p.templateId, p.itemIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['worklist'] })
      void qc.invalidateQueries({ queryKey: ['item'] })
      void qc.invalidateQueries({ queryKey: ['order'] })
      void qc.invalidateQueries({ queryKey: ['order-scope-items'] })
      void qc.invalidateQueries({ queryKey: ['shell-badges'] })
      void qc.invalidateQueries({ queryKey: ['document'] })
    },
  })
}
