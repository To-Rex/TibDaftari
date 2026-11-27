import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Employee, Id, PageQuery, PermissionOverrides, TrainingOverviewQuery } from '@/domain'
import { repos } from '@/data'

/** `unitId` narrows the list to one sub-unit of the scope (the employee's home unit). */
export type EmployeeQuery = PageQuery & { unitId?: Id; roleId?: Id; status?: string }

export const employeeKeys = {
  all: ['employees'] as const,
  list: (scopeId: Id, q: EmployeeQuery) => ['employees', scopeId, q] as const,
  one: (id: Id) => ['employee', id] as const,
}

/** Employees under `scopeId` (the administered unit and everything below it). */
export const useEmployees = (scopeId: Id, q: EmployeeQuery, enabled = true) =>
  useQuery({
    queryKey: employeeKeys.list(scopeId, q),
    queryFn: () => repos.staff.listEmployees(scopeId, q),
    placeholderData: (prev) => prev,
    enabled: enabled && !!scopeId,
  })

export const useEmployee = (id: Id) =>
  useQuery({ queryKey: employeeKeys.one(id), queryFn: () => repos.staff.getEmployee(id), enabled: !!id })

/** Create under `scopeId` (the home unit defaults to it) or update by `id`. */
export function useSaveEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<Employee> & { scopeId: Id; id?: Id; password?: string }) => repos.staff.saveEmployee(input),
    onSuccess: (e, input) => {
      qc.setQueryData(employeeKeys.one(e.id), e)
      void qc.invalidateQueries({ queryKey: ['employees', input.scopeId] })
      // the roles page shows employees per role; the tree carries employee counts per unit
      void qc.invalidateQueries({ queryKey: ['roles', input.scopeId] })
      void qc.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

/** The overview of everyone's training (`modules/admin/training`): one list, narrowed by state, unit and search. */
export const trainingOverviewKey = ['training-overview'] as const
export function useTrainingOverview(q: TrainingOverviewQuery) {
  return useQuery({ queryKey: [...trainingOverviewKey, q], queryFn: () => repos.training.overview(q), placeholderData: keepPreviousData, refetchInterval: 60_000 })
}

/** A manager's two decisions about a colleague's training: let them through (`skip`) or send them (back) to it
 *  (`reset` — the whole plan of their role, or only the tasks named). */
export function useEmployeeTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, tasks }: { id: Id; action: 'skip' | 'reset'; /** `reset` only: the tasks to practise (none = the whole plan) */ tasks?: string[] }) =>
      (action === 'skip' ? repos.staff.skipTraining(id) : repos.staff.resetTraining(id, tasks)),
    onSuccess: (e) => {
      qc.setQueryData(employeeKeys.one(e.id), e)
      void qc.invalidateQueries({ queryKey: employeeKeys.all })
      void qc.invalidateQueries({ queryKey: trainingOverviewKey })
    },
  })
}

export function useSetOverrides() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, overrides }: { id: Id; overrides: PermissionOverrides }) => repos.staff.setOverrides(id, overrides),
    onSuccess: (e) => {
      qc.setQueryData(employeeKeys.one(e.id), e)
      void qc.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}
