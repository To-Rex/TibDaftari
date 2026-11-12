/**
 * One turn of the assistant chat: the user's bubble, the assistant's Markdown reply with the tools it ran as
 * chips, and — for a proposed write — the confirmation card the employee answers.
 */
import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Ban, Check, CheckCircle2, Clock, Download, Eye, FileJson, FileSpreadsheet, FileText, Loader2, PencilLine, ShieldCheck, X } from 'lucide-react'
import type { AssistantAction, AssistantFile, AssistantMessage, AssistantToolCall } from '@/domain'
import { repos } from '@/data'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtRelative } from '@/shared/lib/format'
import { Badge, Button, toast } from '@/shared/ui'
import { Markdown } from './Markdown'

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)
const fileKind = (f: AssistantFile) => (/spreadsheet|excel/.test(f.contentType) || /\.xlsx?$/i.test(f.name) ? 'xlsx' : /json/.test(f.contentType) || /\.json$/i.test(f.name) ? 'json' : 'csv')

/** Save a blob through a temporary link — the browser's own download, named as the server named it. */
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/** A file a tool built: name, size, rows, one button that downloads it (owner-only on the server). */
export function FileCard({ file }: { file: AssistantFile }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const kind = fileKind(file)
  const Icon = kind === 'xlsx' ? FileSpreadsheet : kind === 'json' ? FileJson : FileText
  const expired = new Date(file.expiresAt).getTime() < Date.now()
  const download = async () => {
    setBusy(true)
    try { saveBlob(await repos.assistant.downloadFile(file.id), file.name) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <div className="mt-2 flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface/70 px-3 py-2.5" data-assistant-file={file.id} data-file-kind={kind}>
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', kind === 'xlsx' ? 'bg-ok-soft text-ok' : 'bg-surface-2 text-ink-2')}><Icon className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium" title={file.name}>{file.name}</div>
        <div className="text-[12px] text-ink-3">
          {kind.toUpperCase()} · {fmtSize(file.size)}{typeof file.rows === 'number' && <> · {t('assistant.file.rows', { n: file.rows })}</>}
          {expired && <> · <span className="text-warn">{t('assistant.file.expired')}</span></>}
        </div>
      </div>
      <Button size="sm" leftIcon={busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} disabled={busy || expired} onClick={() => void download()} data-file-download>{t('assistant.file.download')}</Button>
    </div>
  )
}

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


/** The employee's bubble; `pending` = sent, the server has not answered yet (shown at once, slightly dimmed). */
export function UserBubble({ content, pending }: { content: string; pending?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-end" data-chat-msg={pending ? 'user-outgoing' : 'user'}>
      <div className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-[14px] leading-relaxed text-white shadow-1 transition-opacity', pending && 'opacity-75')}>{content}</div>
      {pending && <span className="mt-0.5 inline-flex items-center gap-1 pr-1 text-[11px] text-ink-3"><Loader2 className="size-3 animate-spin" />{t('assistant.sending')}</span>}
    </div>
  )
}

export function ChatMessage({ m, onResolve, busy }: { m: AssistantMessage; onResolve?: (id: string, confirm: boolean) => void; busy?: boolean }) {
  const { t } = useTranslation()
  if (m.role === 'user') return <UserBubble content={m.content} />
  if (m.role === 'tool') {
    return m.isError ? <div className="flex justify-start" data-chat-msg="tool"><div className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger-soft/50 px-2.5 py-1 text-[12px] text-danger"><AlertTriangle className="size-3.5" />{t('assistant.toolError')} · {m.toolName}</div></div> : null
  }
  const empty = !m.content.trim()
  return (
    <div className="flex justify-start" data-chat-msg="assistant">
      <div className="max-w-[92%] min-w-0">
        {m.toolCalls.length > 0 && <div className="mb-1 flex flex-wrap gap-1.5">{m.toolCalls.map((c) => <ToolChip key={c.id} c={c} />)}</div>}
        {!empty && <div className="rounded-2xl rounded-bl-md border border-line bg-bg-elevated px-3.5 py-2.5 shadow-1"><Markdown text={m.content} /></div>}
        {(m.files ?? []).map((f) => <FileCard key={f.id} file={f} />)}
        {m.action && <ActionCard action={m.action} onResolve={onResolve} busy={busy} />}
      </div>
    </div>
  )
}
