import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { initials } from '@/shared/lib/format'

/* ---------- Card ---------- */
export function Card({ className, padded = true, interactive, ...rest }: HTMLAttributes<HTMLDivElement> & { padded?: boolean; interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-line bg-surface shadow-1',
        padded && 'p-5',
        interactive && 'transition-[box-shadow,transform,border-color] duration-250 ease-[var(--ease-out)] hover:shadow-2 hover:border-line-strong hover:-translate-y-px cursor-pointer',
        className,
      )}
      {...rest}
    />
  )
}
export function CardHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-4', className)}>
      <div className="min-w-0 flex-1 basis-[200px]">
        <h3 className="text-[15px] font-semibold text-ink leading-6">{title}</h3>
        {description && <p className="text-[13px] text-ink-3 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 max-w-full">{actions}</div>}
    </div>
  )
}

/* ---------- Badge ---------- */
export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'accent'
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2 border-transparent',
  brand: 'bg-brand-soft text-brand-ink border-transparent',
  ok: 'bg-ok-soft text-ok border-transparent',
  warn: 'bg-warn-soft text-warn border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  info: 'bg-info-soft text-info border-transparent',
  accent: 'bg-accent/15 text-accent border-transparent',
}
export function Badge({ tone = 'neutral', dot, className, children, size = 'md' }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode; size?: 'sm' | 'md' }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap', size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-[12px]', tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  )
}

/* ---------- Avatar ---------- */
export function Avatar({ name, hue, size = 'md', src, className }: { name: string; hue?: number; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; src?: string; className?: string }) {
  const h = hue ?? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  const dims = { xs: 'size-6 text-[10px]', sm: 'size-8 text-[12px]', md: 'size-10 text-[14px]', lg: 'size-12 text-[16px]', xl: 'size-16 text-[22px]' }[size]
  return (
    <span
      className={cn('inline-grid place-items-center rounded-full font-semibold shrink-0 overflow-hidden ring-1 ring-black/5 dark:ring-white/10', dims, className)}
      style={{ background: `oklch(0.92 0.05 ${h})`, color: `oklch(0.42 0.11 ${h})` }}
    >
      {src ? <img src={src} alt={name} className="size-full object-cover" /> : initials(name)}
    </span>
  )
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-3/70', className)} aria-hidden />
}
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-[40%]" />
            <Skeleton className="h-3 w-[25%]" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-14 px-6', className)}>
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-surface-2 text-ink-3 [&>svg]:size-6">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 text-[13.5px] text-ink-3 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ---------- Stat tile ---------- */
export function Stat({ label, value, sub, icon, tone = 'neutral', className, delta }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: Tone; className?: string; delta?: number }) {
  return (
    <Card padded={false} className={cn('p-4 sm:p-5 flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-ink-3">{label}</span>
        {icon && <span className={cn('grid size-8 place-items-center rounded-lg [&>svg]:size-4', tones[tone])}>{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-[26px] leading-none font-semibold tracking-tight tabular">{value}</span>
        {delta != null && (
          <span className={cn('text-[12px] font-medium tabular mb-0.5', delta >= 0 ? 'text-ok' : 'text-danger')}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && <span className="text-[12.5px] text-ink-3">{sub}</span>}
    </Card>
  )
}

/* ---------- Divider / Kbd ---------- */
export const Divider = ({ className }: { className?: string }) => <hr className={cn('border-line', className)} />
export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-grid h-5 min-w-5 place-items-center rounded border border-line bg-surface-2 px-1 font-mono text-[11px] text-ink-3">{children}</kbd>
)
