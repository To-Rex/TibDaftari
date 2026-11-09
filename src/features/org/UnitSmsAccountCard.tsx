/**
 * The unit's SMS account (Xabarchi). Three modes: `inherited` — no key of its own, the nearest ancestor's account
 * sends; `own` — its own key (every SMS of this unit and of the units under it without their own key); `off` — no
 * SMS from this unit and everything under it. The API never returns the plaintext key — only a masked tail.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpFromLine, BellOff, Check, Eye, EyeOff, KeyRound, PlugZap } from 'lucide-react'
import type { OrgUnit, SmsPriority, UnitSmsMode } from '@/domain'
import { repos } from '@/data'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtPhone } from '@/shared/lib/format'
import { Badge, Button, Card, CardHeader, Field, Input, Segmented, Skeleton, toast } from '@/shared/ui'
import { useSaveUnitSms, useUnitSms } from './queries'
import { UnitIcon } from './unitUi'

const MODES: { value: UnitSmsMode; icon: ReactNode }[] = [
  { value: 'inherited', icon: <ArrowUpFromLine /> },
  { value: 'own', icon: <KeyRound /> },
  { value: 'off', icon: <BellOff /> },
]

export function UnitSmsAccountCard({ unit, readOnly }: { unit: OrgUnit; readOnly?: boolean }) {
  const { t } = useTranslation()
  return (
    <Card data-unit-sms>
      <CardHeader className="max-xs:flex-col max-xs:items-start" title={t('admin.sms.accountTitle')} description={t('admin.sms.accountSub')} />
      {/* keyed by unit: switching units starts from that unit's saved account */}
      <SmsAccountEditor key={unit.id} unit={unit} readOnly={readOnly} />
    </Card>
  )
}

