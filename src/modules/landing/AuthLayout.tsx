import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { routes } from '@/shared/config/routes'
import { LanguageSwitcher, Logo, ThemeToggle } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

/** Auth card on the landing background. `staff` gives the split staff sign-in composition. */
export function AuthLayout({ children, aside, variant = 'default' }: { children: ReactNode; aside?: ReactNode; variant?: 'default' | 'staff' }) {
  const reduce = useReducedMotion()
  const staff = variant === 'staff'
  return (
    <div className="auth-shell relative min-h-dvh overflow-x-clip bg-bg">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="auth-orb absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
        {staff && <div className="absolute right-[-12rem] top-[18%] h-[34rem] w-[34rem] rounded-full bg-brand/5 blur-3xl" />}
        <div className="absolute inset-0 grid-dots opacity-30 [mask-image:radial-gradient(60%_40%_at_50%_0%,black,transparent)]" />
      </div>
      <header className={cn('auth-shell-header mx-auto flex h-[64px] items-center justify-between gap-2 px-3 xs:h-[72px] xs:px-5 sm:px-8', staff ? 'max-w-7xl' : 'max-w-6xl 2xl:max-w-7xl')}>
        <Link to={routes.home} className="auth-home-link inline-flex items-center gap-3 text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" />
          <Logo />
        </Link>
        <div className="flex items-center gap-1"><LanguageSwitcher /><ThemeToggle /></div>
      </header>
      <main className={cn(
        'auth-shell-content mx-auto grid px-3 pb-16 pt-4 xs:px-5 sm:px-8 sm:pt-6 lg:items-start lg:pt-14',
        staff
          ? 'max-w-7xl gap-6 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-12 2xl:grid-cols-[minmax(0,500px)_minmax(0,1fr)] 2xl:gap-16'
          : 'max-w-6xl gap-6 lg:gap-10 2xl:max-w-7xl 2xl:gap-16',
        !staff && (aside ? 'lg:grid-cols-[440px_minmax(0,1fr)] 2xl:grid-cols-[480px_minmax(0,1fr)]' : 'justify-items-center'),
      )}>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.01 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'auth-panel w-full min-w-0 max-w-md justify-self-center rounded-[var(--radius-lg)] border border-line bg-bg-elevated p-4 shadow-2 xs:p-5 sm:p-7',
            staff ? 'lg:max-w-none lg:justify-self-stretch lg:self-start lg:p-8' : aside ? 'lg:max-w-none lg:justify-self-start' : 'lg:max-w-[480px]',
          )}
        >
          {children}
        </motion.div>
        {/* Side panel: on desktop beside the card, on phones stacked below it (still reachable) */}
        {aside && (
          <motion.aside
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.5, delay: reduce ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="auth-aside w-full min-w-0 max-w-md justify-self-center lg:max-w-none lg:justify-self-stretch"
          >
            {aside}
          </motion.aside>
        )}
      </main>
    </div>
  )
}
