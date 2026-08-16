import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id, OutboxMessage } from '@/domain'
import { repos } from '@/data'

export interface OutboxParams { status?: string; search?: string; page?: number; pageSize?: number }

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
    mutationFn: (input: { to: string[]; text: string; kind: OutboxMessage['kind']; scheduledAt?: string }) => repos.messaging.send(companyId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['outbox'] })
      void qc.invalidateQueries({ queryKey: ['shell-badges'] })
    },
  })
}
