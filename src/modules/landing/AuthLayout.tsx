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
      <header className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to={routes.home} className="inline-flex items-center gap-3 text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" />
          <Logo />
        </Link>
        <div className="flex items-center gap-1"><LanguageSwitcher /><ThemeToggle /></div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[440px_1fr] lg:items-start lg:pt-14">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md justify-self-center rounded-[var(--radius-lg)] border border-line bg-bg-elevated p-7 shadow-2 lg:justify-self-start">
          {children}
        </motion.div>
        {aside && <div className="max-lg:hidden">{aside}</div>}
      </main>
    </div>
  )
}
