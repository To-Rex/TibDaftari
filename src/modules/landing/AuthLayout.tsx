import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { routes } from '@/shared/config/routes'
import { LanguageSwitcher, Logo, ThemeToggle } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

/**
 * Auth surface on the landing background. `staff` is the quiet, editorial staff sign-in:
 * a form column and a text-only workflow rail, both on the page background (no heavy panel).
 */
export function AuthLayout({ children, aside, variant = 'default' }: { children: ReactNode; aside?: ReactNode; variant?: 'default' | 'staff' }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const staff = variant === 'staff'
  return (
    <div className={cn('auth-shell relative min-h-dvh overflow-x-clip bg-bg', staff && 'flex flex-col')}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="auth-orb absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
        {staff && <div className="absolute right-[-10rem] top-[14%] size-[30rem] rounded-full border border-line/50" />}
        <div className={cn('absolute inset-0 grid-dots [mask-image:radial-gradient(60%_40%_at_50%_0%,black,transparent)]', staff ? 'opacity-20' : 'opacity-30')} />
      </div>
      <header className={cn('auth-shell-header mx-auto flex h-[64px] w-full items-center justify-between gap-2 px-3 xs:h-[72px] xs:px-5 sm:px-8', staff ? 'max-w-5xl' : 'max-w-6xl 2xl:max-w-7xl')}>
        <Link to={routes.home} className="auth-home-link inline-flex items-center gap-3 text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" />
          <Logo />
        </Link>
        <div className="flex items-center gap-1"><LanguageSwitcher compact={staff} /><ThemeToggle /></div>
      </header>
      <main className={cn(
        'auth-shell-content mx-auto grid w-full px-3 xs:px-5 sm:px-8',
        staff
          ? 'max-w-5xl flex-1 content-center gap-10 py-8 sm:py-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-16 lg:content-center'
          : 'max-w-6xl gap-6 pb-16 pt-4 sm:pt-6 lg:items-start lg:gap-10 lg:pt-14 2xl:max-w-7xl 2xl:gap-16',
        !staff && (aside ? 'lg:grid-cols-[440px_minmax(0,1fr)] 2xl:grid-cols-[480px_minmax(0,1fr)]' : 'justify-items-center'),
      )}>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.01 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'w-full min-w-0 max-w-md justify-self-center',
            !staff && 'auth-panel rounded-[var(--radius-lg)] border border-line bg-bg-elevated p-4 shadow-2 xs:p-5 sm:p-7',
            staff ? 'lg:max-w-none lg:justify-self-stretch lg:self-center' : aside ? 'lg:max-w-none lg:justify-self-start' : 'lg:max-w-[480px]',
          )}
        >
          {children}
        </motion.div>
        {/* Side rail: beside the form on desktop, below it on phones (still reachable) */}
        {aside && (
          <motion.aside
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.5, delay: reduce ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'auth-aside w-full min-w-0 max-w-md justify-self-center lg:max-w-none lg:justify-self-stretch',
              staff && 'lg:self-center lg:border-l lg:border-line lg:pl-12 2xl:pl-16',
            )}
          >
            {aside}
          </motion.aside>
        )}
      </main>
      {staff && (
        <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-3 pb-6 pt-4 text-[11.5px] text-ink-3 xs:px-5 sm:px-8">
          <span>{t('landing.footer', { year: new Date().getFullYear() })}</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-brand" />{t('auth.staffSecure')}</span>
        </footer>
      )}
    </div>
  )
}
