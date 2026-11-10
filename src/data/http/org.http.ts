/** HTTP OrgRepository — the organisation tree (`app/modules/units`). */
import type { OrgUnit, QuickStartPreview, QuickStartResult, ResetPreview, ResetResult, SmsTestResult, UnitSms, UnitSmsTemplates } from '@/domain'
import type { OrgRepository } from '../repositories'
import { api, compact } from './client'

export const orgHttp: OrgRepository = {
  tree: (q) => api.get<OrgUnit[]>('/units/tree', { query: { countryId: q?.countryId, rootId: q?.rootId, includeInactive: q?.includeInactive } }),

  get: (id) => api.get<OrgUnit>(`/units/${id}`),

  create: (input) => api.post<OrgUnit>('/units', compact({ ...input })),

  /** PUT is a partial merge on the backend (undefined keys stripped). */
  update: (id, input) => api.put<OrgUnit>(`/units/${id}`, compact({ ...input })),

  getSms: (unitId) => api.get<UnitSms>(`/units/${unitId}/sms`),

  saveSms: (unitId, input) => api.put<UnitSms>(`/units/${unitId}/sms`, compact({ ...input })),

  testSms: (unitId, to) => api.post<SmsTestResult>(`/units/${unitId}/sms/test`, to ? { to } : {}),

  getSmsTemplates: (unitId) => api.get<UnitSmsTemplates>(`/units/${unitId}/sms-templates`),

  saveSmsTemplates: (unitId, { templates, applyToAll }) =>
    api.put<UnitSmsTemplates>(`/units/${unitId}/sms-templates`, { templates, applyToAll: !!applyToAll }),

  setTelegram: (unitId, botToken) => api.put<OrgUnit>(`/units/${unitId}/telegram`, { botToken }),

  resetPreview: (unitId) => api.get<ResetPreview>(`/units/${unitId}/reset`),

  reset: (unitId, input) => api.post<ResetResult>(`/units/${unitId}/reset`, input),

  quickStartPreview: (parentId, q) => api.get<QuickStartPreview>(`/units/${parentId}/quick-start`, { query: { regionId: q?.regionId, districtId: q?.districtId } }),

  quickStart: (parentId, input) => api.post<QuickStartResult>(`/units/${parentId}/quick-start`, compact({ ...input })),
}
