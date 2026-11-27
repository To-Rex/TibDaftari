/**
 * The reading pane of the journal: one message in full — the whole text, the way it went, who and what it is about —
 * and what can be done with it: copy, send again, take out of the queue, write to the same number.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { TFunction } from 'i18next'
import { AlertTriangle, Ban, CalendarClock, Check, CheckCheck, ChevronLeft, ChevronRight, Clock, CornerUpLeft, Hourglass, KeyRound, PenLine, Phone, RefreshCw, XCircle } from 'lucide-react'
import type { OutboxMessage } from '@/domain'
import { CopyButton } from '@/features/assistant/CopyButton'
import { usePermissions } from '@/features/auth/store'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { fmtDateTime, fmtNumber, fmtRelative } from '@/shared/lib/format'
import { Badge, Button, ConfirmDialog, Drawer, EmptyState, IconButton, Skeleton, toast, type Tone } from '@/shared/ui'
import { MessageStatusBadge, messageStatusTone } from './MessageStatusBadge'
import { useCancelMessage, useOutbox, useOutboxMessage, useResendMessage } from './queries'
import { smsInfo } from './sms'
import { MessageText, actionError, failureReason, messageMoment, phoneLabel } from './text'

/** What the composer is opened with from a message: the same number, and the text when it may be reused. */
export interface ComposeSeed { to?: string; text?: string; countryCode?: string | null }

const M = 'clinical.messages'
const noop = () => undefined
const toneText: Record<Tone, string> = { neutral: 'text-ink-3', brand: 'text-brand', ok: 'text-ok', warn: 'text-warn', danger: 'text-danger', info: 'text-info', accent: 'text-accent' }
const toneRing: Record<Tone, string> = { neutral: 'border-line-strong bg-surface-2', brand: 'border-brand/40 bg-brand-soft', ok: 'border-ok/40 bg-ok-soft', warn: 'border-warn/40 bg-warn-soft', danger: 'border-danger/40 bg-danger-soft', info: 'border-info/40 bg-info-soft', accent: 'border-accent/40 bg-accent/15' }

interface Step { key: string; icon: ReactNode; tone: Tone; title: string; at?: string | null; note?: ReactNode; pending?: boolean }

/** The way of a message, oldest step first; the last one is where it stands now. */
function stepsOf(t: TFunction, m: OutboxMessage): Step[] {
  const out: Step[] = [{ key: 'created', icon: <PenLine />, tone: 'neutral', title: t(`${M}.step_created`), at: m.createdAt, note: m.sentByName ?? t(`${M}.system`) }]
  if (m.scheduledAt) out.push({ key: 'scheduled', icon: <CalendarClock />, tone: 'info', title: t(`${M}.step_scheduled`), at: m.scheduledAt, pending: m.status === 'scheduled' })
  if (m.sentAt) out.push({ key: 'sent', icon: <Check />, tone: 'brand', title: t(`${M}.step_sent`), at: m.sentAt, note: m.attempts > 1 ? t(`${M}.attemptsN`, { n: m.attempts }) : undefined })
  const why = failureReason(t, m.error)
  if (m.status === 'queued') {
    out.push(m.nextAttemptAt
      ? { key: 'retry', icon: <RefreshCw />, tone: 'warn', title: t(`${M}.step_retry`), note: <>{t(`${M}.nextAttempt`, { time: fmtDateTime(m.nextAttemptAt) })}{why && <span className="block text-warn">{why.text}</span>}</>, pending: true }
      : { key: 'queued', icon: <Clock />, tone: 'warn', title: t(`${M}.step_queued`), pending: true })
  } else if (m.status === 'sent') {
    out.push({ key: 'awaiting', icon: <Hourglass />, tone: 'neutral', title: t(`${M}.step_awaiting`), note: m.providerStatus ?? undefined, pending: true })
  } else if (m.status === 'delivered') {
    out.push({ key: 'delivered', icon: <CheckCheck />, tone: 'ok', title: t(`${M}.step_delivered`), at: m.updatedAt })
  } else if (m.status === 'failed') {
    out.push({ key: 'failed', icon: <XCircle />, tone: 'danger', title: t(`${M}.step_failed`), at: m.updatedAt }) // the reason has a note of its own above
  } else if (m.status === 'cancelled') {
    out.push({ key: 'cancelled', icon: <Ban />, tone: 'neutral', title: t(`${M}.step_cancelled`), at: m.updatedAt })
  }
  return out
}

