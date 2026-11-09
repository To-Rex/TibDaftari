/**
 * SMS texts of a unit. A unit that never saved its own texts shows (and sends) the nearest ancestor's — the badge
 * says so; saving writes this unit's own texts, which the units under it inherit in turn. "Apply to the whole
 * subtree" also overwrites the texts every unit below has saved.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpFromLine, MessageSquareText, RotateCcw } from 'lucide-react'
import type { OrgUnit, SmsTemplateKind, SmsTemplateOverrides } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { Badge, Button, Card, CardHeader, ConfirmDialog, Skeleton, Switch, Textarea, toast } from '@/shared/ui'
import { useSaveUnitSmsTemplates, useUnitSmsTemplates } from './queries'
import { UnitIcon } from './unitUi'

export type { SmsTemplateKind }
export type SmsTemplates = Record<SmsTemplateKind, string>
const KINDS: SmsTemplateKind[] = ['payment_receipt', 'result_ready', 'reminder']
/** {org} = the organisation (the nearest non-facility unit), {unit} = the facility the message is sent for */
const PLACEHOLDERS = ['{patient}', '{order}', '{service}', '{org}', '{unit}'] as const
/** {link} — the public result PDF — exists only in the "result ready" text */
const RESULT_PLACEHOLDERS = [...PLACEHOLDERS, '{link}'] as const
/** the payment receipt also knows the money: this payment, the cheque total and what is still to pay */
const PAYMENT_PLACEHOLDERS = [...PLACEHOLDERS, '{amount}', '{total}', '{remaining}'] as const
const PLACEHOLDERS_OF: Record<SmsTemplateKind, readonly string[]> = { payment_receipt: PAYMENT_PLACEHOLDERS, result_ready: RESULT_PLACEHOLDERS, reminder: PLACEHOLDERS }

// money as the API writes it in an SMS (thousands grouped with a no-break space)
const SAMPLE: Record<string, string> = { patient: 'Karimova Aziza', order: 'UR-001241', service: 'Umumiy qon tahlili', amount: '120 000', total: '150 000', remaining: '30 000' }
/** a link as long as the real one (32-character token) so the SMS length counter is honest */
const sampleLink = () => `${typeof window !== 'undefined' ? window.location.origin : 'https://temo.uz'}/d/Xk3vQ9pL2mT8aR5wZ1cY7nB4hJ6dF0sE`

/** GSM-7 vs UCS-2 segment counter (approximate, mirrors what Xabarchi bills). */
export function smsSegments(text: string): { chars: number; segments: number; unicode: boolean } {
  const unicode = [...text].some((ch) => ch.charCodeAt(0) > 127)
  const chars = text.length
  const single = unicode ? 70 : 160
  const multi = unicode ? 67 : 153
  const segments = chars === 0 ? 0 : chars <= single ? 1 : Math.ceil(chars / multi)
  return { chars, segments, unicode }
}

/** The "organisation" of a unit as the backend renders `{org}`: the nearest non-facility unit's name. */
export const orgNameOf = (u: OrgUnit): string => (u.level === 'facility' ? u.districtName || u.regionName || u.countryName || u.name : u.shortName || u.name)

export function SmsTemplatesCard({ unit, subtreeCount = 0, readOnly }: { unit: OrgUnit; /** units under this one (0 = a facility / a leaf) */ subtreeCount?: number; readOnly?: boolean }) {
  // keyed by unit: switching units starts from that unit's saved texts
  return <TemplatesEditor key={unit.id} unit={unit} subtreeCount={subtreeCount} readOnly={readOnly} />
}

