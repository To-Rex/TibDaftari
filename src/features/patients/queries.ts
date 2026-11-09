import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { repos } from '@/data'
import type { Id, PageQuery, PatientUpsertInput, PortalAccessInput } from '@/domain'
import { useStaffScope } from '@/features/auth/store'

/** Patient list params. `unitId` keeps the list inside one facility under the scope (the scope itself is usually the facility). */
export type PatientListParams = PageQuery & { tag?: string; unitId?: Id }

export const patientKeys = {
  all: ['patients'] as const,
  list: (scopeId: Id, q: PatientListParams) => ['patients', scopeId, q] as const,
  search: (scopeId: Id, q: string) => ['patients', 'search', scopeId, q] as const,
  detail: (id: Id) => ['patient', id] as const,
}

export const usePatientsList = (scopeId: Id, q: PatientListParams) =>
  useQuery({ queryKey: patientKeys.list(scopeId, q), queryFn: () => repos.patients.list(scopeId, q), placeholderData: (prev) => prev })

/** Identity search covers the whole country registry behind the scope (a patient of another facility must be found,
 *  not registered twice); the visit statistics in the results — and the ranking — are the scope facility's. */
export const usePatientSearch = (scopeId: Id, query: string, limit = 12) =>
  useQuery({
    queryKey: patientKeys.search(scopeId, query),
    queryFn: () => repos.patients.search(scopeId, query, limit),
    enabled: query.trim().length >= 2,
    placeholderData: (prev) => prev,
  })

/** One patient, with the visit statistics of the facility the staff app works in. */
export const usePatient = (id: Id | undefined) => {
  const { scopeId } = useStaffScope()
  return useQuery({ queryKey: [...patientKeys.detail(id ?? ''), scopeId], queryFn: () => repos.patients.get(id!, { unitId: scopeId || undefined }), enabled: !!id })
}

export const useCountries = () => useQuery({ queryKey: ['countries'], queryFn: () => repos.patients.countries(), staleTime: Infinity })
/** Regions of `countryId`; undefined → the platform default country (Uzbekistan), as patient forms expect. */
export const useRegions = (countryId?: Id, opts?: { enabled?: boolean }) =>
  useQuery({ queryKey: ['regions', countryId ?? ''], queryFn: () => repos.patients.regions(countryId || undefined), staleTime: Infinity, enabled: opts?.enabled ?? true })
export const useDistricts = (regionId?: Id, opts?: { enabled?: boolean }) =>
  useQuery({ queryKey: ['districts', regionId ?? ''], queryFn: () => repos.patients.districts(regionId || undefined), staleTime: Infinity, enabled: opts?.enabled ?? true })

/** A new patient is registered at `scopeId` — the facility the staff app works in (`registeredUnitId` omitted = that unit). */
export function useCreatePatient(scopeId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PatientUpsertInput) => repos.patients.create(scopeId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: patientKeys.all })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/** Issue / renew the portal login (the result carries the password — shown once) or switch it off. */
export function usePortalAccess(id: Id) {
  const qc = useQueryClient()
  const { scopeId } = useStaffScope()
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: patientKeys.all })
    void qc.invalidateQueries({ queryKey: patientKeys.detail(id) })
  }
  const set = useMutation({
    // the SMS goes out through the SMS account of the facility the staff app works in (or the one it inherits)
    mutationFn: (input: PortalAccessInput) => repos.patients.setPortalAccess(id, { ...input, unitId: input.unitId ?? (scopeId || undefined) }),
    onSuccess: refresh,
  })
  const remove = useMutation({ mutationFn: () => repos.patients.removePortalAccess(id), onSuccess: refresh })
  return { set, remove }
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
