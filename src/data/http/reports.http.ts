/**
 * HTTP ReportRepository — dashboard summary and revenue breakdown.
 * Wire contract: TibDaftari-Backend `app/modules/reports` (router.py / schemas.py).
 * Dates are `YYYY-MM-DD` calendar days (Asia/Tashkent), inclusive.
 */
import type { DashboardSummary } from '@/domain'
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
}