function TemplatesEditor({ unit, subtreeCount, readOnly }: { unit: OrgUnit; subtreeCount: number; readOnly?: boolean }) {
  const { t } = useTranslation()
  const current = useUnitSmsTemplates(unit.id)
  const saveTexts = useSaveUnitSmsTemplates()
  const [applyAll, setApplyAll] = useState(false)
  const [confirmAll, setConfirmAll] = useState(false)
  const defaults = useMemo<SmsTemplates>(() => ({ payment_receipt: t('admin.sms.defaultPayment'), result_ready: t('admin.sms.defaultResult'), reminder: t('admin.sms.defaultReminder') }), [t])
  const templates = current.data?.templates
  /** what the unit currently sends (empty override = platform default text) */
  const saved = useMemo<SmsTemplates>(() => ({ ...defaults, ...Object.fromEntries(Object.entries(templates ?? {}).filter(([, v]) => !!v)) }), [defaults, templates])
  const [draft, setDraft] = useState<SmsTemplates>(saved)
  const touched = useRef(false)
  // follow the backend value until the user starts editing
  useEffect(() => { if (!touched.current) setDraft(saved) }, [saved])
  const edit = (next: (d: SmsTemplates) => SmsTemplates) => { touched.current = true; setDraft(next) }
  const [active, setActive] = useState<SmsTemplateKind>('payment_receipt')
  const dirty = KINDS.some((k) => draft[k] !== saved[k])
  const canApplyAll = !readOnly && subtreeCount > 0

  const labels: Record<SmsTemplateKind, string> = { payment_receipt: t('admin.sms.tplPayment'), result_ready: t('admin.sms.tplResult'), reminder: t('admin.sms.tplReminder') }
  const orgName = orgNameOf(unit)
  const preview = (text: string) => text.replace(/\{(patient|order|service|org|unit|company|branch|link|amount|total|remaining)\}/g, (_, k: string) =>
    k === 'org' || k === 'company' ? orgName : k === 'unit' || k === 'branch' ? unit.name : k === 'link' ? sampleLink() : (SAMPLE[k] ?? ''))
  const seg = smsSegments(preview(draft[active]))

  const save = async (toAll = false) => {
    // texts equal to the platform default are stored as empty overrides (backend falls back)
    const overrides: SmsTemplateOverrides = Object.fromEntries(KINDS.map((k) => [k, draft[k] !== defaults[k] ? draft[k] : ''])) as SmsTemplateOverrides
    try {
      const r = await saveTexts.mutateAsync({ unitId: unit.id, templates: overrides, applyToAll: toAll })
      touched.current = false
      setConfirmAll(false)
      if (toAll) toast.success(t('admin.sms.appliedToAll', { count: r.applied ?? subtreeCount + 1 }))
      else toast.success(t('admin.sms.templatesSaved'), unit.name)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const onSave = () => (applyAll && canApplyAll ? setConfirmAll(true) : void save())
  const insert = (ph: string) => edit((d) => ({ ...d, [active]: `${d[active]}${d[active].endsWith(' ') || !d[active] ? '' : ' '}${ph}` }))

  return (
    <Card data-unit-sms-templates>
      <CardHeader className="max-sm:flex-col max-sm:items-start" title={t('admin.sms.templatesTitle')} description={t('admin.sms.templatesSub')}
        actions={!readOnly && (
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <Button size="sm" variant="ghost" leftIcon={<RotateCcw className="size-3.5" />} onClick={() => edit(() => defaults)} disabled={!current.data}>{t('admin.sms.resetDefaults')}</Button>
            <Button size="sm" disabled={!(dirty || (applyAll && canApplyAll)) || !current.data} loading={saveTexts.isPending && !confirmAll} onClick={onSave} data-sms-save>{t('common.save')}</Button>
          </div>
        )} />

      {/* whose texts these are: the unit, and whether it already has its own */}
      <div className="mb-5 flex flex-col gap-1.5 rounded-[var(--radius)] border border-line bg-surface-2/40 px-3.5 py-3" data-sms-unit={unit.id}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[13.5px] font-medium text-ink">
            <UnitIcon unit={unit} className="text-brand" /><span className="truncate">{unit.name}</span>{unit.code && <span className="shrink-0 font-mono text-[12px] text-ink-3">{unit.code}</span>}
          </span>
          {current.data && (
            current.data.inherited
              ? <span className="inline-flex" data-sms-inherited><Badge size="sm" tone="neutral"><ArrowUpFromLine className="size-3" />{t('admin.sms.inherited')}</Badge></span>
              : <span className="inline-flex" data-sms-own><Badge size="sm" tone="brand" dot>{t('admin.sms.ownTexts')}</Badge></span>
          )}
        </div>
        <p className="text-[12.5px] text-ink-3">{current.data?.inherited ? t('admin.sms.inheritedHint') : t('admin.sms.textsHint')}</p>
      </div>

      {current.isLoading ? <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]"><Skeleton className="h-32" /><Skeleton className="h-44" /></div>
        : current.isError ? <p className="text-[13px] text-danger">{errorMessage(current.error)}</p>
        : (
          <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
            <div className="flex flex-wrap md:flex-col gap-1">
              {KINDS.map((k) => (
                <button key={k} type="button" onClick={() => setActive(k)} className={cn('flex items-center gap-2 rounded-[10px] px-3 h-10 text-[13.5px] font-medium whitespace-nowrap transition-colors text-left', active === k ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2')}>
                  <MessageSquareText className="size-4 shrink-0" />{labels[k]}
                  {draft[k] !== saved[k] && <span className="ml-auto size-1.5 rounded-full bg-warn" />}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 min-w-0">
              <Textarea value={draft[active]} disabled={readOnly} rows={3} onChange={(e) => edit((d) => ({ ...d, [active]: e.target.value }))} className="font-mono text-[13.5px]" />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12.5px] text-ink-3 mr-1">{t('admin.sms.placeholders')}:</span>
                {PLACEHOLDERS_OF[active].map((p) => (
                  <button key={p} type="button" disabled={readOnly} onClick={() => insert(p)} className="h-6 rounded-md border border-line bg-surface px-2 font-mono text-[12px] text-ink-2 hover:border-brand hover:text-brand-ink transition-colors disabled:opacity-50">{p}</button>
                ))}
              </div>
              <p className="text-[12px] text-ink-3">{t('admin.sms.orgHint')}</p>
              {active === 'result_ready' && <p className="text-[12px] text-ink-3" data-sms-link-hint>{t('admin.sms.linkHint')}</p>}
              {active === 'payment_receipt' && <p className="text-[12px] text-ink-3" data-sms-amount-hint>{t('admin.sms.amountHint')}</p>}
              <div className="rounded-[var(--radius)] border border-line bg-surface-2/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
                  <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('admin.sms.preview')}</span>
                  <Badge tone={seg.segments > 2 ? 'warn' : 'neutral'} size="sm">{t('admin.sms.segments', { chars: seg.chars, segments: seg.segments })}{seg.unicode ? ' · UCS-2' : ' · GSM-7'}</Badge>
                </div>
                <div className="max-w-sm rounded-2xl rounded-tl-md bg-surface border border-line px-3.5 py-2.5 text-[14px] leading-relaxed shadow-1 break-words">{preview(draft[active]) || '…'}</div>
              </div>
              {canApplyAll && (
                <Switch checked={applyAll} onChange={setApplyAll} label={t('admin.sms.applyToAll')} description={t('admin.sms.applyToAllHint', { count: subtreeCount })} className="mt-1" />
              )}
            </div>
          </div>
        )}

      <ConfirmDialog open={confirmAll} onClose={() => !saveTexts.isPending && setConfirmAll(false)} onConfirm={() => void save(true)} loading={saveTexts.isPending} danger
        title={t('admin.sms.applyToAllTitle')} description={t('admin.sms.applyToAllText', { name: unit.name, count: subtreeCount })}
        confirmText={t('admin.sms.applyToAllConfirm')} cancelText={t('common.cancel')} />
    </Card>
  )
}
