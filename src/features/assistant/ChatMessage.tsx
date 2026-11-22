/**
 * The pieces of the assistant chat: the employee's bubble, the assistant's turn (Markdown reply, the tools it ran
 * as chips, the files it built, and — for a proposed write — the confirmation card the employee answers).
 */
import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Ban, Check, CheckCircle2, Clock, Download, Eye, FileImage, FileJson, FileSpreadsheet, FileText, FileType2, Loader2, PencilLine, ShieldCheck, Sparkles, X } from 'lucide-react'
import type { AssistantAction, AssistantFile, AssistantMessage, AssistantToolCall } from '@/domain'
import { repos } from '@/data'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDateTime, fmtRelative, fmtTime, isoDay } from '@/shared/lib/format'
import { Badge, Button, toast } from '@/shared/ui'
import { CopyButton } from './CopyButton'
import { Markdown } from './Markdown'

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)
type FileKind = 'xlsx' | 'csv' | 'json' | 'pdf' | 'docx' | 'image' | 'md' | 'txt'
function fileKind(f: AssistantFile): FileKind {
  const ct = f.contentType
  const ext = (f.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase()
  if (ct.startsWith('image/') || ext === 'png' || ext === 'svg' || ext === 'jpg') return 'image'
  if (ct.includes('pdf') || ext === 'pdf') return 'pdf'
  if (ct.includes('wordprocessingml') || ext === 'docx') return 'docx'
  if (ct.includes('spreadsheet') || ext === 'xlsx') return 'xlsx'
  if (ct.includes('json') || ext === 'json') return 'json'
  if (ct.includes('markdown') || ext === 'md') return 'md'
  if (ct.startsWith('text/plain') || ext === 'txt') return 'txt'
  return 'csv'
}
const KIND_ICON: Record<FileKind, typeof FileText> = { xlsx: FileSpreadsheet, csv: FileSpreadsheet, json: FileJson, pdf: FileType2, docx: FileText, image: FileImage, md: FileText, txt: FileText }
const KIND_LABEL: Record<FileKind, string> = { xlsx: 'XLSX', csv: 'CSV', json: 'JSON', pdf: 'PDF', docx: 'Word', image: 'Rasm', md: 'Markdown', txt: 'TXT' }

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

/** A picture a tool built, shown inline: fetched once with the caller's token (the server checks the owner). */
function ImagePreview({ file }: { file: AssistantFile }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    let obj: string | null = null
    repos.assistant.downloadFile(file.id).then((blob) => { if (alive) { obj = URL.createObjectURL(blob); setUrl(obj) } }).catch(() => undefined)
    return () => { alive = false; if (obj) URL.revokeObjectURL(obj) }
  }, [file.id])
  if (!url) return <div className="mt-2.5 h-40 w-full animate-pulse rounded-xl bg-surface-2" data-file-preview="loading" />
  return <img src={url} alt={file.name} className="mt-2.5 max-h-96 w-auto max-w-full rounded-xl border border-line bg-white" data-file-preview="ready" />
}

