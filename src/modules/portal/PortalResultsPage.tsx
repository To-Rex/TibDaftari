import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { FolderOpen } from 'lucide-react'
import { usePatientSession } from '@/features/session/useSession'
import { stagger } from '@/features/portal/motion'
import { usePortalOverview } from '@/features/portal/queries'
import { ResultRow } from '@/features/portal/components/ResultRow'
import { FilterChips } from '@/features/portal/components/FilterChips'
import { fmtDate } from '@/shared/lib/format'
import { errorMessage } from '@/shared/lib/errors'
import { Card, EmptyState, MotionList, Page, PageHeader, SkeletonRows, toast } from '@/shared/ui'

type Filter = 'all' | 'month' | `c:${string}`

export default function PortalResultsPage() {
  const { t } = useTranslation()
  const session = usePatientSession()
  const q = usePortalOverview(session.patientId)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (q.error) toast.error(t('portal.common.loadError'), errorMessage(q.error))
  }, [q.error, t])

  const data = q.data
  const clinicName = (id: string) => data?.companies.find((c) => c.id === id)?.name
  const orderOf = (id: string) => data?.orders.find((o) => o.id === id)

  const groups = useMemo(() => {
    const docs = data?.documents ?? []
    const nowKey = new Date().toISOString().slice(0, 7)
    const filtered = docs.filter((d) =>
      filter === 'all'
        ? true
        : filter === 'month'
          ? d.createdAt.slice(0, 7) === nowKey
          : d.companyId === filter.slice(2),
    )
    const map = new Map<string, typeof docs>()
    for (const d of filtered) {
      const k = d.createdAt.slice(0, 7)
      map.set(k, [...(map.get(k) ?? []), d])
    }
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: fmtDate(items[0]!.createdAt, 'LLLL yyyy'),
      items,
    }))
  }, [data, filter])

  const chips = [
    { value: 'all' as Filter, label: t('portal.results.all'), count: data?.documents.length },
    { value: 'month' as Filter, label: t('portal.results.thisMonth') },
    ...((data?.companies.length ?? 0) > 1
      ? (data?.companies ?? []).map((c) => ({ value: `c:${c.id}` as Filter, label: c.name }))
      : []),
  ]

  return (
    <Page width="medium">
      <PageHeader title={t('portal.results.title')} description={t('portal.results.subtitle')} />
      {!q.isPending && (data?.documents.length ?? 0) > 0 && (
        <FilterChips items={chips} value={filter} onChange={setFilter} className="mb-5" />
      )}

      {q.isPending ? (
        <Card padded={false}>
          <SkeletonRows rows={6} className="p-4" />
        </Card>
      ) : groups.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<FolderOpen />}
            title={t('portal.results.emptyTitle')}
            description={
              filter === 'all' ? t('portal.home.noResultsText') : t('portal.results.emptyText')
            }
          />
        </Card>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-6"
          >
            {groups.map((g) => (
              <section key={g.key}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-ink-3 text-[13px] font-semibold tracking-[0.06em] uppercase first-letter:uppercase">
                    {g.label}
                  </h2>
                  <span className="tabular text-ink-3 text-[12px]">
                    {t('portal.common.resultsCount', { count: g.items.length })}
                  </span>
                </div>
                <Card padded={false} className="overflow-hidden">
                  <MotionList
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                    className="divide-line divide-y"
                  >
                    {g.items.map((d) => (
                      <ResultRow
                        key={d.id}
                        doc={d}
                        clinic={clinicName(d.companyId)}
                        orderNumber={orderOf(d.orderId)?.number}
                        showChannels
                      />
                    ))}
                  </MotionList>
                </Card>
              </section>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </Page>
  )
}
