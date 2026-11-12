/**
 * What Eskiz says about the account in effect for a unit: balance (warns when low), price per operator, the sender
 * names it approved, the templates and their moderation state — and a box to hand a new text to moderation.
 * The API caches the answer a minute; the refresh button asks Eskiz again.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, BadgeCheck, ChevronDown, ChevronRight, Clock3, FileText, RefreshCw, Send, Wallet, XCircle } from 'lucide-react'
import type { EskizPrice, EskizTemplate, Id } from '@/domain'
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

const HOME = 'UZ'
const HOME_PREVIEW = 4

/** The price per SMS part: the home country's operators as a short list (the rest behind "more"), every other
 *  country folded into one line that opens a scrollable list — the raw answer can hold hundreds of rows. */
function PricesTile({ prices, lang }: { prices: EskizPrice[]; lang: string }) {
  const { t } = useTranslation()
  const [allHome, setAllHome] = useState(false)
  const [abroadOpen, setAbroadOpen] = useState(false)
  const { home, abroad, min, max } = useMemo(() => {
    const isHome = (p: EskizPrice) => !p.countryCode || p.countryCode.toUpperCase() === HOME
    const ours = prices.filter(isHome).sort((a, b) => a.price - b.price || a.operator.localeCompare(b.operator))
    const byCountry = new Map<string, EskizPrice[]>()
    for (const p of prices.filter((p) => !isHome(p))) byCountry.set(p.countryCode!.toUpperCase(), [...(byCountry.get(p.countryCode!.toUpperCase()) ?? []), p])
    const pool = ours.length ? ours : prices
    return { home: ours, abroad: byCountry, min: pool.length ? Math.min(...pool.map((p) => p.price)) : null, max: pool.length ? Math.max(...pool.map((p) => p.price)) : null }
  }, [prices])
  const countryName = useMemo(() => { try { return new Intl.DisplayNames([lang], { type: 'region' }) } catch { return null } }, [lang])
  const shownHome = allHome ? home : home.slice(0, HOME_PREVIEW)
  return (
    <div className="flex flex-col rounded-[var(--radius)] border border-line bg-surface p-3.5" data-eskiz-prices={prices.length}>
      <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('admin.sms.eskiz.prices')}</div>
      <div className="mt-1 text-[24px] font-semibold tabular leading-tight">{min == null ? '—' : min === max ? fmtNumber(min) : `${fmtNumber(min)}–${fmtNumber(max!)}`} <span className="text-[13px] font-normal text-ink-3">{t('admin.sms.eskiz.perPart')}</span></div>
      {!prices.length && <div className="mt-1.5 text-[12px] text-ink-3">{t('admin.sms.eskiz.noPrices')}</div>}
      {home.length > 0 && (
        <ul className="mt-2 divide-y divide-line/60 text-[12.5px]" data-eskiz-prices-home={home.length}>
          {shownHome.map((p) => (
            <li key={p.operator} className="flex items-center justify-between gap-2 py-1">
              <span className="truncate text-ink-2">{p.operator}</span>
              <span className="shrink-0 tabular text-ink">{fmtNumber(p.price)} <span className="text-ink-3">{t('common.sum')}</span></span>
            </li>
          ))}
        </ul>
      )}
      {home.length > HOME_PREVIEW && (
        <button type="button" onClick={() => setAllHome((v) => !v)} className="mt-1 self-start text-[12px] font-medium text-brand-ink hover:underline" data-eskiz-prices-more>
          {allHome ? t('admin.sms.eskiz.pricesLess') : t('admin.sms.eskiz.pricesMore', { n: home.length - HOME_PREVIEW })}
        </button>
      )}
      {abroad.size > 0 && (
        <div className="mt-2 border-t border-line/60 pt-2" data-eskiz-prices-abroad={abroad.size}>
          <button type="button" onClick={() => setAbroadOpen((v) => !v)} className="flex w-full items-center gap-1.5 text-left text-[12.5px] text-ink-2 hover:text-ink" aria-expanded={abroadOpen}>
            {abroadOpen ? <ChevronDown className="size-3.5 shrink-0 text-ink-3" /> : <ChevronRight className="size-3.5 shrink-0 text-ink-3" />}
            <span className="min-w-0 flex-1 truncate">{t('admin.sms.eskiz.pricesAbroad', { n: abroad.size })}</span>
          </button>
          {abroadOpen && (
            <div className="mt-1.5 max-h-48 overflow-y-auto pr-1 text-[12px]">
              {[...abroad.entries()].sort((a, b) => (countryName?.of(a[0]) ?? a[0]).localeCompare(countryName?.of(b[0]) ?? b[0])).map(([cc, rows]) => (
                <div key={cc} className="py-1">
                  <div className="font-medium text-ink">{countryName?.of(cc) ?? cc} <span className="font-normal text-ink-3">· {cc}</span></div>
                  <div className="text-ink-3">{[...rows].sort((a, b) => a.price - b.price).map((p) => `${p.operator} ${fmtNumber(p.price)}`).join(' · ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function EskizPanel({ unitId, canWrite, onPickNick }: { unitId: Id; canWrite: boolean; /** the card's sender field takes an approved name from here */ onPickNick?: (nick: string) => void }) {
  const { t, i18n } = useTranslation()
  const info = useEskizInfo(unitId)
  const refresh = useRefreshEskizInfo()
  const submit = useSubmitEskizTemplate()
  const [text, setText] = useState('')
  const [tplSearch, setTplSearch] = useState('')
  const d = info.data
  const prices = d?.prices ?? []
  // the home country's dearest part tells how many SMS the balance buys
  const homePrices = prices.filter((p) => !p.countryCode || p.countryCode.toUpperCase() === HOME)
  const max = homePrices.length ? Math.max(...homePrices.map((p) => p.price)) : prices.length ? Math.max(...prices.map((p) => p.price)) : null
  const templates = (d?.templates ?? []).filter((tpl) => !tplSearch.trim() || tpl.text.toLowerCase().includes(tplSearch.trim().toLowerCase()))

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
          <div className="grid gap-3 sm:grid-cols-3 sm:items-start">
            <div className={cn('rounded-[var(--radius)] border p-3.5', d.lowBalance ? 'border-warn/40 bg-warn-soft/40' : 'border-line bg-surface')} data-eskiz-balance={d.balance ?? ''}>
              <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3"><Wallet className="size-3.5" />{t('admin.sms.eskiz.balance')}</div>
              <div className={cn('mt-1 text-[24px] font-semibold tabular leading-tight', d.lowBalance && 'text-warn')}>{d.balance == null ? '—' : fmtNumber(d.balance)} <span className="text-[13px] font-normal text-ink-3">{t('common.sum')}</span></div>
              <div className="mt-1 text-[12px] text-ink-3">{d.lowBalance ? t('admin.sms.eskiz.lowBalance') : max != null && d.balance != null && max > 0 ? t('admin.sms.eskiz.enoughFor', { n: fmtNumber(Math.floor(d.balance / max)) }) : t('admin.sms.eskiz.balanceHint')}</div>
            </div>
            <PricesTile prices={prices} lang={i18n.language} />
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
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3"><FileText className="size-3.5" />{t('admin.sms.eskiz.templates')} <span className="normal-case tracking-normal text-ink-3">· {d.templates.length}</span></div>
              {d.templates.length > 6 && <input value={tplSearch} onChange={(e) => setTplSearch(e.target.value)} placeholder={t('admin.sms.eskiz.templateSearch')} className="h-8 w-56 max-w-full rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 text-[12.5px] outline-none focus:border-brand" data-eskiz-template-search />}
            </div>
            {d.templates.length ? (
              <ul className="max-h-72 divide-y divide-line/70 overflow-y-auto rounded-[var(--radius)] border border-line bg-surface">
                {!templates.length && <li className="px-3.5 py-2.5 text-[12.5px] text-ink-3">{t('common.empty')}</li>}
                {templates.map((tpl: EskizTemplate) => (
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
