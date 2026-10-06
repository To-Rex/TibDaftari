/**
 * HTTP ReportRepository — dashboard summary, revenue breakdown and the patient reports (patients / results / services).
 * Wire contract: TibDaftari-Backend `app/modules/reports` (router.py / schemas.py).
 * Dates are `YYYY-MM-DD` calendar days (Asia/Tashkent), inclusive.
 */
import type { DashboardSummary, Page, PatientReport, ResultRow, ResultsReport, ServicesReport } from '@/domain'
import type { ReportRepository } from '@/data/repositories'
import { api } from './client'

type BreakdownRow = { name: string; count: number; revenue: number }

export const reportsHttp: ReportRepository = {
  dashboard: (companyId, q) =>
    api.get<DashboardSummary>(`/companies/${companyId}/reports/dashboard`, {
      query: { branchId: q.branchId, dateFrom: q.dateFrom, dateTo: q.dateTo },
    }),

  breakdown: (companyId, q) =>
    api.get<BreakdownRow[]>(`/companies/${companyId}/reports/breakdown`, {
      query: { by: q.by, dateFrom: q.dateFrom, dateTo: q.dateTo, branchId: q.branchId },
    }),

  patients: (companyId, q) =>
    api.get<PatientReport>(`/companies/${companyId}/reports/patients`, { query: { branchId: q.branchId, dateFrom: q.dateFrom, dateTo: q.dateTo } }),

  results: (companyId, q) =>
    api.get<ResultsReport>(`/companies/${companyId}/reports/results`, { query: { branchId: q.branchId, dateFrom: q.dateFrom, dateTo: q.dateTo } }),

  resultList: (companyId, q) =>
    api.get<Page<ResultRow>>(`/companies/${companyId}/reports/results/list`, {
      query: { branchId: q.branchId, dateFrom: q.dateFrom, dateTo: q.dateTo, status: q.status, page: q.page, pageSize: q.pageSize, search: q.search || undefined },
    }),

  services: (companyId, q) =>
    api.get<ServicesReport>(`/companies/${companyId}/reports/services`, { query: { branchId: q.branchId, dateFrom: q.dateFrom, dateTo: q.dateTo } }),
}
