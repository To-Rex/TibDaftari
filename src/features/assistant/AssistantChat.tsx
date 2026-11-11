/**
 * One conversation with the assistant: the turns, the composer, the confirmation of proposed writes. The working
 * unit (the header scope, or the facility in the staff app) is what every tool acts in.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, SendHorizontal, Sparkles } from 'lucide-react'
import type { AssistantStatus, Id, OrgUnit } from '@/domain'
import { ApiError } from '@/data'
import { useAuth } from '@/features/auth/store'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { Badge, Textarea, toast } from '@/shared/ui'
import { UnitIcon } from '../org/unitUi'
import { ChatMessage } from './ChatMessage'
import { useResolveAction, useSendMessage, useThread } from './queries'

export function AssistantChat({ threadId, unit, status, onFirstSend }: { threadId: Id | null; unit: OrgUnit | null; status: AssistantStatus; onFirstSend: (content: string) => Promise<Id> }) {
  const { t } = useTranslation()
  const me = useAuth((s) => s.staff)
  const thread = useThread(threadId)
  const send = useSendMessage(threadId ?? '')
  const resolve = useResolveAction(threadId ?? '')
  const [draft, setDraft] = useState('')
  const [starting, setStarting] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const messages = thread.data?.messages ?? []
  const busy = send.isPending || resolve.isPending || starting
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [messages.length, busy])
  useEffect(() => { setDraft('') }, [threadId])

  const submit = async (text?: string) => {
    const content = (text ?? draft).trim()
    if (!content || busy) return
    setDraft('')
    try {
      if (!threadId) {
        setStarting(true)
        await onFirstSend(content)
      } else {
        await send.mutateAsync({ content, unitId: unit?.id })
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) toast.error(t('assistant.rateLimited'))
      else toast.error(errorMessage(e))
      setDraft(content)
    } finally {
      setStarting(false)
      box.current?.focus()
    }
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit() }
  }
  const onResolve = (id: string, confirm: boolean) => {
    resolve.mutate({ actionId: id, confirm }, { onError: (e) => toast.error(errorMessage(e)) })
  }
  const examples = [t('assistant.example4'), t('assistant.example1'), t('assistant.example2'), t('assistant.example3')]

  return (
    <div className="flex h-full min-h-0 flex-col" data-assistant-chat>
      {/* where the assistant acts */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 text-[12.5px] text-ink-3">
        <span>{t('assistant.workingIn')}:</span>
        {unit && <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 font-medium text-ink"><UnitIcon unit={unit} className="size-3.5 text-brand" />{unit.name}</span>}
        <span className="ml-auto inline-flex items-center gap-1.5">{status.model && <Badge size="sm" tone="neutral">{status.model}</Badge>}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-chat-scroll>
        {thread.isLoading && threadId ? <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-ink-3" /></div> : messages.length === 0 ? (
          <div className="mx-auto max-w-xl pt-6 text-center" data-chat-welcome>
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand"><Sparkles className="size-6" /></span>
            <h2 className="mt-3 text-[18px] font-semibold">{t('assistant.welcomeTitle', { name: me?.fullName.split(' ')[0] ?? '' })}</h2>
            <p className="mt-1 text-[13.5px] text-ink-2">{t('assistant.welcomeBody')}</p>
            <div className="mt-5 text-left">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t('assistant.examples')}</div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {examples.map((ex) => <button key={ex} type="button" onClick={() => void submit(ex)} className="rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-left text-[13px] transition-colors hover:border-brand hover:text-brand-ink" data-chat-example>{ex}</button>)}
              </div>
            </div>
            <p className="mt-5 text-[11.5px] text-ink-3">{t('assistant.safety')}</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {messages.map((m) => <ChatMessage key={m.id} m={m} onResolve={onResolve} busy={resolve.isPending} />)}
            {busy && <div className="flex items-center gap-2 text-[12.5px] text-ink-3" data-chat-thinking><Loader2 className="size-4 animate-spin" />{t('assistant.thinking')}</div>}
            <div ref={bottom} />
          </div>
        )}
      </div>

      <div className="border-t border-line bg-bg-elevated/80 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea ref={box} rows={1} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} placeholder={t('assistant.composerPlaceholder')} disabled={busy}
            className="max-h-40 min-h-11 flex-1 resize-none" data-chat-input />
          <button type="button" onClick={() => void submit()} disabled={busy || !draft.trim()} aria-label={t('assistant.send')} data-chat-send
            className={cn('grid size-11 shrink-0 place-items-center rounded-full text-white transition-colors', busy || !draft.trim() ? 'bg-brand/40' : 'bg-brand hover:bg-brand-strong')}>
            {busy ? <Loader2 className="size-5 animate-spin" /> : <SendHorizontal className="size-5" />}
          </button>
        </div>
        <p className="mx-auto mt-1 max-w-3xl text-[11px] text-ink-3 max-sm:hidden">{t('assistant.sendHint')}</p>
      </div>
    </div>
  )
}
