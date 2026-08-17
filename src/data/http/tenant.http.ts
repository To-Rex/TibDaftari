/** HTTP TenantRepository — companies + branches (`app/modules/tenant`). */
import type { Branch, Company, Page } from '@/domain'
import type { TenantRepository } from '../repositories'
import { api, compact } from './client'

export const tenantHttp: TenantRepository = {
  listCompanies: (q) => api.get<Page<Company>>('/companies', { query: { ...q } }),

  getCompany: (id) => api.get<Company>(`/companies/${id}`),

  /**
   * PUT is a partial merge on the backend; `sms` (incl. write-only `apiKey`) is replaced wholesale,
   * so the partial is forwarded as-is (undefined keys stripped).
   */
  saveCompany: ({ id, ...rest }) => {
    const body = compact(rest)
    return id ? api.put<Company>(`/companies/${id}`, body) : api.post<Company>('/companies', body)
  },

  listBranches: (companyId) => api.get<Branch[]>(`/companies/${companyId}/branches`),

  saveBranch: ({ id, companyId, ...rest }) => {
    const body = compact(rest)
    return id ? api.put<Branch>(`/branches/${id}`, body) : api.post<Branch>(`/companies/${companyId}/branches`, body)
  },
}
