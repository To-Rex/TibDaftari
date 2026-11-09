/**
 * Catalogue / template queries. Every list is scoped by `scopeId` — the organisation unit the page works in
 * (the administrator's unit for the admin panel, the facility for the staff app); the API returns the
 * catalogue of that unit's lineage. An optional `unitId` narrows to what one sub-unit uses.
 * Unit lists themselves come from `@/features/org/queries` (`useUnitTree`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { repos } from '@/data'
import type { AttributeSchema, Category, Id, ResultTemplate, ServiceType, TemplateAsset } from '@/domain'

export type ServiceTypeQuery = { categoryId?: Id; search?: string; activeOnly?: boolean; unitId?: Id }
export type TemplateQuery = { status?: string; serviceTypeId?: Id; unitId?: Id; search?: string }

export const catalogKeys = {
  categories: (scopeId: Id) => ['categories', scopeId] as const,
  serviceTypes: (scopeId: Id, q: ServiceTypeQuery) => ['serviceTypes', scopeId, q] as const,
  serviceType: (id: Id) => ['serviceType', id] as const,
  schemas: (scopeId: Id) => ['schemas', scopeId] as const,
  schema: (id: Id) => ['schema', id] as const,
  templates: (scopeId: Id, q: TemplateQuery) => ['templates', scopeId, q] as const,
  template: (id: Id) => ['template', id] as const,
  assets: (scopeId: Id) => ['templateAssets', scopeId] as const,
}

/* ------------------------------ queries ------------------------------ */

export const useCategories = (scopeId: Id) =>
  useQuery({ queryKey: catalogKeys.categories(scopeId), queryFn: () => repos.catalog.listCategories(scopeId), enabled: !!scopeId })

/** `q.unitId` = only what that unit offers, with `effectivePrice` / `available` filled in by the API. */
export const useServiceTypes = (scopeId: Id, q: ServiceTypeQuery, enabled = true) =>
  useQuery({ queryKey: catalogKeys.serviceTypes(scopeId, q), queryFn: () => repos.catalog.listServiceTypes(scopeId, q), enabled: enabled && !!scopeId, placeholderData: (p) => p })

export const useServiceType = (id: Id | null | undefined) =>
  useQuery({ queryKey: catalogKeys.serviceType(id ?? ''), queryFn: () => repos.catalog.getServiceType(id!), enabled: !!id })

export const useSchemas = (scopeId: Id) =>
  useQuery({ queryKey: catalogKeys.schemas(scopeId), queryFn: () => repos.catalog.listSchemas(scopeId), enabled: !!scopeId })

export const useSchema = (id: Id | null | undefined) =>
  useQuery({ queryKey: catalogKeys.schema(id ?? ''), queryFn: () => repos.catalog.getSchema(id!), enabled: !!id })

/** `q.unitId` = templates usable at that unit; without it everything managed from the scope. */
export const useTemplates = (scopeId: Id, q: TemplateQuery = {}) =>
  useQuery({ queryKey: catalogKeys.templates(scopeId, q), queryFn: () => repos.templates.list(scopeId, q), enabled: !!scopeId, placeholderData: (p) => p })

export const useTemplate = (id: Id | undefined) =>
  useQuery({ queryKey: catalogKeys.template(id ?? ''), queryFn: () => repos.templates.get(id!), enabled: !!id })

export const useTemplateAssets = (scopeId: Id) =>
  useQuery({ queryKey: catalogKeys.assets(scopeId), queryFn: () => repos.templates.listAssets(scopeId), enabled: !!scopeId })

/* ------------------------------ mutations ------------------------------ */

function useInvalidate() {
  const qc = useQueryClient()
  return (keys: readonly (readonly unknown[])[]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: k }))
}

export function useSaveCategory(scopeId: Id) {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<Category> & { id?: Id }) => repos.catalog.saveCategory({ ...input, scopeId }),
    onSuccess: () => inv([['categories']]),
  })
}
export function useDeleteCategory() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => repos.catalog.deleteCategory(id), onSuccess: () => inv([['categories']]) })
}
export function useSaveServiceType(scopeId: Id) {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<ServiceType> & { id?: Id }) => repos.catalog.saveServiceType({ ...input, scopeId }),
    onSuccess: () => inv([['serviceTypes'], ['serviceType'], ['schemas']]),
  })
}
export function useDeleteServiceType() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => repos.catalog.deleteServiceType(id), onSuccess: () => inv([['serviceTypes'], ['schemas']]) })
}
export function useSaveSchema(scopeId: Id) {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<AttributeSchema> & { id?: Id }) => repos.catalog.saveSchema({ ...input, scopeId }),
    onSuccess: () => inv([['schemas'], ['schema']]),
  })
}
export function usePublishSchema() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => repos.catalog.publishSchema(id), onSuccess: () => inv([['schemas'], ['schema']]) })
}
export function useSaveTemplate(scopeId: Id) {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<ResultTemplate> & { id?: Id }) => repos.templates.save({ ...input, scopeId }),
    onSuccess: () => inv([['templates'], ['template']]),
  })
}
export function useTemplateStatus() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: Id; status: ResultTemplate['status'] }) => repos.templates.setStatus(id, status),
    onSuccess: () => inv([['templates'], ['template']]),
  })
}
/** Draft copy of a template; `unitIds` binds the copy to the chosen units (a unit taking another unit's template). */
export function useDuplicateTemplate() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: ({ id, name, unitIds }: { id: Id; name?: string; unitIds?: Id[] }) => repos.templates.duplicate(id, { name, unitIds }), onSuccess: () => inv([['templates']]) })
}
/** The standard cheque as a new draft receipt template owned by the scope. */
export function useCreateDefaultReceipt(scopeId: Id) {
  const inv = useInvalidate()
  return useMutation({ mutationFn: (input: Parameters<typeof repos.templates.createDefaultReceipt>[1]) => repos.templates.createDefaultReceipt(scopeId, input), onSuccess: () => inv([['templates']]) })
}
export function useDeleteTemplate() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => repos.templates.delete(id), onSuccess: () => inv([['templates']]) })
}
export function useUploadAsset(scopeId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (asset: Parameters<typeof repos.templates.uploadAsset>[1]) => repos.templates.uploadAsset(scopeId, asset),
    // Put the new asset into the editor's cache immediately: the image element references it
    // before the background refetch finishes, otherwise the canvas shows the "image" placeholder.
    onSuccess: (asset) => {
      qc.setQueryData<TemplateAsset[]>(catalogKeys.assets(scopeId), (old) => [asset, ...(old ?? []).filter((a) => a.id !== asset.id)])
      void qc.invalidateQueries({ queryKey: catalogKeys.assets(scopeId) })
    },
  })
}
export function useDeleteAsset(scopeId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assetId: Id) => repos.templates.deleteAsset(scopeId, assetId),
    onSuccess: (_data, assetId) => {
      qc.setQueryData<TemplateAsset[]>(catalogKeys.assets(scopeId), (old) => (old ?? []).filter((a) => a.id !== assetId))
      void qc.invalidateQueries({ queryKey: catalogKeys.assets(scopeId) })
    },
  })
}
