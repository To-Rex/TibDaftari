/** Horizontal step chips: registered → entered → submitted → approved. */
import { useTranslation } from 'react-i18next'
import { Check, ChevronRight } from 'lucide-react'
import type { OrderItem } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { fmtDate } from '@/shared/lib/format'

export function ItemTimeline({ item, className }: { item: OrderItem; className?: string }) {
  const { t } = useTranslation()
  const steps: { key: string; at?: string; danger?: boolean }[] = [
    { key: 'registered', at: item.createdAt },
    { key: 'entered', at: item.enteredAt },
    ...(item.status === 'rejected' ? [{ key: 'rejected', at: item.updatedAt, danger: true }] : [{ key: 'submitted', at: item.submittedAt }]),
    { key: 'approved', at: item.approvedAt },
  ]
  return (
    <ol className={cn('flex flex-wrap items-center gap-1', className)}>
      {steps.map((s, i) => {
        const done = !!s.at
        return (
          <li key={s.key} className="flex items-center gap-1">
            <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium tabular transition-colors', done ? (s.danger ? 'border-danger/30 bg-danger-soft text-danger' : 'border-ok/30 bg-ok-soft text-ok') : 'border-line bg-surface text-ink-3')}>
              {done ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-current opacity-60" />}
              {t(`clinical.lab.step_${s.key}`)}
              {done && <span className="opacity-70">{fmtDate(s.at, 'dd.MM HH:mm')}</span>}
            </span>
            {i < steps.length - 1 && <ChevronRight className="size-3.5 text-ink-3/60" />}
          </li>
        )
      })}
    </ol>
  )
}
