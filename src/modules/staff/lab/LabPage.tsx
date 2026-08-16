/** Laboratory worklist — category tabs, status filter, date presets, search, server pagination. */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import type { ItemStatus } from '@/domain'
import { repos } from '@/data'
import { useStaffSession } from '@/features/session/useSession'
import { CategoryTabs, type CategorySelection } from '@/features/lab/CategoryTabs'
import { DateRangeFilter, initialRange, type RangeState } from '@/features/lab/DateRangeFilter'
import { WorklistTable } from '@/features/lab/WorklistTable'
import { useLabCategories, useWorklist, type WorklistParams } from '@/features/lab/queries'
import { routes } from '@/shared/config/routes'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { cn } from '@/shared/lib/cn'
import { Card, IconButton, Page, PageHeader, Pagination, SearchInput, Segmented, Toolbar } from '@/shared/ui'

type StatusFilter = 'all' | Exclude<ItemStatus, 'cancelled'>
const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'entered', 'submitted', 'rejected', 'approved']

export default function LabPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { companyId, employeeId, branchId } = useStaffSession()

  const [cat, setCat] = useState<CategorySelection>({ rootId: 'all', childId: null })
  const [status, setStatus] = useState<StatusFilter>('all')
  const [range, setRange] = useState<RangeState>(() => initialRange('today'))
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const q = useDebounce(search.trim(), 300)

  const cats = useLabCategories(companyId, employeeId)
  const categoryIds = useMemo(() => {
    if (!cats.data) return undefined
    if (cat.rootId === 'all') return cats.data.allIds
    if (cat.childId) return cats.data.descendants(cat.childId)
    return cats.data.roots.find((r) => r.root.id === cat.rootId)?.ids
  }, [cats.data, cat])

  useEffect(() => setPage(1), [cat, status, range, q, pageSize])

  const base: WorklistParams = { branchId: branchId ?? undefined, categoryIds, dateFrom: range.range.from, dateTo: range.range.to, search: q || undefined }
  const list = useWorklist(companyId, { ...base, status: status === 'all' ? undefined : [status], page, pageSize }, { refetchInterval: 30_000, enabled: !!cats.data })

  // per-status counts (light queries: 1 row each)
  const countQueries = useQueries({
    queries: STATUS_FILTERS.map((s) => ({
      queryKey: ['worklist-count', companyId, base, s],
      queryFn: () => repos.orders.worklist(companyId, { ...base, status: s === 'all' ? undefined : [s], page: 1, pageSize: 1 }),
      enabled: !!cats.data,
      refetchInterval: 30_000,
      select: (d: { total: number }) => d.total,
    })),
  })
  const counts = Object.fromEntries(STATUS_FILTERS.map((s, i) => [s, countQueries[i]?.data])) as Record<StatusFilter, number | undefined>

  const data = list.data
  const restrictedHint = cats.data?.restricted ? t('clinical.lab.restrictedHint') : undefined

  return (
    <Page>
      <PageHeader
        title={t('clinical.lab.title')}
        description={t('clinical.lab.subtitle')}
        actions={
          <IconButton label={t('common.retry')} onClick={() => void list.refetch()} className={cn(list.isFetching && 'text-brand')}>
            <RefreshCw className={cn(list.isFetching && 'animate-spin')} />
          </IconButton>
        }
      />

      <div className="mb-4">
        <CategoryTabs roots={cats.data?.roots} loading={cats.isLoading} value={cat} onChange={setCat} />
      </div>

      <Toolbar
        actions={<DateRangeFilter value={range} onChange={setRange} size="sm" />}
      >
        <SearchInput value={search} onChange={setSearch} placeholder={t('clinical.lab.searchPlaceholder')} className="h-9 w-full sm:w-72" />
        <Segmented<StatusFilter>
          size="sm"
          value={status}
          onChange={setStatus}
          items={STATUS_FILTERS.map((s) => ({
            value: s,
            label: (
              <span className="flex items-center gap-1.5">
                {s === 'all' ? t('common.all') : t(`clinical.status.${s}`)}
                {counts[s] != null && <span className={cn('rounded-full px-1.5 text-[11px] tabular', status === s ? 'bg-brand-soft text-brand-ink' : 'bg-surface-3/70 text-ink-3')}>{counts[s]}</span>}
              </span>
            ),
          }))}
        />
      </Toolbar>

      <Card padded={false} className="overflow-hidden">
        <WorklistTable
          rows={data?.items ?? []}
          loading={list.isLoading || cats.isLoading}
          onOpen={(r) => nav(routes.app.labItem(r.id))}
          categoryColor={(id) => cats.data?.colors[id]}
          emptyHint={restrictedHint}
        />
        {data && data.total > 0 && (
          <div className="border-t border-line px-4 py-3">
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPage={setPage} onPageSize={setPageSize} labels={{ perPage: t('common.perPage'), of: t('common.of'), rows: t('common.rows') }} />
          </div>
        )}
      </Card>
    </Page>
  )
}
