/**
 * /d/:token — the public verification link a result carries (its QR code and the SMS / Telegram link).
 * Anyone who scans it sees the authenticity card (what was issued, by which clinic, when). The PDF
 * itself is always protected: an SMS code is sent to the phone the document belongs to, and the PDF
 * comes back in the same verify request.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { BadgeCheck, Download, ExternalLink, FileText, FileX2, Loader2, ShieldCheck } from 'lucide-react'
import { API_BASE } from '@/data/http/client'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { fmtDate } from '@/shared/lib/format'
import { LanguageSwitcher, Logo, ThemeToggle } from '@/shared/ui'

type Info = { id: string; title: string; companyName: string; issuedAt: string }

type State =
  | { status: 'loading' }
  | { status: 'verify'; info: Info }
  | { status: 'otp'; info: Info; phoneMasked: string }
  | { status: 'ready'; blobUrl: string; filename: string }
  | { status: 'error'; notFound: boolean; revoked?: boolean; message?: string }

type Otp = {
  challengeId: string
  phoneMasked: string
  codeLength: number
  resendIn: number
  expiresAt: number
}

type ApiError = { code?: string; message?: string; details?: { phone?: string | null; retryAfter?: number } }

const btn = 'inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius)] px-5 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25'
const OTP_CACHE = 'tibdaftari:doc-otp:'

const readApiError = async (response: Response): Promise<ApiError> => {
  try {
    const body = await response.json()
    const error = body?.error ?? {}
    return { code: error.code, message: error.message, details: error.details }
  } catch {
    return {}
  }
}

const pdfFilename = (response: Response) =>
  /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? 'natija.pdf'

const rememberOtp = (token: string, otp: Otp) => {
  try {
    sessionStorage.setItem(OTP_CACHE + token, JSON.stringify(otp))
  } catch {
    // sessionStorage may be unavailable (privacy mode) — the form still works for this page
  }
}

const forgetOtp = (token: string) => {
  try {
    sessionStorage.removeItem(OTP_CACHE + token)
  } catch {
    // ignore
  }
}

export default function PublicResultPage() {
  const { t } = useTranslation()
  const { token = '' } = useParams()
  const infoUrl = `${API_BASE}/d/${encodeURIComponent(token)}`
  const otpRequestUrl = `${infoUrl}/otp/request`
  const otpVerifyUrl = `${infoUrl}/otp/verify`

  const [state, setState] = useState<State>({ status: 'loading' })
  const [otp, setOtp] = useState<Otp | null>(null)
  const [code, setCode] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const loadedFor = useRef<string | null>(null)

  async function requestOtp(info: Info) {
    setState({ status: 'otp', info, phoneMasked: '' })
    setSending(true)
    setOtpError(null)
    try {
      const response = await fetch(otpRequestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!response.ok) {
        const error = await readApiError(response)
        setOtpError(error.message || t('portal.publicResult.otpFailed'))
        if (error.details?.retryAfter) setCooldown(Number(error.details.retryAfter) || 0)
        return
      }
      const data = await response.json()
      const next: Otp = {
        challengeId: data.challengeId,
        phoneMasked: data.phoneMasked,
        codeLength: Number(data.codeLength) || 6,
        resendIn: Number(data.resendIn) || 0,
        expiresAt: Date.now() + (Number(data.expiresIn) || 300) * 1000,
      }
      setOtp(next)
      setState({ status: 'otp', info, phoneMasked: next.phoneMasked })
      setCode('')
      setCooldown(next.resendIn)
      rememberOtp(token, next)
    } catch {
      setOtpError(t('portal.publicResult.otpFailed'))
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (loadedFor.current === token) return
    loadedFor.current = token
    const load = async () => {
      try {
        const response = await fetch(infoUrl, { cache: 'no-store' })
        if (!response.ok) {
          const error = await readApiError(response)
          if (response.status === 410 && error.code === 'revoked') {
            setState({ status: 'error', notFound: false, revoked: true })
            return
          }
          if (response.status === 404) {
            setState({ status: 'error', notFound: true })
            return
          }
          setState({ status: 'error', notFound: false, message: error.message })
          return
        }
        const info = (await response.json()) as Info
        setState({ status: 'verify', info })
      } catch {
        setState({ status: 'error', notFound: false })
      }
    }
    void load()
    // the first load only runs once per token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [infoUrl, token])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const verify = async (event: FormEvent) => {
    event.preventDefault()
    if (!otp || !code.trim() || verifying || sending) return
    setVerifying(true)
    setOtpError(null)
    try {
      const response = await fetch(otpVerifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: otp.challengeId, code: code.trim() }),
      })
      if (!response.ok) {
        const error = await readApiError(response)
        if (error.code === 'otp_invalid') setOtpError(t('portal.publicResult.otpInvalid'))
        else if (error.code === 'otp_expired') {
          setOtpError(t('portal.publicResult.otpExpired'))
          setOtp(null)
          forgetOtp(token)
          setCooldown(0)
        } else setOtpError(error.message || t('portal.publicResult.otpFailed'))
        return
      }
      const blob = await response.blob()
      setState({ status: 'ready', blobUrl: URL.createObjectURL(blob), filename: pdfFilename(response) })
      forgetOtp(token)
    } catch {
      setOtpError(t('portal.publicResult.otpFailed'))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-ink" data-public-result={state.status}>
      <header className="flex h-16 items-center justify-between border-b border-line px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        {state.status === 'loading' && (
          <div className="grid min-h-[50vh] place-items-center text-ink-3">
            <span className="flex items-center gap-2 text-[14px]">
              <Loader2 className="size-5 animate-spin" />
              {t('portal.publicResult.loading')}
            </span>
          </div>
        )}

        {state.status === 'verify' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-8 w-full max-w-md" data-public-verify>
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-ok-soft text-ok">
                <BadgeCheck className="size-7" />
              </span>
              <h1 className="text-[20px] font-semibold">{t('portal.publicResult.verified')}</h1>
              <p className="text-[14px] text-ink-3">{t('portal.publicResult.verifiedHint')}</p>
            </div>
            <dl className="mt-6 space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4 text-[13.5px] shadow-1">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">{t('portal.publicResult.docTitle')}</dt>
                <dd className="text-right font-medium">{state.info.title}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">{t('portal.publicResult.clinic')}</dt>
                <dd className="text-right font-medium">{state.info.companyName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">{t('portal.publicResult.issued')}</dt>
                <dd className="text-right tabular">{fmtDate(state.info.issuedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">{t('portal.publicResult.docId')}</dt>
                <dd className="text-right font-mono text-[12px] text-ink-2">{state.info.id.slice(0, 13)}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={() => void requestOtp(state.info)} className={cn(btn, 'w-full bg-brand text-white hover:bg-brand-strong')} data-public-view>
                <FileText className="size-5" />
                {t('portal.publicResult.viewPdf')}
              </button>
              <Link to={routes.patientLogin} className={cn(btn, 'w-full border border-line-strong/70 bg-surface text-ink shadow-1 hover:bg-surface-2')}>
                {t('portal.publicResult.portal')}
              </Link>
            </div>
          </motion.div>
        )}

        {state.status === 'otp' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-8 w-full max-w-md"
            data-public-otp
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand-ink">
                <ShieldCheck className="size-7" />
              </span>
              <h1 className="text-[20px] font-semibold">{t('portal.publicResult.otpTitle')}</h1>
              <p className="text-[14px] text-ink-3">
                {state.phoneMasked
                  ? t('portal.publicResult.otpHint', { phone: state.phoneMasked })
                  : t('portal.publicResult.otpNoPhoneHint')}
              </p>
            </div>
            <form onSubmit={verify} className="mt-5 space-y-2">
              <label htmlFor="public-otp-code" className="block text-[13px] font-medium text-ink-2">
                {t('portal.publicResult.otpCode')}
              </label>
              <input
                id="public-otp-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={otp?.codeLength ?? 6}
                disabled={!otp || verifying}
                className="h-12 w-full rounded-[var(--radius)] border border-line-strong bg-surface px-3 text-center text-[20px] tracking-[0.35em] outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
              />
              {otpError && (
                <p role="alert" className="text-[13px] text-danger">
                  {otpError}
                </p>
              )}
              <button
                type="submit"
                disabled={!otp || !code.trim() || verifying || sending}
                className={cn(btn, 'w-full bg-brand text-white hover:bg-brand-strong disabled:opacity-50')}
              >
                {verifying ? <Loader2 className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
                {t('portal.publicResult.otpVerify')}
              </button>
            </form>
            <div className="mt-4 flex flex-col items-center gap-2 text-[13px]">
              <button
                type="button"
                onClick={() => void requestOtp(state.info)}
                disabled={sending || cooldown > 0}
                className="font-medium text-brand-ink hover:underline disabled:text-ink-3 disabled:no-underline"
              >
                {sending
                  ? t('portal.publicResult.otpSending')
                  : cooldown > 0
                    ? t('portal.publicResult.otpResendIn', { seconds: cooldown })
                    : t('portal.publicResult.otpResend')}
              </button>
              <Link to={routes.patientLogin} className="text-ink-3 hover:text-ink">
                {t('portal.publicResult.portal')}
              </Link>
            </div>
          </motion.div>
        )}

        {state.status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 text-center"
          >
            <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
              <FileX2 className="size-7" />
            </span>
            <h1
              className="text-[20px] font-semibold"
              data-public-error={state.revoked ? 'revoked' : state.notFound ? 'not-found' : 'failed'}
            >
              {state.revoked
                ? t('portal.publicResult.revoked')
                : state.notFound
                  ? t('portal.publicResult.notFound')
                  : t('portal.publicResult.failed')}
            </h1>
            <p className="text-[14px] text-ink-3">
              {state.revoked
                ? t('portal.publicResult.revokedHint')
                : state.notFound
                  ? t('portal.publicResult.notFoundHint')
                  : state.message || t('portal.publicResult.failedHint')}
            </p>
            <Link
              to={routes.patientLogin}
              className={cn(btn, 'mt-2 border border-line-strong/70 bg-surface text-ink shadow-1 hover:bg-surface-2')}
            >
              {t('portal.publicResult.portal')}
            </Link>
          </motion.div>
        )}

        {state.status === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                <FileText className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-[20px] font-semibold tracking-tight">{t('portal.publicResult.title')}</h1>
                <p className="text-[13.5px] text-ink-3">{t('portal.publicResult.subtitle')}</p>
              </div>
            </div>
            <div className="grid gap-2 xs:grid-cols-2 sm:flex">
              <a
                href={state.blobUrl}
                target="_blank"
                rel="noopener"
                className={cn(btn, 'bg-brand text-white hover:bg-brand-strong')}
                data-public-open
              >
                <ExternalLink className="size-5" />
                {t('portal.publicResult.open')}
              </a>
              <a
                href={state.blobUrl}
                download={state.filename}
                className={cn(btn, 'border border-line-strong/70 bg-surface text-ink shadow-1 hover:bg-surface-2')}
                data-public-download
              >
                <Download className="size-5" />
                {t('portal.publicResult.download')}
              </a>
            </div>
            {/* phones hand PDFs to their own viewer ("open"); computers show it right here */}
            <object
              aria-label={t('portal.publicResult.title')}
              data={state.blobUrl}
              type="application/pdf"
              className="hidden h-[78vh] w-full rounded-[var(--radius-lg)] border border-line bg-white md:block"
              data-public-preview
            >
              <p className="p-4 text-[13px] text-ink-3">{t('portal.publicResult.subtitle')}</p>
            </object>
            <p className="text-[12.5px] text-ink-3">
              {t('portal.publicResult.privacy')}{' '}
              <Link to={routes.patientLogin} className="font-medium text-brand-ink hover:underline">
                {t('portal.publicResult.portal')}
              </Link>
            </p>
          </motion.div>
        )}
      </main>
    </div>
  )
}
