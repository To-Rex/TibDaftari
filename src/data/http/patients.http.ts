/** HTTP PatientRepository — patients + public countries/regions/districts (`app/modules/patients`). */
import type { Country, District, Page, Patient, PortalAccessResult, Region } from '@/domain'
import type { PatientRepository } from '../repositories'
import { api, compact } from './client'

export const patientsHttp: PatientRepository = {
  list: (scopeId, q) => api.get<Page<Patient>>(`/units/${scopeId}/patients`, { query: { ...q } }),

  get: (id, q) => api.get<Patient>(`/patients/${id}`, { query: { unitId: q?.unitId } }),

  search: (scopeId, query, limit, unitId) =>
    api.get<Patient[]>(`/units/${scopeId}/patients/search`, { query: { q: query, limit, unitId } }),

  create: (scopeId, input) => api.post<Patient>(`/units/${scopeId}/patients`, compact({ ...input })),

  update: (id, input) => api.put<Patient>(`/patients/${id}`, compact({ ...input })),

  /** Backend only reads the identity keys (phone / passportNumber / pinfl); extras are ignored. */
  findDuplicates: (scopeId, input) => api.post<Patient[]>(`/units/${scopeId}/patients/duplicates`, compact({ ...input })),

  setPortalAccess: (id, input) => api.put<PortalAccessResult>(`/patients/${id}/portal-access`, compact({ ...input })),

  removePortalAccess: (id) => api.delete<Patient>(`/patients/${id}/portal-access`),

  countries: () => api.get<Country[]>('/countries', { actor: 'none' }),

  regions: (countryId) => api.get<Region[]>('/regions', { actor: 'none', query: { countryId } }),

  districts: (regionId) => api.get<District[]>('/districts', { actor: 'none', query: { regionId } }),
}
