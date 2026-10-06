/**
 * /d/:token — the link a patient gets in the "result ready" SMS / Telegram message. No sign-in: the unguessable
 * document token is the key. The PDF comes from the API (`GET /api/v1/d/{token}`); on a computer it is shown in
 * the page, on a phone the "open" button hands it to the phone's PDF viewer.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Download, ExternalLink, FileText, FileX2, Loader2 } from 'lucide-react'
import { API_BASE } from '@/data/http/client'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { LanguageSwitcher, Logo, ThemeToggle } from '@/shared/ui'

type State = { status: 'loading' } | { status: 'ready'; blobUrl: string; filename: string } | { status: 'error'; notFound: boolean }

const btn = 'inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius)] px-5 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25'

export default function PublicResultPage() {
  const { t } = useTranslation()
  const { token = '' } = useParams()
  const pdfUrl = `${API_BASE}/d/${encodeURIComponent(token)}`
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    let made: string | null = null
    setState({ status: 'loading' })
    fetch(pdfUrl)
      .then(async (r) => {
        if (!r.ok) { if (alive) setState({ status: 'error', notFound: r.status === 404 }); return }
        const blob = await r.blob()
        made = URL.createObjectURL(blob)
        const name = /filename="([^"]+)"/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? 'natija.pdf'
        if (alive) setState({ status: 'ready', blobUrl: made, filename: name })
      })
      .catch(() => { if (alive) setState({ status: 'error', notFound: false }) })
    return () => { alive = false; if (made) URL.revokeObjectURL(made) }
  }, [pdfUrl])

  return (
    <div className="min-h-dvh bg-bg text-ink" data-public-result={state.status}>
      <header className="flex h-16 items-center justify-between border-b border-line px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1"><LanguageSwitcher compact /><ThemeToggle /></div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        {state.status === 'loading' && (
          <div className="grid min-h-[50vh] place-items-center text-ink-3"><span className="flex items-center gap-2 text-[14px]"><Loader2 className="size-5 animate-spin" />{t('portal.publicResult.loading')}</span></div>
        )}
        {state.status === 'error' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger"><FileX2 className="size-7" /></span>
            <h1 className="text-[20px] font-semibold">{state.notFound ? t('portal.publicResult.notFound') : t('portal.publicResult.failed')}</h1>
            <p className="text-[14px] text-ink-3">{state.notFound ? t('portal.publicResult.notFoundHint') : t('portal.publicResult.failedHint')}</p>
            <Link to={routes.patientLogin} className={cn(btn, 'mt-2 border border-line-strong/70 bg-surface text-ink shadow-1 hover:bg-surface-2')}>{t('portal.publicResult.portal')}</Link>
          </motion.div>
        )}
        {state.status === 'ready' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink"><FileText className="size-6" /></span>
              <div className="min-w-0 flex-1">
                <h1 className="text-[20px] font-semibold tracking-tight">{t('portal.publicResult.title')}</h1>
                <p className="text-[13.5px] text-ink-3">{t('portal.publicResult.subtitle')}</p>
              </div>
            </div>
            <div className="grid gap-2 xs:grid-cols-2 sm:flex">
              <a href={pdfUrl} target="_blank" rel="noopener" className={cn(btn, 'bg-brand text-white hover:bg-brand-strong')} data-public-open><ExternalLink className="size-5" />{t('portal.publicResult.open')}</a>
              <a href={state.blobUrl} download={state.filename} className={cn(btn, 'border border-line-strong/70 bg-surface text-ink shadow-1 hover:bg-surface-2')} data-public-download><Download className="size-5" />{t('portal.publicResult.download')}</a>
            </div>
            {/* phones hand PDFs to their own viewer ("open"); computers show it right here */}
            <object aria-label={t('portal.publicResult.title')} data={state.blobUrl} type="application/pdf" className="hidden h-[78vh] w-full rounded-[var(--radius-lg)] border border-line bg-white md:block" data-public-preview>
              <p className="p-4 text-[13px] text-ink-3">{t('portal.publicResult.subtitle')}</p>
            </object>
            <p className="text-[12.5px] text-ink-3">{t('portal.publicResult.privacy')} <Link to={routes.patientLogin} className="font-medium text-brand-ink hover:underline">{t('portal.publicResult.portal')}</Link></p>
          </motion.div>
        )}
      </main>
    </div>
  )
}
