/**
 * The branch's own SMS key (Xabarchi). Every branch sends through its own account; a branch without one uses the
 * company's shared key, and a branch may switch SMS off. Saving changes only the selected branch — other branches
 * and the shared key keep theirs (before this, every branch admin overwrote the one company key).
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BellOff, Building2, Check, Eye, EyeOff, KeyRound, PlugZap } from 'lucide-react'
import type { Branch, BranchSmsMode, Id, SmsPriority } from '@/domain'
import { repos } from '@/data'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtPhone } from '@/shared/lib/format'
import { Badge, Button, Card, CardHeader, Field, Input, Segmented, Skeleton, toast } from '@/shared/ui'
import { useBranchSms, useSaveBranchSms } from './queries'
import { SmsBranchPicker, type SmsBranchSelection } from './smsBranch'

const MODES: { value: BranchSmsMode; icon: ReactNode }[] = [
  { value: 'own', icon: <KeyRound /> },
  { value: 'company', icon: <Building2 /> },
  { value: 'off', icon: <BellOff /> },
]

export function BranchSmsAccountCard({ companyId, selection, readOnly }: { companyId: Id; selection: SmsBranchSelection; readOnly?: boolean }) {
  const { t } = useTranslation()
  if (selection.isLoading) return <Skeleton className="h-64" />
  if (!selection.branch) return null // the texts card below explains that there are no branches yet
  return (
    <Card data-branch-sms>
      <CardHeader className="max-xs:flex-col max-xs:items-start" title={t('admin.sms.branchKeyTitle')} description={t('admin.sms.branchKeySub')} />
      {/* keyed by branch: switching branches starts from that branch's saved account */}
      <BranchSmsEditor key={selection.branch.id} companyId={companyId} branch={selection.branch} readOnly={readOnly} picker={<SmsBranchPicker sel={selection} label={t('admin.sms.branchKeyLabel')} />} />
      {selection.switcher && selection.all.length > 1 && <BranchesOverview selection={selection} />}
    </Card>
  )
}