/** A file a tool built: kind, name, size, rows, one button that downloads it (owner-only on the server); pictures preview inline. */
export function FileCard({ file }: { file: AssistantFile }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const kind = fileKind(file)
  const Icon = KIND_ICON[kind]
  const expired = new Date(file.expiresAt).getTime() < Date.now()
  const download = async () => {
    setBusy(true)
    try { saveBlob(await repos.assistant.downloadFile(file.id), file.name) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const tone = kind === 'xlsx' || kind === 'csv' ? 'bg-ok-soft text-ok' : kind === 'pdf' ? 'bg-danger-soft text-danger' : kind === 'docx' ? 'bg-brand-soft text-brand' : kind === 'image' ? 'bg-warn-soft text-warn' : 'bg-surface-2 text-ink-2'
  return (
    <div className="max-w-xl rounded-2xl border border-line bg-bg-elevated p-3 shadow-1 transition-colors hover:border-line-strong" data-assistant-file={file.id} data-file-kind={kind}>
      <div className="flex items-center gap-3">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-medium" title={file.name}>{file.name}</div>
          <div className="text-[12px] text-ink-3">
            {KIND_LABEL[kind]} · {fmtSize(file.size)}{typeof file.rows === 'number' && kind !== 'image' && <> · {t('assistant.file.rows', { n: file.rows })}</>}
            {expired && <> · <span className="text-warn">{t('assistant.file.expired')}</span></>}
          </div>
        </div>
        <Button size="sm" variant="secondary" className="max-xs:px-2" leftIcon={busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} disabled={busy || expired} onClick={() => void download()} aria-label={t('assistant.file.download')} data-file-download><span className="max-xs:hidden">{t('assistant.file.download')}</span></Button>
      </div>
      {kind === 'image' && !expired && <ImagePreview file={file} />}
    </div>
  )
}

function ToolChip({ c }: { c: AssistantToolCall }) {
  const done = c.status === 'ok' || c.status === 'done'
  const bad = c.status === 'error' || c.status === 'failed'
  const waiting = c.status === 'pending'
  return (
    <span title={c.summary || c.name} data-tool-chip={c.name}
      className={cn('inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border px-2 text-[12px]', bad ? 'border-danger/40 bg-danger-soft/60 text-danger' : waiting ? 'border-warn/40 bg-warn-soft/60 text-warn' : 'border-line bg-surface/70 text-ink-3')}>
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
    <div className={cn('max-w-xl rounded-2xl border p-3.5', pending ? 'border-warn/50 bg-warn-soft/40 shadow-1' : 'border-line bg-surface/60')} data-assistant-action={action.id} data-action-status={action.status}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', pending ? 'bg-warn/15 text-warn' : 'bg-surface-2 text-ink-2')}>{pending ? <ShieldCheck className="size-4" /> : action.status === 'done' ? <CheckCircle2 className="size-4 text-ok" /> : <Ban className="size-4" />}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">{pending ? t('assistant.action.title') : action.title}</div>
          {pending && <div className="text-[12px] text-ink-3">{t('assistant.action.hint')}</div>}
        </div>
        <Badge tone={tone} size="sm">{t(`assistant.action.${action.status}`)}</Badge>
      </div>
      {(pending || args.length > 0 || action.error) && <div className="mt-2.5 rounded-xl border border-line/70 bg-bg-elevated px-3 py-2 text-[13px]">
        {pending && <div className="mb-1 flex items-center gap-2 font-medium"><PencilLine className="size-3.5 text-ink-3" />{action.title}</div>}
        {args.length > 0 && (
          <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12.5px]">
            {args.map(([k, v]) => <Fragment key={k}><dt className="font-mono text-ink-3">{k}</dt><dd className="truncate">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></Fragment>)}
          </dl>
        )}
        {action.error && <p className="mt-1 text-[12.5px] text-danger">{action.error}</p>}
      </div>}
      {pending && onResolve && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" leftIcon={busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} disabled={busy} onClick={() => onResolve(action.id, true)} data-action-confirm>{t('assistant.action.confirm')}</Button>
          <Button size="sm" variant="secondary" leftIcon={<X className="size-4" />} disabled={busy} onClick={() => onResolve(action.id, false)} data-action-cancel>{t('assistant.action.cancel')}</Button>
          <span className="ml-auto text-[11.5px] text-ink-3">{t('assistant.action.expiresIn', { when: fmtRelative(action.expiresAt) })}</span>
        </div>
      )}
    </div>
  )
}


/** `14:05` for today, the full date and time for an older turn. */
const stamp = (iso: string) => (isoDay(new Date(iso)) === isoDay() ? fmtTime(iso) : fmtDateTime(iso))

