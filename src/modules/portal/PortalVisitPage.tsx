import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, FileQuestion } from 'lucide-react'
import { usePatientSession } from '@/features/session/useSession'
import { stagger } from '@/features/portal/motion'
import { useBranches, useCompany, usePortalOrder } from '@/features/portal/queries'
import { orderActiveCount, orderReadyCount, paymentTone } from '@/features/portal/status'
import { VisitItemCard } from '@/features/portal/components/VisitItemCard'
import { routes } from '@/shared/config/routes'
import { fmtDateTime, fmtMoney } from '@/shared/lib/format'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MotionList,
  Page,
  Skeleton,
  SkeletonRows,
} from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

function MoneyRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'ok' | 'warn' | 'danger'
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-2 text-[13.5px]',
        strong && 'text-[15px] font-semibold',
      )}
    >
      <span className={strong ? 'text-ink' : 'text-ink-3'}>{label}</span>
      <span
        className={cn(
          'tabular',
          tone === 'ok' && 'text-ok',
          tone === 'warn' && 'text-warn',
          tone === 'danger' && 'text-danger',
          !tone && 'text-ink',
        )}
      >
        {value}
      </span>
    </div>
  )
}

export default function PortalVisitPage() {
  const { t } = useTranslation()
  const { orderId } = useParams<{ orderId: string }>()
  const session = usePatientSession()
  const q = usePortalOrder(session.patientId, orderId)
  const companyQ = useCompany(q.data?.order.companyId)
  const branchesQ = useBranches(q.data?.order.companyId)
  const branch = branchesQ.data?.find((b) => b.id === q.data?.order.branchId)

  if (q.isError) {
    return (
      <Page width="medium">
        <Card padded={false}>
          <EmptyState
            icon={<FileQuestion />}
            title={t('portal.visit.notFoundTitle')}
            description={t('portal.visit.notFoundText')}
            action={
              <Link to={routes.portal.visits}>
                <Button variant="secondary" leftIcon={<ArrowLeft className="size-4" />}>
                  {t('portal.visit.backToVisits')}
                </Button>
              </Link>
            }
          />
        </Card>
      </Page>
    )
  }

  const order = q.data?.order
  const items = q.data?.items ?? []
  const done = order ? orderReadyCount(order) : 0
  const total = order ? orderActiveCount(order) : 0
  const remaining = order ? Math.max(0, order.total - order.paidAmount) : 0

  return (
    <Page width="medium">
      <Link
        to={routes.portal.visits}
        className="text-ink-3 hover:text-ink mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
      >
        <ArrowLeft className="size-3.5" /> {t('portal.visit.backToVisits')}
      </Link>

      <div className="mb-6">
        {order ? (
          <>
            <p className="text-ink-3 text-[12.5px]">
              {companyQ.data?.name}
              {branch && <> · {branch.name}</>}
              {' · '}
              <span className="tabular">{fmtDateTime(order.createdAt)}</span>
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-3">
              <h1 className="tabular text-[22px] font-semibold tracking-tight sm:text-[26px]">
                {t('portal.visit.title', { number: order.number })}
              </h1>
              <Badge tone={paymentTone[order.payment]} dot>
                {t(`portal.payment.${order.payment}`)}
              </Badge>
              <Badge tone={order.status === 'completed' ? 'ok' : 'neutral'}>
                {t(`portal.orderStatus.${order.status}`)}
              </Badge>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-56" />
            <Skeleton className="h-7 w-64" />
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <Card padded={false} className="overflow-hidden">
          <div className="border-line flex items-baseline justify-between border-b px-4 py-3 sm:px-5">
            <h2 className="text-[14px] font-semibold">{t('portal.visit.items')}</h2>
            {order && (
              <span className="tabular text-ink-3 text-[12.5px]">
                {t('portal.visits.ready', { done, total })}
              </span>
            )}
          </div>
          {q.isPending ? (
            <SkeletonRows rows={3} className="p-5" />
          ) : (
            <MotionList
              variants={stagger}
              initial="hidden"
              animate="show"
              className="divide-line divide-y"
            >
              {items.map((it) => (
                <VisitItemCard key={it.id} item={it} />
              ))}
            </MotionList>
          )}
        </Card>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <Card padded={false} className="px-5 py-3">
            <h2 className="text-ink-3 py-2 text-[13px] font-semibold tracking-[0.06em] uppercase">
              {t('portal.visit.payment')}
            </h2>
            {order ? (
              <div className="divide-line divide-y">
                <MoneyRow label={t('portal.visit.subtotal')} value={fmtMoney(order.subtotal)} />
                {order.discountAmount > 0 && (
                  <MoneyRow
                    label={`${t('portal.visit.discount')} (${order.discountPercent}%)`}
                    value={`− ${fmtMoney(order.discountAmount)}`}
                    tone="ok"
                  />
                )}
                <MoneyRow label={t('portal.visit.total')} value={fmtMoney(order.total)} strong />
                <MoneyRow
                  label={t('portal.visit.paid')}
                  value={fmtMoney(order.paidAmount)}
                  tone="ok"
                />
                {remaining > 0 && (
                  <MoneyRow
                    label={t('portal.visit.remaining')}
                    value={fmtMoney(remaining)}
                    tone="warn"
                  />
                )}
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-3.5" />
                ))}
              </div>
            )}
          </Card>
          {order?.note && (
            <Card className="text-ink-2 text-[13.5px] leading-relaxed">
              <p className="text-ink-3 mb-1 text-[12px] font-medium tracking-[0.05em] uppercase">
                {t('portal.visit.note')}
              </p>
              {order.note}
            </Card>
          )}
        </aside>
      </div>
    </Page>
  )
}
