import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Employee, Id, PageQuery, PermissionOverrides } from '@/domain'
import { repos } from '@/data'

export type EmployeeQuery = PageQuery & { branchId?: Id; roleId?: Id; status?: string }

export const employeeKeys = {
  list: (companyId: Id, q: EmployeeQuery) => ['employees', companyId, q] as const,
  one: (id: Id) => ['employee', id] as const,
}

export const useEmployees = (companyId: Id, q: EmployeeQuery, enabled = true) =>
  useQuery({
    queryKey: employeeKeys.list(companyId, q),
    queryFn: () => repos.staff.listEmployees(companyId, q),
    placeholderData: (prev) => prev,
    enabled,
  })

export const useEmployee = (id: Id) =>
  useQuery({ queryKey: employeeKeys.one(id), queryFn: () => repos.staff.getEmployee(id), enabled: !!id })

export function useSaveEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<Employee> & { companyId: Id; id?: Id; password?: string }) => repos.staff.saveEmployee(input),
    onSuccess: (e) => {
      qc.setQueryData(employeeKeys.one(e.id), e)
      void qc.invalidateQueries({ queryKey: ['employees', e.companyId] })
      void qc.invalidateQueries({ queryKey: ['company', e.companyId] })
    },
  })
}

export function useSetOverrides() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, overrides }: { id: Id; overrides: PermissionOverrides }) => repos.staff.setOverrides(id, overrides),
    onSuccess: (e) => {
      qc.setQueryData(employeeKeys.one(e.id), e)
      void qc.invalidateQueries({ queryKey: ['employees', e.companyId] })
    },
  })
}
