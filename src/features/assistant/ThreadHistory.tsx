/**
 * The history of the caller's conversations: a new chat, a search by title, the threads grouped by when they were
 * last touched, and — per thread — rename and delete. A conversation that belongs to a scheduled task wears a
 * clock, and a dot while its newest answer is unread. Lives in the panel the page opens with a button.
 */

/** the title of a scheduled task's conversation carries a clock sign of its own — the row shows an icon instead */
export const threadTitle = (th: { title: string; scheduleId?: string | null }, untitled: string) => (th.scheduleId ? th.title.replace(/^⏰\s*/, '') : th.title) || untitled
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, Ellipsis, MessagesSquare, PencilLine, Search, SquarePen, Trash2, X } from 'lucide-react'
import type { AssistantThread, Id } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { fmtDateTime } from '@/shared/lib/format'
import { Kbd, Menu, Skeleton } from '@/shared/ui'

type Bucket = 'today' | 'yesterday' | 'week' | 'month' | 'older'
const BUCKETS: Bucket[] = ['today', 'yesterday', 'week', 'month', 'older']
const DAY = 86_400_000
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
function bucketOf(iso: string, today: number): Bucket {
  const days = Math.round((today - dayStart(new Date(iso))) / DAY)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days <= 7 ? 'week' : days <= 30 ? 'month' : 'older'
}

/** The title being edited in place: Enter or leaving the field saves, Esc gives up. */
export function RenameInput({ value, onSave, onCancel, className }: { value: string; onSave: (title: string) => void; onCancel: () => void; className?: string }) {
  const { t } = useTranslation()
  const [text, setText] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  const closed = useRef(false)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  const finish = (save: boolean) => {
    if (closed.current) return
    closed.current = true
    const title = text.trim()
    if (save && title && title !== value.trim()) onSave(title)
    else onCancel()
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); finish(true) }
    if (e.key === 'Escape') { e.preventDefault(); finish(false) }
  }
  return (
    <input ref={ref} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={() => finish(true)} onClick={(e) => e.stopPropagation()}
      aria-label={t('assistant.renameThread')} data-thread-rename
      className={cn('h-8 w-full min-w-0 rounded-lg border border-brand bg-surface px-2 text-[13.5px] text-ink outline-none ring-4 ring-brand/12', className)} />
  )
}

export interface ThreadHistoryProps {
  threads: AssistantThread[] | undefined
  loading: boolean
  active: Id | null
  onOpen: (id: Id) => void
  onNew: () => void
  onRename: (id: Id, title: string) => void
  onDelete: (thread: AssistantThread) => void
  /** shown on small screens, where the panel lies over the chat */
  onClose?: () => void
  footer?: ReactNode
}

