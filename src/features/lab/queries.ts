/** React-query hooks for lab / confirm workflows. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Category, Id, ItemStatus, ValueMap } from '@/domain'
import { repos } from '@/data'

export interface WorklistParams {
  branchId?: Id
  categoryIds?: Id[]
  status?: ItemStatus[]
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
}

export const labKeys = {
  worklist: (companyId: Id, p: WorklistParams) => ['worklist', companyId, p] as const,
  item: (id: Id) => ['item', id] as const,
  schema: (id: Id) => ['schema', id] as const,
  categories: (companyId: Id) => ['categories', companyId] as const,
  employee: (id: Id) => ['employee', id] as const,
}

export function useWorklist(companyId: Id, params: WorklistParams, opts?: { refetchInterval?: number; enabled?: boolean }) {
  return useQuery({
    queryKey: labKeys.worklist(companyId, params),
    queryFn: () => repos.orders.worklist(companyId, params),
    placeholderData: (prev) => prev,
    refetchInterval: opts?.refetchInterval,
    enabled: opts?.enabled ?? true,
  })
}

/** Status-tab counters in ONE request (replaces one worklist request per tab). */
export function useWorklistCounts(companyId: Id, params: Omit<WorklistParams, 'status' | 'page' | 'pageSize'>, opts?: { refetchInterval?: number; enabled?: boolean }) {
  return useQuery({
    queryKey: ['worklist-counts', companyId, params] as const,
    queryFn: () => repos.orders.worklistCounts(companyId, params),
    placeholderData: (prev) => prev,
    refetchInterval: opts?.refetchInterval,
    enabled: opts?.enabled ?? true,
  })
}

export const useItem = (itemId: Id | undefined) =>
  useQuery({ queryKey: labKeys.item(itemId ?? ''), queryFn: () => repos.orders.getItem(itemId!), enabled: !!itemId })

export const useSchema = (schemaId: Id | null | undefined) =>
  useQuery({ queryKey: labKeys.schema(schemaId ?? ''), queryFn: () => repos.catalog.getSchema(schemaId!), enabled: !!schemaId, staleTime: 5 * 60_000 })

/**
 * Lab categories visible to the current employee. Restricts to employee.categoryIds
 * (plus their subtree) when set. Returns top-level nodes with their allowed children.
 */
export function useLabCategories(companyId: Id, employeeId: Id) {
  return useQuery({
    queryKey: [...labKeys.categories(companyId), 'lab', employeeId],
    queryFn: async () => {
      const [cats, emp] = await Promise.all([
        repos.catalog.listCategories(companyId),
        repos.staff.getEmployee(employeeId).catch(() => null),
      ])
      const lab = cats.filter((c) => c.workflow === 'lab' && c.isActive)
      const byParent = new Map<Id | null, Category[]>()
      for (const c of lab) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c])
      const descendants = (id: Id): Id[] => [id, ...(byParent.get(id) ?? []).flatMap((c) => descendants(c.id))]
      const restricted = emp?.categoryIds?.length ? new Set(emp.categoryIds.flatMap(descendants)) : null
      const allowed = (id: Id) => !restricted || restricted.has(id)
      const colors: Record<Id, string | undefined> = {}
      const roots = (byParent.get(null) ?? []).map((root) => {
        const children = (byParent.get(root.id) ?? []).filter((c) => allowed(c.id) || descendants(c.id).some(allowed))
        const ids = descendants(root.id).filter(allowed)
        for (const id of descendants(root.id)) colors[id] = root.color
        for (const c of byParent.get(root.id) ?? []) for (const id of descendants(c.id)) colors[id] = c.color ?? root.color
        return { root, children, ids }
      }).filter((r) => r.ids.length > 0)
      return { roots, allIds: restricted ? [...restricted] : undefined, descendants, restricted: !!restricted, colors }
    },
    staleTime: 5 * 60_000,
  })
}

const invalidateItem = (qc: ReturnType<typeof useQueryClient>, itemId: Id) => {
  void qc.invalidateQueries({ queryKey: ['worklist'] })
  void qc.invalidateQueries({ queryKey: labKeys.item(itemId) })
  void qc.invalidateQueries({ queryKey: ['shell-badges'] })
  void qc.invalidateQueries({ queryKey: ['order'] })
}

export function useSaveValues(itemId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { employeeId: Id; values: ValueMap; labNote?: string }) => repos.orders.saveValues(itemId, p.employeeId, p.values, p.labNote),
    onSuccess: (item) => { qc.setQueryData(labKeys.item(itemId), item); invalidateItem(qc, itemId) },
  })
}
export function useSubmitItem(itemId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { employeeId: Id }) => repos.orders.submitItem(itemId, p.employeeId),
    onSuccess: (item) => { qc.setQueryData(labKeys.item(itemId), item); invalidateItem(qc, itemId) },
  })
}
export function useApproveItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { itemId: Id; employeeId: Id; templateId?: Id }) => repos.orders.approveItem(p.itemId, p.employeeId, p.templateId),
    onSuccess: (r) => { qc.setQueryData(labKeys.item(r.item.id), r.item); invalidateItem(qc, r.item.id) },
  })
}
export function useRejectItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { itemId: Id; employeeId: Id; reason: string }) => repos.orders.rejectItem(p.itemId, p.employeeId, p.reason),
    onSuccess: (item) => { qc.setQueryData(labKeys.item(item.id), item); invalidateItem(qc, item.id) },
  })
}

/** Item + its order + patient + schema — everything the entry / confirm views need. */
export function useItemContext(itemId: Id | undefined) {
  const item = useItem(itemId)
  const order = useQuery({ queryKey: ['order', item.data?.orderId], queryFn: () => repos.orders.get(item.data!.orderId), enabled: !!item.data?.orderId })
  const patient = useQuery({ queryKey: ['patient', order.data?.order.patientId], queryFn: () => repos.patients.get(order.data!.order.patientId), enabled: !!order.data?.order.patientId, staleTime: 60_000 })
  const schema = useSchema(item.data?.schemaId)
  return { item, order, patient, schema, loading: item.isLoading || (!!item.data?.schemaId && schema.isLoading) }
}