function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0" data-step={s.key}>
          {i < steps.length - 1 && <span aria-hidden className="absolute bottom-0 left-[13px] top-7 w-px bg-line" />}
          <span className={cn('z-[1] grid size-[27px] shrink-0 place-items-center rounded-full border [&>svg]:size-3.5', toneRing[s.tone], toneText[s.tone], s.pending && 'border-dashed')}>{s.icon}</span>
          <div className="min-w-0 flex-1 pt-[3px]">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className={cn('text-[13.5px] font-medium', s.pending ? 'text-ink-2' : 'text-ink')}>{s.title}</span>
              {s.at && <time dateTime={s.at} title={fmtRelative(s.at)} className="whitespace-nowrap text-[12.5px] tabular text-ink-3">{fmtDateTime(s.at)}</time>}
            </div>
            {s.note && <div className="mt-0.5 break-words text-[12.5px] leading-5 text-ink-3">{s.note}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** A label and its value: side by side where there is room, stacked on a narrow screen. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 py-2 sm:grid-cols-[150px_minmax(0,1fr)]">
      <dt className="text-[12.5px] text-ink-3 sm:pt-px">{label}</dt>
      <dd className="min-w-0 break-words text-[13.5px] text-ink">{children}</dd>
    </div>
  )
}

function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-2 flex min-h-7 flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Note({ tone, icon, children }: { tone: 'info' | 'danger' | 'warn'; icon: ReactNode; children: ReactNode }) {
  const look = { info: 'border-info/25 bg-info-soft/60 [&>svg]:text-info', danger: 'border-danger/25 bg-danger-soft/60 [&>svg]:text-danger', warn: 'border-warn/30 bg-warn-soft/60 [&>svg]:text-warn' }[tone]
  return <div className={cn('flex items-start gap-2.5 rounded-[var(--radius)] border px-3.5 py-2.5 text-[13px] leading-5 text-ink-2 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0', look)}>{icon}<div className="min-w-0 flex-1 break-words">{children}</div></div>
}

