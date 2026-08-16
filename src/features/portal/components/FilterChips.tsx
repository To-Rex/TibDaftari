import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'

/** Horizontal scrollable chip row (mobile-friendly filter). */
export function FilterChips<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { value: T; label: ReactNode; count?: number }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0',
        className,
      )}
      role="radiogroup"
    >
      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(it.value)}
            className={cn(
              'relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
              active
                ? 'text-brand-ink border-transparent'
                : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId="portal-chip"
                className="bg-brand-soft absolute inset-0 rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{it.label}</span>
            {it.count != null && (
              <span
                className={cn(
                  'tabular relative rounded-full px-1.5 text-[11px]',
                  active ? 'bg-brand/15' : 'bg-surface-2 text-ink-3',
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
