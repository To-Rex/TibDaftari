/**
 * HTTP ReportRepository — dashboard summary, revenue breakdown and the patient reports (patients / results / services).
 * Wire contract: TibDaftari-Backend `app/modules/reports` (router.py / schemas.py).
 * Dates are `YYYY-MM-DD` calendar days (local time), inclusive.
 */
import type { DashboardSummary, Page, PatientReport, ResultRow, ResultsReport, ServicesReport } from '@/domain'
import type { ReportRepository } from '@/data/repositories'
import { api } from './client'

type BreakdownRow = { name: string; count: number; revenue: number }

export const reportsHttp: ReportRepository = {
  dashboard: (scopeId, q) =>
    api.get<DashboardSummary>(`/units/${scopeId}/reports/dashboard`, {
      query: { unitId: q.unitId, dateFrom: q.dateFrom, dateTo: q.dateTo },
    }),

  breakdown: (scopeId, q) =>
    api.get<BreakdownRow[]>(`/units/${scopeId}/reports/breakdown`, {
      query: { by: q.by, dateFrom: q.dateFrom, dateTo: q.dateTo, unitId: q.unitId },
    }),

  patients: (scopeId, q) =>
    api.get<PatientReport>(`/units/${scopeId}/reports/patients`, { query: { unitId: q.unitId, dateFrom: q.dateFrom, dateTo: q.dateTo } }),

  results: (scopeId, q) =>
    api.get<ResultsReport>(`/units/${scopeId}/reports/results`, { query: { unitId: q.unitId, dateFrom: q.dateFrom, dateTo: q.dateTo } }),

  resultList: (scopeId, q) =>
    api.get<Page<ResultRow>>(`/units/${scopeId}/reports/results/list`, {
      query: { unitId: q.unitId, dateFrom: q.dateFrom, dateTo: q.dateTo, status: q.status, page: q.page, pageSize: q.pageSize, search: q.search || undefined },
    }),

  services: (scopeId, q) =>
    api.get<ServicesReport>(`/units/${scopeId}/reports/services`, { query: { unitId: q.unitId, dateFrom: q.dateFrom, dateTo: q.dateTo } }),

  exportXlsx: (scopeId, q) =>
    api.get<Blob>(`/units/${scopeId}/reports/export.xlsx`, {
      query: { unitId: q.unitId, dateFrom: q.dateFrom, dateTo: q.dateTo, lang: q.lang },
      blob: true,
    }),
}
