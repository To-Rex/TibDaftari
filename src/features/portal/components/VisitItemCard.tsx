import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowUpRight, Clock, RotateCcw } from 'lucide-react'
import type { OrderItem } from '@/domain'
import { routes } from '@/shared/config/routes'
import { fmtDateTime, fmtMoney } from '@/shared/lib/format'
import { Badge, Button } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { fadeUp } from '../motion'
import { itemTone } from '../status'
import { StatusTimeline } from './StatusTimeline'

export function VisitItemCard({ item }: { item: OrderItem }) {
  const { t } = useTranslation()
  const cancelled = item.status === 'cancelled'
  const approved = item.status === 'approved'
  return (
    <motion.article
      variants={fadeUp}
      className={cn('px-4 py-4 sm:px-5', cancelled && 'opacity-60')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink-3 text-[12px] font-medium tracking-[0.05em] uppercase">
            {item.categoryName}
          </p>
          <h3 className="text-ink mt-0.5 text-[15px] font-semibold">{item.serviceName}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={itemTone[item.status]} dot={!cancelled}>
            {t(`portal.status.${item.status}`)}
          </Badge>
          <span className="tabular text-ink-2 text-[13px] font-medium">
            {fmtMoney(item.finalPrice)}
            {item.finalPrice !== item.price && (
              <span className="tabular text-ink-3 ml-1.5 text-[11.5px] font-normal line-through">
                {fmtMoney(item.price, false)}
              </span>
            )}
          </span>
        </div>
      </div>

      {!cancelled && <StatusTimeline status={item.status} className="mt-4 max-w-md" />}

      <div className="text-ink-3 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
        {item.doctorName && (
          <span>
            {t('portal.common.doctor')}: <span className="text-ink-2">{item.doctorName}</span>
          </span>
        )}
        {item.technicianName && (
          <span>
            {t('portal.common.technician')}:{' '}
            <span className="text-ink-2">{item.technicianName}</span>
          </span>
        )}
        {approved && item.approvedAt && (
          <span className="tabular inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {fmtDateTime(item.approvedAt)}
          </span>
        )}
      </div>

      {item.status === 'rejected' && (
        <p className="bg-danger-soft/60 text-danger mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px]">
          <RotateCcw className="size-3.5" /> {t('portal.visit.rejectedHint')}
        </p>
      )}

      {approved && item.documentId ? (
        <Link to={routes.portal.result(item.documentId)} className="mt-3 inline-block">
          <Button variant="soft" size="sm" rightIcon={<ArrowUpRight className="size-4" />}>
            {t('portal.visit.viewResult')}
          </Button>
        </Link>
      ) : (
        !cancelled &&
        !approved && <p className="text-ink-3 mt-3 text-[12.5px]">{t('portal.visit.resultSoon')}</p>
      )}
    </motion.article>
  )
}
