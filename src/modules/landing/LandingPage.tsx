import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, CircleCheck, Sparkles, Waypoints } from 'lucide-react'
import { routes } from '@/shared/config/routes'
import { Button, LanguageSwitcher, Logo, ThemeToggle } from '@/shared/ui'
import { useAuth } from '@/features/auth/store'
import { ResultPreviewCard } from './ResultPreviewCard'
import { LandingFlow } from './LandingFlow'
import { LandingValue } from './LandingValue'

const ease = [0.22, 1, 0.36, 1] as const

export default function LandingPage() {
  const { t } = useTranslation()
  const { patient, staff } = useAuth()
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroCopyY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -28])
  const heroPreviewY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 30])
  const patientHref = patient ? routes.portal.root : routes.patientLogin
  const staffHref = staff ? routes.app.root : routes.staffLogin
  const rise = (delay = 0, distance = 20) => ({
    initial: reduce ? false : { opacity: 0, y: distance },
    animate: reduce ? undefined : { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.01 : 0.7, delay: reduce ? 0 : delay, ease },
  })

  return (
    <div className="landing-page relative min-h-dvh overflow-x-clip bg-bg text-ink">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-brand px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t('landing.skipToContent')}
      </a>

      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="landing-orb landing-orb-a absolute -left-28 -top-36 h-[34rem] w-[34rem] rounded-full bg-brand/12 blur-3xl" />
        <div className="landing-orb landing-orb-b absolute right-[-14rem] top-[20rem] h-[38rem] w-[38rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="landing-orb landing-orb-c absolute bottom-[-18rem] left-[22%] h-[36rem] w-[36rem] rounded-full bg-brand/8 blur-3xl" />
        <div className="absolute inset-0 grid-dots opacity-[0.27] [mask-image:radial-gradient(76%_46%_at_50%_0%,black,transparent)]" />
        <div className="landing-noise absolute inset-0 opacity-[0.035]" />
      </div>

      <motion.header
        initial={reduce ? false : { opacity: 0, y: -14 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.6, ease }}
        className="sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4"
      >
        <div className="mx-auto flex h-14 max-w-[1340px] items-center justify-between rounded-2xl border border-line/80 bg-bg/75 px-3 shadow-[0_12px_30px_-24px_rgb(20_32_29/0.6)] backdrop-blur-xl sm:h-16 sm:px-4">
          <Logo />
          <nav aria-label={t('landing.navigationLabel')} className="hidden items-center gap-1 lg:flex">
            {[
              ['#oqim', t('landing.navFlow')],
              ['#imkoniyat', t('landing.navCapabilities')],
              ['#andozalar', t('landing.navTemplates')],
            ].map(([href, label]) => (
              <a key={href} href={href} className="landing-nav-link rounded-lg px-3 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link to={staffHref} className="ml-1.5 max-sm:hidden">
              <Button variant="secondary" size="sm">{t('landing.ctaStaff')}</Button>
            </Link>
          </div>
        </div>
      </motion.header>

      <main id="main-content">
        <section ref={heroRef} className="mx-auto grid max-w-[1340px] items-center gap-14 px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[minmax(0,0.94fr)_minmax(420px,0.86fr)] lg:gap-16 lg:pt-24 xl:gap-24 xl:px-10">
          <motion.div style={reduce ? undefined : { y: heroCopyY }} className="relative z-10">
            <motion.div {...rise(0)} className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-brand/20 bg-brand-soft/70 px-3 py-1.5 text-[12px] font-semibold text-brand-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.28)]">
              <span className="relative flex size-2"><span className="relative inline-flex size-2 rounded-full bg-brand" /></span>
              <Sparkles className="size-3.5 shrink-0" />
              <span className="truncate">{t('landing.heroEyebrow')}</span>
            </motion.div>

            <motion.h1 {...rise(0.07)} className="max-w-3xl text-[clamp(2.7rem,6vw,5.6rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-pretty">
              {t('landing.heroTitleBefore')}{' '}
              <span className="relative whitespace-nowrap text-brand">
                {t('landing.heroTitleAccent')}
                <motion.span
                  aria-hidden
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={reduce ? undefined : { scaleX: 1 }}
                  transition={{ duration: reduce ? 0.01 : 0.75, delay: reduce ? 0 : 0.38, ease }}
                  className="absolute -bottom-2 left-0 h-2 w-full origin-left -rotate-1 rounded-full bg-brand/15"
                />
              </span>{' '}
              {t('landing.heroTitleAfter')}
            </motion.h1>

            <motion.p {...rise(0.14)} className="mt-7 max-w-xl text-[16px] leading-[1.75] text-ink-2 sm:text-[18px]">
              {t('landing.heroSubtitle')}
            </motion.p>

            <motion.div {...rise(0.21)} className="mt-9 flex flex-wrap items-center gap-3">
              <motion.div whileHover={reduce ? undefined : { y: -3, scale: 1.015 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }}>
                <Link to={patientHref}>
                  <Button className="landing-cta" size="lg" rightIcon={<ArrowRight className="size-4" />}>{t('landing.ctaPatient')}</Button>
                </Link>
              </motion.div>
              <motion.div whileHover={reduce ? undefined : { y: -3, scale: 1.015 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }}>
                <Link to={staffHref}>
                  <Button className="landing-cta" size="lg" variant="ghost" rightIcon={<Waypoints className="size-4" />}>{t('landing.ctaStaff')}</Button>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div {...rise(0.28)} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-ink-2 sm:mt-12">
              <span className="inline-flex items-center gap-2"><CircleCheck className="size-4 text-ok" />{t('landing.heroProofOne')}</span>
              <span className="inline-flex items-center gap-2"><CircleCheck className="size-4 text-ok" />{t('landing.heroProofTwo')}</span>
            </motion.div>
          </motion.div>

          <motion.div style={reduce ? undefined : { y: heroPreviewY }} className="relative mx-auto w-full max-w-[610px] pb-12 lg:pb-4">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 32, rotate: -1.8 }}
              animate={reduce ? undefined : { opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: reduce ? 0.01 : 0.95, delay: reduce ? 0 : 0.22, ease }}
              className="relative"
            >
              <motion.div
                animate={reduce ? undefined : { y: [0, -7, 0] }}
                whileHover={reduce ? undefined : { y: -5, rotate: -0.35, scale: 1.008 }}
                transition={{ y: { duration: 6, repeat: Infinity, ease: 'easeInOut' }, default: { type: 'spring', stiffness: 210, damping: 20 } }}
                className="relative"
              >
                <ResultPreviewCard />
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        <section aria-label={t('landing.proofStripLabel')} className="mx-auto max-w-[1340px] px-5 pb-20 sm:px-8 xl:px-10">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: reduce ? 0.01 : 0.65, ease }}
            className="grid overflow-hidden rounded-[28px] border border-line bg-surface/70 shadow-[0_22px_56px_-44px_rgb(20_32_29/0.46)] backdrop-blur sm:grid-cols-[1.15fr_0.85fr]"
          >
            <div className="relative flex items-start gap-4 p-5 sm:p-7">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink"><Waypoints className="size-5" /></span>
              <div>
                <p className="text-[15px] font-semibold">{t('landing.proofTitle')}</p>
                <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-ink-2">{t('landing.proofText')}</p>
              </div>
              <motion.span
                aria-hidden
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={reduce ? undefined : { scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: reduce ? 0.01 : 0.75, ease }}
                className="absolute bottom-0 left-0 h-1 w-28 origin-left bg-brand"
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-line border-t border-line bg-surface-2/55 sm:border-l sm:border-t-0">
              {[
                [t('landing.proofOneTitle'), t('landing.proofOneText')],
                [t('landing.proofTwoTitle'), t('landing.proofTwoText')],
              ].map(([title, text]) => (
                <div key={title} className="p-5 sm:p-7">
                  <p className="text-[15px] font-semibold text-brand-ink">{title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <LandingFlow staffHref={staffHref} />
        <LandingValue patientHref={patientHref} staffHref={staffHref} />
      </main>

      <footer className="border-t border-line bg-surface/60">
        <div className="mx-auto flex max-w-[1340px] flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between xl:px-10">
          <div className="flex items-center gap-4">
            <Logo compact />
            <span className="hidden h-4 w-px bg-line sm:block" />
            <span className="text-[12.5px] text-ink-3">{t('landing.footer', { year: new Date().getFullYear() })}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-ink-3">
            <a href="#oqim" className="landing-footer-link landing-nav-link transition-colors hover:text-brand-ink">{t('landing.navFlow')}</a>
            <a href="#imkoniyat" className="landing-footer-link landing-nav-link transition-colors hover:text-brand-ink">{t('landing.navCapabilities')}</a>
            <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-brand" />{t('landing.demoBadge')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
