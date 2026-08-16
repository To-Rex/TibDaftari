import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import type { Order, OrderItem, RenderContext } from '@/domain'
import { routes } from '@/shared/config/routes'
import { fmtDate, fmtDateTime } from '@/shared/lib/format'
import { Card, MotionList, MotionItem } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { fadeUp, stagger } from '../motion'
import { abnormalEntries, checkedCount } from '../abnormal'

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 text-[13.5px]">
      <dt className="text-ink-3 shrink-0">{label}</dt>
      <dd className="text-ink min-w-0 break-words text-right font-medium">{value}</dd>
    </div>
  )
}

export function ResultInfoPanel({
  item,
  order,
  ctx,
  clinic,
  branch,
  className,
}: {
  item?: OrderItem
  order: Order
  ctx: RenderContext
  clinic?: string
  branch?: string
  className?: string
}) {
  const { t } = useTranslation()
  const abnormal = abnormalEntries(ctx)
  const checked = checkedCount(ctx)

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Card padded={false} className="px-4 py-3 xs:px-5">
        <h3 className="text-ink-3 py-2 text-[13px] font-semibold tracking-[0.06em] uppercase">
          {t('portal.result.about')}
        </h3>
        <dl className="divide-line divide-y">
          <Row
            label={t('portal.common.service')}
            value={item?.serviceName ?? ctx.item.serviceName}
          />
          <Row
            label={t('portal.common.clinic')}
            value={[clinic, branch].filter(Boolean).join(' · ')}
          />
          <Row label={t('portal.common.doctor')} value={item?.doctorName} />
          <Row label={t('portal.common.technician')} value={item?.technicianName} />
          <Row label={t('portal.result.orderedAt')} value={fmtDate(order.createdAt)} />
          <Row
            label={t('portal.result.approvedAt')}
            value={item?.approvedAt ? fmtDateTime(item.approvedAt) : undefined}
          />
        </dl>
        {item?.labNote && (
          <p className="bg-surface-2 text-ink-2 mt-2 rounded-lg px-3 py-2 text-[12.5px] leading-relaxed">
            <span className="text-ink-3 font-medium">{t('portal.result.labNote')}: </span>
            {item.labNote}
          </p>
        )}
        <Link
          to={routes.portal.visit(order.id)}
          className="group text-brand-ink hover:text-brand mt-3 mb-1 inline-flex items-center gap-1 text-[13px] font-medium transition-colors"
        >
          {t('portal.result.openVisit')} <span className="tabular">{order.number}</span>
          <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </Card>

      {checked > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          {abnormal.length === 0 ? (
            <Card className="border-ok/20 bg-ok-soft/40 flex items-start gap-3">
              <CheckCircle2 className="text-ok mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-ink text-[14px] font-semibold">{t('portal.result.allNormal')}</p>
                <p className="text-ink-2 mt-0.5 text-[12.5px]">
                  {t('portal.result.allNormalHint')}
                </p>
              </div>
            </Card>
          ) : (
            <Card padded={false} className="overflow-hidden">
              <div className="border-line bg-warn-soft/40 flex items-start gap-3 border-b px-4 py-4 xs:px-5">
                <AlertCircle className="text-warn mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="text-ink text-[14px] font-semibold">
                    {t('portal.result.abnormalTitle')}
                  </p>
                  <p className="text-ink-2 mt-0.5 text-[12.5px] leading-relaxed">
                    {t('portal.result.abnormalHint')}
                  </p>
                </div>
              </div>
              <MotionList
                variants={stagger}
                initial="hidden"
                animate="show"
                className="divide-line divide-y"
              >
                {abnormal.map((a) => (
                  <MotionItem
                    key={a.key}
                    variants={fadeUp}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-2.5 text-[13.5px] xs:px-5"
                  >
                    <span className="text-ink min-w-0 break-words">{a.label}</span>
                    <span className="shrink-0 text-right">
                      <span
                        className={cn(
                          'tabular font-semibold',
                          a.critical ? 'text-danger' : 'text-warn',
                        )}
                      >
                        {a.value} {a.unit}
                      </span>
                      {a.reference && (
                        <span className="tabular text-ink-3 ml-1.5 text-[12px]">
                          ({t('portal.result.abnormalRef', { ref: a.reference })})
                        </span>
                      )}
                    </span>
                  </MotionItem>
                ))}
              </MotionList>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  )
}
