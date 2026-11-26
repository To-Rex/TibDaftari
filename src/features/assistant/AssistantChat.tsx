/**
 * One conversation with the assistant: the welcome with examples, the turns, the composer, the confirmation of
 * proposed writes. The working unit (the header scope, or the facility in the staff app) is what every tool acts in.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, BadgeCheck, CalendarClock, ChartPie, CopyPlus, FileSpreadsheet, FlaskConical, Lightbulb, Loader2, MapPin, PencilLine, ReceiptText, Sparkles, TrendingUp, UserPlus, Users, type LucideIcon } from 'lucide-react'
import type { AssistantMessage, AssistantStatus, AssistantThread, Id, OrgUnit } from '@/domain'
import { ApiError } from '@/data'
import { useAuth } from '@/features/auth/store'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { toast } from '@/shared/ui'
import { AssistantMark, AssistantTurn, ScheduledMark, UserBubble } from './ChatMessage'
import { Composer } from './Composer'
import { NEW_THREAD as NEW, useAssistantActions, useAssistantWorks, useThread } from './queries'

const enter = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const } }
type Turn = { kind: 'user'; m: AssistantMessage } | { kind: 'assistant'; id: Id; items: AssistantMessage[] }

/** What to try first — only what this employee's role can really do (`needs` = a tool they must hold); the first six fit are shown. */
const EXAMPLES: { key: string; icon: LucideIcon; needs?: string }[] = [
  { key: 'example4', icon: Lightbulb },
  { key: 'exampleOrder', icon: ReceiptText, needs: 'create_order' },
  { key: 'examplePatient', icon: UserPlus, needs: 'create_patient' },
  { key: 'exampleWorklist', icon: FlaskConical, needs: 'save_result_values' },
  { key: 'exampleApprove', icon: BadgeCheck, needs: 'approve_result' },
  { key: 'exampleCopy', icon: CopyPlus, needs: 'copy_working_set' },
  { key: 'example1', icon: TrendingUp, needs: 'breakdown' },
  { key: 'exampleSchedule', icon: CalendarClock, needs: 'create_schedule' },
  { key: 'example5', icon: FileSpreadsheet, needs: 'export_data' },
  { key: 'example6', icon: ChartPie, needs: 'export_chart' },
  { key: 'example2', icon: Users, needs: 'list_employees' },
  { key: 'example3', icon: PencilLine, needs: 'update_unit' },
]

/** Everything the assistant said and did between two messages of the employee is one turn. */
function toTurns(messages: AssistantMessage[]): Turn[] {
  const out: Turn[] = []
  for (const m of messages) {
    if (m.role === 'user') { out.push({ kind: 'user', m }); continue }
    if (m.role === 'tool' && !m.isError) continue
    const tail = out[out.length - 1]
    if (tail?.kind === 'assistant') tail.items.push(m)
    else out.push({ kind: 'assistant', id: m.id, items: [m] })
  }
  return out
}

