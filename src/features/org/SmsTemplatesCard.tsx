/**
 * SMS text templates — per branch. The card edits the branch selected in the top bar (a pinned branch admin:
 * their own branch); with "All branches" a picker chooses which one. A branch that never saved its own texts
 * shows (and sends) the company's shared texts until it does. A company admin can write one set to every branch.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyCheck, MessageSquareText, RotateCcw } from 'lucide-react'
import type { Branch, SmsTemplateKind, SmsTemplateOverrides } from '@/domain'
import { storage } from '@/shared/lib/storage'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { Badge, Button, Card, CardHeader, ConfirmDialog, Skeleton, Textarea, toast } from '@/shared/ui'
import { useBranchSmsTemplates, useSaveBranchSmsTemplates } from './queries'
import { SmsBranchPicker, useSmsBranch, type SmsBranchSelection } from './smsBranch'

export type { SmsTemplateKind }
export type SmsTemplates = Record<SmsTemplateKind, string>
const KINDS: SmsTemplateKind[] = ['payment_receipt', 'result_ready', 'reminder']
/** {branch} = the name of the branch the message is sent for */
const PLACEHOLDERS = ['{patient}', '{order}', '{service}', '{company}', '{branch}'] as const
/** {link} — the public result PDF — exists only in the "result ready" text */
const RESULT_PLACEHOLDERS = [...PLACEHOLDERS, '{link}'] as const
/** the payment receipt also knows the money: this payment, the cheque total and what is still to pay */
const PAYMENT_PLACEHOLDERS = [...PLACEHOLDERS, '{amount}', '{total}', '{remaining}'] as const
const PLACEHOLDERS_OF: Record<SmsTemplateKind, readonly string[]> = { payment_receipt: PAYMENT_PLACEHOLDERS, result_ready: RESULT_PLACEHOLDERS, reminder: PLACEHOLDERS }
/** Pre-backend drafts lived in localStorage; they are offered once as the initial draft, then dropped. */
const LEGACY_STORAGE_KEY = (companyId: string) => `clinic.sms.templates.${companyId}`

// money as the API writes it in an SMS (thousands grouped with a no-break space)
const SAMPLE = { patient: 'Karimova Aziza', order: 'UR-001241', service: 'Umumiy qon tahlili', company: '', branch: '', link: '', amount: '120 000', total: '150 000', remaining: '30 000' }
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

export function SmsTemplatesCard({ companyId, companyName, readOnly, selection }: { companyId: string; companyName: string; readOnly?: boolean; selection?: SmsBranchSelection }) {
  const { t } = useTranslation()
  // the page passes its selection so the key card and this card edit the same branch
  const own = useSmsBranch(companyId)
  const sel = selection ?? own
  const { branch } = sel

  if (sel.isLoading) return <Skeleton className="h-72" />
  if (!branch) {
    return (
      <Card>
        <CardHeader title={t('admin.sms.templatesTitle')} description={t('admin.sms.templatesSub')} />
        <p className="text-[13.5px] text-ink-3" data-sms-no-branch>{t('admin.sms.noBranches')}</p>
      </Card>
    )
  }

  // "All branches" in the top bar: choose here which branch's texts to edit; otherwise the top-bar branch
  const branchSlot = <SmsBranchPicker sel={sel} label={t('admin.sms.branchTexts')} />

  // keyed by branch: switching branches starts from that branch's saved texts
  return <BranchTemplatesEditor key={branch.id} companyId={companyId} companyName={companyName} branch={branch} readOnly={readOnly} branchSlot={branchSlot} branchCount={sel.switcher ? sel.all.length : 0} />
}

