import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id, Role } from '@/domain'
import { repos } from '@/data'

export const roleKeys = { list: (companyId: Id) => ['roles', companyId] as const }

export const useRoles = (companyId: Id) =>
  useQuery({ queryKey: roleKeys.list(companyId), queryFn: () => repos.staff.listRoles(companyId) })

export function useSaveRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<Role> & { companyId: Id; id?: Id }) => repos.staff.saveRole(input),
    onSuccess: (_r, input) => void qc.invalidateQueries({ queryKey: roleKeys.list(input.companyId) }),
  })
}

export function useDeleteRole(companyId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => repos.staff.deleteRole(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: roleKeys.list(companyId) }),
  })
}
