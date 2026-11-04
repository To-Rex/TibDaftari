/**
 * Portal login + password of a patient, issued at reception. Phone + SMS code keeps working; a login session sees
 * this patient only, so relatives sharing one phone each get their own. The password is generated (or typed),
 * shown here once — the backend stores only its hash — and optionally sent by SMS (masked in the outbox).
 * Renewing sets a new password and ends the old login sessions; switching off removes the login.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Eye, EyeOff, KeyRound, LockKeyhole, MessageSquare, TriangleAlert, UserRound } from 'lucide-react'
import type { Patient, PortalAccessResult } from '@/domain'
import { fmtDateTime, fmtPhone } from '@/shared/lib/format'
import { errorMessage } from '@/shared/lib/errors'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { Button, Field, IconButton, Input, Modal, Segmented, Switch, toast } from '@/shared/ui'
import { usePortalAccess } from './queries'

/** Same rule as the backend (`portal_login.valid_login`). */
const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{2,39}$/
const PASSWORD_MIN = 6

type Step = 'form' | 'remove' | 'done'

/** The portal sign-in page of this web app (the SMS carries the same address). */
const portalUrl = () => `${window.location.origin}${routes.patientLogin}`

async function copy(text: string, ok: string, failed: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(ok)
  } catch {
    toast.error(failed)
  }
}

