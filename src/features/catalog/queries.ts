import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { repos } from '@/data'
import type { AttributeSchema, Category, Id, ResultTemplate, ServiceType } from '@/domain'

export const catalogKeys = {
  categories: (companyId: Id) => ['categories', companyId] as const,
  serviceTypes: (companyId: Id, q: { categoryId?: Id; search?: string }) => ['serviceTypes', companyId, q] as const,
  serviceType: (id: Id) => ['serviceType', id] as const,
  schemas: (companyId: Id) => ['schemas', companyId] as const,
  schema: (id: Id) => ['schema', id] as const,
  branches: (companyId: Id) => ['branches', companyId] as const,
  templates: (companyId: Id, q: { status?: string; serviceTypeId?: Id; search?: string }) => ['templates', companyId, q] as const,
  template: (id: Id) => ['template', id] as const,
  assets: (companyId: Id) => ['templateAssets', companyId] as const,
}

/* ------------------------------ queries ------------------------------ */

export const useCategories = (companyId: Id) =>
  useQuery({ queryKey: catalogKeys.categories(companyId), queryFn: () => repos.catalog.listCategories(companyId) })

export const useServiceTypes = (companyId: Id, q: { categoryId?: Id; search?: string }, enabled = true) =>
  useQuery({ queryKey: catalogKeys.serviceTypes(companyId, q), queryFn: () => repos.catalog.listServiceTypes(companyId, q), enabled, placeholderData: (p) => p })

export const useServiceType = (id: Id | null | undefined) =>
  useQuery({ queryKey: catalogKeys.serviceType(id ?? ''), queryFn: () => repos.catalog.getServiceType(id!), enabled: !!id })

export const useSchemas = (companyId: Id) =>
  useQuery({ queryKey: catalogKeys.schemas(companyId), queryFn: () => repos.catalog.listSchemas(companyId) })

export const useSchema = (id: Id | null | undefined) =>
  useQuery({ queryKey: catalogKeys.schema(id ?? ''), queryFn: () => repos.catalog.getSchema(id!), enabled: !!id })

export const useBranches = (companyId: Id) =>
  useQuery({ queryKey: catalogKeys.branches(companyId), queryFn: () => repos.tenant.listBranches(companyId) })

export const useTemplates = (companyId: Id, q: { status?: string; serviceTypeId?: Id; search?: string } = {}) =>
  useQuery({ queryKey: catalogKeys.templates(companyId, q), queryFn: () => repos.templates.list(companyId, q), placeholderData: (p) => p })

export const useTemplate = (id: Id | undefined) =>
  useQuery({ queryKey: catalogKeys.template(id ?? ''), queryFn: () => repos.templates.get(id!), enabled: !!id })

export const useTemplateAssets = (companyId: Id) =>
  useQuery({ queryKey: catalogKeys.assets(companyId), queryFn: () => repos.templates.listAssets(companyId) })

/* ------------------------------ mutations ------------------------------ */

function useInvalidate() {
  const qc = useQueryClient()
  return (keys: readonly (readonly unknown[])[]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: k }))
}

export function useSaveCategory(companyId: Id) {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<Category> & { id?: Id }) => repos.catalog.saveCategory({ ...input, companyId }),
    onSuccess: () => inv([['categories']]),
  })
}
export function useDeleteCategory() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => repos.catalog.deleteCategory(id), onSuccess: () => inv([['categories']]) })
}
export function useSaveServiceType(companyId: Id) {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<ServiceType> & { id?: Id }) => repos.catalog.saveServiceType({ ...input, companyId }),
    onSuccess: () => inv([['serviceTypes'], ['serviceType'], ['schemas']]),
  })
}
export function useDeleteServiceType() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => repos.catalog.deleteServiceType(id), onSuccess: () => inv([['serviceTypes'], ['schemas']]) })
}
export function useSaveSchema(companyId: Id) {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<AttributeSchema> & { id?: Id }) => repos.catalog.saveSchema({ ...input, companyId }),
    onSuccess: () => inv([['schemas'], ['schema']]),
  })
}
export function usePublishSchema() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => repos.catalog.publishSchema(id), onSuccess: () => inv([['schemas'], ['schema']]) })
}
export function useSaveTemplate(companyId: Id) {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<ResultTemplate> & { id?: Id }) => repos.templates.save({ ...input, companyId }),
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
export function useDuplicateTemplate() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => repos.templates.duplicate(id), onSuccess: () => inv([['templates']]) })
}
export function useDeleteTemplate() {
  const inv = useInvalidate()
  return useMutation({ mutationFn: (id: Id) => repos.templates.delete(id), onSuccess: () => inv([['templates']]) })
}
export function useUploadAsset(companyId: Id) {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (asset: Parameters<typeof repos.templates.uploadAsset>[1]) => repos.templates.uploadAsset(companyId, asset),
    onSuccess: () => inv([['templateAssets']]),
  })
}
