/**
 * /v/:token — what the QR code printed on a result opens: an authenticity check only. Whoever holds the paper sees
 * whether it is genuine (which clinic issued it, when, the numbers to compare, the patient's initials) or withdrawn —
 * never the results, the PDF or an SMS code; those stay behind the SMS link (/d/:token).
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { BadgeCheck, FileX2, Loader2, SearchX, ShieldCheck, ShieldX } from 'lucide-react'
import { API_BASE } from '@/data/http/client'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { fmtDateTime } from '@/shared/lib/format'
import { LanguageSwitcher, Logo, ThemeToggle } from '@/shared/ui'

type Check = {
  id: string
  status: 'valid' | 'revoked'
  title: string
  companyName: string
  branchName: string
  orderNumber: string
  doctorName: string
  patient: string
  issuedAt: string
  revokedAt: string | null
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; check: Check; checkedAt: string }
  | { status: 'error'; notFound: boolean }

const btn = 'inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius)] px-5 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25'

export default function PublicVerifyPage() {
  const { t } = useTranslation()
  const { token = '' } = useParams()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/v/${encodeURIComponent(token)}`, { cache: 'no-store' })
        if (!alive) return
        if (!response.ok) {
          setState({ status: 'error', notFound: response.status === 404 })
          return
        }
        const check = (await response.json()) as Check
        if (alive) setState({ status: 'ready', check, checkedAt: new Date().toISOString() })
      } catch {
        if (alive) setState({ status: 'error', notFound: false })
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [token])

  const rows = (check: Check) =>
    [
      { key: 'document', value: check.title },
      { key: 'patient', value: check.patient },
      { key: 'clinic', value: check.companyName },
      { key: 'branch', value: check.branchName },
      { key: 'doctor', value: check.doctorName },
      { key: 'issued', value: fmtDateTime(check.issuedAt), tabular: true },
      ...(check.revokedAt ? [{ key: 'revokedAt', value: fmtDateTime(check.revokedAt), tabular: true }] : []),
      { key: 'orderNumber', value: check.orderNumber, tabular: true },
      { key: 'docId', value: check.id.slice(0, 13), mono: true },
    ].filter((row) => row.value)

  return (
    <div className="min-h-dvh bg-bg text-ink" data-public-verify={state.status === 'ready' ? state.check.status : state.status}>
      <header className="flex h-16 items-center justify-between border-b border-line px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        {state.status === 'loading' && (
          <div className="grid min-h-[50vh] place-items-center text-ink-3">
            <span className="flex items-center gap-2 text-[14px]">
              <Loader2 className="size-5 animate-spin" />
              {t('portal.publicVerify.loading')}
            </span>
          </div>
        )}

        {state.status === 'ready' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 w-full">
            <div className="flex flex-col items-center gap-3 text-center">
              <span
                className={cn(
                  'grid size-16 place-items-center rounded-full',
                  state.check.status === 'valid' ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger',
                )}
              >
                {state.check.status === 'valid' ? <BadgeCheck className="size-8" /> : <ShieldX className="size-8" />}
              </span>
              <h1 className="text-[21px] font-semibold">
                {state.check.status === 'valid' ? t('portal.publicVerify.valid') : t('portal.publicVerify.revoked')}
              </h1>
              <p className="text-[14px] text-ink-3">
                {state.check.status === 'valid'
                  ? t('portal.publicVerify.validHint', { clinic: state.check.companyName })
                  : t('portal.publicVerify.revokedHint')}
              </p>
            </div>
            <dl className="mt-6 space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4 text-[13.5px] shadow-1">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-3">{t('portal.publicVerify.status')}</dt>
                <dd
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold',
                    state.check.status === 'valid' ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger',
                  )}
                >
                  {state.check.status === 'valid' ? t('portal.publicVerify.statusValid') : t('portal.publicVerify.statusRevoked')}
                </dd>
              </div>
              {rows(state.check).map((row) => (
                <div key={row.key} className="flex justify-between gap-4">
                  <dt className="shrink-0 text-ink-3">{t(`portal.publicVerify.${row.key}`)}</dt>
                  <dd className={cn('text-right font-medium', row.tabular && 'tabular', row.mono && 'font-mono text-[12px] font-normal text-ink-2')}>
                    {row.value}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-[12.5px]">
                <dt className="text-ink-3">{t('portal.publicVerify.checkedAt')}</dt>
                <dd className="tabular text-ink-2">{fmtDateTime(state.checkedAt)}</dd>
              </div>
            </dl>
            <p className="mt-4 flex items-start gap-2 text-[12.5px] text-ink-3">
              <ShieldCheck className="mt-px size-4 shrink-0" />
              {t('portal.publicVerify.privacy')}
            </p>
            <p className="mt-3 text-[12.5px] text-ink-3">
              {t('portal.publicVerify.patientHint')}{' '}
              <Link to={routes.patientLogin} className="font-medium text-brand-ink hover:underline">
                {t('portal.publicVerify.portal')}
              </Link>
            </p>
          </motion.div>
        )}

        {state.status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 text-center"
          >
            <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
              {state.notFound ? <SearchX className="size-7" /> : <FileX2 className="size-7" />}
            </span>
            <h1 className="text-[20px] font-semibold" data-public-verify-error={state.notFound ? 'not-found' : 'failed'}>
              {state.notFound ? t('portal.publicVerify.notFound') : t('portal.publicVerify.failed')}
            </h1>
            <p className="text-[14px] text-ink-3">
              {state.notFound ? t('portal.publicVerify.notFoundHint') : t('portal.publicVerify.failedHint')}
            </p>
            {!state.notFound && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={cn(btn, 'mt-2 border border-line-strong/70 bg-surface text-ink shadow-1 hover:bg-surface-2')}
              >
                {t('common.retry')}
              </button>
            )}
          </motion.div>
        )}
      </main>
    </div>
  )
}
