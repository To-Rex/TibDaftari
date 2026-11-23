/** Assistant queries: status at the working unit, the caller's threads, one thread, sending, confirming, the account. */
import { useMemo } from 'react'
import { notifyManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssistantAccountInput, AssistantAction, AssistantSchedule, AssistantScheduleInput, AssistantScheduleList, AssistantSendResult, AssistantThread, AssistantThreadDetail, Id } from '@/domain'
import { repos } from '@/data'

export const assistantKeys = {
  status: (unitId: Id | null) => ['assistant', 'status', unitId ?? ''] as const,
  threads: () => ['assistant', 'threads'] as const,
  thread: (id: Id) => ['assistant', 'thread', id] as const,
  account: (unitId: Id) => ['assistant', 'account', unitId] as const,
  platformAccount: () => ['assistant', 'platform-account'] as const,
  schedules: () => ['assistant', 'schedules'] as const,
}

export const useAssistantStatus = (unitId: Id | null) =>
  useQuery({ queryKey: assistantKeys.status(unitId), queryFn: () => repos.assistant.status(unitId ?? undefined), staleTime: 60_000 })

// re-read every minute: a scheduled task may leave an answer (an unread conversation) while the page is open
export const useThreads = () => useQuery({ queryKey: assistantKeys.threads(), queryFn: () => repos.assistant.listThreads(), staleTime: 15_000, refetchInterval: 60_000 })

export const useThread = (id: Id | null) =>
  useQuery({ queryKey: assistantKeys.thread(id ?? ''), queryFn: () => repos.assistant.getThread(id as Id), enabled: !!id })

/** Append the turns of a send / confirm / cancel to the cached thread so the chat grows without a refetch. */
function appendTurns(qc: ReturnType<typeof useQueryClient>, threadId: Id, r: AssistantSendResult) {
  qc.setQueryData<AssistantThreadDetail>(assistantKeys.thread(threadId), (cur) => {
    const known = new Set((cur?.messages ?? []).map((m) => m.id))
    // nothing waits any more → whatever an older turn still shows as waiting was declined
    const settle = (a: AssistantAction): AssistantAction => (a.status === 'pending' ? { ...a, status: 'cancelled' } : a)
    const messages = [...(cur?.messages ?? []).map((m) => {
      // the message that carried the resolved action(s) shows the new status
      const upd = r.messages.find((x) => x.id === m.id)
      if (upd) return upd
      const waits = r.pending === null && (m.action?.status === 'pending' || m.actions?.some((a) => a.status === 'pending'))
      return waits ? { ...m, action: m.action ? settle(m.action) : m.action, actions: m.actions?.map(settle) } : m
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
/** …and the employee's own scheduled tasks, which the assistant may have made or changed */
const touched = (qc: ReturnType<typeof useQueryClient>) => {
  for (const key of WRITE_TOUCHES) void qc.invalidateQueries({ queryKey: [key] })
  void qc.invalidateQueries({ queryKey: assistantKeys.schedules() })
}

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
      /**
       * Ask the server to stop the run of a thread. The run may not have announced itself yet (the request is
       * still on its way), so the ask is repeated a few times while `still()` says the wait goes on. The waiting
       * request itself answers — with what was done before the stop.
       */
      stop: async (threadId: Id, still: () => boolean) => {
        for (let i = 0; i < 8 && still(); i++) {
          try { if ((await repos.assistant.stop(threadId)).stopping) return true } catch { /* the next try decides */ }
          await new Promise((r) => window.setTimeout(r, 350))
        }
        return false
      },
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
      resolve: async (threadId: Id, actionId: Id, confirm: boolean, word?: string) => {
        setWork(threadId, { mode: 'action' })
        try {
          const r = await (confirm ? repos.assistant.confirm(actionId, word) : repos.assistant.cancel(actionId))
          notifyManager.batch(() => { appendTurns(qc, r.thread.id, r); setWork(threadId, null) })
          if (confirm) touched(qc)
          return r
        } catch (e) {
          setWork(threadId, null)
          void qc.invalidateQueries({ queryKey: assistantKeys.thread(threadId) })
          throw e
        }
      },
      /** one answer to a turn that proposed several writes: `confirm` run, the rest of that turn is declined */
      resolveMany: async (threadId: Id, confirm: Id[], cancel: Id[]) => {
        setWork(threadId, { mode: 'action' })
        try {
          const r = await repos.assistant.resolveBatch(confirm, cancel)
          notifyManager.batch(() => { appendTurns(qc, r.thread.id, r); setWork(threadId, null) })
          if (confirm.length) touched(qc)
          return r
        } catch (e) {
          setWork(threadId, null)
          void qc.invalidateQueries({ queryKey: assistantKeys.thread(threadId) })
          throw e
        }
      },
      /** take several done writes back with one press */
      undoMany: async (threadId: Id, ids: Id[]) => {
        setWork(threadId, { mode: 'action' })
        try {
          const r = await repos.assistant.undoBatch(ids)
          notifyManager.batch(() => { appendTurns(qc, r.thread.id, r); setWork(threadId, null) })
          touched(qc)
          return r
        } catch (e) {
          setWork(threadId, null)
          void qc.invalidateQueries({ queryKey: assistantKeys.thread(threadId) })
          throw e
        }
      },
      /** take a confirmed write back; the thread gets the updated card and a note */
      undo: async (threadId: Id, actionId: Id) => {
        setWork(threadId, { mode: 'action' })
        try {
          const r = await repos.assistant.undo(actionId)
          notifyManager.batch(() => { appendTurns(qc, r.thread.id, r); setWork(threadId, null) })
          touched(qc)
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

// ---------------------------------------------------------------- scheduled tasks («Rejali topshiriqlar»)

export const useSchedules = (enabled = true) =>
  useQuery({ queryKey: assistantKeys.schedules(), queryFn: () => repos.assistant.listSchedules(), enabled, staleTime: 15_000, refetchInterval: 60_000 })

/** Put a saved task where the list shows it at once (the refetch confirms it). */
function keepSchedule(qc: ReturnType<typeof useQueryClient>, row: AssistantSchedule) {
  qc.setQueryData<AssistantScheduleList>(assistantKeys.schedules(), (cur) => (cur ? { ...cur, items: cur.items.some((x) => x.id === row.id) ? cur.items.map((x) => (x.id === row.id ? row : x)) : [...cur.items, row] } : cur))
  void qc.invalidateQueries({ queryKey: assistantKeys.schedules() })
}

export function useSaveSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input, unitId }: { id?: Id; input: Partial<AssistantScheduleInput>; unitId?: Id }) =>
      id ? repos.assistant.updateSchedule(id, input) : repos.assistant.createSchedule(input as AssistantScheduleInput, unitId),
    onSuccess: (row) => { keepSchedule(qc, row); void qc.invalidateQueries({ queryKey: assistantKeys.threads() }) },
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => repos.assistant.deleteSchedule(id),
    onSuccess: (_r, id) => {
      qc.setQueryData<AssistantScheduleList>(assistantKeys.schedules(), (cur) => (cur ? { ...cur, items: cur.items.filter((x) => x.id !== id) } : cur))
      void qc.invalidateQueries({ queryKey: assistantKeys.schedules() })
    },
  })
}

/** Run a task right now: the answer lands in its conversation (re-read with the list of conversations). */
export function useRunSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => repos.assistant.runSchedule(id),
    onSuccess: (row) => {
      keepSchedule(qc, row)
      void qc.invalidateQueries({ queryKey: assistantKeys.threads() })
      if (row.threadId) void qc.invalidateQueries({ queryKey: assistantKeys.thread(row.threadId) })
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
