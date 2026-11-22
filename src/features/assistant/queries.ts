/** Assistant queries: status at the working unit, the caller's threads, one thread, sending, confirming, the account. */
import { useMemo } from 'react'
import { notifyManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssistantAccountInput, AssistantSendResult, AssistantThread, AssistantThreadDetail, Id } from '@/domain'
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
    // on the list at once (the page opens it before the refetch lands)
    onSuccess: (th) => {
      qc.setQueryData<AssistantThread[]>(assistantKeys.threads(), (cur) => [th, ...(cur ?? []).filter((x) => x.id !== th.id)])
      void qc.invalidateQueries({ queryKey: assistantKeys.threads() })
    },
  })
}

export function useRenameThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: Id; title: string }) => repos.assistant.renameThread(id, title),
    onSuccess: (th) => {
      qc.setQueryData<AssistantThread[]>(assistantKeys.threads(), (cur) => cur?.map((x) => (x.id === th.id ? { ...x, title: th.title } : x)))
      qc.setQueryData<AssistantThreadDetail>(assistantKeys.thread(th.id), (cur) => (cur ? { ...cur, thread: { ...cur.thread, title: th.title } } : cur))
      void qc.invalidateQueries({ queryKey: assistantKeys.threads() })
    },
  })
}

export function useDeleteThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => repos.assistant.deleteThread(id),
    onSuccess: (_r, id) => {
      qc.setQueryData<AssistantThread[]>(assistantKeys.threads(), (cur) => cur?.filter((x) => x.id !== id))
      qc.removeQueries({ queryKey: assistantKeys.thread(id) })
      void qc.invalidateQueries({ queryKey: assistantKeys.threads() })
    },
  })
}

/** What a confirmed write may have changed — the pages re-read it. */
const WRITE_TOUCHES = ['units', 'unit', 'employees', 'categories', 'service-types', 'templates', 'orders', 'patients', 'outbox']

/** What a conversation is waiting for: the reply to `content`, or a confirmed / declined write being carried out. */
export type AssistantWork = { mode: 'reply'; content: string } | { mode: 'action' }
type Works = Record<string, AssistantWork>
/** the key of the conversation that does not exist yet (its first message is on its way) */
export const NEW_THREAD = 'new'
const WORKS_KEY = ['assistant-works'] as const
const NO_WORKS: Works = {}

/**
 * The waits, per conversation. They live in the query cache next to the threads on purpose: the reply and the end
 * of its wait then reach the screen in ONE render (no frame where the sent message is gone and the answer is not
 * there yet), and a wait survives leaving the page and coming back.
 */
export const useAssistantWorks = (): Works =>
  useQuery({ queryKey: WORKS_KEY, queryFn: () => NO_WORKS, initialData: NO_WORKS, staleTime: Infinity, gcTime: Infinity, enabled: false }).data

/**
 * Sending a message and answering a proposed write. Plain calls rather than one shared mutation: two
 * conversations may wait for their replies at the same time, and the turns land in the thread the SERVER names —
 * never in the one that happens to be on screen when the reply arrives.
 */
export function useAssistantActions() {
  const qc = useQueryClient()
  return useMemo(() => {
    const setWork = (key: string, w: AssistantWork | null) =>
      qc.setQueryData<Works>(WORKS_KEY, (m = NO_WORKS) => {
        if (!w && !(key in m)) return m
        const next = { ...m }
        if (w) next[key] = w
        else delete next[key]
        return next
      })
    return {
      /** the conversation `key` starts waiting */
      begin: (key: string, w: AssistantWork) => { setWork(key, w) },
      /** the wait of the not-yet-existing conversation belongs to the one just created */
      adopt: (id: Id) => notifyManager.batch(() => { const w = qc.getQueryData<Works>(WORKS_KEY)?.[NEW_THREAD]; if (w) { setWork(id, w); setWork(NEW_THREAD, null) } }),
      end: (key: string) => { setWork(key, null) },
      send: async (threadId: Id, content: string, unitId?: Id) => {
        try {
          const r = await repos.assistant.send(threadId, content, unitId)
          notifyManager.batch(() => { appendTurns(qc, r.thread.id, r); setWork(threadId, null) })
          return r
        } catch (e) {
          setWork(threadId, null)
          // the server may have kept the message even though the reply failed — show what it really holds
          void qc.invalidateQueries({ queryKey: assistantKeys.thread(threadId) })
          void qc.invalidateQueries({ queryKey: assistantKeys.threads() })
          throw e
        }
      },
      resolve: async (threadId: Id, actionId: Id, confirm: boolean) => {
        setWork(threadId, { mode: 'action' })
        try {
          const r = await (confirm ? repos.assistant.confirm(actionId) : repos.assistant.cancel(actionId))
          notifyManager.batch(() => { appendTurns(qc, r.thread.id, r); setWork(threadId, null) })
          if (confirm) for (const key of WRITE_TOUCHES) void qc.invalidateQueries({ queryKey: [key] })
          return r
        } catch (e) {
          setWork(threadId, null)
          void qc.invalidateQueries({ queryKey: assistantKeys.thread(threadId) })
          throw e
        }
      },
    }
  }, [qc])
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
