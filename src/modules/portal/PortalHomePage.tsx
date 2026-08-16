import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { CalendarDays, FileCheck2, FolderOpen, Wallet } from 'lucide-react'
import { usePatientSession } from '@/features/session/useSession'
import { stagger } from '@/features/portal/motion'
import { usePortalOverview, useBranchNames } from '@/features/portal/queries'
import { firstName, isRecent } from '@/features/portal/status'
import { SummaryCard } from '@/features/portal/components/SummaryCard'
import { SectionHeader } from '@/features/portal/components/SectionHeader'
import { ResultRow } from '@/features/portal/components/ResultRow'
import { VisitRow } from '@/features/portal/components/VisitRow'
import { routes } from '@/shared/config/routes'
import { fmtDate, fmtMoney } from '@/shared/lib/format'
import { errorMessage } from '@/shared/lib/errors'
import { Card, EmptyState, MotionList, Page, Skeleton, SkeletonRows, toast } from '@/shared/ui'

const greetingKey = (h: number) =>
  h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : h < 23 ? 'evening' : 'night'

export default function PortalHomePage() {
  const { t } = useTranslation()
  const session = usePatientSession()
  const q = usePortalOverview(session.patientId)
  const branchNames = useBranchNames(q.data?.companies.map((c) => c.id) ?? [])

  useEffect(() => {
    if (q.error) toast.error(t('portal.common.loadError'), errorMessage(q.error))
  }, [q.error, t])

  const data = q.data
  const clinicName = (companyId: string) => data?.companies.find((c) => c.id === companyId)?.name
  const orderOf = (orderId: string) => data?.orders.find((o) => o.id === orderId)
  const docs = data?.documents ?? []
  const orders = data?.orders ?? []
  const freshDocs = docs.filter((d) => isRecent(d.createdAt)).length
  const inProgress = orders.reduce(
    (s, o) => s + o.progress.pending + o.progress.entered + o.progress.submitted,
    0,
  )
  const unpaid = orders.filter((o) => o.payment === 'unpaid' || o.payment === 'partial')
  const unpaidSum = unpaid.reduce((s, o) => s + (o.total - o.paidAmount), 0)
  const last = orders[0]

  return (
    <Page width="medium">
      <header className="mb-6">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-[26px] font-semibold tracking-tight sm:text-[30px]"
        >
          {t(`portal.greeting.${greetingKey(new Date().getHours())}`, {
            name: firstName(session.fullName),
          })}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-ink-3 mt-1 text-[14.5px]"
        >
          {t('portal.greeting.subtitle')}
        </motion.p>
      </header>

      {q.isPending ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[92px] rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : (
        <MotionList
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-3 sm:grid-cols-3"
        >
          <SummaryCard
            icon={<FileCheck2 />}
            tone="ok"
            label={t('portal.home.resultsReady')}
            value={docs.length}
            sub={
              docs.length
                ? freshDocs
                  ? t('portal.home.resultsReadySub', { count: freshDocs })
                  : inProgress
                    ? t('portal.home.inProgress', { count: inProgress })
                    : undefined
                : t('portal.home.resultsReadyNone')
            }
            to={routes.portal.results}
          />
          <SummaryCard
            icon={<CalendarDays />}
            tone="brand"
            label={t('portal.home.lastVisit')}
            value={last ? fmtDate(last.createdAt) : '—'}
            sub={
              last
                ? [clinicName(last.companyId), branchNames.get(last.branchId)]
                    .filter(Boolean)
                    .join(' · ')
                : t('portal.home.noVisits')
            }
            to={last ? routes.portal.visit(last.id) : routes.portal.visits}
          />
          <SummaryCard
            icon={<Wallet />}
            tone={unpaid.length ? 'warn' : 'neutral'}
            label={t('portal.home.unpaid')}
            value={unpaid.length ? fmtMoney(unpaidSum) : '0'}
            sub={
              unpaid.length
                ? t('portal.home.unpaidSub', { count: unpaid.length })
                : t('portal.home.allPaid')
            }
            to={routes.portal.visits}
          />
        </MotionList>
      )}

      <section className="mt-8">
        <SectionHeader
          title={t('portal.home.latestResults')}
          to={docs.length > 5 ? routes.portal.results : undefined}
          linkLabel={t('portal.common.seeAll')}
        />
        <Card padded={false} className="overflow-hidden">
          {q.isPending ? (
            <SkeletonRows rows={4} className="p-4" />
          ) : docs.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title={t('portal.home.noResultsTitle')}
              description={t('portal.home.noResultsText')}
              className="py-10"
            />
          ) : (
            <MotionList
              variants={stagger}
              initial="hidden"
              animate="show"
              className="divide-line divide-y"
            >
              {docs.slice(0, 5).map((d) => (
                <ResultRow
                  key={d.id}
                  doc={d}
                  clinic={clinicName(d.companyId)}
                  orderNumber={orderOf(d.orderId)?.number}
                />
              ))}
            </MotionList>
          )}
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeader
          title={t('portal.home.latestVisits')}
          to={orders.length > 3 ? routes.portal.visits : undefined}
          linkLabel={t('portal.common.seeAll')}
        />
        <Card padded={false} className="overflow-hidden">
          {q.isPending ? (
            <SkeletonRows rows={3} className="p-4" />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<CalendarDays />}
              title={t('portal.home.noVisitsTitle')}
              description={t('portal.home.noVisitsText')}
              className="py-10"
            />
          ) : (
            <MotionList
              variants={stagger}
              initial="hidden"
              animate="show"
              className="divide-line divide-y"
            >
              {orders.slice(0, 3).map((o) => (
                <VisitRow
                  key={o.id}
                  order={o}
                  compact
                  place={[clinicName(o.companyId), branchNames.get(o.branchId)]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))}
            </MotionList>
          )}
        </Card>
      </section>
    </Page>
  )
}
