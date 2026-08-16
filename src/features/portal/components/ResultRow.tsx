import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ChevronRight, FileCheck2, MessageSquareText, Smartphone } from 'lucide-react'
import type { ResultDocument } from '@/domain'
import { routes } from '@/shared/config/routes'
import { fmtDate } from '@/shared/lib/format'
import { Badge, Tooltip } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { fadeUp } from '../motion'
import { deliveredVia, documentTitle, isRecent } from '../status'

export function ResultRow({
  doc,
  clinic,
  orderNumber,
  showChannels,
  className,
}: {
  doc: ResultDocument
  clinic?: string
  orderNumber?: string
  showChannels?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const fresh = isRecent(doc.createdAt)
  return (
    <motion.div variants={fadeUp}>
      <Link
        to={routes.portal.result(doc.id)}
        className={cn(
          'group hover:bg-surface-2/70 flex items-center gap-3 px-3 py-3.5 transition-colors xs:gap-3.5 xs:px-4 sm:px-5',
          className,
        )}
      >
        <span className="bg-ok-soft text-ok relative grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105">
          <FileCheck2 className="size-[18px]" />
          {fresh && (
            <span className="bg-brand ring-surface absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-ink line-clamp-2 text-[14.5px] font-medium xs:truncate">{documentTitle(doc)}</p>
          <p className="text-ink-3 mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px]">
            {clinic && <span className="max-w-full truncate">{clinic}</span>}
            {clinic && orderNumber && <span aria-hidden>·</span>}
            {orderNumber && <span className="tabular">{orderNumber}</span>}
            {/* watch/tiny phones: status + date move into the meta line */}
            <span className="tabular text-ok xs:hidden">· {t('portal.status.approved')} · {fmtDate(doc.createdAt)}</span>
            {showChannels && (
              <span className="text-ink-3/70 ml-1 inline-flex items-center gap-1">
                {deliveredVia(doc, 'portal') && (
                  <Tooltip label={t('portal.results.viaPortal')}>
                    <Smartphone className="size-3.5" />
                  </Tooltip>
                )}
                {deliveredVia(doc, 'sms') && (
                  <Tooltip label={t('portal.results.viaSms')}>
                    <MessageSquareText className="size-3.5" />
                  </Tooltip>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 max-xs:hidden">
          <Badge tone="ok" size="sm" dot>
            {t('portal.status.approved')}
          </Badge>
          <span className="tabular text-ink-3 text-[12px]">{fmtDate(doc.createdAt)}</span>
        </div>
        <span className="text-brand-ink hidden text-[13px] font-medium opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
          {t('portal.common.view')}
        </span>
        <ChevronRight className="text-ink-3 size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  )
}
