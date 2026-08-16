import { useQuery } from '@tanstack/react-query'
import type { Id } from '@/domain'
import { repos } from '@/data'

export type BreakdownBy = 'category' | 'service' | 'branch' | 'employee'

export const useDashboard = (companyId: Id, q: { branchId?: Id; dateFrom: string; dateTo: string }) =>
  useQuery({ queryKey: ['reports', 'dashboard', companyId, q], queryFn: () => repos.reports.dashboard(companyId, q), placeholderData: (p) => p })

export const useBreakdown = (companyId: Id, q: { by: BreakdownBy; dateFrom: string; dateTo: string; branchId?: Id }) =>
  useQuery({ queryKey: ['reports', 'breakdown', companyId, q], queryFn: () => repos.reports.breakdown(companyId, q), placeholderData: (p) => p })
