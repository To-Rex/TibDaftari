/** Outbox queries. `scopeId` = the unit the page works in (the facility); `unitId` narrows a wider scope to one sub-unit. */
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Id, OutboxMessage } from '@/domain'
import { repos } from '@/data'

export interface OutboxParams { status?: string; kind?: string; search?: string; page?: number; pageSize?: number; unitId?: Id; dateFrom?: string; dateTo?: string }

export function useOutboxCounts(scopeId: Id, params: { kind?: string; search?: string; unitId?: Id; dateFrom?: string; dateTo?: string }, refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['outbox-counts', scopeId, params],
    queryFn: () => repos.messaging.outboxCounts(scopeId, params),
    placeholderData: (p) => p,
    refetchInterval,
  })
}

export function useOutbox(scopeId: Id, params: OutboxParams, refetchInterval?: number | false, enabled = true) {
  return useQuery({
    queryKey: ['outbox', scopeId, params],
    queryFn: () => repos.messaging.listOutbox(scopeId, params),
    placeholderData: (p) => p,
    refetchInterval,
    enabled,
  })
}

/** a message on its way changes by itself (queued → sent → delivered): look again while it does */
export const inFlight = (m?: Pick<OutboxMessage, 'status'> | null) => !!m && (m.status === 'queued' || m.status === 'sent')

/**
 * One message, for the reading pane. `seed` = the row the list already has: it is shown at once and refreshed
 * behind; without it (a link opened directly, a message from another page of the list) the message is fetched.
 */
export function useOutboxMessage(scopeId: Id, id: Id | null, seed?: OutboxMessage) {
  return useQuery({
    queryKey: ['outbox-message', scopeId, id],
    queryFn: () => repos.messaging.getOutbox(scopeId, id!),
    enabled: !!id && !!scopeId,
    initialData: seed,
    // the list row is as old as the list's last answer — never trusted for longer than the list itself is
    initialDataUpdatedAt: 0,
    // opened again a moment later it may have moved on (queued → sent): always ask
    staleTime: 0,
    retry: false,
    refetchInterval: (q) => (inFlight(q.state.data) ? 4000 : false),
  })
}

/** Everything the journal shows comes from these keys — an action on one message refreshes them all. */
const refreshOutbox = (qc: QueryClient) => {
  void qc.invalidateQueries({ queryKey: ['outbox'] })
  void qc.invalidateQueries({ queryKey: ['outbox-counts'] })
  void qc.invalidateQueries({ queryKey: ['outbox-message'] })
  void qc.invalidateQueries({ queryKey: ['shell-badges'] })
}

export function useSendSms(scopeId: Id) {
  const qc = useQueryClient()
  return useMutation({
    // a manual message goes out from the scope facility; above facility level the composer names one (`unitId`)
    mutationFn: (input: { to: string[]; text: string; kind: OutboxMessage['kind']; scheduledAt?: string; unitId?: Id; countryCode?: string }) => repos.messaging.send(scopeId, input),
    onSuccess: () => refreshOutbox(qc),
  })
}

/** Take a waiting message out of the queue. */
export function useCancelMessage(scopeId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => repos.messaging.cancelOutbox(scopeId, id),
    onSuccess: (m) => qc.setQueryData(['outbox-message', scopeId, m.id], m),
    // also after a refusal: "too late" means the list on screen is out of date
    onSettled: () => refreshOutbox(qc),
  })
}

/** Send a finished SMS again — the answer is the new message. */
export function useResendMessage(scopeId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => repos.messaging.resendOutbox(scopeId, id),
    onSuccess: (m) => qc.setQueryData(['outbox-message', scopeId, m.id], m),
    onSettled: () => refreshOutbox(qc),
  })
}
