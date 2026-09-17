import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { repos } from '@/data'
import type { Id, PageQuery, PatientUpsertInput } from '@/domain'

export type PatientListParams = PageQuery & { tag?: string }

export const patientKeys = {
  all: ['patients'] as const,
  list: (companyId: Id, q: PatientListParams) => ['patients', companyId, q] as const,
  search: (companyId: Id, q: string) => ['patients', 'search', companyId, q] as const,
  detail: (id: Id) => ['patient', id] as const,
}

export const usePatientsList = (companyId: Id, q: PatientListParams) =>
  useQuery({ queryKey: patientKeys.list(companyId, q), queryFn: () => repos.patients.list(companyId, q), placeholderData: (prev) => prev })

export const usePatientSearch = (companyId: Id, query: string, limit = 12) =>
  useQuery({
    queryKey: patientKeys.search(companyId, query),
    queryFn: () => repos.patients.search(companyId, query, limit),
    enabled: query.trim().length >= 2,
    placeholderData: (prev) => prev,
  })

export const usePatient = (id: Id | undefined) =>
  useQuery({ queryKey: patientKeys.detail(id ?? ''), queryFn: () => repos.patients.get(id!), enabled: !!id })

export const useCountries = () => useQuery({ queryKey: ['countries'], queryFn: () => repos.patients.countries(), staleTime: Infinity })
/** Regions of `countryId`; undefined → the platform default country (Uzbekistan), as patient forms expect. */
export const useRegions = (countryId?: Id, opts?: { enabled?: boolean }) =>
  useQuery({ queryKey: ['regions', countryId ?? ''], queryFn: () => repos.patients.regions(countryId || undefined), staleTime: Infinity, enabled: opts?.enabled ?? true })
export const useDistricts = (regionId?: Id, opts?: { enabled?: boolean }) =>
  useQuery({ queryKey: ['districts', regionId ?? ''], queryFn: () => repos.patients.districts(regionId || undefined), staleTime: Infinity, enabled: opts?.enabled ?? true })

export function useCreatePatient(companyId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PatientUpsertInput) => repos.patients.create(companyId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientKeys.all })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdatePatient(id: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<PatientUpsertInput>) => repos.patients.update(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientKeys.all })
      void qc.invalidateQueries({ queryKey: patientKeys.detail(id) })
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