/** The assistant is working: its mark pulses, the hint changes the longer the model takes. */
function Typing({ mode, onStop, stopping }: { mode: 'reply' | 'action'; onStop?: () => void; stopping?: boolean }) {
  const { t } = useTranslation()
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setSec((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  const hint = stopping ? t('assistant.stopping') : mode === 'action' ? t('assistant.typingAction') : sec < 5 ? t('assistant.typing1') : sec < 15 ? t('assistant.typing2') : t('assistant.typing3')
  return (
    <motion.div {...enter} className="flex items-center gap-3" data-chat-thinking data-chat-thinking-sec={sec}>
      <AssistantMark live className="max-sm:hidden" />
      <div className="flex h-7 min-w-0 items-center gap-2.5">
        <span className="flex shrink-0 items-center gap-1" aria-hidden>
          {[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }} />)}
        </span>
        <span className="ai-shimmer truncate text-[13.5px]" aria-live="polite">{hint}</span>
        {sec >= 8 && <span className="shrink-0 text-[11.5px] text-ink-3">{sec} s</span>}
        {onStop && !stopping && <button type="button" onClick={onStop} className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink" data-chat-stop-inline>{t('assistant.stop')}</button>}
      </div>
    </motion.div>
  )
}

export interface AssistantChatProps {
  threadId: Id | null
  unit: OrgUnit | null
  status: AssistantStatus
  /** start a conversation for the first message: create it and seed the cache this chat reads — without opening it */
  onCreate: () => Promise<AssistantThread>
  /** show a conversation (the page keeps which one is open) */
  onOpen: (id: Id) => void
  /** bumped when the employee asks for the composer (a new chat, a conversation picked from the history) */
  focusTick?: number
}

export function AssistantChat({ threadId, unit, status, onCreate, onOpen, focusTick = 0 }: AssistantChatProps) {
  const { t } = useTranslation()
  const me = useAuth((s) => s.staff)
  const pointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const roomy = useMediaQuery('(min-width: 640px)')
  const thread = useThread(threadId)
  const actions = useAssistantActions()
  const [draft, setDraft] = useState('')
  // what each conversation is waiting for — a reply in one does not block (or show up in) another
  const works = useAssistantWorks()
  // the conversation the first message has just created: until the page shows it (and the wait is filed under its
  // id) the new-chat view speaks for it, whichever of the two happens first
  const adopted = useRef<Id | null>(null)
  const drafts = useRef(new Map<string, string>())
  const draftNow = useRef(draft)
  draftNow.current = draft
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const [away, setAway] = useState(false)
  // the reader is at the end — content that grows later (a picture loading) keeps them there
  const pinned = useRef(true)
  const autoUntil = useRef(0)
  const shown = useRef<string | null>(null)

  const key = threadId ?? NEW
  const work = works[key] ?? (adopted.current && (threadId === null || threadId === adopted.current) ? (works[adopted.current] ?? works[NEW]) : undefined)
  const busy = !!work
  const outgoing = work?.mode === 'reply' ? work.content : null
  const messages = thread.data?.messages
  const turns = useMemo(() => toTurns(messages ?? []), [messages])
  const loading = !!threadId && thread.isLoading
  const hero = !loading && turns.length === 0 && !busy

  // every conversation keeps its own unsent text; the one a first message creates inherits what is being typed
  const prev = useRef(threadId)
  useEffect(() => {
    const from = prev.current
    prev.current = threadId
    if (from === threadId) return
    if (from === null && threadId === adopted.current) { adopted.current = null; return }
    drafts.current.set(from ?? NEW, draftNow.current)
    setDraft(drafts.current.get(threadId ?? NEW) ?? '')
  }, [threadId])
  // a keyboard is at hand → the composer is ready to type in (phones keep their keyboard down until asked)
  useEffect(() => { if (pointer) box.current?.focus({ preventScroll: true }) }, [threadId, pointer, focusTick])

  const toEnd = (smooth: boolean) => {
    const el = scroller.current
    if (!el) return
    pinned.current = true
    autoUntil.current = Date.now() + (smooth ? 800 : 0)
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }
  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight
    setAway(gap > 160)
    if (Date.now() > autoUntil.current) pinned.current = gap < 48
  }
  const count = messages?.length ?? 0
  const counted = useRef(0)
  const waited = useRef<'reply' | 'action' | null>(null)
  const mode = work?.mode ?? null
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || hero) { setAway(false); return }
    const grew = count > counted.current
    counted.current = count
    if (shown.current !== key) {
      // a conversation just opened: straight to its end, no ride through the history
      if (loading) return
      shown.current = key
      if (!mode) { waited.current = null; toEnd(false); return }
    }
    // waiting: the message just sent and the "working" mark stay in view
    if (mode) { waited.current = mode; toEnd(true); return }
    const was = waited.current
    waited.current = null
    // nothing new (a send that failed, a status that changed): the reader stays where they are
    if (!grew) return
    if (was === 'reply') {
      // an answer taller than the screen is read from the question down, not from its last line up
      const asks = el.querySelectorAll<HTMLElement>('[data-chat-msg^="user"]')
      const ask = asks[asks.length - 1]
      if (ask) {
        const top = ask.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop
        if (el.scrollHeight - top > el.clientHeight) {
          pinned.current = false
          autoUntil.current = Date.now() + 800
          el.scrollTo({ top: Math.max(0, top - 16), behavior: 'smooth' })
          return
        }
      }
      toEnd(true)
    } else if (was === 'action' || pinned.current) {
      // the outcome of a confirmed / declined write, or turns that arrived on their own while the reader was at the end
      toEnd(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scrolls when the conversation changes or grows, not on every render
  }, [key, count, mode, loading, hero])
  useEffect(() => {
    const el = content.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => { const sc = scroller.current; if (sc && pinned.current) sc.scrollTop = sc.scrollHeight })
    ro.observe(el)
    return () => ro.disconnect()
  }, [hero, loading])

  const submit = async (text?: string) => {
    const body = (text ?? draft).trim()
    if (!body || busy) return
    let id = threadId
    if (text === undefined || text === draft) setDraft('')
    actions.begin(id ?? NEW, { mode: 'reply', content: body })
    try {
      if (!id) {
        const th = await onCreate()
        id = th.id
        // the wait moves to the conversation that now exists, and the page opens it
        adopted.current = id
        actions.adopt(id)
        onOpen(id)
      }
      await actions.send(id, body, unit?.id)
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) toast.error(t('assistant.rateLimited'))
      else toast.error(errorMessage(e))
      // the text comes back to the composer of the conversation it was written in (unless something new is there)
      const home = id ?? NEW
      if (prev.current === id || (id !== null && adopted.current === id)) setDraft((cur) => cur || body)
      else if (!drafts.current.get(home)) drafts.current.set(home, body)
    } finally {
      // `send` ends the wait together with the reply; this covers a conversation that could not even be created
      if (!id) actions.end(NEW)
      if (pointer) box.current?.focus({ preventScroll: true })
    }
  }
  // the thread whose wait the employee asked to stop (until that wait ends)
  const [stoppingIn, setStoppingIn] = useState<Id | null>(null)
  const stopping = !!threadId && stoppingIn === threadId && busy
  const busyNow = useRef(busy)
  busyNow.current = busy
  useEffect(() => { if (!busy) setStoppingIn(null) }, [busy])
  const onStop = threadId ? () => {
    if (stoppingIn === threadId) return
    setStoppingIn(threadId)
    void actions.stop(threadId, () => busyNow.current).then((ok) => { if (!ok) setStoppingIn((cur) => (cur === threadId ? null : cur)) })
  } : undefined
  const onUndo = async (actionId: string) => {
    if (!threadId || works[threadId]) return
    try { await actions.undo(threadId, actionId) } catch (e) { toast.error(errorMessage(e)) }
  }
  const onResolve = async (actionId: string, confirm: boolean, word?: string) => {
    if (!threadId || works[threadId]) return
    try { await actions.resolve(threadId, actionId, confirm, word) } catch (e) { toast.error(errorMessage(e)) }
  }
  // several writes of one turn, answered together — and taken back together
  const onResolveMany = async (confirm: string[], cancel: string[]) => {
    if (!threadId || works[threadId]) return
    try { await actions.resolveMany(threadId, confirm, cancel) } catch (e) { toast.error(errorMessage(e)) }
  }
  const onUndoMany = async (ids: string[]) => {
    if (!threadId || works[threadId]) return
    try { await actions.undoMany(threadId, ids) } catch (e) { toast.error(errorMessage(e)) }
  }

  const examples = useMemo(() => {
    const mine = new Set(status.tools.map((x) => x.name))
    return EXAMPLES.filter((e) => !e.needs || mine.has(e.needs)).slice(0, 6).map((e) => ({ text: t(`assistant.${e.key}`), icon: e.icon }))
  }, [status.tools, t])
  const place = status.context ?? []
  const placeholder = busy ? t('assistant.composerBusy') : hero && roomy ? t('assistant.composerPlaceholder') : t('assistant.composerShort')
  const acting = work?.mode === 'action'

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', hero && 'overflow-y-auto')} data-assistant-chat data-chat-state={hero ? 'welcome' : 'thread'}>
      <div ref={scroller} onScroll={onScroll} className={cn('px-4 sm:px-6', hero ? 'mt-auto pt-6' : 'min-h-0 flex-1 overflow-y-auto pb-8 pt-2')} data-chat-scroll>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-ink-3" /></div> : hero ? (
          <motion.div {...enter} className="mx-auto max-w-2xl text-center" data-chat-welcome data-tour="assistant-welcome">
            <span className="mx-auto grid size-14 place-items-center rounded-[20px] bg-gradient-to-br from-brand to-brand-strong text-white shadow-2 dark:text-bg"><Sparkles className="size-7" /></span>
            <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.03em] sm:text-[32px]">{t('assistant.welcomeTitle', { name: me?.fullName.split(' ')[0] ?? '' })}</h1>
            <p className="mx-auto mt-2 max-w-xl text-[14.5px] leading-relaxed text-ink-2">{t('assistant.welcomeBody')}</p>
            {place.length > 0 && (
              <p className="mx-auto mt-3 inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-full bg-surface-2/60 px-3 py-1 text-[12.5px] text-ink-3" title={t('assistant.contextHint')} data-chat-context>
                <MapPin className="size-3.5 shrink-0 text-brand" />
                {place.map((step, i) => <span key={step.id} className={cn('inline-flex items-center gap-1.5', i === place.length - 1 && 'font-medium text-ink')} title={t(`org.level.${step.level}`)}>{i > 0 && <span aria-hidden className="text-ink-3/60">›</span>}{step.name}</span>)}
              </p>
            )}
          </motion.div>
        ) : (
          <div ref={content} className="mx-auto flex max-w-3xl flex-col gap-5">
            {turns.map((turn, i) => (
              <motion.div key={turn.kind === 'user' ? turn.m.id : turn.id} {...enter}>
                {turn.kind === 'user' ? (turn.m.scheduled ? <ScheduledMark content={turn.m.content} at={turn.m.createdAt} /> : <UserBubble content={turn.m.content} at={turn.m.createdAt} />) : <AssistantTurn items={turn.items} onResolve={(a, c, w) => void onResolve(a, c, w)} onResolveMany={(c, x) => void onResolveMany(c, x)} onUndo={(a) => void onUndo(a)} onUndoMany={(ids) => void onUndoMany(ids)} busy={acting} last={i === turns.length - 1 && !busy} onChoose={i === turns.length - 1 && !busy ? (option) => void submit(option) : undefined} />}
              </motion.div>
            ))}
            {outgoing && <motion.div {...enter}><UserBubble content={outgoing} pending /></motion.div>}
            {busy && <Typing mode={acting ? 'action' : 'reply'} onStop={onStop} stopping={stopping} />}
          </div>
        )}
      </div>

      <div className={cn('relative shrink-0 px-3 sm:px-6', hero ? 'mb-auto pb-8 pt-6' : 'pb-2 sm:pb-3')} data-chat-dock>
        {!hero && <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-bg to-transparent" aria-hidden />}
        <AnimatePresence>
          {!hero && away && (
            <motion.button type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.16 }} onClick={() => toEnd(true)} aria-label={t('assistant.scrollDown')} title={t('assistant.scrollDown')} data-chat-scroll-down
              className="absolute -top-12 left-1/2 z-10 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-line-strong/70 bg-bg-elevated text-ink-2 shadow-2 transition-colors hover:text-ink">
              <ArrowDown className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>
        <div className="mx-auto max-w-3xl">
          <Composer ref={box} value={draft} onChange={setDraft} onSubmit={() => void submit()} busy={busy} placeholder={placeholder} unit={unit} status={status} hero={hero} onStop={onStop} stopping={stopping} />
          {hero ? (
            <>
              <div className="mt-6" data-tour="assistant-examples">
                <div className="mb-2 px-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t('assistant.examples')}</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {examples.map(({ text, icon: Icon }) => (
                    <button key={text} type="button" onClick={() => void submit(text)} data-chat-example
                      className="group flex items-start gap-2.5 rounded-2xl border border-line bg-bg-elevated/70 p-3 text-left text-[13.5px] leading-snug text-ink-2 transition-[border-color,color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-brand/60 hover:text-ink hover:shadow-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-3 transition-colors group-hover:bg-brand-soft group-hover:text-brand"><Icon className="size-4" /></span>
                      <span className="min-w-0 pt-0.5">{text}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p data-tour="assistant-safety" className="mx-auto mt-6 max-w-2xl text-center text-[11.5px] leading-relaxed text-ink-3">{t('assistant.safety')}</p>
            </>
          ) : <p className="mt-1.5 text-center text-[11px] text-ink-3 max-sm:hidden">{busy && onStop ? t('assistant.stopHint') : t('assistant.sendHint')}</p>}
        </div>
      </div>
    </div>
  )
}
