/**
 * What Eskiz says about the account in effect for a unit: balance (warns when low), price per operator, the sender
 * names it approved, the templates and their moderation state — and a box to hand a new text to moderation.
 * The API caches the answer a minute; the refresh button asks Eskiz again.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, BadgeCheck, Clock3, FileText, RefreshCw, Send, Wallet, XCircle } from 'lucide-react'
import type { EskizTemplate, Id } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDateTime, fmtNumber } from '@/shared/lib/format'
import { Badge, Button, Skeleton, Textarea, toast } from '@/shared/ui'
import { useEskizInfo, useRefreshEskizInfo, useSubmitEskizTemplate } from './queries'

/** moderation state → badge tone and label key */
export const TEMPLATE_STATE: Record<string, { tone: 'ok' | 'warn' | 'danger' | 'info' | 'neutral'; key: string; icon: typeof BadgeCheck }> = {
  service: { tone: 'ok', key: 'approved', icon: BadgeCheck },
  reklama: { tone: 'ok', key: 'approvedAd', icon: BadgeCheck },
  moderation: { tone: 'warn', key: 'moderation', icon: Clock3 },
  inproccess: { tone: 'info', key: 'inProgress', icon: Clock3 },
  rejected: { tone: 'danger', key: 'rejected', icon: XCircle },
  /** our own marker: the text was never handed to Eskiz */
  none: { tone: 'neutral', key: 'none', icon: Clock3 },
}

export function TemplateStateBadge({ status, size = 'sm' }: { status: string | null | undefined; size?: 'sm' | 'md' }) {
  const { t } = useTranslation()
  if (!status) return null
  const st = TEMPLATE_STATE[status] ?? { tone: 'neutral' as const, key: 'unknown', icon: Clock3 }
  const Icon = st.icon
  return <Badge size={size} tone={st.tone}><Icon className="size-3" />{t(`admin.sms.eskiz.tpl_${st.key}`, { defaultValue: status })}</Badge>
}

