import type { ReactNode } from 'react'
import { motion, type Variants } from 'motion/react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

/** Page-level container with a soft entrance animation. */
export function Page({ children, className, width = 'wide' }: { children: ReactNode; className?: string; width?: 'narrow' | 'medium' | 'wide' | 'full' }) {
  // wide/full stretch to the viewport (no dead space on large monitors); padding scales with the screen
  const w = { narrow: 'max-w-3xl', medium: 'max-w-5xl', wide: 'max-w-none 2xl:px-10 3xl:px-14', full: 'max-w-none' }[width]
  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} className={cn('mx-auto w-full px-3 xs:px-4 sm:px-6 lg:px-8 py-4 sm:py-6', w, className)}>
      {children}
    </motion.main>
  )
}

export function PageHeader({ title, description, actions, breadcrumbs, className, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumbs?: { label: ReactNode; to?: string }[]; className?: string; eyebrow?: ReactNode }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {breadcrumbs && (
          <nav className="mb-2 flex items-center gap-1 text-[12.5px] text-ink-3">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {b.to ? <Link to={b.to} className="hover:text-ink transition-colors">{b.label}</Link> : <span className="text-ink-2">{b.label}</span>}
                {i < breadcrumbs.length - 1 && <ChevronRight className="size-3" />}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <div className="mb-1 text-[12px] font-medium uppercase tracking-[0.08em] text-brand-ink">{eyebrow}</div>}
        <h1 className="text-[24px] sm:text-[26px] font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-ink-3 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

/** Toolbar row above tables: search + filters left, actions right. */
export function Toolbar({ children, actions, className }: { children?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between', className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Stagger container for lists/grids */
export const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }
export const fadeUp: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } }
export const MotionList = motion.div
export const MotionItem = motion.div
