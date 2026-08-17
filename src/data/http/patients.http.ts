/** HTTP PatientRepository — patients + public regions/districts (`app/modules/patients`). */
import type { District, Page, Patient, Region } from '@/domain'
import type { PatientRepository } from '../repositories'
import { api, compact } from './client'

export const patientsHttp: PatientRepository = {
  list: (companyId, q) => api.get<Page<Patient>>(`/companies/${companyId}/patients`, { query: { ...q } }),

  get: (id) => api.get<Patient>(`/patients/${id}`),

  search: (companyId, query, limit) =>
    api.get<Patient[]>(`/companies/${companyId}/patients/search`, { query: { q: query, limit } }),

  create: (companyId, input) => api.post<Patient>(`/companies/${companyId}/patients`, compact({ ...input })),

  update: (id, input) => api.put<Patient>(`/patients/${id}`, compact({ ...input })),

  /** Backend only reads the identity keys (phone / passportNumber / pinfl); extras are ignored. */
  findDuplicates: (companyId, input) => api.post<Patient[]>(`/companies/${companyId}/patients/duplicates`, compact({ ...input })),

  regions: () => api.get<Region[]>('/regions', { actor: 'none' }),

  districts: (regionId) => api.get<District[]>('/districts', { actor: 'none', query: { regionId } }),
}
