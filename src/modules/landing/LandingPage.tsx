import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, MessageSquareText, FolderLock, Building2, ShieldCheck, Sparkles } from 'lucide-react'
import { routes } from '@/shared/config/routes'
import { Button, Logo, LanguageSwitcher, ThemeToggle, Badge } from '@/shared/ui'
import { useAuth } from '@/features/auth/store'
import { ResultPreviewCard } from './ResultPreviewCard'

const ease = [0.22, 1, 0.36, 1] as const

export default function LandingPage() {
  const { t } = useTranslation()
  const { patient, staff } = useAuth()
  const reduce = useReducedMotion()
  const rise = (d = 0) => ({ initial: { opacity: 0, y: reduce ? 0 : 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: d, ease } })

  const features = [
    { icon: <MessageSquareText />, title: t('landing.feat1Title'), text: t('landing.feat1Text') },
    { icon: <FolderLock />, title: t('landing.feat2Title'), text: t('landing.feat2Text') },
    { icon: <Building2 />, title: t('landing.feat3Title'), text: t('landing.feat3Text') },
  ]

  return (
    <div className="min-h-dvh bg-bg text-ink overflow-x-clip">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl dark:bg-brand/10" />
        <div className="absolute top-[40%] -right-40 h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute inset-0 grid-dots opacity-[0.35] [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]" />
      </div>

      <header className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link to={staff ? routes.app.root : routes.staffLogin} className="ml-2 max-sm:hidden">
            <Button variant="secondary" size="sm">{t('landing.ctaStaff')}</Button>
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
          <div>
            <motion.div {...rise(0)}>
              <Badge tone="brand" className="mb-5 h-7 px-3 text-[12.5px]"><Sparkles className="size-3.5" />{t('landing.heroEyebrow')}</Badge>
            </motion.div>
            <motion.h1 {...rise(0.06)} className="text-[40px] leading-[1.06] font-semibold tracking-[-0.02em] sm:text-[56px]">
              {t('landing.heroTitle')}
            </motion.h1>
            <motion.p {...rise(0.12)} className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2">{t('landing.heroSubtitle')}</motion.p>
            <motion.div {...rise(0.18)} className="mt-9 flex flex-wrap items-center gap-3">
              <Link to={patient ? routes.portal.root : routes.patientLogin}>
                <Button size="lg" rightIcon={<ArrowRight className="size-4" />}>{t('landing.ctaPatient')}</Button>
              </Link>
              <Link to={staff ? routes.app.root : routes.staffLogin}>
                <Button size="lg" variant="ghost">{t('landing.ctaStaff')}</Button>
              </Link>
            </motion.div>
            <motion.dl {...rise(0.26)} className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
              {[
                ['128K+', t('landing.stat1')],
                ['40+', t('landing.stat2')],
                ['< 2 kun', t('landing.stat3')],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-[22px] font-semibold tracking-tight tabular">{v}</dt>
                  <dd className="text-[12.5px] text-ink-3">{l}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div initial={{ opacity: 0, y: reduce ? 0 : 30, rotate: reduce ? 0 : -1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.8, delay: 0.2, ease }} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <ResultPreviewCard />
          </motion.div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: i * 0.08, ease }}
                className="group rounded-[var(--radius-lg)] border border-line bg-surface/70 p-6 backdrop-blur transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-2">
                <span className="mb-4 inline-grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-ink transition-transform duration-300 group-hover:scale-105 [&>svg]:size-5">{f.icon}</span>
                <h3 className="text-[16px] font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-[13px] text-ink-3 sm:flex-row sm:px-8">
          <span>{t('landing.footer', { year: new Date().getFullYear() })}</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" />{t('landing.demoBadge')}</span>
        </div>
      </footer>
    </div>
  )
}
