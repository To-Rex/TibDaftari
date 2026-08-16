import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { routes } from '@/shared/config/routes'
import { LanguageSwitcher, Logo, ThemeToggle } from '@/shared/ui'

/** Centered auth card on the landing background. */
export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-bg">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute inset-0 grid-dots opacity-30 [mask-image:radial-gradient(60%_40%_at_50%_0%,black,transparent)]" />
      </div>
      <header className="mx-auto flex h-[64px] xs:h-[72px] max-w-6xl 2xl:max-w-7xl items-center justify-between gap-2 px-3 xs:px-5 sm:px-8">
        <Link to={routes.home} className="inline-flex items-center gap-3 text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" />
          <Logo />
        </Link>
        <div className="flex items-center gap-1"><LanguageSwitcher /><ThemeToggle /></div>
      </header>
      <main className="mx-auto grid max-w-6xl 2xl:max-w-7xl gap-6 px-3 pb-16 pt-4 xs:px-5 sm:px-8 sm:pt-6 lg:grid-cols-[440px_minmax(0,1fr)] lg:items-start lg:gap-10 lg:pt-14 2xl:grid-cols-[480px_minmax(0,1fr)] 2xl:gap-16">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="w-full min-w-0 max-w-md justify-self-center rounded-[var(--radius-lg)] border border-line bg-bg-elevated p-4 shadow-2 xs:p-5 sm:p-7 lg:max-w-none lg:justify-self-start">
          {children}
        </motion.div>
        {/* Demo hints: side column on desktop, stacked under the card on phones (still reachable) */}
        {aside && <div className="w-full min-w-0 max-w-md justify-self-center lg:max-w-none lg:justify-self-stretch">{aside}</div>}
      </main>
    </div>
  )
}