function SmsAccountEditor({ unit, readOnly }: { unit: OrgUnit; readOnly?: boolean }) {
  const { t } = useTranslation()
  const current = useUnitSms(unit.id)
  const save = useSaveUnitSms()
  const d = current.data
  const [mode, setMode] = useState<UnitSmsMode>('inherited')
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
  const isRoot = !unit.parentId
  const priorities: { value: SmsPriority; label: string }[] = [
    { value: 'urgent', label: t('admin.sms.priorityUrgent') },
    { value: 'transactional', label: t('admin.sms.priorityTransactional') },
    { value: 'bulk', label: t('admin.sms.priorityBulk') },
  ]

  const persist = async () => {
    await save.mutateAsync({ unitId: unit.id, mode, ...(mode === 'own' ? { apiKey: apiKey.trim() || undefined, defaultPriority: priority, senderNote: note.trim() } : {}) })
  }
  const submit = async () => {
    if (needsKey) return toast.warning(t('admin.sms.keyNeeded'))
    try {
      await persist()
      toast.success(t('admin.sms.accountSaved'), unit.name)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  /** ONE real SMS through the key this unit's messages use; unsaved changes are saved first. */
  const test = async () => {
    if (needsKey) return toast.warning(t('admin.sms.keyNeeded'))
    setTesting(true)
    try {
      if (dirty) await persist()
      const r = await repos.org.testSms(unit.id, testTo.trim() || undefined)
      toast.success(t('admin.sms.testOk'), t('admin.sms.testSent', { to: r.to ? fmtPhone(r.to) : '—', id: r.providerMessageId ?? '—' }))
    } catch (e) {
      toast.error(t('admin.sms.testFailed'), errorMessage(e))
    } finally {
      setTesting(false)
    }
  }

  // what the saved account does right now
  const effectiveName = d?.effectiveUnitName ?? ''
  const inheritsFrom = !!d && d.mode !== 'own' && d.provider === 'xabarchi' && !!d.effectiveUnitId && d.effectiveUnitId !== unit.id
  const status = !d ? null
    : d.mode === 'off' ? <Badge size="sm" tone="warn" dot>{t('admin.sms.usesNone')}</Badge>
    : d.mode === 'own' && d.provider === 'xabarchi' ? <Badge size="sm" tone="ok" dot>{t('admin.sms.usesOwn')}{d.apiKeyMasked ? ` · ${d.apiKeyMasked}` : ''}</Badge>
    : inheritsFrom ? <Badge size="sm" tone="brand" dot>{t('admin.sms.usesInherited', { name: effectiveName })}</Badge>
    : <Badge size="sm" tone="warn" dot>{t('admin.sms.usesNothing')}</Badge>
  const hint = mode === 'own' ? t('admin.sms.hintOwn')
    : mode === 'off' ? t('admin.sms.hintOff')
    : inheritsFrom ? t('admin.sms.hintInherited', { name: effectiveName })
    : isRoot ? t('admin.sms.hintRootNone') : t('admin.sms.hintInheritedNone')
  const sub: Record<UnitSmsMode, string> = {
    inherited: inheritsFrom ? t('admin.sms.modeInheritedSub', { name: effectiveName }) : isRoot ? t('admin.sms.modeInheritedRoot') : t('admin.sms.modeInheritedNone'),
    own: t('admin.sms.modeOwnSub'),
    off: t('admin.sms.modeOffSub'),
  }
  const label: Record<UnitSmsMode, string> = { inherited: t('admin.sms.modeInherited'), own: t('admin.sms.modeOwn'), off: t('admin.sms.modeOff') }

  return (
    <div className="flex flex-col gap-5" data-unit-sms-editor={unit.id}>
      {/* which unit, and what it sends with now */}
      <div className="flex flex-col gap-1.5 rounded-[var(--radius)] border border-line bg-surface-2/40 px-3.5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[13.5px] font-medium text-ink">
            <UnitIcon unit={unit} className="text-brand" /><span className="truncate">{unit.name}</span>{unit.code && <span className="shrink-0 font-mono text-[12px] text-ink-3">{unit.code}</span>}
          </span>
          {status && <span className="inline-flex min-w-0 max-w-full" data-unit-sms-status={d?.mode ?? ''} data-unit-sms-provider={d?.provider ?? ''}>{status}</span>}
        </div>
        <p className="text-[12.5px] text-ink-3" data-unit-sms-hint>{hint}</p>
      </div>

      {current.isLoading ? <Skeleton className="h-40" /> : current.isError ? <p className="text-[13px] text-danger">{errorMessage(current.error)}</p> : (
        <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t('admin.sms.accountTitle')}>
            {MODES.map((m) => {
              const on = mode === m.value
              return (
                <button key={m.value} type="button" role="radio" aria-checked={on} onClick={() => setMode(m.value)} data-unit-sms-mode={m.value}
                  className={cn('flex min-w-0 items-center gap-3 rounded-[var(--radius)] border p-3.5 text-left transition-all', on ? 'border-brand bg-brand-soft/60 shadow-1' : 'border-line bg-surface hover:border-line-strong')}>
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg [&>svg]:size-4', on ? 'bg-brand text-white' : 'bg-surface-2 text-ink-3')}>{m.icon}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="break-words text-[14px] font-medium">{label[m.value]}</span>
                    <span className="break-words text-[12px] text-ink-3">{sub[m.value]}</span>
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
                  <Input id={id} type={showKey ? 'text' : 'password'} mono autoComplete="off" placeholder={t('admin.sms.apiKeyPlaceholder')} leftIcon={<KeyRound />} value={apiKey} onChange={(e) => setApiKey(e.target.value)} data-unit-sms-key
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
                  <Input id={id} inputMode="tel" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={unit.phone ? fmtPhone(unit.phone) : '+998 90 123 45 67'} className="min-w-0 flex-1 basis-48" data-unit-sms-test-to />
                  <Button type="button" variant="secondary" className="max-sm:w-full" leftIcon={<PlugZap className="size-4" />} loading={testing} onClick={() => void test()} disabled={mode === 'inherited' && !inheritsFrom} data-unit-sms-test>{t('admin.sms.test')}</Button>
                </div>
              )}
            </Field>
          )}
          {!readOnly && (
            <div className="flex justify-end">
              <Button type="button" className="max-sm:w-full" loading={save.isPending && !testing} disabled={!dirty} onClick={() => void submit()} data-unit-sms-save>{t('common.save')}</Button>
            </div>
          )}
        </fieldset>
      )}
    </div>
  )
}
