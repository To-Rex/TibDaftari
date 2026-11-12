/** Report queries. `scopeId` = the unit the page reports on; `unitId` narrows a wider scope to one facility. */
import { useQuery } from '@tanstack/react-query'
import type { Id, ResultListStatus } from '@/domain'
import type { ReportRange } from '@/data/repositories'
import { repos } from '@/data'

export type BreakdownBy = 'category' | 'service' | 'unit' | 'employee'

export const useDashboard = (scopeId: Id, q: ReportRange) =>
  useQuery({ queryKey: ['reports', 'dashboard', scopeId, q], queryFn: () => repos.reports.dashboard(scopeId, q), placeholderData: (p) => p })

export const useBreakdown = (scopeId: Id, q: { by: BreakdownBy } & ReportRange) =>
  useQuery({ queryKey: ['reports', 'breakdown', scopeId, q], queryFn: () => repos.reports.breakdown(scopeId, q), placeholderData: (p) => p })

export const usePatientReport = (scopeId: Id, q: ReportRange) =>
  useQuery({ queryKey: ['reports', 'patients', scopeId, q], queryFn: () => repos.reports.patients(scopeId, q), placeholderData: (p) => p })

export const useResultsReport = (scopeId: Id, q: ReportRange) =>
  useQuery({ queryKey: ['reports', 'results', scopeId, q], queryFn: () => repos.reports.results(scopeId, q), placeholderData: (p) => p })

export const useResultList = (scopeId: Id, q: ReportRange & { status: ResultListStatus; page: number; pageSize: number; search?: string }) =>
  useQuery({ queryKey: ['reports', 'result-list', scopeId, q], queryFn: () => repos.reports.resultList(scopeId, q), placeholderData: (p) => p })

export const useServicesReport = (scopeId: Id, q: ReportRange) =>
  useQuery({ queryKey: ['reports', 'services', scopeId, q], queryFn: () => repos.reports.services(scopeId, q), placeholderData: (p) => p })

export const useSmsReport = (scopeId: Id, q: ReportRange) =>
  useQuery({ queryKey: ['reports', 'sms', scopeId, q], queryFn: () => repos.reports.sms(scopeId, q), placeholderData: (p) => p })
