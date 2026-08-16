import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ChevronRight, Receipt } from 'lucide-react'
import type { Order } from '@/domain'
import { routes } from '@/shared/config/routes'
import { fmtDate, fmtMoney } from '@/shared/lib/format'
import { Badge } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { fadeUp } from '../motion'
import { orderActiveCount, orderReadyCount, paymentTone } from '../status'

export function VisitRow({
  order,
  place,
  className,
  compact,
}: {
  order: Order
  place?: string
  className?: string
  compact?: boolean
}) {
  const { t } = useTranslation()
  const done = orderReadyCount(order)
  const total = orderActiveCount(order)
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <motion.div variants={fadeUp}>
      <Link
        to={routes.portal.visit(order.id)}
        className={cn(
          'group hover:bg-surface-2/70 flex items-center gap-3.5 px-4 py-3.5 transition-colors sm:px-5',
          className,
        )}
      >
        <span className="bg-brand-soft text-brand-ink grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105">
          <Receipt className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-ink flex items-center gap-2 text-[14.5px] font-medium">
            <span className="tabular">{order.number}</span>
            {!compact && (
              <Badge tone={paymentTone[order.payment]} size="sm">
                {t(`portal.payment.${order.payment}`)}
              </Badge>
            )}
          </p>
          <p className="text-ink-3 mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px]">
            {place && <span className="truncate">{place}</span>}
            {place && <span aria-hidden>·</span>}
            <span className="tabular">{fmtDate(order.createdAt)}</span>
            <span aria-hidden>·</span>
            <span>{t('portal.common.services', { count: order.itemCount })}</span>
          </p>
          {!compact && (
            <div className="mt-2 flex items-center gap-2.5">
              <div className="bg-surface-3 h-1.5 w-full max-w-[160px] overflow-hidden rounded-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                  className={cn('h-full rounded-full', pct === 100 ? 'bg-ok' : 'bg-brand')}
                />
              </div>
              <span className="tabular text-ink-3 text-[12px]">
                {t('portal.visits.ready', { done, total })}
              </span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="tabular text-[14px] font-semibold">{fmtMoney(order.total)}</span>
          {compact ? (
            <Badge tone={paymentTone[order.payment]} size="sm">
              {t(`portal.payment.${order.payment}`)}
            </Badge>
          ) : (
            <span className="text-ink-3 text-[12px]">
              {t(`portal.orderStatus.${order.status}`)}
            </span>
          )}
        </div>
        <ChevronRight className="text-ink-3 size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  )
}
