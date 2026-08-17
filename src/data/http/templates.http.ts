/**
 * HTTP TemplateRepository — result templates and template assets.
 * Wire contract: TibDaftari-Backend `app/modules/templates` (router.py / schemas.py).
 * Asset `url` comes back as a relative `/api/v1/files/{id}` path and is absolutised here.
 */
import type { Id, ResultTemplate, TemplateAsset } from '@/domain'
import type { TemplateRepository } from '@/data/repositories'
import { absoluteUrl, api, compact } from './client'

/** Editable template fields (`status` is only accepted on create; updates go through setStatus). */
const templateBody = (input: Partial<ResultTemplate>, withStatus: boolean) =>
  compact({
    name: input.name,
    description: input.description,
    serviceTypeIds: input.serviceTypeIds,
    categoryIds: input.categoryIds,
    scope: input.scope,
    language: input.language,
    doc: input.doc,
    thumbnailUrl: input.thumbnailUrl,
    status: withStatus ? input.status : undefined,
  })

const withAbsoluteUrl = (a: TemplateAsset): TemplateAsset => ({ ...a, url: absoluteUrl(a.url) ?? a.url })

export const templatesHttp: TemplateRepository = {
  list: (companyId, q) =>
    api.get<ResultTemplate[]>(`/companies/${companyId}/templates`, {
      query: { status: q?.status, serviceTypeId: q?.serviceTypeId, search: q?.search },
    }),

  get: (id) => api.get<ResultTemplate>(`/templates/${id}`),

  save: (input) =>
    input.id
      ? api.put<ResultTemplate>(`/templates/${input.id}`, templateBody(input, false))
      : api.post<ResultTemplate>(`/companies/${input.companyId}/templates`, templateBody(input, true)),

  setStatus: (id, status) => api.post<ResultTemplate>(`/templates/${id}/status`, { status }),

  duplicate: (id) => api.post<ResultTemplate>(`/templates/${id}/duplicate`),

  delete: (id) => api.delete<void>(`/templates/${id}`),

  listAssets: async (companyId: Id) => (await api.get<TemplateAsset[]>(`/companies/${companyId}/assets`)).map(withAbsoluteUrl),

  /** `asset.url` is a data URL; the API stores it as a file and returns `/api/v1/files/{id}`. */
  uploadAsset: async (companyId, asset) => {
    const body = compact({ kind: asset.kind, name: asset.name, url: asset.url, width: asset.width, height: asset.height, employeeId: asset.employeeId })
    return withAbsoluteUrl(await api.post<TemplateAsset>(`/companies/${companyId}/assets`, body))
  },
}
