/** Quick start («Tezkor ishga tushirish») queries: the preview under a parent and the one-request creation. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id, QuickStartInput } from '@/domain'
import { repos } from '@/data'

export const quickStartKeys = {
  preview: (parentId: Id, regionId?: Id, districtId?: Id) => ['quick-start', parentId, regionId ?? '', districtId ?? ''] as const,
}

/** What a new facility under `parentId` (and the chosen geo) would inherit, the sample facilities and the roles. */
export const useQuickStartPreview = (parentId: Id | null, q: { regionId?: Id; districtId?: Id }, enabled = true) =>
  useQuery({
    queryKey: quickStartKeys.preview(parentId ?? '', q.regionId, q.districtId),
    queryFn: () => repos.org.quickStartPreview(parentId as Id, q),
    enabled: enabled && !!parentId,
    staleTime: 30_000,
  })

export function useQuickStart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ parentId, input }: { parentId: Id; input: QuickStartInput }) => repos.org.quickStart(parentId, input),
    onSuccess: () => {
      // the tree grew, people were added, and the new facility's catalogue / templates exist now
      for (const key of ['units', 'unit', 'employees', 'roles', 'categories', 'service-types', 'schemas', 'templates', 'quick-start', 'platform']) {
        void qc.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}
