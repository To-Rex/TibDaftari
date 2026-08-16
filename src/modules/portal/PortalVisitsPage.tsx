import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays } from 'lucide-react'
import { usePatientSession } from '@/features/session/useSession'
import { stagger } from '@/features/portal/motion'
import { useBranchNames, usePortalOverview } from '@/features/portal/queries'
import { VisitRow } from '@/features/portal/components/VisitRow'
import { errorMessage } from '@/shared/lib/errors'
import {
  Card,
  EmptyState,
  MotionList,
  Page,
  PageHeader,
  Pagination,
  SkeletonRows,
  toast,
} from '@/shared/ui'

const PAGE_SIZE = 10

export default function PortalVisitsPage() {
  const { t } = useTranslation()
  const session = usePatientSession()
  const q = usePortalOverview(session.patientId)
  const branchNames = useBranchNames(q.data?.companies.map((c) => c.id) ?? [])
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (q.error) toast.error(t('portal.common.loadError'), errorMessage(q.error))
  }, [q.error, t])

  const orders = q.data?.orders ?? []
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
  const slice = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const clinicName = (id: string) => q.data?.companies.find((c) => c.id === id)?.name
  const place = (companyId: string, branchId: string) =>
    [clinicName(companyId), branchNames.get(branchId)].filter(Boolean).join(' · ')

  return (
    <Page width="medium">
      <PageHeader title={t('portal.visits.title')} description={t('portal.visits.subtitle')} />
      <Card padded={false} className="overflow-hidden">
        {q.isPending ? (
          <SkeletonRows rows={6} className="p-4" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title={t('portal.visits.emptyTitle')}
            description={t('portal.visits.emptyText')}
          />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MotionList
                variants={stagger}
                initial="hidden"
                animate="show"
                className="divide-line divide-y"
              >
                {slice.map((o) => (
                  <VisitRow key={o.id} order={o} place={place(o.companyId, o.branchId)} />
                ))}
              </MotionList>
            </motion.div>
          </AnimatePresence>
        )}
      </Card>
      {orders.length > PAGE_SIZE && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={orders.length}
            pageSize={PAGE_SIZE}
            onPage={(p) => {
              setPage(p)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            labels={{ perPage: t('common.perPage'), of: t('common.of'), rows: t('common.rows') }}
          />
        </div>
      )}
    </Page>
  )
}
