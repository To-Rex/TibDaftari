/** Assistant queries: status at the working unit, the caller's threads, one thread, sending, confirming, the account. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssistantAccountInput, AssistantSendResult, AssistantThreadDetail, Id } from '@/domain'
import { repos } from '@/data'

export const assistantKeys = {
  status: (unitId: Id | null) => ['assistant', 'status', unitId ?? ''] as const,
  threads: () => ['assistant', 'threads'] as const,
  thread: (id: Id) => ['assistant', 'thread', id] as const,
  account: (unitId: Id) => ['assistant', 'account', unitId] as const,
  platformAccount: () => ['assistant', 'platform-account'] as const,
}

export const useAssistantStatus = (unitId: Id | null) =>
  useQuery({ queryKey: assistantKeys.status(unitId), queryFn: () => repos.assistant.status(unitId ?? undefined), staleTime: 60_000 })

export const useThreads = () => useQuery({ queryKey: assistantKeys.threads(), queryFn: () => repos.assistant.listThreads(), staleTime: 15_000 })

export const useThread = (id: Id | null) =>
  useQuery({ queryKey: assistantKeys.thread(id ?? ''), queryFn: () => repos.assistant.getThread(id as Id), enabled: !!id })

/** Append the turns of a send / confirm / cancel to the cached thread so the chat grows without a refetch. */
function appendTurns(qc: ReturnType<typeof useQueryClient>, threadId: Id, r: AssistantSendResult) {
  qc.setQueryData<AssistantThreadDetail>(assistantKeys.thread(threadId), (cur) => {
    const known = new Set((cur?.messages ?? []).map((m) => m.id))
    const messages = [...(cur?.messages ?? []).map((m) => {
      // the message that carried the resolved action shows its new status
      const upd = r.messages.find((x) => x.id === m.id)
      return upd ?? (m.action && r.pending === null && m.action.status === 'pending' ? { ...m, action: { ...m.action, status: 'cancelled' as const } } : m)
    }), ...r.messages.filter((m) => !known.has(m.id))]
    return { thread: r.thread, messages, pending: r.pending }
  })
  void qc.invalidateQueries({ queryKey: assistantKeys.thread(threadId) })
  void qc.invalidateQueries({ queryKey: assistantKeys.threads() })
}

export function useCreateThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ unitId, title }: { unitId?: Id; title?: string }) => repos.assistant.createThread(unitId, title),
    onSuccess: () => void qc.invalidateQueries({ queryKey: assistantKeys.threads() }),
  })
}

export function useDeleteThread() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: Id) => repos.assistant.deleteThread(id), onSuccess: () => void qc.invalidateQueries({ queryKey: assistantKeys.threads() }) })
}

export function useSendMessage(threadId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ content, unitId }: { content: string; unitId?: Id }) => repos.assistant.send(threadId, content, unitId),
    onSuccess: (r) => appendTurns(qc, threadId, r),
  })
}

export function useResolveAction(threadId: Id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ actionId, confirm }: { actionId: Id; confirm: boolean }) => (confirm ? repos.assistant.confirm(actionId) : repos.assistant.cancel(actionId)),
    onSuccess: (r) => {
      appendTurns(qc, threadId, r)
      // a confirmed write changed data somewhere — the pages re-read it
      for (const key of ['units', 'unit', 'employees', 'categories', 'service-types', 'templates', 'orders', 'patients', 'outbox']) void qc.invalidateQueries({ queryKey: [key] })
    },
  })
}

export const useAssistantAccount = (unitId: Id | null) =>
  useQuery({ queryKey: assistantKeys.account(unitId ?? ''), queryFn: () => repos.assistant.getAccount(unitId as Id), enabled: !!unitId })

export const useAssistantPlatformAccount = (enabled = true) =>
  useQuery({ queryKey: assistantKeys.platformAccount(), queryFn: () => repos.assistant.getPlatformAccount(), enabled })

export function useSavePlatformAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AssistantAccountInput) => repos.assistant.savePlatformAccount(input),
    onSuccess: (r) => { qc.setQueryData(assistantKeys.platformAccount(), r); void qc.invalidateQueries({ queryKey: ['assistant'] }) },
  })
}

export function useSaveAssistantAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ unitId, input }: { unitId: Id; input: AssistantAccountInput }) => repos.assistant.saveAccount(unitId, input),
    onSuccess: (r, v) => { qc.setQueryData(assistantKeys.account(v.unitId), r); void qc.invalidateQueries({ queryKey: ['assistant'] }) },
  })
}
