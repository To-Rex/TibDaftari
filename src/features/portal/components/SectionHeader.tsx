import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export function SectionHeader({
  title,
  to,
  linkLabel,
  className,
}: {
  title: ReactNode
  to?: string
  linkLabel?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-baseline justify-between gap-3', className)}>
      <h2 className="text-ink text-[15px] font-semibold tracking-tight">{title}</h2>
      {to && (
        <Link
          to={to}
          className="group text-brand-ink hover:text-brand inline-flex items-center gap-1 text-[13px] font-medium transition-colors"
        >
          {linkLabel}
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}
