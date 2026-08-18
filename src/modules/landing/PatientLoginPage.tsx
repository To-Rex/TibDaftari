import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Phone, ShieldCheck } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Button, Field, Input, toast } from '@/shared/ui'
import { repos, ApiError } from '@/data'
import { useAuth } from '@/features/auth/store'
import { routes } from '@/shared/config/routes'
import { fmtPhone } from '@/shared/lib/format'

const formatLocal = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 9)
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean)
  return parts.join(' ')
}

export default function PatientLoginPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const patientLogin = useAuth((s) => s.patientLogin)
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [challenge, setChallenge] = useState<{ id: string; devCode?: string } | null>(null)
  const [code, setCode] = useState<string[]>(['', '', '', ''])
  const [busy, setBusy] = useState(false)
  const [left, setLeft] = useState(0)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = phone.replace(/\D/g, '')

  useEffect(() => {
    if (left <= 0) return
    const id = setInterval(() => setLeft((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [left])

  const send = async () => {
    setBusy(true)
    try {
      const r = await repos.auth.requestPatientOtp({ phone: `998${digits}` })
      setChallenge({ id: r.challengeId, devCode: r.devCode })
      setStep('code')
      setLeft(45)
      setCode(['', '', '', ''])
      setTimeout(() => inputs.current[0]?.focus(), 60)
      toast.success(t('auth.codeSent'))
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }
  const verify = async (full: string) => {
    if (!challenge) return
    setBusy(true)
    try {
      const s = await repos.auth.verifyPatientOtp({ phone: `998${digits}`, code: full, challengeId: challenge.id })
      patientLogin(s)
      nav(routes.portal.root, { replace: true })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('common.error'))
      setCode(['', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setBusy(false)
    }
  }
  const onDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '')
    if (d.length > 1) {
      const arr = d.slice(0, 4).split('')
      const next = [...code]
      arr.forEach((c, j) => { if (i + j < 4) next[i + j] = c })
      setCode(next)
      const full = next.join('')
      if (full.length === 4) void verify(full)
      else inputs.current[Math.min(3, i + arr.length)]?.focus()
      return
    }
    const next = [...code]
    next[i] = d
    setCode(next)
    if (d && i < 3) inputs.current[i + 1]?.focus()
    const full = next.join('')
    if (full.length === 4) void verify(full)
  }

  return (
    <AuthLayout
      aside={
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface/60 p-4 xs:p-5 sm:p-6 backdrop-blur">
          <p className="inline-flex items-center gap-2 text-[13px] font-medium text-brand-ink"><ShieldCheck className="size-4" />{t('landing.demoBadge')}</p>
          <p className="mt-2 text-[13.5px] text-ink-3 break-words">{t('auth.patientHint')}</p>
        </div>
      }
    >
      <h1 className="text-[22px] font-semibold tracking-tight">{t('auth.patientTitle')}</h1>
      <p className="mt-1 text-[14px] text-ink-3">{t('auth.patientSubtitle')}</p>

      <AnimatePresence mode="wait" initial={false}>
        {step === 'phone' ? (
          <motion.form key="phone" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }} className="mt-7 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (digits.length === 9) void send() }}>
            <Field label={t('auth.phone')}>
              {(id) => (
                <div className="flex items-stretch gap-2">
                  <span className="grid h-10 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line bg-surface-2 px-2 xs:px-3 font-mono text-[13px] xs:text-[14px] text-ink-2">+998</span>
                  <Input id={id} inputMode="numeric" autoFocus autoComplete="tel-national" placeholder="90 123 45 67" value={phone} onChange={(e) => setPhone(formatLocal(e.target.value))} mono leftIcon={<Phone />} />
                </div>
              )}
            </Field>
            <Button type="submit" size="lg" block loading={busy} disabled={digits.length !== 9} className="mt-2">{t('auth.sendCode')}</Button>
            <div className="relative my-2 text-center text-[12px] text-ink-3"><span className="relative z-10 bg-bg-elevated px-3">{t('auth.orContinueWith')}</span><span className="absolute inset-x-0 top-1/2 h-px bg-line" /></div>
            <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
              <Button type="button" variant="secondary" disabled title={t('auth.soon')} leftIcon={<GoogleIcon />}>{t('auth.google')}</Button>
              <Button type="button" variant="secondary" disabled title={t('auth.soon')} leftIcon={<AppleIcon />}>{t('auth.apple')}</Button>
            </div>
          </motion.form>
        ) : (
          <motion.div key="code" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.25 }} className="mt-7">
            <p className="text-[14px] text-ink-2">{t('auth.enterCode', { phone: fmtPhone(`998${digits}`) })}</p>
            <div className="mt-5 flex justify-between gap-2 xs:gap-3">
              {code.map((c, i) => (
                <input key={i} ref={(el) => { inputs.current[i] = el }} inputMode="numeric" maxLength={4} value={c} disabled={busy}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !code[i] && i > 0) inputs.current[i - 1]?.focus() }}
                  className="h-14 min-w-0 w-full rounded-[var(--radius)] border border-line bg-surface text-center font-mono text-[22px] font-semibold xs:h-16 xs:text-[26px] tabular shadow-1 transition-all focus:border-brand focus:ring-4 focus:ring-brand/12 focus:outline-none" />
              ))}
            </div>
            {challenge?.devCode && <p className="mt-3 text-center text-[12.5px] text-ink-3">{t('auth.devHint', { code: challenge.devCode })}</p>}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <button type="button" className="min-h-[40px] text-ink-3 hover:text-ink" onClick={() => setStep('phone')}>{t('auth.changePhone')}</button>
              <button type="button" disabled={left > 0 || busy} onClick={() => void send()} className="min-h-[40px] font-medium text-brand-ink disabled:text-ink-3">{left > 0 ? t('auth.resendIn', { s: left }) : t('auth.resend')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-8 text-center text-[13px] text-ink-3">
        {t('auth.forStaff')} <Link to={routes.staffLogin} className="font-medium text-brand-ink hover:underline">{t('auth.staffLink')}</Link>
      </p>
    </AuthLayout>
  )
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" /><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.2v3.1C3.2 21.3 7.3 24 12 24z" /><path fill="#FBBC05" d="M5.3 14.3c-.5-1.5-.5-3.1 0-4.6V6.6H1.2c-1.6 3.2-1.6 7 0 10.8l4.1-3.1z" /><path fill="#EA4335" d="M12 4.7c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.1 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4.1 3.1c.9-2.9 3.6-5 6.7-5z" /></svg>
)
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4 fill-current"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8 2.2-1.2 3-2.4c.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-3.8zM14 5.4c.7-.8 1.1-1.9 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" /></svg>
)
