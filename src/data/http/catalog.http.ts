/**
 * HTTP CatalogRepository — categories, service types, attribute schemas.
 * Wire contract: TibDaftari-Backend `app/modules/catalog` (router.py / schemas.py).
 * Backend DTOs are camelCase and match `@/domain/catalog` 1:1; audit stamps
 * (id, companyId, createdAt, updatedAt) and server-computed fields (stats, usedBy)
 * are stripped from write payloads (the API ignores extras anyway).
 */
import type { AttributeSchema, Category, Id, ServiceType } from '@/domain'
import type { CatalogRepository } from '@/data/repositories'
import { api, compact } from './client'

/** Drop identity/audit keys so PUT/POST bodies carry only editable fields. */
const writable = <T extends { id?: Id; companyId?: Id; createdAt?: string; updatedAt?: string }>(input: T) => {
  const { id: _id, companyId: _cid, createdAt: _c, updatedAt: _u, ...rest } = input
  return compact(rest as Record<string, unknown>)
}

export const catalogHttp: CatalogRepository = {
  listCategories: (companyId) => api.get<Category[]>(`/companies/${companyId}/categories`),

  saveCategory: (input) =>
    input.id
      ? api.put<Category>(`/categories/${input.id}`, writable(input))
      : api.post<Category>(`/companies/${input.companyId}/categories`, writable(input)),

  deleteCategory: (id) => api.delete<void>(`/categories/${id}`),

  listServiceTypes: (companyId, q) =>
    api.get<ServiceType[]>(`/companies/${companyId}/service-types`, {
      query: { categoryId: q?.categoryId, search: q?.search, activeOnly: q?.activeOnly },
    }),

  getServiceType: (id) => api.get<ServiceType>(`/service-types/${id}`),

  saveServiceType: (input) => {
    const { stats: _stats, ...rest } = input
    return input.id
      ? api.put<ServiceType>(`/service-types/${input.id}`, writable(rest))
      : api.post<ServiceType>(`/companies/${input.companyId}/service-types`, writable(rest))
  },

  deleteServiceType: (id) => api.delete<void>(`/service-types/${id}`),

  listSchemas: (companyId) => api.get<AttributeSchema[]>(`/companies/${companyId}/schemas`),

  getSchema: (id) => api.get<AttributeSchema>(`/schemas/${id}`),

  /**
   * Only name/description/fields are writable; version/status are server-managed
   * (PUT bumps the version of a published schema when fields change; use publishSchema for status).
   */
  saveSchema: (input) => {
    const body = compact({ name: input.name, description: input.description, fields: input.fields })
    return input.id
      ? api.put<AttributeSchema>(`/schemas/${input.id}`, body)
      : api.post<AttributeSchema>(`/companies/${input.companyId}/schemas`, body)
  },

  publishSchema: (id) => api.post<AttributeSchema>(`/schemas/${id}/publish`),
}