export function EskizPanel({ unitId, canWrite, onPickNick }: { unitId: Id; canWrite: boolean; /** the card's sender field takes an approved name from here */ onPickNick?: (nick: string) => void }) {
  const { t } = useTranslation()
  const info = useEskizInfo(unitId)
  const refresh = useRefreshEskizInfo()
  const submit = useSubmitEskizTemplate()
  const [text, setText] = useState('')
  const d = info.data
  const prices = d?.prices ?? []
  const min = prices.length ? Math.min(...prices.map((p) => p.price)) : null
  const max = prices.length ? Math.max(...prices.map((p) => p.price)) : null

  const doRefresh = async () => {
    try { await refresh.mutateAsync(unitId) } catch (e) { toast.error(errorMessage(e)) }
  }
  const doSubmit = async () => {
    const body = text.trim()
    if (body.length < 3) return
    try {
      await submit.mutateAsync({ unitId, text: body })
      setText('')
      toast.success(t('admin.sms.eskiz.submitted'), t('admin.sms.eskiz.submittedHint'))
    } catch (e) { toast.error(t('admin.sms.eskiz.submitFailed'), errorMessage(e)) }
  }

  if (info.isLoading) return <Skeleton className="h-40" data-eskiz-panel="loading" />
  if (info.isError) return <p className="text-[13px] text-danger" data-eskiz-panel="error">{errorMessage(info.error)}</p>
  if (!d || !d.configured) return null

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-line bg-surface-2/30 p-4" data-eskiz-panel={d.error ? 'unreachable' : 'ready'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold">{t('admin.sms.eskiz.title')}</div>
          <div className="truncate text-[12.5px] text-ink-3">
            {d.userName ? `${d.userName} · ` : ''}{d.login}{d.accountUnitName ? ` · ${d.accountUnitName}` : ''}{d.fetchedAt ? ` · ${t('admin.sms.eskiz.fetchedAt', { at: fmtDateTime(d.fetchedAt) })}` : ''}
          </div>
        </div>
        <Button size="sm" variant="ghost" leftIcon={<RefreshCw className={cn('size-3.5', refresh.isPending && 'animate-spin')} />} onClick={() => void doRefresh()} disabled={refresh.isPending} data-eskiz-refresh>{t('common.refresh')}</Button>
      </div>

      {d.error ? (
        <div className="flex gap-3 rounded-[var(--radius-sm)] border border-danger/30 bg-danger-soft/40 px-3.5 py-3 text-[13px]" data-eskiz-error>
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
          <div className="min-w-0"><div className="font-medium text-ink">{t('admin.sms.eskiz.unreachable')}</div><div className="text-ink-2">{d.error}</div></div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={cn('rounded-[var(--radius)] border p-3.5', d.lowBalance ? 'border-warn/40 bg-warn-soft/40' : 'border-line bg-surface')} data-eskiz-balance={d.balance ?? ''}>
              <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3"><Wallet className="size-3.5" />{t('admin.sms.eskiz.balance')}</div>
              <div className={cn('mt-1 text-[24px] font-semibold tabular leading-tight', d.lowBalance && 'text-warn')}>{d.balance == null ? '—' : fmtNumber(d.balance)} <span className="text-[13px] font-normal text-ink-3">{t('common.sum')}</span></div>
              <div className="mt-1 text-[12px] text-ink-3">{d.lowBalance ? t('admin.sms.eskiz.lowBalance') : min != null && d.balance != null && min > 0 ? t('admin.sms.eskiz.enoughFor', { n: fmtNumber(Math.floor(d.balance / max!)) }) : t('admin.sms.eskiz.balanceHint')}</div>
            </div>
            <div className="rounded-[var(--radius)] border border-line bg-surface p-3.5" data-eskiz-prices={prices.length}>
              <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('admin.sms.eskiz.prices')}</div>
              <div className="mt-1 text-[24px] font-semibold tabular leading-tight">{min == null ? '—' : min === max ? fmtNumber(min) : `${fmtNumber(min)}–${fmtNumber(max!)}`} <span className="text-[13px] font-normal text-ink-3">{t('admin.sms.eskiz.perPart')}</span></div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {prices.map((p) => <span key={`${p.operator}-${p.countryCode ?? ''}`} className="rounded-md border border-line bg-surface-2/60 px-1.5 py-0.5 text-[11.5px] text-ink-2">{p.operator} · {fmtNumber(p.price)}</span>)}
                {!prices.length && <span className="text-[12px] text-ink-3">{t('admin.sms.eskiz.noPrices')}</span>}
              </div>
            </div>
            <div className="rounded-[var(--radius)] border border-line bg-surface p-3.5" data-eskiz-nicks={d.nicks.length}>
              <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('admin.sms.eskiz.nicks')}</div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {d.nicks.map((n) => (
                  <button key={n} type="button" disabled={!onPickNick} onClick={() => onPickNick?.(n)} data-eskiz-nick={n}
                    className={cn('rounded-md border px-2 py-1 font-mono text-[12.5px] transition-colors', n === d.sender ? 'border-brand bg-brand-soft/60 text-brand-ink' : 'border-line bg-surface-2/60 text-ink-2', onPickNick && 'hover:border-brand hover:text-brand-ink')}>{n}</button>
                ))}
                {!d.nicks.length && <span className="text-[12px] text-ink-3">{t('admin.sms.eskiz.noNicks')}</span>}
              </div>
              <div className="mt-1.5 text-[12px] text-ink-3">{onPickNick ? t('admin.sms.eskiz.nicksHint') : t('admin.sms.eskiz.nicksCurrent', { nick: d.sender ?? '4546' })}</div>
            </div>
          </div>

          <div data-eskiz-templates={d.templates.length}>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3"><FileText className="size-3.5" />{t('admin.sms.eskiz.templates')}</div>
            {d.templates.length ? (
              <ul className="divide-y divide-line/70 rounded-[var(--radius)] border border-line bg-surface">
                {d.templates.map((tpl: EskizTemplate) => (
                  <li key={tpl.id || tpl.text} className="flex items-start justify-between gap-3 px-3.5 py-2.5" data-eskiz-template={tpl.status}>
                    <span className="min-w-0 break-words font-mono text-[12.5px] leading-relaxed text-ink">{tpl.text}</span>
                    <TemplateStateBadge status={tpl.status} />
                  </li>
                ))}
              </ul>
            ) : <p className="text-[12.5px] text-ink-3">{t('admin.sms.eskiz.noTemplates')}</p>}
            <p className="mt-2 text-[12px] text-ink-3">{t('admin.sms.eskiz.templatesHint')}</p>
          </div>

          {canWrite && (
            <div className="flex flex-col gap-2" data-eskiz-submit>
              <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('admin.sms.eskiz.newTemplatePh')} className="font-mono text-[13px]" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] text-ink-3">{t('admin.sms.eskiz.newTemplateHint')}</span>
                <Button size="sm" variant="secondary" leftIcon={<Send className="size-3.5" />} loading={submit.isPending} disabled={text.trim().length < 3} onClick={() => void doSubmit()} data-eskiz-submit-button>{t('admin.sms.eskiz.submit')}</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
