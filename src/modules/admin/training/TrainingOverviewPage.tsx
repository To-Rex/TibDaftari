/**
 * O‘quv nazorati — the mandatory training seen from above: one list of everyone it concerns inside the reader's
 * scope (a superadmin: every company and clinic at once). Who is in the training and how far, who is stuck, who has
 * only «finish» left, who has not signed in yet, who finished and who was let through. A row says WHICH tasks are
 * missing (a dot per task); opening it shows them by name with the manager's two decisions.
 * The filter lives in the address (`?state=`), so a notice can lead straight to «stuck».
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, GraduationCap } from 'lucide-react'
import type { OrgUnit, TrainingOverviewFilter, TrainingOverviewQuery, TrainingOverviewRow } from '@/domain'
import { useAuth, usePermissions } from '@/features/auth/store'
import { TrainingDetails, TrainingStateBadge } from '@/features/employees/EmployeeTrainingCard'
import { useTrainingOverview } from '@/features/employees/queries'
import { UnitPicker } from '@/features/org/UnitPicker'
import { useUnitTree, useUnitTreeShape } from '@/features/org/queries'
import { TaskDots, trainingDays } from '@/features/training/TaskMarks'
import { routes } from '@/shared/config/routes'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { cn } from '@/shared/lib/cn'
import { fmtDate, fmtRelative } from '@/shared/lib/format'
import { Avatar, Button, Card, DataTable, Drawer, EmptyState, Page, PageHeader, Pagination, SearchInput, Segmented, Toolbar, type Column } from '@/shared/ui'

const FILTERS: TrainingOverviewFilter[] = ['open', 'active', 'stalled', 'ready', 'pending', 'passed', 'skipped']
const isFilter = (v: string | null): v is TrainingOverviewFilter => !!v && (FILTERS as string[]).includes(v)
type SortKey = NonNullable<TrainingOverviewQuery['sortBy']>

export default function TrainingOverviewPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { can, isSuperAdmin } = usePermissions()
  const staff = useAuth((s) => s.staff)
  const canWrite = can('admin.employee.write')
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)

  const [sp, setSp] = useSearchParams()
  const asked = sp.get('state')
  const state: TrainingOverviewFilter = isFilter(asked) ? asked : 'open'
  const [unitId, setUnitId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const dSearch = useDebounce(search.trim(), 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sort, setSort] = useState<{ by: SortKey; dir: 'asc' | 'desc' } | null>(null)
  useEffect(() => setPage(1), [state, unitId, dSearch, pageSize, sort])
  const pick = (next: TrainingOverviewFilter) => setSp((p) => { if (next === 'open') p.delete('state'); else p.set('state', next); return p }, { replace: true })

  const query = useMemo<TrainingOverviewQuery>(() => ({ state, unitId: unitId ?? undefined, search: dSearch || undefined, page, pageSize, sortBy: sort?.by, sortDir: sort?.dir }), [state, unitId, dSearch, page, pageSize, sort])
  const list = useTrainingOverview(query)
  const data = list.data
  const counts = data?.counts

  // the units the list can be narrowed to: everything for a superadmin, one's own subtree(s) for everyone else
  const units = useMemo<OrgUnit[]>(() => {
    if (!tree.data) return []
    if (isSuperAdmin) return tree.data
    const own = (staff?.unitIds ?? []).filter((id) => shape.byId.has(id))
    const tops = own.filter((id) => !shape.ancestors(id).some((a) => a.id !== id && own.includes(a.id)))
    return tops.flatMap((id) => shape.under(id))
  }, [tree.data, isSuperAdmin, staff?.unitIds, shape])
  // where a unit stands: the names above it, the company first
  const pathOf = (id?: string | null) => (id ? shape.ancestors(id).filter((u) => u.id !== id).map((u) => u.shortName ?? u.name).join(' › ') : '')

  // the open row: kept by itself, so a decision that moves the person out of the current filter does not close it
  const [picked, setPicked] = useState<TrainingOverviewRow | null>(null)
  const fresh = picked && data?.items.find((r) => r.id === picked.id)
  const shown = fresh ?? picked

  const numberOf = (f: TrainingOverviewFilter) => (!counts ? undefined : f === 'open' ? counts.active + counts.pending : f === 'all' ? undefined : counts[f])

  const columns: Column<TrainingOverviewRow>[] = [
    { key: 'fullName', header: t('admin.employees.colEmployee'), sortable: true, card: 'title', cell: (r) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={r.fullName} hue={r.avatarHue} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-medium">{r.fullName}</p>
          <p className="truncate font-mono text-[12px] text-ink-3">@{r.login}{r.roleName ? <span className="font-sans 2xl:hidden"> · {r.roleName}</span> : null}</p>
        </div>
      </div>
    ) },
    { key: 'unit', header: t('admin.employees.colUnit'), hideBelow: 'md', card: 'field', cell: (r) => {
      const path = pathOf(r.unitId)
      return (
        <div className="min-w-0 max-w-[240px]" title={path ? `${path} › ${r.unitName ?? ''}` : undefined}>
          <p className="truncate text-[13px] text-ink-2">{r.unitName ?? '—'}</p>
          {path && <p className="truncate text-[12px] text-ink-3">{path}</p>}
        </div>
      )
    } },
    { key: 'role', header: t('admin.employees.colRole'), hideBelow: '2xl', card: 'hidden', cell: (r) => <span className="text-[13px] text-ink-2">{r.roleName ?? '—'}</span> },
    { key: 'state', header: t('admin.employees.colStatus'), card: 'meta', cell: (r) => <TrainingStateBadge training={r.training} size="sm" /> },
    { key: 'progress', header: t('training.overview.colTasks'), sortable: true, card: 'field', cell: (r) => {
      const tasks = r.training.tasks ?? []
      if (!tasks.length) return <span className="text-ink-3">—</span>
      return (
        <span className="inline-flex items-center gap-2">
          <TaskDots tasks={tasks} planned={r.training.state === 'pending'} />
          {r.training.state !== 'pending' && <span className="text-[12.5px] text-ink-3 tabular">{r.training.done}/{r.training.total}</span>}
        </span>
      )
    } },
    { key: 'startedAt', header: t('training.overview.colTime'), sortable: true, hideBelow: 'sm', card: 'field', cell: (r) => {
      const tr = r.training
      if (tr.state === 'active') {
        const days = trainingDays(tr.startedAt)
        return <span className={cn('text-[13px] tabular', tr.stalled ? 'font-medium text-danger' : 'text-ink-2')}>{days ? t('training.overview.days', { n: days }) : t('training.overview.today')}</span>
      }
      return <span className="text-[13px] text-ink-3 tabular">{tr.completedAt ? fmtDate(tr.completedAt) : '—'}</span>
    } },
    { key: 'lastLoginAt', header: t('admin.employees.colLastLogin'), sortable: true, hideBelow: '2xl', card: 'field', cell: (r) => <span className="text-[13px] text-ink-3 tabular">{r.lastLoginAt ? fmtRelative(r.lastLoginAt) : t('admin.employees.never')}</span> },
  ]

  return (
    <Page>
      <PageHeader title={t('training.overview.title')} description={isSuperAdmin ? t('training.overview.subtitleAll') : t('training.overview.subtitle')} />

      <div className="mb-4 min-w-0 max-w-full overflow-x-auto no-scrollbar" data-training-filters>
        <Segmented<TrainingOverviewFilter> size="sm" value={state} onChange={pick} className="shrink-0"
          items={FILTERS.map((f) => {
            const n = numberOf(f)
            return {
              value: f,
              label: (
                <span className="flex items-center gap-1.5" data-filter={f}>
                  {t(`training.overview.filter.${f}`)}
                  {n != null && <span className={cn('rounded-full px-1.5 text-[11px] tabular', f === 'stalled' && n > 0 ? 'bg-danger-soft text-danger' : state === f ? 'bg-brand-soft text-brand-ink' : 'bg-surface-3/70 text-ink-3')}>{n}</span>}
                </span>
              ),
            }
          })} />
      </div>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder={t('admin.employees.searchPlaceholder')} className="w-full sm:w-72" />
        {units.length > 1 && <UnitPicker units={units} value={unitId} onChange={setUnitId} allowEmpty placeholder={t('admin.employees.allUnits')} className="w-full sm:w-auto sm:min-w-60" />}
        {state === 'stalled' && !!data && data.stallDays > 0 && <span className="text-[12.5px] text-ink-3">{t('training.overview.stalledNote', { n: data.stallDays })}</span>}
      </Toolbar>

      <Card padded={false} className="overflow-hidden" data-training-overview={state}>
        <DataTable<TrainingOverviewRow>
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(r) => r.id}
          loading={list.isFetching}
          sortBy={sort?.by}
          sortDir={sort?.dir}
          onSort={(k) => setSort((s) => ({ by: k as SortKey, dir: s?.by === k ? (s.dir === 'asc' ? 'desc' : 'asc') : k === 'fullName' ? 'asc' : 'desc' }))}
          onRowClick={setPicked}
          empty={<EmptyState icon={<GraduationCap />} title={t(`training.overview.empty.${state === 'open' || state === 'active' || state === 'stalled' ? state : 'other'}`)} description={list.isError ? t('common.error') : undefined} />}
        />
        {data && data.total > 0 && (
          <div className="border-t border-line px-4 py-3">
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPage={setPage} onPageSize={setPageSize}
              labels={{ perPage: t('common.perPage'), of: t('common.of'), rows: t('common.rows') }} />
          </div>
        )}
      </Card>

      <Drawer open={!!picked} onClose={() => setPicked(null)} width="max-w-lg"
        title={shown && (
          <span className="flex min-w-0 items-center gap-3">
            <Avatar name={shown.fullName} hue={shown.avatarHue} size="md" className="shrink-0" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{shown.fullName}</span>
              <span className="truncate text-[12.5px] font-normal text-ink-3"><span className="font-mono">@{shown.login}</span>{shown.roleName ? ` · ${shown.roleName}` : ''}</span>
            </span>
          </span>
        )}
        footer={shown && <Button block variant="secondary" rightIcon={<ArrowUpRight className="size-4" />} onClick={() => nav(routes.admin.employee(shown.id))}>{t('training.overview.openCard')}</Button>}>
        {shown && (
          <div className="flex flex-col gap-4" data-training-row={shown.id}>
            <div className="flex flex-wrap items-center gap-2">
              <TrainingStateBadge training={shown.training} />
              {shown.unitName && <span className="min-w-0 break-words text-[13px] text-ink-3">{[pathOf(shown.unitId), shown.unitName].filter(Boolean).join(' › ')}</span>}
            </div>
            <TrainingDetails employeeId={shown.id} name={shown.fullName} training={shown.training} canWrite={canWrite} isSelf={shown.id === staff?.employeeId}
              onChanged={(e) => { if (e.training) setPicked({ ...shown, training: e.training }) }} />
          </div>
        )}
      </Drawer>
    </Page>
  )
}
