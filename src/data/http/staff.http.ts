/** HTTP StaffRepository — employees + roles (`app/modules/staff`). */
import type { Employee, Page, Role } from '@/domain'
import type { StaffRepository } from '../repositories'
import { api, compact } from './client'

export const staffHttp: StaffRepository = {
  listEmployees: (scopeId, q) => api.get<Page<Employee>>(`/units/${scopeId}/employees`, { query: { ...q } }),

  getEmployee: (id) => api.get<Employee>(`/employees/${id}`),

  /** `password` passes through (create: optional, update: reset); undefined keys are stripped. */
  saveEmployee: ({ id, scopeId, ...rest }) => {
    const body = compact(rest)
    return id ? api.put<Employee>(`/employees/${id}`, body) : api.post<Employee>(`/units/${scopeId}/employees`, body)
  },

  setOverrides: (id, overrides) => api.put<Employee>(`/employees/${id}/overrides`, overrides),

  listRoles: (scopeId) => api.get<Role[]>(`/units/${scopeId}/roles`),

  saveRole: ({ id, scopeId, ...rest }) => {
    const body = compact(rest)
    return id ? api.put<Role>(`/roles/${id}`, body) : api.post<Role>(`/units/${scopeId}/roles`, body)
  },

  deleteRole: (id) => api.delete<void>(`/roles/${id}`),
}