/** The other messages the same number got — the conversation around this one. */
function NumberHistory({ scopeId, m, onOpen, onShowAll }: { scopeId: string; m: OutboxMessage; onOpen: (id: string) => void; onShowAll: (to: string) => void }) {
  const { t } = useTranslation()
  const list = useOutbox(scopeId, { search: m.to, pageSize: 12 }, false)
  const rows = useMemo(() => (list.data?.items ?? []).filter((x) => x.to === m.to && x.id !== m.id), [list.data, m.id, m.to])
  return (
    <Section title={t(`${M}.history`)} action={rows.length > 0 && <Button variant="link" size="xs" onClick={() => onShowAll(m.to)}>{t(`${M}.historyAll`)}</Button>}>
      {list.isLoading
        ? <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        : rows.length === 0
          ? <p className="text-[13px] text-ink-3">{t(`${M}.historyEmpty`)}</p>
          : (
            <ul className="overflow-hidden rounded-[var(--radius)] border border-line" data-message-history>
              {rows.slice(0, 5).map((x) => (
                <li key={x.id} className="border-b border-line/70 last:border-b-0">
                  <button type="button" onClick={() => onOpen(x.id)} className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-2/60">
                    <span aria-hidden className={cn('mt-[7px] size-2 shrink-0 rounded-full bg-current', toneText[messageStatusTone[x.status]])} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 break-words text-[13px] text-ink-2">{x.text}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11.5px] tabular text-ink-3">
                        <span>{t(`${M}.status_${x.status}`)}</span><span>{t(`${M}.kind_${x.kind}`)}</span><span>{fmtDateTime(messageMoment(x))}</span>
                      </span>
                    </span>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-ink-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
    </Section>
  )
}

export function MessageDrawer({ scopeId, id, seed, onClose, onOpen, onPrev, onNext, position, onCompose, onShowAll, showUnit }: {
  /** the unit the journal is read in */
  scopeId: string
  /** the message to show; null = closed */
  id: string | null
  /** the row the list already has for it (shown at once, refreshed behind) */
  seed?: OutboxMessage
  onClose: () => void
  /** go to another message: one from the history, the original of a repeat, the copy that was just sent */
  onOpen: (id: string) => void
  /** the neighbours in the list (absent at either end) */
  onPrev?: () => void
  onNext?: () => void
  /** "3 / 20" */
  position?: string
  /** open the composer (absent = the reader may not send) */
  onCompose?: (seed: ComposeSeed) => void
  /** show everything this number got in the list */
  onShowAll: (to: string) => void
  /** the journal mixes facilities — say which one sent it */
  showUnit: boolean
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const q = useOutboxMessage(scopeId, id, seed)
  const m = q.data
  const cancel = useCancelMessage(scopeId)
  const resend = useResendMessage(scopeId)
  const [ask, setAsk] = useState<'resend' | 'cancel' | null>(null)
  useEffect(() => setAsk(null), [id])

  // ← → walk the list without leaving the pane (never while typing or answering a question)
  useEffect(() => {
    if (!id || ask) return
    const h = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      if (e.key === 'ArrowLeft' && onPrev) { e.preventDefault(); onPrev() }
      if (e.key === 'ArrowRight' && onNext) { e.preventDefault(); onNext() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [id, ask, onPrev, onNext])

  const info = useMemo(() => (m && m.channel === 'sms' ? smsInfo(m.text) : null), [m])
  const steps = useMemo(() => (m ? stepsOf(t, m) : []), [t, m])
  const why = m ? failureReason(t, m.error) : null
  const phone = m ? phoneLabel(m) : ''

  const doCancel = async () => {
    if (!m) return
    try { await cancel.mutateAsync(m.id); toast.success(t(`${M}.cancelledToast`)) } catch (e) { toast.error(actionError(t, e)) }
    setAsk(null)
  }
  const doResend = async () => {
    if (!m) return
    try {
      const copy = await resend.mutateAsync(m.id)
      toast.success(t(`${M}.resentToast`))
      setAsk(null)
      onOpen(copy.id) // the new message is what the reader follows from here on
    } catch (e) { toast.error(actionError(t, e)); setAsk(null) }
  }

  const nav = (onPrev || onNext || position) && (
    <span className="ml-auto flex shrink-0 items-center gap-0.5 font-normal">
      {position && <span className="mr-1 whitespace-nowrap text-[12px] tabular text-ink-3">{position}</span>}
      <IconButton label={t(`${M}.prev`)} title={t(`${M}.prev`)} size="sm" disabled={!onPrev} onClick={onPrev} className="disabled:opacity-35"><ChevronLeft /></IconButton>
      <IconButton label={t(`${M}.next`)} title={t(`${M}.next`)} size="sm" disabled={!onNext} onClick={onNext} className="disabled:opacity-35"><ChevronRight /></IconButton>
    </span>
  )
  const act = m && (m.canCancel || m.canResend || onCompose)

  return (
    <>
      <Drawer open={!!id} onClose={ask ? noop : onClose} width="max-w-2xl"
        title={<span className="flex items-center gap-2"><span className="truncate">{t(`${M}.detailTitle`)}</span>{nav}</span>}
        footer={act ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2 max-sm:[&>*]:flex-1" data-message-actions>
            {onCompose && (
              <Button variant="secondary" leftIcon={<PenLine className="size-4" />} onClick={() => onCompose({ to: m.channel === 'sms' ? m.to : undefined, text: m.secret ? undefined : m.text, countryCode: m.countryCode })}>
                {m.secret ? t(`${M}.writeTo`) : t(`${M}.editAndSend`)}
              </Button>
            )}
            {m.canCancel && <Button variant="danger" leftIcon={<Ban className="size-4" />} onClick={() => setAsk('cancel')}>{t(`${M}.cancel`)}</Button>}
            {m.canResend && <Button leftIcon={<RefreshCw className="size-4" />} onClick={() => setAsk('resend')}>{t(`${M}.resend`)}</Button>}
          </div>
        ) : undefined}>
        {!m
          ? q.isError
            ? <EmptyState icon={<AlertTriangle />} title={t(`${M}.notFound`)} description={t(`${M}.notFoundHint`)} />
            : <div className="space-y-4"><Skeleton className="h-7 w-1/2" /><Skeleton className="h-32 w-full" /><Skeleton className="h-24 w-full" /></div>
          : (
            <div className="flex flex-col gap-6" data-message={m.id}>
              {/* who it went to and where it stands */}
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                    <span className="break-all font-mono text-[18px] font-semibold leading-7 tabular">{phone}</span>
                    <CopyButton text={m.to} label={t(`${M}.copyNumber`)} doneLabel={t(`${M}.copied`)} />
                    {m.channel === 'sms' && <a href={`tel:+${m.to}`} aria-label={t(`${M}.call`)} title={t(`${M}.call`)} className="inline-flex h-7 items-center rounded-md px-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"><Phone className="size-3.5" /></a>}
                  </div>
                  {m.patientName && (
                    m.patientId && can('reception.patient.read')
                      ? <Link to={routes.app.patient(m.patientId)} className="mt-0.5 inline-block break-words text-[14px] font-medium text-brand-ink hover:underline">{m.patientName}</Link>
                      : <div className="mt-0.5 break-words text-[14px] text-ink-2">{m.patientName}</div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <MessageStatusBadge status={m.status} />
                  <Badge>{t(`${M}.kind_${m.kind}`)}</Badge>
                  {m.countryCode && m.countryCode !== 'UZ' && <Badge tone="info">{m.countryCode}</Badge>}
                </div>
              </div>

              {/* the whole text */}
              <section className="rounded-[var(--radius)] border border-line bg-surface shadow-1" data-message-text>
                <MessageText text={m.text} className="select-text px-4 pt-4 text-[15px] leading-[1.65] text-ink" />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line/70 px-4 py-2 text-[12px] tabular text-ink-3">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{t(`${M}.chars`, { n: [...m.text].length })}</span>
                    {info && <><span aria-hidden>·</span><span>{t(`${M}.parts`, { n: m.parts ?? info.segments })}</span><span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{info.encoding === 'gsm' ? 'GSM-7' : 'UCS-2'}</span></>}
                  </span>
                  <CopyButton text={m.text} label={t(`${M}.copyText`)} doneLabel={t(`${M}.copied`)} className="-mr-1.5 text-[12.5px] font-medium">{(done) => (done ? t(`${M}.copied`) : t(`${M}.copyText`))}</CopyButton>
                </div>
              </section>

              {(m.secret || m.resendOf || (why && m.status === 'failed')) && (
                <div className="flex flex-col gap-2.5">
                  {why && m.status === 'failed' && (
                    <Note tone="danger" icon={<XCircle />}>
                      <span className="font-medium text-ink">{why.text}</span>
                      {why.raw && <span className="mt-0.5 block font-mono text-[11.5px] text-ink-3">{why.raw}</span>}
                      {m.error === 'sms_not_configured' && can('admin.settings.write') && <Link to={routes.admin.sms} className="mt-1 inline-block font-medium text-info hover:underline">{t(`${M}.openSettings`)}</Link>}
                    </Note>
                  )}
                  {m.secret && <Note tone="info" icon={<KeyRound />}>{t(`${M}.secretNote`)}</Note>}
                  {m.resendOf && (
                    <Note tone="info" icon={<CornerUpLeft />}>
                      {t(`${M}.repeatNote`)}{' '}
                      <button type="button" onClick={() => onOpen(m.resendOf!)} className="font-medium text-info hover:underline">{t(`${M}.openOriginal`)}</button>
                    </Note>
                  )}
                </div>
              )}

              <Section title={t(`${M}.timeline`)}><Timeline steps={steps} /></Section>

              <Section title={t(`${M}.details`)}>
                <dl className="divide-y divide-line/70 rounded-[var(--radius)] border border-line px-3.5">
                  {m.orderNumber && (
                    <Row label={t(`${M}.order`)}>
                      {m.orderId && can(['reception.order.create', 'reception.payment.late_edit', 'reports.operations.read'])
                        ? <Link to={routes.app.order(m.orderId)} className="font-mono font-medium text-brand-ink hover:underline">{m.orderNumber}</Link>
                        : <span className="font-mono">{m.orderNumber}</span>}
                    </Row>
                  )}
                  {showUnit && m.unitName && <Row label={t(`${M}.unit`)}>{m.unitName}</Row>}
                  <Row label={t(`${M}.sender`)}>{m.sentByName ?? t(`${M}.system`)}</Row>
                  <Row label={t(`${M}.channel`)}>{t(`${M}.channel_${m.channel}`)}</Row>
                  {m.attempts > 0 && <Row label={t(`${M}.attempts`)}><span className="tabular">{m.attempts}</span></Row>}
                  {m.cost != null && <Row label={t(`${M}.cost`)}><span className="tabular">{fmtNumber(Math.round(m.cost))} {t('common.sum')}</span></Row>}
                  {m.providerStatus && <Row label={t(`${M}.providerState`)}><span className="font-mono text-[12.5px]">{m.providerStatus}</span></Row>}
                  {m.providerMessageId && <Row label={t(`${M}.providerId`)}><span className="break-all font-mono text-[12.5px]">{m.providerMessageId}</span></Row>}
                </dl>
              </Section>

              <NumberHistory scopeId={scopeId} m={m} onOpen={onOpen} onShowAll={onShowAll} />
            </div>
          )}
      </Drawer>

      <ConfirmDialog open={ask === 'cancel'} onClose={() => setAsk(null)} onConfirm={() => void doCancel()} danger loading={cancel.isPending}
        title={t(`${M}.cancelTitle`)} description={t(`${M}.cancelHint`, { phone })} confirmText={t(`${M}.cancel`)} cancelText={t('common.back')} />
      <ConfirmDialog open={ask === 'resend'} onClose={() => setAsk(null)} onConfirm={() => void doResend()} loading={resend.isPending}
        title={t(`${M}.resendTitle`)} description={t(m && (m.status === 'sent' || m.status === 'delivered') ? `${M}.resendAgainHint` : `${M}.resendHint`, { phone })} confirmText={t(`${M}.resend`)} cancelText={t('common.cancel')} />
    </>
  )
}
