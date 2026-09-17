/** HTTP PatientRepository — patients + public countries/regions/districts (`app/modules/patients`). */
import type { Country, District, Page, Patient, Region } from '@/domain'
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

  countries: () => api.get<Country[]>('/countries', { actor: 'none' }),

  regions: (countryId) => api.get<Region[]>('/regions', { actor: 'none', query: { countryId } }),

  districts: (regionId) => api.get<District[]>('/districts', { actor: 'none', query: { regionId } }),
}
