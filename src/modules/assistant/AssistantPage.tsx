/**
 * «Yordamchi» — the assistant page shared by the staff app and the admin panel: the open conversation fills the
 * page, the history of the caller's conversations slides in from the left on a button (remembered on a wide
 * screen, an overlay on a narrow one). The open conversation is in the address (`?c=`), so a reload keeps it.
 * The employee's scheduled tasks open from the bar (and from a notice: `?tasks=1`).
 * Not configured here → a pointer to the settings (for those who may set it up).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Bot, CalendarClock, ChevronDown, PanelLeftClose, PanelLeftOpen, PencilLine, Settings2, ShieldOff, SquarePen, Trash2 } from 'lucide-react'
import type { AssistantThread, Id } from '@/domain'
import { useAuth, usePermissions } from '@/features/auth/store'
import { AssistantChat } from '@/features/assistant/AssistantChat'
import { assistantKeys, useAssistantStatus, useCreateThread, useDeleteThread, useRenameThread, useSchedules, useThreads } from '@/features/assistant/queries'
import { SchedulesPanel } from '@/features/assistant/SchedulesPanel'
import { RenameInput, ThreadHistory, threadTitle } from '@/features/assistant/ThreadHistory'
import { useUnitTree } from '@/features/org/queries'
import { routes } from '@/shared/config/routes'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { storage } from '@/shared/lib/storage'
import { Button, ConfirmDialog, EmptyState, IconButton, Menu, Page, Skeleton, toast } from '@/shared/ui'

/** whether the history panel stays open on a wide screen — the viewer's own choice, per browser */
const HISTORY_KEY = 'clinic.assistant.history'
const THREAD_PARAM = 'c'
/** `?tasks=1` — a notice about a scheduled task leads to the list of tasks */
const TASKS_PARAM = 'tasks'
const PANEL_WIDTH = 288
const ease = [0.22, 1, 0.36, 1] as const

