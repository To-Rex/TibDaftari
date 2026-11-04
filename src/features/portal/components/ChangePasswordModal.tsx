/**
 * The patient changes the portal password (sessions opened with the login only). The backend checks the current
 * password and ends the other login sessions; this one stays signed in.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { repos } from '@/data'
import { errorMessage } from '@/shared/lib/errors'
import { Button, Field, Input, Modal, toast } from '@/shared/ui'

const MIN = 6

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [show, setShow] = useState(false)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setCurrent('')
    setNext('')
    setRepeat('')
    setShow(false)
    setTouched(false)
  }, [open])

  const nextErr = next.length < MIN ? t('portal.profile.pwShort') : next !== next.trim() ? t('portal.profile.pwSpaces') : current && next === current ? t('portal.profile.pwSame') : null
  const repeatErr = repeat !== next ? t('portal.profile.pwMismatch') : null
  const invalid = !current || !!nextErr || !!repeatErr

  const submit = async () => {
    setTouched(true)
    if (invalid) return
    setBusy(true)
    try {
      await repos.auth.changePatientPassword({ currentPassword: current, newPassword: next })
      toast.success(t('portal.profile.pwChanged'), t('portal.profile.pwChangedHint'))
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const type = show ? 'text' : 'password'
  const eye = (
    <button type="button" aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')} aria-pressed={show} onClick={() => setShow((s) => !s)}
      className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink">
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} size="sm" title={t('portal.profile.changePassword')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button loading={busy} disabled={touched && invalid} onClick={() => void submit()} data-change-password-submit>{t('portal.profile.pwSave')}</Button></>}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        {/* lets password managers pair the new password with the account */}
        <input type="text" name="username" autoComplete="username" className="hidden" readOnly tabIndex={-1} aria-hidden />
        <Field label={t('portal.profile.pwCurrent')} error={touched && !current ? t('common.required') : null}>
          {(id) => <Input id={id} type={type} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" maxLength={200} leftIcon={<LockKeyhole />} rightSlot={eye} invalid={touched && !current} />}
        </Field>
        <Field label={t('portal.profile.pwNew')} error={touched ? nextErr : null}>
          {(id) => <Input id={id} type={type} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" maxLength={128} leftIcon={<LockKeyhole />} invalid={touched && !!nextErr} />}
        </Field>
        <Field label={t('portal.profile.pwRepeat')} error={touched ? repeatErr : null}>
          {(id) => <Input id={id} type={type} value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" maxLength={128} leftIcon={<LockKeyhole />} invalid={touched && !!repeatErr} />}
        </Field>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  )
}
