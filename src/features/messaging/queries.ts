/** Outbox queries. `scopeId` = the unit the page works in (the facility); `unitId` narrows a wider scope to one sub-unit. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id, OutboxMessage } from '@/domain'
import { repos } from '@/data'

export interface OutboxParams { status?: string; search?: string; page?: number; pageSize?: number; unitId?: Id }

export function useOutboxCounts(scopeId: Id, params: { kind?: string; search?: string; unitId?: Id }, refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['outbox-counts', scopeId, params],
    queryFn: () => repos.messaging.outboxCounts(scopeId, params),
    placeholderData: (p) => p,
    refetchInterval,
  })
}

export function useOutbox(scopeId: Id, params: OutboxParams, refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['outbox', scopeId, params],
    queryFn: () => repos.messaging.listOutbox(scopeId, params),
    placeholderData: (p) => p,
    refetchInterval,
  })
}

export function useSendSms(scopeId: Id) {
  const qc = useQueryClient()
  return useMutation({
    // a manual message goes out from the scope facility; above facility level the composer names one (`unitId`)
    mutationFn: (input: { to: string[]; text: string; kind: OutboxMessage['kind']; scheduledAt?: string; unitId?: Id }) => repos.messaging.send(scopeId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['outbox'] })
      void qc.invalidateQueries({ queryKey: ['outbox-counts'] })
      void qc.invalidateQueries({ queryKey: ['shell-badges'] })
    },
  })
}
