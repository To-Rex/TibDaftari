/**
 * The unit's SMS account — a Xabarchi key or an Eskiz.uz login. Three modes: `inherited` — no account of its own,
 * the nearest ancestor's sends; `own` — its own account (every SMS of this unit and of the units under it without
 * their own); `off` — no SMS from this unit and everything under it. An account on the country node serves the
 * whole country; any unit below may still keep its own. The API never returns a plaintext secret — a masked tail
 * for a Xabarchi key, nothing at all for an Eskiz password.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpFromLine, AtSign, BellOff, Check, Eye, EyeOff, Info, KeyRound, LockKeyhole, PlugZap } from 'lucide-react'
import type { OrgUnit, SmsPriority, SmsProvider, SmsProviderChoice, UnitSmsMode } from '@/domain'
import { repos } from '@/data'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtNumber, fmtPhone } from '@/shared/lib/format'
import { Badge, Button, Card, CardHeader, Field, Input, Segmented, Skeleton, toast } from '@/shared/ui'
import { useSaveUnitSms, useUnitSms } from './queries'
import { UnitIcon } from './unitUi'

const MODES: { value: UnitSmsMode; icon: ReactNode }[] = [
  { value: 'inherited', icon: <ArrowUpFromLine /> },
  { value: 'own', icon: <KeyRound /> },
  { value: 'off', icon: <BellOff /> },
]
const PROVIDER_NAMES: Record<SmsProvider, string> = { xabarchi: 'Xabarchi', eskiz: 'Eskiz.uz', none: '' }
const providerName = (p: SmsProvider | undefined | null) => (p ? PROVIDER_NAMES[p] : '')
/** the default Eskiz sender name until the organisation's own nick is approved */
const ESKIZ_DEFAULT_SENDER = '4546'

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
  const [provider, setProvider] = useState<SmsProviderChoice>('xabarchi')
  const [apiKey, setApiKey] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [sender, setSender] = useState('')
  const [priority, setPriority] = useState<SmsPriority>('transactional')
  const [note, setNote] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [testing, setTesting] = useState(false)
  // the unit's own live account, if it has one
  const savedOwn = d?.mode === 'own' && d.provider !== 'none' ? d.provider : null
  // follow the saved account (after a save too); a unit without its own account starts from the provider in effect above it
  useEffect(() => {
    if (!d) return
    setMode(d.mode)
    setProvider(d.provider !== 'none' ? d.provider : 'xabarchi')
    setPriority(d.defaultPriority)
    setNote(d.senderNote ?? '')
    setLogin(d.mode === 'own' ? (d.login ?? '') : '')
    setSender(d.mode === 'own' ? (d.sender ?? '') : '')
    setApiKey('')
    setPassword('')
  }, [d])

  const needsLogin = mode === 'own' && provider === 'eskiz' && !login.trim()
  // the secret: a Xabarchi key / an Eskiz password — needed the first time and when the provider changes
  const needsSecret = mode === 'own' && (provider === 'xabarchi' ? !apiKey.trim() && savedOwn !== 'xabarchi' : !password.trim() && savedOwn !== 'eskiz')
  const ownDirty = !!d && mode === 'own' && (
    provider !== savedOwn || !!apiKey.trim() || !!password.trim() || priority !== d.defaultPriority || note.trim() !== (d.senderNote ?? '')
    || (provider === 'eskiz' && (login.trim() !== (d.mode === 'own' ? (d.login ?? '') : '') || sender.trim() !== (d.mode === 'own' ? (d.sender ?? '') : '')))
  )
  const dirty = !!d && (mode !== d.mode || ownDirty)
  const isRoot = !unit.parentId
  const priorities: { value: SmsPriority; label: string }[] = [
    { value: 'urgent', label: t('admin.sms.priorityUrgent') },
    { value: 'transactional', label: t('admin.sms.priorityTransactional') },
    { value: 'bulk', label: t('admin.sms.priorityBulk') },
  ]
  const providers: { value: SmsProviderChoice; label: string }[] = [
    { value: 'xabarchi', label: t('admin.sms.providerXabarchi') },
    { value: 'eskiz', label: t('admin.sms.providerEskiz') },
  ]

  const persist = async () => {
    await save.mutateAsync({
      unitId: unit.id, mode,
      ...(mode === 'own' ? {
        provider,
        apiKey: provider === 'xabarchi' ? apiKey.trim() || undefined : undefined,
        login: provider === 'eskiz' ? login.trim() : undefined,
        password: provider === 'eskiz' ? password.trim() || undefined : undefined,
        sender: provider === 'eskiz' ? sender.trim() || undefined : undefined,
        defaultPriority: priority, senderNote: note.trim(),
      } : {}),
    })
  }
  /** the missing credential, if any — said once instead of a silent failure */
  const missing = () => {
    if (needsLogin) return toast.warning(t('admin.sms.loginNeeded')), true
    if (needsSecret) return toast.warning(provider === 'eskiz' ? t('admin.sms.passwordNeeded') : t('admin.sms.keyNeeded')), true
    return false
  }
  const submit = async () => {
    if (missing()) return
    try {
      await persist()
      toast.success(t('admin.sms.accountSaved'), unit.name)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  /** ONE real SMS through the account this unit's messages use; unsaved changes are saved first. */
  const test = async () => {
    if (missing()) return
    setTesting(true)
    try {
      if (dirty) await persist()
      const r = await repos.org.testSms(unit.id, testTo.trim() || undefined)
      const to = r.to ? fmtPhone(r.to) : '—'
      toast.success(t('admin.sms.testOk'), r.provider === 'eskiz'
        ? t('admin.sms.testSentEskiz', { to, id: r.providerMessageId ?? '—', balance: r.balance == null ? '—' : fmtNumber(r.balance) })
        : t('admin.sms.testSent', { to, id: r.providerMessageId ?? '—' }))
    } catch (e) {
      toast.error(t('admin.sms.testFailed'), errorMessage(e))
    } finally {
      setTesting(false)
    }
  }

  // what the saved account does right now
  const effectiveName = d?.effectiveUnitName ?? ''
  const live = !!d && d.provider !== 'none'
  const inheritsFrom = !!d && d.mode !== 'own' && live && !!d.effectiveUnitId && d.effectiveUnitId !== unit.id
  const ownDetail = d?.provider === 'eskiz' ? d.login : d?.apiKeyMasked
  const status = !d ? null
    : d.mode === 'off' ? <Badge size="sm" tone="warn" dot>{t('admin.sms.usesNone')}</Badge>
    : d.mode === 'own' && live ? <Badge size="sm" tone="ok" dot>{t('admin.sms.usesOwn')} · {providerName(d.provider)}{ownDetail ? ` · ${ownDetail}` : ''}</Badge>
    : inheritsFrom ? <Badge size="sm" tone="brand" dot>{t('admin.sms.usesInherited', { name: effectiveName })} · {providerName(d.provider)}</Badge>
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
  const eyeButton = (
    <button type="button" onClick={() => setShowSecret((v) => !v)} aria-label={showSecret ? 'hide' : 'show'} className="grid size-7 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
      {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  )

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
              <Field label={t('admin.sms.providerPick')} hint={t('admin.sms.providerPickHint')}>
                {() => <div data-unit-sms-provider-pick={provider}><Segmented<SmsProviderChoice> items={providers} value={provider} onChange={(p) => { setProvider(p); setShowSecret(false) }} className="max-w-full flex-wrap" /></div>}
              </Field>

              {provider === 'xabarchi' ? (
                <>
                  <Field label={t('admin.sms.apiKey')} hint={savedOwn === 'xabarchi' ? `${t('admin.sms.apiKeyCurrent')}: ${d?.apiKeyMasked} · ${t('admin.sms.apiKeyKeep')}` : t('admin.sms.apiKeyHint')}>
                    {(id) => <Input id={id} type={showSecret ? 'text' : 'password'} mono autoComplete="off" placeholder={t('admin.sms.apiKeyPlaceholder')} leftIcon={<KeyRound />} value={apiKey} onChange={(e) => setApiKey(e.target.value)} data-unit-sms-key rightSlot={eyeButton} />}
                  </Field>
                  <Field label={t('admin.sms.priority')} hint={t('admin.sms.priorityHint')}>
                    {() => <Segmented items={priorities} value={priority} onChange={setPriority} className="max-w-full flex-wrap" />}
                  </Field>
                </>
              ) : (
                <>
                  <div className="flex gap-3 rounded-[var(--radius-sm)] border border-info/30 bg-info-soft/40 px-3.5 py-3 text-[13px] text-ink-2" data-unit-sms-eskiz-note>
                    <Info className="mt-0.5 size-4 shrink-0 text-info" />
                    <div className="min-w-0">{t('admin.sms.eskizNote')}</div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('admin.sms.eskizLogin')} required hint={t('admin.sms.eskizLoginHint')}>
                      {(id) => <Input id={id} type="email" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="info@klinika.uz" leftIcon={<AtSign />} value={login} onChange={(e) => setLogin(e.target.value)} data-unit-sms-login />}
                    </Field>
                    <Field label={t('admin.sms.eskizPassword')} required={savedOwn !== 'eskiz'} hint={savedOwn === 'eskiz' ? t('admin.sms.eskizPasswordKeep') : t('admin.sms.eskizPasswordHint')}>
                      {(id) => <Input id={id} type={showSecret ? 'text' : 'password'} autoComplete="new-password" leftIcon={<LockKeyhole />} value={password} onChange={(e) => setPassword(e.target.value)} data-unit-sms-password rightSlot={eyeButton} />}
                    </Field>
                  </div>
                  <Field label={t('admin.sms.eskizSender')} hint={t('admin.sms.eskizSenderHint', { nick: ESKIZ_DEFAULT_SENDER })} optionalText={t('common.optional')}>
                    {(id) => <Input id={id} mono maxLength={40} placeholder={ESKIZ_DEFAULT_SENDER} value={sender} onChange={(e) => setSender(e.target.value)} data-unit-sms-sender />}
                  </Field>
                </>
              )}
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