/** The employee's bubble; `pending` = sent, the server has not answered yet (shown at once, slightly dimmed). */
export function UserBubble({ content, pending, at }: { content: string; pending?: boolean; at?: string }) {
  const { t } = useTranslation()
  return (
    <div className="group/msg flex flex-col items-end" data-chat-msg={pending ? 'user-outgoing' : 'user'}>
      <div className={cn('max-w-[85%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-lg bg-brand-soft px-4 py-2.5 text-[14.5px] leading-relaxed text-ink transition-opacity', pending && 'opacity-70')}>{content}</div>
      {pending ? <span className="mt-1 inline-flex h-7 items-center gap-1.5 pr-1 text-[11.5px] text-ink-3"><Loader2 className="size-3 animate-spin" />{t('assistant.sending')}</span> : (
        <div className="-mb-3 mt-0.5 flex h-7 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/msg:opacity-100" data-chat-msg-tools>
          {at && <time dateTime={at} className="px-1 text-[11.5px] text-ink-3">{stamp(at)}</time>}
          <CopyButton text={content} label={t('assistant.copy')} doneLabel={t('assistant.copied')} />
        </div>
      )}
    </div>
  )
}

/** One stored turn: the employee's bubble, a failed tool as a small red line, or a piece of the assistant's answer. */
export function ChatMessage({ m, onResolve, busy }: { m: AssistantMessage; onResolve?: (id: string, confirm: boolean) => void; busy?: boolean }) {
  const { t } = useTranslation()
  if (m.role === 'user') return <UserBubble content={m.content} at={m.createdAt} />
  if (m.role === 'tool') {
    return m.isError ? <div className="flex justify-start" data-chat-msg="tool"><div className="inline-flex h-6 items-center gap-1.5 rounded-full border border-danger/30 bg-danger-soft/50 px-2.5 text-[12px] text-danger"><AlertTriangle className="size-3.5" />{t('assistant.toolError')} · {m.toolName}</div></div> : null
  }
  const empty = !m.content.trim()
  return (
    <div className="min-w-0 space-y-2.5" data-chat-msg="assistant">
      {m.toolCalls.length > 0 && <div className="flex flex-wrap gap-1.5">{m.toolCalls.map((c) => <ToolChip key={c.id} c={c} />)}</div>}
      {!empty && <Markdown text={m.content} />}
      {(m.files ?? []).map((f) => <FileCard key={f.id} file={f} />)}
      {m.action && <ActionCard action={m.action} onResolve={onResolve} busy={busy} />}
    </div>
  )
}

/**
 * The assistant's side of an exchange: everything it said and did between two messages of the employee, under
 * one mark, with the time and a "copy" for the text it wrote.
 */
export function AssistantTurn({ items, onResolve, busy, last }: { items: AssistantMessage[]; onResolve?: (id: string, confirm: boolean) => void; busy?: boolean; last?: boolean }) {
  const { t } = useTranslation()
  const text = items.filter((m) => m.role === 'assistant' && m.content.trim()).map((m) => m.content.trim()).join('\n\n')
  const at = items[items.length - 1]?.createdAt
  return (
    <div className="group/msg flex gap-3" data-chat-turn="assistant">
      <AssistantMark className="mt-0.5 max-sm:hidden" />
      <div className="min-w-0 flex-1">
        <div className="space-y-2.5">{items.map((m) => <ChatMessage key={m.id} m={m} onResolve={onResolve} busy={busy} />)}</div>
        <div className={cn('mt-1 flex h-7 items-center gap-1 transition-opacity focus-within:opacity-100 group-hover/msg:opacity-100 [@media(hover:none)]:opacity-100', !last && 'opacity-0')} data-chat-msg-tools>
          {text && <CopyButton text={text} label={t('assistant.copy')} doneLabel={t('assistant.copied')} className="-ml-1.5" />}
          {at && <time dateTime={at} className="px-1 text-[11.5px] text-ink-3">{stamp(at)}</time>}
        </div>
      </div>
    </div>
  )
}

/** The assistant's mark — the small spark the answers hang from; `live` = it is working right now. */
export function AssistantMark({ live, className }: { live?: boolean; className?: string }) {
  return (
    <span className={cn('relative grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand', className)} aria-hidden>
      {live && <span className="absolute inset-0 animate-ping rounded-full bg-brand/25 [animation-duration:1.6s]" />}
      <Sparkles className="relative size-3.5" />
    </span>
  )
}
