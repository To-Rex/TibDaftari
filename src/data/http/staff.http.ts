/** HTTP StaffRepository — employees + roles (`app/modules/staff`). */
import type { Employee, Page, Role } from '@/domain'
import type { StaffRepository } from '../repositories'
import { api, compact } from './client'

export const staffHttp: StaffRepository = {
  listEmployees: (companyId, q) => api.get<Page<Employee>>(`/companies/${companyId}/employees`, { query: { ...q } }),

  getEmployee: (id) => api.get<Employee>(`/employees/${id}`),

  /** `password` passes through (create: optional, update: reset); undefined keys are stripped. */
  saveEmployee: ({ id, companyId, ...rest }) => {
    const body = compact(rest)
    return id ? api.put<Employee>(`/employees/${id}`, body) : api.post<Employee>(`/companies/${companyId}/employees`, body)
  },

  setOverrides: (id, overrides) => api.put<Employee>(`/employees/${id}/overrides`, overrides),

  listRoles: (companyId) => api.get<Role[]>(`/companies/${companyId}/roles`),

  saveRole: ({ id, companyId, ...rest }) => {
    const body = compact(rest)
    return id ? api.put<Role>(`/roles/${id}`, body) : api.post<Role>(`/companies/${companyId}/roles`, body)
  },

  deleteRole: (id) => api.delete<void>(`/roles/${id}`),
}
