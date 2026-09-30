import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id, OutboxMessage } from '@/domain'
import { repos } from '@/data'
import { useAuth } from '@/features/auth/store'

export interface OutboxParams { status?: string; search?: string; page?: number; pageSize?: number; branchId?: Id }

export function useOutboxCounts(companyId: Id, params: { kind?: string; search?: string; branchId?: Id }, refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['outbox-counts', companyId, params],
    queryFn: () => repos.messaging.outboxCounts(companyId, params),
    placeholderData: (p) => p,
    refetchInterval,
  })
}

export function useOutbox(companyId: Id, params: OutboxParams, refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['outbox', companyId, params],
    queryFn: () => repos.messaging.listOutbox(companyId, params),
    placeholderData: (p) => p,
    refetchInterval,
  })
}

export function useSendSms(companyId: Id) {
  const qc = useQueryClient()
  return useMutation({
    // a manual message is sent from the branch selected in the top bar (it shows in that branch's outbox)
    mutationFn: (input: { to: string[]; text: string; kind: OutboxMessage['kind']; scheduledAt?: string }) => repos.messaging.send(companyId, { ...input, branchId: useAuth.getState().branchId ?? undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['outbox'] })
      void qc.invalidateQueries({ queryKey: ['shell-badges'] })
    },
  })
}
