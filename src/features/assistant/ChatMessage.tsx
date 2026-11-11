/**
 * One turn of the assistant chat: the user's bubble, the assistant's Markdown reply with the tools it ran as
 * chips, and — for a proposed write — the confirmation card the employee answers.
 */
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Ban, Check, CheckCircle2, Clock, Eye, Loader2, PencilLine, ShieldCheck, X } from 'lucide-react'
import type { AssistantAction, AssistantMessage, AssistantToolCall } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { fmtRelative } from '@/shared/lib/format'
import { Badge, Button } from '@/shared/ui'
import { Markdown } from './Markdown'

function ToolChip({ c }: { c: AssistantToolCall }) {
  const done = c.status === 'ok' || c.status === 'done'
  const bad = c.status === 'error' || c.status === 'failed'
  const waiting = c.status === 'pending'
  return (
    <span title={c.summary || c.name} data-tool-chip={c.name}
      className={cn('inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px]', bad ? 'border-danger/40 bg-danger-soft/60 text-danger' : waiting ? 'border-warn/40 bg-warn-soft/60 text-warn' : 'border-line bg-surface text-ink-2')}>
      {c.kind === 'write' ? <PencilLine className="size-3" /> : <Eye className="size-3" />}
      <span className="truncate">{c.title}</span>
      {done && <Check className="size-3 text-ok" />}
      {bad && <AlertTriangle className="size-3" />}
      {waiting && <Clock className="size-3" />}
      {c.status === 'cancelled' && <Ban className="size-3 text-ink-3" />}
    </span>
  )
}

export function ActionCard({ action, onResolve, busy }: { action: AssistantAction; onResolve?: (id: string, confirm: boolean) => void; busy?: boolean }) {
  const { t } = useTranslation()
  const pending = action.status === 'pending'
  const tone = action.status === 'done' ? 'ok' : action.status === 'failed' ? 'danger' : pending ? 'warn' : 'neutral'
  const args = Object.entries(action.args ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== '')
  return (
    <div className={cn('mt-2 rounded-[var(--radius)] border p-3', pending ? 'border-warn/50 bg-warn-soft/40' : 'border-line bg-surface/60')} data-assistant-action={action.id} data-action-status={action.status}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', pending ? 'bg-warn/15 text-warn' : 'bg-surface-2 text-ink-2')}>{pending ? <ShieldCheck className="size-4" /> : action.status === 'done' ? <CheckCircle2 className="size-4 text-ok" /> : <Ban className="size-4" />}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">{pending ? t('assistant.action.title') : action.title}</div>
          {pending && <div className="text-[12px] text-ink-3">{t('assistant.action.hint')}</div>}
        </div>
        <Badge tone={tone} size="sm">{t(`assistant.action.${action.status}`)}</Badge>
      </div>
      <div className="mt-2 rounded-lg border border-line/70 bg-bg-elevated px-3 py-2 text-[13px]">
        <div className="mb-1 flex items-center gap-2 font-medium"><PencilLine className="size-3.5 text-ink-3" />{action.title}</div>
        {args.length > 0 && (
          <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12.5px]">
            {args.map(([k, v]) => <Fragment key={k}><dt className="font-mono text-ink-3">{k}</dt><dd className="truncate">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></Fragment>)}
          </dl>
        )}
        {action.error && <p className="mt-1 text-[12.5px] text-danger">{action.error}</p>}
      </div>
      {pending && onResolve && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Button size="sm" leftIcon={busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} disabled={busy} onClick={() => onResolve(action.id, true)} data-action-confirm>{t('assistant.action.confirm')}</Button>
          <Button size="sm" variant="secondary" leftIcon={<X className="size-4" />} disabled={busy} onClick={() => onResolve(action.id, false)} data-action-cancel>{t('assistant.action.cancel')}</Button>
          <span className="ml-auto text-[11.5px] text-ink-3">{t('assistant.action.expiresIn', { when: fmtRelative(action.expiresAt) })}</span>
        </div>
      )}
    </div>
  )
}


export function ChatMessage({ m, onResolve, busy }: { m: AssistantMessage; onResolve?: (id: string, confirm: boolean) => void; busy?: boolean }) {
  const { t } = useTranslation()
  if (m.role === 'user') {
    return (
      <div className="flex justify-end" data-chat-msg="user">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-[14px] leading-relaxed text-white shadow-1">{m.content}</div>
      </div>
    )
  }
  if (m.role === 'tool') {
    return m.isError ? <div className="flex justify-start" data-chat-msg="tool"><div className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger-soft/50 px-2.5 py-1 text-[12px] text-danger"><AlertTriangle className="size-3.5" />{t('assistant.toolError')} · {m.toolName}</div></div> : null
  }
  const empty = !m.content.trim()
  return (
    <div className="flex justify-start" data-chat-msg="assistant">
      <div className="max-w-[92%] min-w-0">
        {m.toolCalls.length > 0 && <div className="mb-1 flex flex-wrap gap-1.5">{m.toolCalls.map((c) => <ToolChip key={c.id} c={c} />)}</div>}
        {!empty && <div className="rounded-2xl rounded-bl-md border border-line bg-bg-elevated px-3.5 py-2.5 shadow-1"><Markdown text={m.content} /></div>}
        {m.action && <ActionCard action={m.action} onResolve={onResolve} busy={busy} />}
      </div>
    </div>
  )
}