export default function AssistantPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const loc = useLocation()
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const wide = useMediaQuery('(min-width: 1024px)')
  const [params, setParams] = useSearchParams()
  const { isSuperAdmin } = usePermissions()
  const staff = useAuth((s) => s.staff)
  const scopeUnitId = useAuth((s) => s.scopeUnitId)
  const facilityId = useAuth((s) => s.facilityId)
  const inAdmin = loc.pathname.startsWith(routes.admin.root)
  // the staff app acts in its facility, the admin panel in the administered unit
  const unitId: Id | null = (inAdmin ? scopeUnitId : (facilityId ?? scopeUnitId)) ?? staff?.unitId ?? null
  const tree = useUnitTree()
  const unit = useMemo(() => tree.data?.find((u) => u.id === unitId) ?? null, [tree.data, unitId])
  const status = useAssistantStatus(unitId)
  const threads = useThreads()
  const create = useCreateThread()
  const rename = useRenameThread()
  const remove = useDeleteThread()
  // the history: pinned beside the chat on a wide screen (remembered), a drawer over it on a narrow one
  const [pinned, setPinned] = useState(() => storage.get<boolean>(HISTORY_KEY, false))
  const [drawer, setDrawer] = useState(false)
  const historyOpen = wide ? pinned : drawer
  const [renaming, setRenaming] = useState(false)
  const [focusTick, setFocusTick] = useState(0)
  const [doomed, setDoomed] = useState<AssistantThread | null>(null)
  const [tasksOpen, setTasksOpen] = useState(false)
  // the count on the bar's button; the list itself is read again when the panel opens
  const schedules = useSchedules(status.data?.enabled === true && status.data.configured)
  const liveTasks = schedules.data?.items.filter((x) => x.isActive).length ?? 0

  const current = params.get(THREAD_PARAM)
  const known = !!current && !!threads.data?.some((x) => x.id === current)
  // until the list is here, the address is trusted — the conversation opens without a flash of the welcome
  const active: Id | null = current && (known || !threads.data) ? current : null
  const activeThread = threads.data?.find((x) => x.id === active) ?? null

  const show = useCallback((id: Id | null, replace = false) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id) next.set(THREAD_PARAM, id)
      else next.delete(THREAD_PARAM)
      return next
    }, { replace })
  }, [setParams])
  // a link to a conversation that is gone (deleted, somebody else's) → a new chat
  useEffect(() => { if (current && threads.data && !known) show(null, true) }, [current, threads.data, known, show])
  useEffect(() => { setRenaming(false) }, [active])
  useEffect(() => {
    if (!params.has(TASKS_PARAM)) return
    setTasksOpen(true)
    setParams((prev) => { const next = new URLSearchParams(prev); next.delete(TASKS_PARAM); return next }, { replace: true })
  }, [params, setParams])
  // a scheduled run left an answer in the conversation that is open: read it now, and it is no longer "unread"
  const unreadHere = !!activeThread?.unread
  useEffect(() => {
    if (!active || !unreadHere) return
    qc.setQueryData<AssistantThread[]>(assistantKeys.threads(), (cur) => cur?.map((x) => (x.id === active ? { ...x, unread: false } : x)))
    void qc.invalidateQueries({ queryKey: assistantKeys.thread(active) })
  }, [active, unreadHere, qc])

  const toggleHistory = () => {
    if (wide) setPinned((v) => { storage.set(HISTORY_KEY, !v); return !v })
    else setDrawer((v) => !v)
  }
  const open = (id: Id) => { show(id); setDrawer(false); setFocusTick((n) => n + 1) }
  const newChat = () => { show(null); setDrawer(false); setFocusTick((n) => n + 1) }

  /** The first message of a new conversation: create the thread and seed the cache the chat reads. */
  const onCreate = async (): Promise<AssistantThread> => {
    const th = await create.mutateAsync({ unitId: unitId ?? undefined })
    qc.setQueryData(assistantKeys.thread(th.id), { thread: th, messages: [], pending: null })
    return th
  }
  const onRename = (id: Id, title: string) => {
    rename.mutate({ id, title }, { onSuccess: () => toast.success(t('assistant.renamed')), onError: (e) => toast.error(errorMessage(e)) })
  }
  const del = async () => {
    if (!doomed) return
    try {
      await remove.mutateAsync(doomed.id)
      if (active === doomed.id) show(null, true)
      toast.success(t('assistant.deleted'))
      setDoomed(null)
    } catch (e) { toast.error(errorMessage(e)) }
  }

  // the settings page has no menu entry: superadmins reach it from here (the admin panel)
  const settingsLink = inAdmin && isSuperAdmin

  if (status.isLoading) return <Page><Skeleton className="h-[60vh]" /></Page>
  if (status.data && !status.data.enabled) return <Page><EmptyState icon={<ShieldOff />} title={t('assistant.noAccess')} className="min-h-[60vh]" /></Page>
  if (status.data && !status.data.configured) {
    return (
      <Page>
        <EmptyState icon={<Bot />} title={t('assistant.notConfigured')} description={t('assistant.notConfiguredHint')} className="min-h-[60vh]"
          action={isSuperAdmin && <Button leftIcon={<Settings2 className="size-4" />} onClick={() => nav(routes.admin.assistantSettings)} data-assistant-settings-link>{t('assistant.openSettings')}</Button>} />
      </Page>
    )
  }

  const history = (
    <ThreadHistory threads={threads.data} loading={threads.isLoading} active={active} onOpen={open} onNew={newChat} onRename={onRename} onDelete={setDoomed} onClose={wide ? undefined : () => setDrawer(false)} />
  )
  const title = activeThread ? threadTitle(activeThread, t('assistant.untitled')) : t('assistant.newThread')
  const openTasks = () => { setDrawer(false); setTasksOpen(true) }

  return (
    <Page width="full" className="!p-0">
      <div className="relative flex h-[calc(100dvh-3.5rem)] overflow-hidden sm:h-[calc(100dvh-4rem)]" data-assistant-page data-history={historyOpen ? 'open' : 'closed'}>
        {wide ? (
          <motion.aside initial={false} animate={{ width: historyOpen ? PANEL_WIDTH : 0 }} transition={{ duration: reduce ? 0 : 0.26, ease }} inert={!historyOpen} aria-hidden={!historyOpen} aria-label={t('assistant.history')}
            className={cn('shrink-0 overflow-hidden bg-bg-elevated/60', historyOpen && 'border-r border-line')} data-assistant-history>
            <div className="h-full" style={{ width: PANEL_WIDTH }}>{history}</div>
          </motion.aside>
        ) : (
          <AnimatePresence>
            {historyOpen && (
              <>
                <motion.div key="shade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="app-modal-backdrop absolute inset-0 z-20" onClick={() => setDrawer(false)} aria-hidden />
                <motion.aside key="drawer" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: reduce ? 0 : 0.26, ease }} aria-label={t('assistant.history')}
                  className="absolute inset-y-0 left-0 z-30 w-[min(20rem,86vw)] border-r border-line bg-bg-elevated shadow-3" data-assistant-history>
                  {history}
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        )}

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-0.5 px-2 sm:px-3" data-assistant-bar>
            <IconButton label={historyOpen ? t('assistant.hideHistory') : t('assistant.showHistory')} aria-expanded={historyOpen} onClick={toggleHistory} data-history-toggle data-hotkey="h">
              {historyOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </IconButton>
            <IconButton label={t('assistant.newThread')} onClick={newChat} data-thread-new data-hotkey="n"><SquarePen /></IconButton>
            <div className="ml-1 flex min-w-0 flex-1 items-center">
              {activeThread && renaming ? (
                <RenameInput value={activeThread.title} onSave={(v) => { setRenaming(false); onRename(activeThread.id, v) }} onCancel={() => setRenaming(false)} className="max-w-md" />
              ) : activeThread ? (
                <Menu align="start" className="min-w-0 max-w-full"
                  trigger={(o) => (
                    <button type="button" aria-expanded={o} title={title} className={cn('flex h-9 min-w-0 max-w-full items-center gap-1 rounded-lg px-2 text-[14px] font-medium transition-colors hover:bg-surface-2', o && 'bg-surface-2')} data-thread-title>
                      {activeThread.scheduleId && <CalendarClock className="size-3.5 shrink-0 text-brand" aria-label={t('assistant.schedule.mark')} />}
                      <span className="truncate">{title}</span><ChevronDown className={cn('size-3.5 shrink-0 text-ink-3 transition-transform', o && 'rotate-180')} />
                    </button>
                  )}
                  items={[
                    { key: 'rename', label: t('assistant.renameThread'), icon: <PencilLine />, onSelect: () => setRenaming(true) },
                    { key: 'delete', label: t('assistant.deleteThread'), icon: <Trash2 />, danger: true, separatorBefore: true, onSelect: () => setDoomed(activeThread) },
                  ]} />
              ) : <span className="truncate px-2 text-[14px] font-medium text-ink-2" data-thread-title>{title}</span>}
            </div>
            <span className="relative">
              <IconButton label={t('assistant.schedule.title')} onClick={openTasks} data-schedules-open><CalendarClock /></IconButton>
              {liveTasks > 0 && <span className="pointer-events-none absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white ring-2 ring-bg" data-schedules-count>{liveTasks}</span>}
            </span>
            {settingsLink && <IconButton label={t('assistant.openSettings')} onClick={() => nav(routes.admin.assistantSettings)} data-assistant-settings-link><Settings2 /></IconButton>}
          </header>
          {status.data && <AssistantChat threadId={active} unit={unit} status={status.data} onCreate={onCreate} onOpen={(id) => show(id, true)} focusTick={focusTick} />}
        </section>
      </div>

      <SchedulesPanel open={tasksOpen} onClose={() => setTasksOpen(false)} unit={unit} onOpenThread={(id) => { setTasksOpen(false); open(id) }} />
      <ConfirmDialog open={!!doomed} onClose={() => setDoomed(null)} onConfirm={() => void del()} danger loading={remove.isPending}
        title={t('assistant.deleteConfirmTitle')} description={t('assistant.deleteConfirmBody', { title: doomed ? threadTitle(doomed, t('assistant.untitled')) : '' })} confirmText={t('common.delete')} cancelText={t('common.cancel')} />
    </Page>
  )
}