function BranchSmsEditor({ companyId, branch, readOnly, picker }: { companyId: Id; branch: Branch; readOnly?: boolean; picker: ReactNode }) {
  const { t } = useTranslation()
  const current = useBranchSms(branch.id)
  const save = useSaveBranchSms(companyId)
  const d = current.data
  const [mode, setMode] = useState<BranchSmsMode>('company')
  const [apiKey, setApiKey] = useState('')
  const [priority, setPriority] = useState<SmsPriority>('transactional')
  const [note, setNote] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [testing, setTesting] = useState(false)
  // follow the saved account (after a save too)
  useEffect(() => {
    if (!d) return
    setMode(d.mode)
    setPriority(d.defaultPriority)
    setNote(d.senderNote ?? '')
    setApiKey('')
  }, [d])

  const savedOwnKey = d?.mode === 'own' && !!d.apiKeyMasked
  const dirty = !!d && (mode !== d.mode || (mode === 'own' && (!!apiKey.trim() || priority !== d.defaultPriority || note.trim() !== (d.senderNote ?? ''))))
  const needsKey = mode === 'own' && !apiKey.trim() && !savedOwnKey
  const priorities: { value: SmsPriority; label: string }[] = [
    { value: 'urgent', label: t('admin.sms.priorityUrgent') },
    { value: 'transactional', label: t('admin.sms.priorityTransactional') },
    { value: 'bulk', label: t('admin.sms.priorityBulk') },
  ]

  const persist = async () => {
    await save.mutateAsync({ branchId: branch.id, mode, ...(mode === 'own' ? { apiKey: apiKey.trim() || undefined, defaultPriority: priority, senderNote: note.trim() || undefined } : {}) })
  }
  const submit = async () => {
    if (needsKey) return toast.warning(t('admin.sms.branchKeyNeeded'))
    try {
      await persist()
      toast.success(t('admin.sms.branchSaved'), branch.name)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  /** ONE real SMS through the key this branch's messages use; unsaved changes are saved first. */
  const test = async () => {
    if (needsKey) return toast.warning(t('admin.sms.branchKeyNeeded'))
    setTesting(true)
    try {
      if (dirty) await persist()
      const r = await repos.tenant.testBranchSms(branch.id, testTo.trim() || undefined)
      toast.success(t('admin.sms.testOk'), t('admin.sms.testSent', { to: r.to ? fmtPhone(r.to) : '—', id: r.providerMessageId ?? '—' }))
    } catch (e) {
      toast.error(t('admin.sms.testFailed'), errorMessage(e))
    } finally {
      setTesting(false)
    }
  }

  // what the saved account does right now
  const status = !d ? null
    : d.effective === 'branch' ? <Badge size="sm" tone="ok" dot>{t('admin.sms.usesOwn')}{d.apiKeyMasked ? ` · ${d.apiKeyMasked}` : ''}</Badge>
    : d.effective === 'company' ? <Badge size="sm" tone="brand" dot>{t('admin.sms.usesCompany')}</Badge>
    : <Badge size="sm" tone="warn" dot>{t('admin.sms.usesNone')}</Badge>
  const hint = mode === 'own' ? t('admin.sms.hintOwn') : mode === 'off' ? t('admin.sms.hintOff') : d?.companyApiKeyMasked ? t('admin.sms.hintCompany') : t('admin.sms.hintCompanyNone')
  const sub: Record<BranchSmsMode, string> = {
    own: t('admin.sms.modeOwnSub'),
    company: d?.companyApiKeyMasked ? t('admin.sms.modeCompanySub', { key: d.companyApiKeyMasked }) : t('admin.sms.modeCompanyNone'),
    off: t('admin.sms.modeOffSub'),
  }
  const label: Record<BranchSmsMode, string> = { own: t('admin.sms.modeOwn'), company: t('admin.sms.modeCompany'), off: t('admin.sms.modeOff') }

  return (
    <div className="flex flex-col gap-5" data-branch-sms-editor={branch.id}>
      {/* which branch, and what it sends with now */}
      <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-line bg-surface-2/40 px-3.5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('admin.sms.branchKeyLabel')}</span>
          <div className="min-w-0 max-w-full">{picker}</div>
          {status && <span className="inline-flex min-w-0 max-w-full" data-branch-sms-status={d?.effective ?? 'none'}>{status}</span>}
        </div>
        <p className="text-[12.5px] text-ink-3" data-branch-sms-hint>{hint}</p>
      </div>

      {current.isLoading ? <Skeleton className="h-40" /> : current.isError ? <p className="text-[13px] text-danger">{errorMessage(current.error)}</p> : (
        <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t('admin.sms.branchKeyTitle')}>
            {MODES.map((m) => {
              const on = mode === m.value
              return (
                <button key={m.value} type="button" role="radio" aria-checked={on} onClick={() => setMode(m.value)} data-branch-sms-mode={m.value}
                  className={cn('flex min-w-0 items-center gap-3 rounded-[var(--radius)] border p-3.5 text-left transition-all', on ? 'border-brand bg-brand-soft/60 shadow-1' : 'border-line bg-surface hover:border-line-strong')}>
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg [&>svg]:size-4', on ? 'bg-brand text-white' : 'bg-surface-2 text-ink-3')}>{m.icon}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="break-words text-[14px] font-medium">{label[m.value]}</span>
                    <span className="break-all text-[12px] text-ink-3">{sub[m.value]}</span>
                  </span>
                  {on && <Check className="ml-auto size-4 shrink-0 text-brand" />}
                </button>
              )
            })}
          </div>

          {mode === 'own' && (
            <>
              <Field label={t('admin.sms.apiKey')} hint={savedOwnKey ? `${t('admin.sms.apiKeyCurrent')}: ${d?.apiKeyMasked} · ${t('admin.sms.apiKeyKeep')}` : t('admin.sms.apiKeyHint')}>
                {(id) => (
                  <Input id={id} type={showKey ? 'text' : 'password'} mono autoComplete="off" placeholder={t('admin.sms.apiKeyPlaceholder')} leftIcon={<KeyRound />} value={apiKey} onChange={(e) => setApiKey(e.target.value)} data-branch-sms-key
                    rightSlot={<button type="button" onClick={() => setShowKey((s) => !s)} aria-label={showKey ? 'hide' : 'show'} className="grid size-7 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} />
                )}
              </Field>
              <Field label={t('admin.sms.priority')} hint={t('admin.sms.priorityHint')}>
                {() => <Segmented items={priorities} value={priority} onChange={setPriority} className="max-w-full flex-wrap" />}
              </Field>
              <Field label={t('admin.sms.senderNote')} hint={t('admin.sms.senderNoteHint')} optionalText={t('common.optional')}>
                {(id) => <Input id={id} maxLength={40} value={note} onChange={(e) => setNote(e.target.value)} />}
              </Field>
            </>
          )}

          {mode !== 'off' && (
            <Field label={t('admin.sms.testTo')} hint={t('admin.sms.testToHint')} optionalText={t('common.optional')}>
              {(id) => (
                <div className="flex flex-wrap gap-2">
                  <Input id={id} inputMode="tel" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={branch.phone ? fmtPhone(branch.phone) : '+998 90 123 45 67'} className="min-w-0 flex-1 basis-48" data-branch-sms-test-to />
                  <Button type="button" variant="secondary" className="max-sm:w-full" leftIcon={<PlugZap className="size-4" />} loading={testing} onClick={() => void test()} disabled={mode === 'company' && !d?.companyApiKeyMasked} data-branch-sms-test>{t('admin.sms.test')}</Button>
                </div>
              )}
            </Field>
          )}
          {!readOnly && (
            <div className="flex justify-end">
              <Button type="button" className="max-sm:w-full" loading={save.isPending && !testing} disabled={!dirty} onClick={() => void submit()} data-branch-sms-save>{t('common.save')}</Button>
            </div>
          )}
        </fieldset>
      )}
    </div>
  )
}

/** Company admins: which key every branch sends with (click — edit that branch, when a picker is shown). */
function BranchesOverview({ selection }: { selection: SmsBranchSelection }) {
  const { t } = useTranslation()
  return (
    <div className="mt-6 border-t border-line pt-4" data-branch-sms-overview>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('admin.sms.overview')}</span>
        <span className="text-[12px] text-ink-3">{t('admin.sms.overviewHint')}</span>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {selection.all.map((b) => {
          const mode = b.smsMode ?? 'company'
          const active = b.id === selection.branch?.id
          const pickable = selection.canPick && selection.mine.some((x) => x.id === b.id)
          return (
            <li key={b.id} data-overview-branch={b.id} data-overview-mode={mode}>
              <button type="button" disabled={!pickable} onClick={() => selection.pick(b.id)}
                className={cn('flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-left text-[13.5px]', pickable && 'hover:text-brand-ink', active && 'font-semibold')}>
                <span className="min-w-0 truncate">{b.name} <span className="font-mono text-[12px] font-normal text-ink-3">{b.code}</span></span>
                {mode === 'own' ? <Badge size="sm" tone="ok" dot>{t('admin.sms.usesOwn')}{b.smsApiKeyMasked ? ` · ${b.smsApiKeyMasked}` : ''}</Badge>
                  : mode === 'off' ? <Badge size="sm" tone="warn" dot>{t('admin.sms.usesNone')}</Badge>
                  : <Badge size="sm" tone="neutral" dot>{t('admin.sms.usesCompany')}</Badge>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
