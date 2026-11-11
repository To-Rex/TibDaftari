/**
 * «Yordamchi» — the assistant page shared by the staff app and the admin panel: the caller's conversations on the
 * left, the open one on the right. Not configured here → a pointer to the settings (for those who may set it up).
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Bot, MessageSquarePlus, PanelLeft, Settings2, ShieldOff, Trash2 } from 'lucide-react'
import type { Id } from '@/domain'
import { repos } from '@/data'
import { useAuth, usePermissions } from '@/features/auth/store'
import { AssistantChat } from '@/features/assistant/AssistantChat'
import { assistantKeys, useAssistantStatus, useCreateThread, useDeleteThread, useThreads } from '@/features/assistant/queries'
import { useUnitTree } from '@/features/org/queries'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtRelative } from '@/shared/lib/format'
import { Button, EmptyState, IconButton, Page, Skeleton, toast } from '@/shared/ui'

export default function AssistantPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const loc = useLocation()
  const qc = useQueryClient()
  const { can } = usePermissions()
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
  const remove = useDeleteThread()
  const [current, setCurrent] = useState<Id | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const active = current && threads.data?.some((x) => x.id === current) ? current : null

  /** The first message of a new conversation: open the thread, send, seed the cache the chat reads. */
  const onFirstSend = async (content: string): Promise<Id> => {
    const th = await create.mutateAsync({ unitId: unitId ?? undefined })
    qc.setQueryData(assistantKeys.thread(th.id), { thread: th, messages: [], pending: null })
    setCurrent(th.id)
    try {
      const r = await repos.assistant.send(th.id, content, unitId ?? undefined)
      qc.setQueryData(assistantKeys.thread(th.id), { thread: r.thread, messages: r.messages, pending: r.pending })
    } finally {
      void qc.invalidateQueries({ queryKey: assistantKeys.threads() })
    }
    return th.id
  }

  const del = async (id: Id) => {
    try { await remove.mutateAsync(id); if (active === id) setCurrent(null); toast.success(t('assistant.deleted')) } catch (e) { toast.error(errorMessage(e)) }
  }

  if (status.isLoading) return <Page><Skeleton className="h-[60vh]" /></Page>
  if (status.data && !status.data.enabled) return <Page><EmptyState icon={<ShieldOff />} title={t('assistant.noAccess')} className="min-h-[60vh]" /></Page>
  if (status.data && !status.data.configured) {
    return (
      <Page>
        <EmptyState icon={<Bot />} title={t('assistant.notConfigured')} description={t('assistant.notConfiguredHint')} className="min-h-[60vh]"
          action={can('admin.settings.write') && <Button leftIcon={<Settings2 className="size-4" />} onClick={() => nav(routes.admin.assistantSettings)}>{t('assistant.openSettings')}</Button>} />
      </Page>
    )
  }

  const list = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t('assistant.threads')}</span>
        <Button size="xs" variant="soft" className="ml-auto" leftIcon={<MessageSquarePlus className="size-3.5" />} onClick={() => { setCurrent(null); setListOpen(false) }} data-thread-new>{t('assistant.newThread')}</Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {threads.data?.length === 0 && <p className="px-3 py-6 text-center text-[12.5px] text-ink-3">{t('assistant.noThreads')}</p>}
        {threads.data?.map((th) => (
          <div key={th.id} role="button" tabIndex={0} onClick={() => { setCurrent(th.id); setListOpen(false) }} onKeyDown={(e) => { if (e.key === 'Enter') { setCurrent(th.id); setListOpen(false) } }}
            className={cn('group flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors', active === th.id ? 'bg-brand-soft/60 text-brand-ink' : 'hover:bg-surface-2')} data-thread-row={th.id}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{th.title || t('assistant.untitled')}</div>
              <div className="text-[11px] text-ink-3">{fmtRelative(th.lastMessageAt ?? th.createdAt)}</div>
            </div>
            <IconButton size="sm" label={t('assistant.deleteThread')} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={(e) => { e.stopPropagation(); void del(th.id) }}><Trash2 /></IconButton>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <Page width="full" className="!py-0">
      <div className="relative flex h-[calc(100dvh-3.5rem)] overflow-hidden sm:h-[calc(100dvh-4rem)]" data-assistant-page>
        <aside className={cn('w-72 shrink-0 border-r border-line bg-bg-elevated/60 max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-20 max-lg:bg-bg-elevated max-lg:shadow-3', !listOpen && 'max-lg:hidden')}>{list}</aside>
        {listOpen && <div className="absolute inset-0 z-10 bg-ink/30 lg:hidden" onClick={() => setListOpen(false)} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2 lg:hidden">
            <IconButton size="sm" label={t('assistant.threads')} onClick={() => setListOpen(true)}><PanelLeft /></IconButton>
            <span className="truncate text-[13.5px] font-medium">{threads.data?.find((x) => x.id === active)?.title || t('assistant.title')}</span>
          </div>
          {status.data && <AssistantChat threadId={active} unit={unit} status={status.data} onFirstSend={onFirstSend} />}
        </div>
      </div>
    </Page>
  )
}