export function PortalAccessModal({ patient, open, onClose }: { patient: Patient; open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { set, remove } = usePortalAccess(patient.id)
  const current = patient.portal.login ?? null
  const [step, setStep] = useState<Step>('form')
  const [login, setLogin] = useState('')
  const [pwMode, setPwMode] = useState<'auto' | 'manual'>('auto')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [sendSms, setSendSms] = useState(true)
  const [touched, setTouched] = useState(false)
  const [result, setResult] = useState<PortalAccessResult | null>(null)

  useEffect(() => {
    if (!open) return
    setStep('form')
    setLogin(current ?? '')
    setPwMode('auto')
    setPassword('')
    setShowPw(false)
    setSendSms(true)
    setTouched(false)
    setResult(null)
    // reset on every opening only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const loginErr = login && !LOGIN_RE.test(login) ? t('staff.patients.access.loginInvalid') : null
  const pwErr = pwMode !== 'manual' ? null : password.length < PASSWORD_MIN ? t('staff.patients.access.pwShort') : password !== password.trim() ? t('staff.patients.access.pwSpaces') : null
  const invalid = !!loginErr || !!pwErr

  const submit = async () => {
    setTouched(true)
    if (invalid) return
    try {
      const r = await set.mutateAsync({ login: login || undefined, password: pwMode === 'manual' ? password : undefined, sendSms })
      setResult(r)
      setStep('done')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const switchOff = async () => {
    try {
      await remove.mutateAsync()
      toast.success(t('staff.patients.access.removed'), patient.fullName)
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const copied = t('staff.patients.access.copied')
  const copyFailed = t('staff.patients.access.copyFailed')

  if (step === 'done' && result) {
    const all = t('staff.patients.access.copyText', { url: portalUrl(), login: result.login, password: result.password })
    const smsLine = result.sms === 'queued' ? { tone: 'ok', text: t('staff.patients.access.smsQueued', { phone: fmtPhone(patient.phone) }) }
      : result.sms === 'not_configured' ? { tone: 'warn', text: t('staff.patients.access.smsNotConfigured') }
      : result.sms === 'invalid_phone' ? { tone: 'warn', text: t('staff.patients.access.smsInvalidPhone') }
      : null
    return (
      <Modal open={open} onClose={onClose} size="sm" title={t('staff.patients.access.doneTitle')} description={patient.fullName}
        footer={<><Button variant="ghost" leftIcon={<Copy className="size-4" />} onClick={() => void copy(all, copied, copyFailed)}>{t('staff.patients.access.copyAll')}</Button><Button onClick={onClose} data-portal-access-done>{t('staff.patients.access.done')}</Button></>}>
        <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-line bg-surface-2/40 p-3.5" data-portal-access-result>
          {[
            { key: 'login', label: t('staff.patients.access.login'), value: result.login, icon: <UserRound className="size-4" /> },
            { key: 'password', label: t('staff.patients.access.password'), value: result.password, icon: <LockKeyhole className="size-4" /> },
          ].map((row) => (
            <div key={row.key} className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">{row.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">{row.label}</span>
                <span className="block break-all font-mono text-[17px] font-semibold tracking-wide" data-portal-access-value={row.key}>{row.value}</span>
              </span>
              <IconButton label={t('staff.patients.access.copy')} size="sm" onClick={() => void copy(row.value, copied, copyFailed)}><Copy /></IconButton>
            </div>
          ))}
          <div className="mt-1 border-t border-line pt-2 text-[12.5px] text-ink-3">
            {t('staff.patients.access.page')}: <span className="break-all font-medium text-ink-2">{portalUrl()}</span>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" />{t('staff.patients.access.doneOnce')}
        </p>
        {smsLine && (
          <p className={cn('mt-2 flex items-center gap-2 text-[13px]', smsLine.tone === 'ok' ? 'text-ok' : 'text-warn')} data-portal-access-sms={result.sms}>
            {smsLine.tone === 'ok' ? <Check className="size-4 shrink-0" /> : <MessageSquare className="size-4 shrink-0" />}{smsLine.text}
          </p>
        )}
      </Modal>
    )
  }

  if (step === 'remove') {
    return (
      <Modal open={open} onClose={onClose} size="sm" title={t('staff.patients.access.removeTitle')}
        footer={<><Button variant="ghost" onClick={() => setStep('form')}>{t('common.back')}</Button><Button variant="danger" loading={remove.isPending} onClick={() => void switchOff()} data-portal-access-remove-confirm>{t('staff.patients.access.removeConfirm')}</Button></>}>
        <p className="text-[14px] leading-relaxed text-ink-2">{t('staff.patients.access.removeText', { login: current ?? '' })}</p>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title={t('staff.patients.access.title')} description={current ? t('staff.patients.access.hintRenew') : t('staff.patients.access.hintNew')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button leftIcon={<KeyRound className="size-4" />} loading={set.isPending} disabled={touched && invalid} onClick={() => void submit()} data-portal-access-submit>
            {current ? t('staff.patients.access.renew') : t('staff.patients.access.issue')}
          </Button>
        </>
      }>
      <div className="flex flex-col gap-4">
        {current && (
          <div className="rounded-[var(--radius)] border border-line bg-surface-2/40 px-3.5 py-2.5" data-portal-access-current>
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ok-soft text-ok"><KeyRound className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('staff.patients.access.current')}</span>
                <span className="block break-all font-mono text-[14.5px] font-semibold">{current}</span>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-2">
              <span className="text-[12px] text-ink-3 tabular">{patient.portal.loginSetAt ? t('staff.patients.access.since', { date: fmtDateTime(patient.portal.loginSetAt) }) : ''}</span>
              <Button variant="ghost" size="xs" className="-mr-1.5 text-danger hover:bg-danger-soft/60 hover:text-danger" onClick={() => setStep('remove')} data-portal-access-remove>{t('staff.patients.access.remove')}</Button>
            </div>
          </div>
        )}

        <Field label={t('staff.patients.access.login')} optionalText={t('common.optional')} error={loginErr} hint={t('staff.patients.access.loginHint')}>
          {(id) => (
            <Input id={id} value={login} onChange={(e) => setLogin(e.target.value.toLowerCase().replace(/\s+/g, ''))} maxLength={40} mono={!!login}
              autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={t('staff.patients.access.loginAuto')} leftIcon={<UserRound />} invalid={!!loginErr} data-portal-access-login />
          )}
        </Field>

        <Field label={t('staff.patients.access.password')} error={touched ? pwErr : null} hint={pwMode === 'auto' ? t('staff.patients.access.pwAutoHint') : undefined}>
          {(id) => (
            <div className="flex flex-col gap-2">
              <Segmented<'auto' | 'manual'> size="sm" block value={pwMode} onChange={setPwMode}
                items={[{ value: 'auto', label: t('staff.patients.access.pwAuto') }, { value: 'manual', label: t('staff.patients.access.pwManual') }]} />
              {pwMode === 'manual' && (
                <Input id={id} type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} autoComplete="new-password" autoFocus
                  leftIcon={<LockKeyhole />} invalid={touched && !!pwErr} data-portal-access-password
                  rightSlot={<button type="button" aria-label={showPw ? t('auth.hidePassword') : t('auth.showPassword')} aria-pressed={showPw} onClick={() => setShowPw((s) => !s)} className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink">{showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} />
              )}
            </div>
          )}
        </Field>

        <Switch checked={sendSms} onChange={setSendSms} label={t('staff.patients.access.sendSms')} description={t('staff.patients.access.sendSmsTo', { phone: fmtPhone(patient.phone) })} />
      </div>
    </Modal>
  )
}