function BranchTemplatesEditor({ companyId, companyName, branch, readOnly, branchSlot, branchCount }: { companyId: string; companyName: string; branch: Branch; readOnly?: boolean; branchSlot: ReactNode; branchCount: number }) {
  const { t } = useTranslation()
  const current = useBranchSmsTemplates(branch.id)
  const saveTexts = useSaveBranchSmsTemplates()
  const [confirmAll, setConfirmAll] = useState(false)
  const defaults = useMemo<SmsTemplates>(() => ({ payment_receipt: t('admin.sms.defaultPayment'), result_ready: t('admin.sms.defaultResult'), reminder: t('admin.sms.defaultReminder') }), [t])
  const templates = current.data?.templates
  /** what the branch currently sends (empty override = platform default text) */
  const saved = useMemo<SmsTemplates>(() => ({ ...defaults, ...Object.fromEntries(Object.entries(templates ?? {}).filter(([, v]) => !!v)) }), [defaults, templates])
  const legacy = useMemo(() => storage.get<Partial<SmsTemplates> | null>(LEGACY_STORAGE_KEY(companyId), null), [companyId])
  const [draft, setDraft] = useState<SmsTemplates>(() => ({ ...saved, ...(legacy ?? {}) }))
  const touched = useRef(!!legacy)
  // follow the backend value until the user starts editing (or a legacy draft was restored)
  useEffect(() => { if (!touched.current) setDraft(saved) }, [saved])
  const edit = (next: (d: SmsTemplates) => SmsTemplates) => { touched.current = true; setDraft(next) }
  const [active, setActive] = useState<SmsTemplateKind>('payment_receipt')
  const dirty = KINDS.some((k) => draft[k] !== saved[k])
  const canApplyAll = !readOnly && branchCount > 1

  const labels: Record<SmsTemplateKind, string> = { payment_receipt: t('admin.sms.tplPayment'), result_ready: t('admin.sms.tplResult'), reminder: t('admin.sms.tplReminder') }
  const preview = (text: string) => text.replace(/\{(patient|order|service|company|branch|link|amount|total|remaining)\}/g, (_, k: keyof typeof SAMPLE) => (k === 'company' ? companyName : k === 'branch' ? branch.name : k === 'link' ? sampleLink() : SAMPLE[k]))
  const seg = smsSegments(preview(draft[active]))

  const save = async (applyToAll = false) => {
    // texts equal to the platform default are stored as empty overrides (backend falls back)
    const overrides: SmsTemplateOverrides = Object.fromEntries(KINDS.map((k) => [k, draft[k] !== defaults[k] ? draft[k] : ''])) as SmsTemplateOverrides
    try {
      const r = await saveTexts.mutateAsync({ branchId: branch.id, templates: overrides, applyToAll })
      storage.remove(LEGACY_STORAGE_KEY(companyId))
      touched.current = false
      setConfirmAll(false)
      if (applyToAll) toast.success(t('admin.sms.appliedToAll', { count: r.applied ?? branchCount }))
      else toast.success(t('admin.sms.templatesSaved'), branch.name)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const insert = (ph: string) => edit((d) => ({ ...d, [active]: `${d[active]}${d[active].endsWith(' ') || !d[active] ? '' : ' '}${ph}` }))

  return (
    <Card>
      <CardHeader className="max-sm:flex-col max-sm:items-start" title={t('admin.sms.templatesTitle')} description={t('admin.sms.templatesSub')}
        actions={!readOnly && (
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <Button size="sm" variant="ghost" leftIcon={<RotateCcw className="size-3.5" />} onClick={() => edit(() => defaults)} disabled={!current.data}>{t('admin.sms.resetDefaults')}</Button>
            {canApplyAll && <Button size="sm" variant="secondary" leftIcon={<CopyCheck className="size-3.5" />} onClick={() => setConfirmAll(true)} disabled={!current.data} data-sms-apply-all>{t('admin.sms.applyToAll')}</Button>}
            <Button size="sm" disabled={!dirty || !current.data} loading={saveTexts.isPending && !confirmAll} onClick={() => void save()} data-sms-save>{t('common.save')}</Button>
          </div>
        )} />

      {/* whose texts these are: the branch, and whether it already has its own */}
      <div className="mb-5 flex flex-col gap-1.5 rounded-[var(--radius)] border border-line bg-surface-2/40 px-3.5 py-3" data-sms-branch={branch.id}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('admin.sms.branchTexts')}</span>
          <div className="min-w-0 max-w-full">{branchSlot}</div>
          {current.data && (
            current.data.inherited
              ? <span className="inline-flex" data-sms-inherited><Badge size="sm" tone="neutral">{t('admin.sms.inherited')}</Badge></span>
              : <span className="inline-flex" data-sms-own><Badge size="sm" tone="brand" dot>{t('admin.sms.ownTexts')}</Badge></span>
          )}
        </div>
        <p className="text-[12.5px] text-ink-3">{current.data?.inherited ? t('admin.sms.inheritedHint') : t('admin.sms.branchHint')}</p>
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
              {active === 'result_ready' && <p className="text-[12px] text-ink-3" data-sms-link-hint>{t('admin.sms.linkHint')}</p>}
              {active === 'payment_receipt' && <p className="text-[12px] text-ink-3" data-sms-amount-hint>{t('admin.sms.amountHint')}</p>}
              <div className="rounded-[var(--radius)] border border-line bg-surface-2/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
                  <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('admin.sms.preview')}</span>
                  <Badge tone={seg.segments > 2 ? 'warn' : 'neutral'} size="sm">{t('admin.sms.segments', { chars: seg.chars, segments: seg.segments })}{seg.unicode ? ' · UCS-2' : ' · GSM-7'}</Badge>
                </div>
                <div className="max-w-sm rounded-2xl rounded-tl-md bg-surface border border-line px-3.5 py-2.5 text-[14px] leading-relaxed shadow-1 break-words">{preview(draft[active]) || '…'}</div>
              </div>
            </div>
          </div>
        )}

      <ConfirmDialog open={confirmAll} onClose={() => !saveTexts.isPending && setConfirmAll(false)} onConfirm={() => void save(true)} loading={saveTexts.isPending}
        title={t('admin.sms.applyToAllTitle')} description={t('admin.sms.applyToAllText', { count: branchCount })}
        confirmText={t('admin.sms.applyToAllConfirm')} cancelText={t('common.cancel')} />
    </Card>
  )
}
