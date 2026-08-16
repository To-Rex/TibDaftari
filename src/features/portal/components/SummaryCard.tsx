import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { fadeUp } from '../motion'
import type { Tone } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

const iconTone: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  brand: 'bg-brand-soft text-brand-ink',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent/15 text-accent',
}

const cls =
  'group flex h-full min-w-0 items-start gap-3.5 rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-1 2xl:p-5 transition-[box-shadow,transform,border-color] duration-250 ease-[var(--ease-out)]'

export function SummaryCard({
  icon,
  label,
  value,
  sub,
  tone = 'brand',
  to,
}: {
  icon: ReactNode
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  tone?: Tone
  to?: string
}) {
  const body = (
    <>
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105 [&>svg]:size-[18px]',
          iconTone[tone],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-ink-3 text-[12.5px] font-medium">{label}</p>
        <p className="tabular mt-0.5 truncate text-[20px] leading-tight font-semibold tracking-tight 2xl:text-[24px]">
          {value}
        </p>
        {sub && <p className="text-ink-3 mt-1 truncate text-[12.5px]">{sub}</p>}
      </div>
    </>
  )
  return (
    <motion.div variants={fadeUp} className="h-full">
      {to ? (
        <Link
          to={to}
          className={cn(cls, 'hover:border-line-strong hover:shadow-2 hover:-translate-y-px')}
        >
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </motion.div>
  )
}
