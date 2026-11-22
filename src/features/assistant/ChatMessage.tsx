/**
 * The pieces of the assistant chat: the employee's bubble, the assistant's turn (Markdown reply, the tools it ran
 * as chips, the files it built, and — for a proposed write — the confirmation card the employee answers).
 */
import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Ban, Check, CheckCircle2, Clock, Download, Eye, FileImage, FileJson, FileSpreadsheet, FileText, FileType2, Loader2, PencilLine, ShieldCheck, Sparkles, Square, Undo2, X } from 'lucide-react'
import type { AssistantAction, AssistantChoices, AssistantFile, AssistantMessage, AssistantToolCall } from '@/domain'
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

type Resolve = (id: string, confirm: boolean, word?: string) => void

/**
 * A write the assistant proposed: what it touches (ids already turned into names by the server), and the yes / no.
 * An irreversible one says so in red and, when the server asks for it, takes the word the employee types.
 */
export function ActionCard({ action, onResolve, onUndo, busy }: { action: AssistantAction; onResolve?: Resolve; /** take the done write back */ onUndo?: (id: string) => void; busy?: boolean }) {
  const { t } = useTranslation()
  const [word, setWord] = useState('')
  // "undo" asks once more before it runs — it is a write of its own
  const [asking, setAsking] = useState(false)
  const pending = action.status === 'pending'
  const danger = !!action.danger
  const undone = !!action.undo?.undoneAt
  const canUndo = action.status === 'done' && !!action.undo?.available && !!onUndo
  const tone = undone ? 'neutral' : action.status === 'done' ? 'ok' : action.status === 'failed' ? 'danger' : pending ? (danger ? 'danger' : 'warn') : 'neutral'
  const rows = action.details?.length
    ? action.details.map((d) => ({ label: d.label, value: d.value, raw: false }))
    : Object.entries(action.args ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => ({ label: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v), raw: true }))
  const needsWord = pending && !!action.confirmWord
  const wordOk = !needsWord || word.trim().toLowerCase() === (action.confirmWord ?? '').trim().toLowerCase()
  return (
    <div className={cn('max-w-xl rounded-2xl border p-3.5', pending ? (danger ? 'border-danger/50 bg-danger-soft/40 shadow-1' : 'border-warn/50 bg-warn-soft/40 shadow-1') : 'border-line bg-surface/60')}
      data-assistant-action={action.id} data-action-status={action.status} data-action-danger={danger || undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('grid size-7 shrink-0 place-items-center rounded-lg', pending ? (danger ? 'bg-danger/15 text-danger' : 'bg-warn/15 text-warn') : 'bg-surface-2 text-ink-2')}>
          {pending ? (danger ? <AlertTriangle className="size-4" /> : <ShieldCheck className="size-4" />) : undone ? <Undo2 className="size-4" /> : action.status === 'done' ? <CheckCircle2 className="size-4 text-ok" /> : <Ban className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">{pending ? t(danger ? 'assistant.action.dangerTitle' : 'assistant.action.title') : action.title}</div>
          {pending && <div className="text-[12px] text-ink-3">{t(danger ? 'assistant.action.dangerHint' : 'assistant.action.hint')}</div>}
        </div>
        <Badge tone={tone} size="sm">{undone ? t('assistant.action.undone') : t(`assistant.action.${action.status}`)}</Badge>
      </div>
      {(pending || rows.length > 0 || action.error) && <div className="mt-2.5 rounded-xl border border-line/70 bg-bg-elevated px-3 py-2 text-[13px]">
        {pending && <div className="mb-1.5 flex items-center gap-2 font-medium"><PencilLine className="size-3.5 text-ink-3" />{action.title}</div>}
        {rows.length > 0 && (
          <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12.5px]" data-action-details>
            {rows.map((r, i) => <Fragment key={i}><dt className={cn('max-w-[11rem] text-ink-3', r.raw && 'font-mono')}>{r.label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words">{r.value}</dd></Fragment>)}
          </dl>
        )}
        {action.error && <p className="mt-1 text-[12.5px] text-danger">{action.error}</p>}
      </div>}
      {needsWord && onResolve && (
        <label className="mt-3 block text-[12.5px] text-ink-2">
          {t('assistant.action.typeWord', { word: action.confirmWord })}
          <input value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" spellCheck={false} placeholder={action.confirmWord ?? ''} data-action-word
            className="mt-1 h-9 w-full rounded-lg border border-danger/40 bg-bg-elevated px-2.5 font-mono text-[13.5px] text-ink outline-none transition-shadow placeholder:text-ink-3/60 focus:border-danger focus:ring-4 focus:ring-danger/12" />
        </label>
      )}
      {pending && onResolve && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={danger ? 'danger' : 'primary'} leftIcon={busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} disabled={busy || !wordOk} onClick={() => onResolve(action.id, true, needsWord ? word.trim() : undefined)} data-action-confirm>{t('assistant.action.confirm')}</Button>
          <Button size="sm" variant="secondary" leftIcon={<X className="size-4" />} disabled={busy} onClick={() => onResolve(action.id, false)} data-action-cancel>{t('assistant.action.cancel')}</Button>
          <span className="ml-auto text-[11.5px] text-ink-3">{t('assistant.action.expiresIn', { when: fmtRelative(action.expiresAt) })}</span>
        </div>
      )}
      {pending && <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-3" data-action-undoable={action.undoable ? 'yes' : 'no'}><Undo2 className="size-3.5 shrink-0" />{t(action.undoable ? 'assistant.undo.willBePossible' : 'assistant.undo.willNotBePossible')}</p>}
      {canUndo && (asking ? (
        <div className="mt-3 rounded-xl border border-line bg-bg-elevated px-3 py-2.5" data-action-undo-ask>
          <p className="text-[12.5px] text-ink-2">{t('assistant.undo.ask')} {action.undo?.label}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" leftIcon={busy ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />} disabled={busy} onClick={() => { setAsking(false); onUndo?.(action.id) }} data-action-undo-yes>{t('assistant.undo.yes')}</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => setAsking(false)}>{t('assistant.undo.no')}</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" leftIcon={<Undo2 className="size-4" />} disabled={busy} onClick={() => setAsking(true)} data-action-undo>{t('assistant.undo.button')}</Button>
          {action.undo?.until && <span className="text-[11.5px] text-ink-3">{t('assistant.undo.until', { when: fmtRelative(action.undo.until) })}</span>}
        </div>
      ))}
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

/** A question of the assistant with ready answers: tapping one sends it; once answered (or no longer the last word) the buttons rest. */
export function Choices({ choices, shown, onChoose }: { choices: AssistantChoices; /** the question is already in the message text */ shown?: boolean; onChoose?: (option: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="max-w-xl" data-chat-choices={onChoose ? 'open' : 'closed'}>
      {!shown && choices.question && <p className="mb-2 text-[14.5px] leading-[1.7]">{choices.question}</p>}
      <div className="flex flex-wrap gap-1.5">
        {choices.options.map((o) => (
          <button key={o} type="button" disabled={!onChoose} onClick={() => onChoose?.(o)} data-chat-choice
            className={cn('min-h-9 max-w-full rounded-2xl border px-3 py-1.5 text-left text-[13.5px] leading-snug transition-[background-color,border-color,color,transform]', onChoose ? 'border-brand/40 bg-brand-soft/50 text-brand-ink hover:-translate-y-px hover:border-brand hover:bg-brand-soft' : 'cursor-default border-line bg-surface/60 text-ink-3')}>
            {o}
          </button>
        ))}
      </div>
      {onChoose && <p className="mt-1.5 text-[11.5px] text-ink-3">{t('assistant.choices.hint')}</p>}
    </div>
  )
}

/** One stored turn: the employee's bubble, a failed tool as a small red line, or a piece of the assistant's answer. */
export function ChatMessage({ m, onResolve, onUndo, busy, onChoose }: { m: AssistantMessage; onResolve?: Resolve; onUndo?: (id: string) => void; busy?: boolean; onChoose?: (option: string) => void }) {
  const { t } = useTranslation()
  if (m.role === 'user') return <UserBubble content={m.content} at={m.createdAt} />
  if (m.role === 'tool') {
    return m.isError ? <div className="flex justify-start" data-chat-msg="tool"><div className="inline-flex h-6 items-center gap-1.5 rounded-full border border-danger/30 bg-danger-soft/50 px-2.5 text-[12px] text-danger"><AlertTriangle className="size-3.5" />{t('assistant.toolError')} · {m.toolName}</div></div> : null
  }
  // the run was stopped here: a quiet mark instead of the note kept for the model
  if (m.stopped) return <div className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface/60 px-2.5 text-[12.5px] text-ink-3" data-chat-msg="stopped"><Square className="size-3 fill-current" />{t('assistant.stopped')}</div>
  // a write was taken back: said plainly, with the mark of the way back
  if (m.undoOf) return <div className="flex max-w-xl items-start gap-2 rounded-2xl border border-line bg-surface/60 px-3 py-2 text-[13.5px] leading-relaxed text-ink-2" data-chat-msg="undo"><Undo2 className="mt-0.5 size-4 shrink-0 text-brand" /><span className="min-w-0 break-words">{m.content.replace(/^↩\s*/, '')}</span></div>
  const empty = !m.content.trim()
  return (
    <div className="min-w-0 space-y-2.5" data-chat-msg="assistant">
      {m.toolCalls.length > 0 && <div className="flex flex-wrap gap-1.5">{m.toolCalls.map((c) => <ToolChip key={c.id} c={c} />)}</div>}
      {!empty && <Markdown text={m.content} />}
      {(m.files ?? []).map((f) => <FileCard key={f.id} file={f} />)}
      {m.action && <ActionCard action={m.action} onResolve={onResolve} onUndo={onUndo} busy={busy} />}
      {m.choices && <Choices choices={m.choices} shown={!!m.choices.question && m.content.includes(m.choices.question)} onChoose={onChoose} />}
    </div>
  )
}

/**
 * The assistant's side of an exchange: everything it said and did between two messages of the employee, under
 * one mark, with the time and a "copy" for the text it wrote. `onChoose` is given while its question still stands.
 */
export function AssistantTurn({ items, onResolve, onUndo, busy, last, onChoose }: { items: AssistantMessage[]; onResolve?: Resolve; onUndo?: (id: string) => void; busy?: boolean; last?: boolean; onChoose?: (option: string) => void }) {
  const { t } = useTranslation()
  const text = items.filter((m) => m.role === 'assistant' && !m.stopped && (m.content.trim() || m.choices?.question)).map((m) => [m.content.trim(), m.choices && !m.content.includes(m.choices.question) ? m.choices.question : ''].filter(Boolean).join('\n\n')).join('\n\n')
  const at = items[items.length - 1]?.createdAt
  return (
    <div className="group/msg flex gap-3" data-chat-turn="assistant">
      <AssistantMark className="mt-0.5 max-sm:hidden" />
      <div className="min-w-0 flex-1">
        <div className="space-y-2.5">{items.map((m, i) => <ChatMessage key={m.id} m={m} onResolve={onResolve} onUndo={onUndo} busy={busy} onChoose={i === items.length - 1 ? onChoose : undefined} />)}</div>
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
