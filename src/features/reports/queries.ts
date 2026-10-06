import { useQuery } from '@tanstack/react-query'
import type { Id, ResultListStatus } from '@/domain'
import { repos } from '@/data'

export type BreakdownBy = 'category' | 'service' | 'branch' | 'employee'

export const useDashboard = (companyId: Id, q: { branchId?: Id; dateFrom: string; dateTo: string }) =>
  useQuery({ queryKey: ['reports', 'dashboard', companyId, q], queryFn: () => repos.reports.dashboard(companyId, q), placeholderData: (p) => p })

export const useBreakdown = (companyId: Id, q: { by: BreakdownBy; dateFrom: string; dateTo: string; branchId?: Id }) =>
  useQuery({ queryKey: ['reports', 'breakdown', companyId, q], queryFn: () => repos.reports.breakdown(companyId, q), placeholderData: (p) => p })

type Range = { branchId?: Id; dateFrom: string; dateTo: string }

export const usePatientReport = (companyId: Id, q: Range) =>
  useQuery({ queryKey: ['reports', 'patients', companyId, q], queryFn: () => repos.reports.patients(companyId, q), placeholderData: (p) => p })

export const useResultsReport = (companyId: Id, q: Range) =>
  useQuery({ queryKey: ['reports', 'results', companyId, q], queryFn: () => repos.reports.results(companyId, q), placeholderData: (p) => p })

export const useResultList = (companyId: Id, q: Range & { status: ResultListStatus; page: number; pageSize: number; search?: string }) =>
  useQuery({ queryKey: ['reports', 'result-list', companyId, q], queryFn: () => repos.reports.resultList(companyId, q), placeholderData: (p) => p })

export const useServicesReport = (companyId: Id, q: Range) =>
  useQuery({ queryKey: ['reports', 'services', companyId, q], queryFn: () => repos.reports.services(companyId, q), placeholderData: (p) => p })
