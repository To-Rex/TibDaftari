import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus, UserCog } from 'lucide-react'
import type { Column } from '@/shared/ui'
import type { Employee } from '@/domain'
import { repos } from '@/data'
import { useStaffSession } from '@/features/session/useSession'
import { usePermissions } from '@/features/auth/store'
import { useBranches } from '@/features/org/queries'
import { useRoles } from '@/features/roles/queries'
import { useEmployees } from '@/features/employees/queries'
import { EmployeeForm } from '@/features/employees/EmployeeForm'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { routes } from '@/shared/config/routes'
import { fmtRelative } from '@/shared/lib/format'
import { Avatar, Badge, Button, Card, DataTable, Drawer, EmptyState, Page, PageHeader, Pagination, SearchInput, Select, Toolbar } from '@/shared/ui'

export default function EmployeesPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { companyId, employeeId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.employee.write')
  const [search, setSearch] = useState('')
  const [roleId, setRoleId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [drawer, setDrawer] = useState(false)
  const [sort, setSort] = useState<{ by: string; dir: 'asc' | 'desc' }>({ by: 'fullName', dir: 'asc' })
  const dSearch = useDebounce(search.trim(), 300)

  const query = useMemo(() => ({ page, pageSize, search: dSearch || undefined, roleId: roleId || undefined, branchId: branchId || undefined, status: status || undefined, sortBy: sort.by, sortDir: sort.dir }), [page, pageSize, dSearch, roleId, branchId, status, sort])
  const employees = useEmployees(companyId, query)
  const roles = useRoles(companyId)
  const branches = useBranches(companyId)
  const categories = useQuery({ queryKey: ['categories', companyId], queryFn: () => repos.catalog.listCategories(companyId) })

  const roleById = useMemo(() => new Map((roles.data ?? []).map((r) => [r.id, r])), [roles.data])
  const branchById = useMemo(() => new Map((branches.data ?? []).map((b) => [b.id, b])), [branches.data])
  const catById = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c])), [categories.data])

  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1) }

  const columns: Column<Employee>[] = [
    { key: 'fullName', header: t('admin.employees.colEmployee'), sortable: true, card: 'title', cell: (e) => (
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={e.fullName} hue={e.avatarHue} size="sm" />
        <div className="min-w-0">
          <p className="font-medium flex flex-wrap items-center gap-1.5 min-w-0"><span className="truncate">{e.fullName}</span>{e.id === employeeId && <Badge tone="brand" size="sm">{t('admin.employees.self')}</Badge>}</p>
          <p className="text-[12px] text-ink-3 font-mono truncate">@{e.login}</p>
        </div>
      </div>
    ) },
    { key: 'role', header: t('admin.employees.colRole'), card: 'meta', cell: (e) => {
      const r = roleById.get(e.roleId)
      return <Badge tone={r?.key === 'superadmin' ? 'accent' : r?.isSystem ? 'brand' : 'neutral'}>{r?.name ?? '—'}</Badge>
    } },
    { key: 'branches', header: t('admin.employees.colBranches'), hideBelow: 'md', card: 'field', cell: (e) => (
      <div className="flex flex-wrap gap-1">
        {e.branchIds.length ? e.branchIds.map((id) => <span key={id} className="inline-flex h-6 items-center rounded-full bg-surface-2 px-2 text-[12px] font-medium text-ink-2"><span className="font-mono mr-1 text-ink-3">{branchById.get(id)?.code}</span>{branchById.get(id)?.name ?? id}</span>) : <span className="text-[12.5px] text-warn">{t('admin.employees.noBranch')}</span>}
      </div>
    ) },
    { key: 'categories', header: t('admin.employees.colCategories'), hideBelow: 'lg', cell: (e) => (
      <span className="text-[13px] text-ink-2 line-clamp-1 max-md:line-clamp-none max-md:break-words">{e.categoryIds.length ? e.categoryIds.map((id) => catById.get(id)?.name ?? id).join(', ') : <span className="text-ink-3">{t('admin.employees.allCategories')}</span>}</span>
    ) },
    { key: 'status', header: t('admin.employees.colStatus'), card: 'field', cell: (e) => <Badge tone={e.status === 'active' ? 'ok' : 'neutral'} dot>{e.status === 'active' ? t('common.active') : t('common.inactive')}</Badge> },
    { key: 'lastLoginAt', header: t('admin.employees.colLastLogin'), hideBelow: 'sm', sortable: true, card: 'field', cell: (e) => <span className="text-[13px] text-ink-3 tabular">{e.lastLoginAt ? fmtRelative(e.lastLoginAt) : t('admin.employees.never')}</span> },
  ]

  const data = employees.data

  return (
    <Page>
      <PageHeader title={t('admin.employees.title')} description={t('admin.employees.subtitle')}
        actions={canWrite && <Button leftIcon={<Plus className="size-4" />} onClick={() => setDrawer(true)}>{t('admin.employees.add')}</Button>} />

      <Toolbar>
        <SearchInput value={search} onChange={reset(setSearch)} placeholder={t('admin.employees.searchPlaceholder')} className="w-full sm:w-72" />
        <Select value={roleId} onChange={(e) => reset(setRoleId)(e.target.value)} className="w-full sm:w-auto sm:min-w-40">
          <option value="">{t('admin.employees.allRoles')}</option>
          {(roles.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
        <Select value={branchId} onChange={(e) => reset(setBranchId)(e.target.value)} className="w-full sm:w-auto sm:min-w-40">
          <option value="">{t('admin.employees.allBranches')}</option>
          {(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Select value={status} onChange={(e) => reset(setStatus)(e.target.value)} className="w-full sm:w-auto sm:min-w-36">
          <option value="">{t('admin.employees.allStatuses')}</option>
          <option value="active">{t('common.active')}</option>
          <option value="inactive">{t('common.inactive')}</option>
        </Select>
      </Toolbar>

      <Card padded={false} className="overflow-hidden">
        <DataTable<Employee>
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(e) => e.id}
          loading={employees.isFetching}
          sortBy={sort.by}
          sortDir={sort.dir}
          onSort={(k) => setSort((s) => ({ by: k, dir: s.by === k && s.dir === 'asc' ? 'desc' : 'asc' }))}
          onRowClick={(e) => nav(routes.admin.employee(e.id))}
          empty={<EmptyState icon={<UserCog />} title={t('admin.employees.empty')} description={t('common.emptyHint')} />}
        />
        {data && data.total > 0 && (
          <div className="border-t border-line px-4 py-3">
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1) }}
              labels={{ perPage: t('common.perPage'), of: t('common.of'), rows: t('common.rows') }} />
          </div>
        )}
      </Card>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title={t('admin.employees.add')} width="max-w-2xl">
        {drawer && <EmployeeForm companyId={companyId} onCancel={() => setDrawer(false)} onSaved={(e) => { setDrawer(false); nav(routes.admin.employee(e.id)) }} />}
      </Drawer>
    </Page>
  )
}
