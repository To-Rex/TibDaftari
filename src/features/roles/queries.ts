import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id, Role } from '@/domain'
import { repos } from '@/data'

export const roleKeys = {
  all: ['roles'] as const,
  list: (scopeId: Id) => ['roles', scopeId] as const,
}

/** System roles + roles defined on the scope's path and subtree. */
export const useRoles = (scopeId: Id, enabled = true) =>
  useQuery({ queryKey: roleKeys.list(scopeId), queryFn: () => repos.staff.listRoles(scopeId), enabled: enabled && !!scopeId })

/** Create a role scoped to `scopeId` (the API sets the scope from the path) or update by `id`. */
export function useSaveRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<Role> & { scopeId: Id; id?: Id }) => repos.staff.saveRole(input),
    // a role is visible from every unit of its lineage, so every scope's list may change
    onSuccess: () => void qc.invalidateQueries({ queryKey: roleKeys.all }),
  })
}

export function useDeleteRole(scopeId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => repos.staff.deleteRole(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: roleKeys.list(scopeId) })
      void qc.invalidateQueries({ queryKey: roleKeys.all })
    },
  })
}