export function ThreadHistory({ threads, loading, active, onOpen, onNew, onRename, onDelete, onClose, footer }: ThreadHistoryProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Id | null>(null)

  const groups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    const today = dayStart(new Date())
    const by = new Map<Bucket, AssistantThread[]>()
    for (const th of threads ?? []) {
      if (q && !threadTitle(th, t('assistant.untitled')).toLocaleLowerCase().includes(q)) continue
      const b = bucketOf(th.lastMessageAt ?? th.createdAt, today)
      by.set(b, [...(by.get(b) ?? []), th])
    }
    return BUCKETS.filter((b) => by.has(b)).map((b) => ({ bucket: b, items: by.get(b)! }))
  }, [threads, query, t])
  const total = threads?.length ?? 0

  return (
    <div className="flex h-full flex-col" data-thread-history>
      <div className="flex h-12 shrink-0 items-center gap-2 pl-4 pr-2">
        <span className="text-[13.5px] font-semibold">{t('assistant.threads')}</span>
        {total > 0 && <span className="rounded-full bg-surface-2 px-1.5 py-px text-[11px] font-medium text-ink-3">{total}</span>}
        {onClose && <button type="button" onClick={onClose} aria-label={t('assistant.hideHistory')} className="ml-auto grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"><X className="size-4" /></button>}
      </div>

      <div className="shrink-0 space-y-2 px-3 pb-2">
        <button type="button" onClick={onNew} data-thread-new="panel"
          className="group flex h-10 w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-[13.5px] font-medium text-ink shadow-1 transition-colors hover:border-brand/60 hover:bg-brand-soft/40">
          <SquarePen className="size-4 text-brand" />{t('assistant.newThread')}
          <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 max-lg:hidden"><Kbd>N</Kbd></span>
        </button>
        {total > 0 && (
          <label className="flex h-9 items-center gap-2 rounded-xl bg-surface-2/70 px-3 text-ink-3 transition-colors focus-within:bg-surface-2 focus-within:text-ink">
            <Search className="size-3.5 shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape' && query) { e.stopPropagation(); setQuery('') } }} placeholder={t('assistant.searchThreads')} aria-label={t('assistant.searchThreads')}
              className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3" data-thread-search />
            {query && <button type="button" onClick={() => setQuery('')} aria-label={t('common.close')} className="grid size-5 place-items-center rounded-full hover:bg-surface-3"><X className="size-3" /></button>}
          </label>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" data-thread-list>
        {loading && !threads && <div className="space-y-1.5 px-1 pt-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>}
        {!loading && total === 0 && (
          <div className="px-4 py-10 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-full bg-surface-2 text-ink-3"><MessagesSquare className="size-5" /></span>
            <p className="mt-2.5 text-[13px] text-ink-3">{t('assistant.noThreads')}</p>
          </div>
        )}
        {total > 0 && groups.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-ink-3" data-thread-nomatch>{t('assistant.noMatches')}</p>}
        {groups.map((g) => (
          <section key={g.bucket} className="pt-2" data-thread-group={g.bucket}>
            <h3 className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">{t(`assistant.group.${g.bucket}`)}</h3>
            <ul className="space-y-px">
              {g.items.map((th) => {
                const on = active === th.id
                const title = threadTitle(th, t('assistant.untitled'))
                if (editing === th.id) {
                  return <li key={th.id} className="px-0.5 py-0.5"><RenameInput value={th.title} onSave={(v) => { setEditing(null); onRename(th.id, v) }} onCancel={() => setEditing(null)} /></li>
                }
                return (
                  <li key={th.id}>
                    <div role="button" tabIndex={0} aria-current={on ? 'true' : undefined} title={`${title}\n${fmtDateTime(th.lastMessageAt ?? th.createdAt)}`}
                      onClick={() => onOpen(th.id)} onDoubleClick={() => setEditing(th.id)}
                      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(th.id) } if (e.key === 'F2') setEditing(th.id) }}
                      className={cn('group/row relative flex h-9 items-center rounded-lg pl-2.5 pr-1 text-[13.5px] outline-offset-[-2px] transition-colors', on ? 'bg-brand-soft/70 font-medium text-brand-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')} data-thread-row={th.id}>
                      {th.scheduleId && <CalendarClock className={cn('mr-1.5 size-3.5 shrink-0', on ? 'text-brand' : 'text-ink-3')} aria-label={t('assistant.schedule.mark')} data-thread-scheduled />}
                      <span className={cn('min-w-0 flex-1 truncate', th.unread && !on && 'font-semibold text-ink')}>{title}</span>
                      {th.unread && !on && <span className="mr-1 size-2 shrink-0 rounded-full bg-accent" title={t('assistant.schedule.unread')} data-thread-unread />}
                      <span className={cn('shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100', on && 'opacity-100')} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Menu
                          trigger={(open) => <button type="button" aria-label={t('assistant.threadMenu')} title={t('assistant.threadMenu')} aria-expanded={open} className={cn('grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-ink', open && 'bg-surface-3 text-ink')} data-thread-menu><Ellipsis className="size-4" /></button>}
                          items={[
                            { key: 'rename', label: t('assistant.renameThread'), icon: <PencilLine />, onSelect: () => setEditing(th.id) },
                            { key: 'delete', label: t('assistant.deleteThread'), icon: <Trash2 />, danger: true, separatorBefore: true, onSelect: () => onDelete(th) },
                          ]} />
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      {footer && <div className="shrink-0 border-t border-line p-2">{footer}</div>}
    </div>
  )
}
