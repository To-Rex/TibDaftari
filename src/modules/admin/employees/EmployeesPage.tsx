import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus, UserCog } from 'lucide-react'
import type { Column } from '@/shared/ui'
import type { Employee } from '@/domain'
import { isProtectedRole } from '@/domain'
import { unitsUnder } from '@/domain'
import { repos } from '@/data'
import { useAdminScope, useAuth, usePermissions } from '@/features/auth/store'
import { useUnitTree } from '@/features/org/queries'
import { UnitPicker } from '@/features/org/UnitPicker'
import { useRoles } from '@/features/roles/queries'
import { useEmployees } from '@/features/employees/queries'
import { EmployeeForm } from '@/features/employees/EmployeeForm'
import { UnitLevelBadge } from '@/features/employees/UnitLevelBadge'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { routes } from '@/shared/config/routes'
import { fmtRelative } from '@/shared/lib/format'
import { Avatar, Badge, Button, Card, DataTable, Drawer, EmptyState, Page, PageHeader, Pagination, SearchInput, Select, Toolbar } from '@/shared/ui'

/** Employees of the administered unit and everything under it; `unitId` narrows to one sub-unit. */
export default function EmployeesPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { scopeId } = useAdminScope()
  const meId = useAuth((s) => s.staff?.employeeId)
  const { can } = usePermissions()
  const canWrite = can('admin.employee.write')
  const [search, setSearch] = useState('')
  const [roleId, setRoleId] = useState('')
  const [unitId, setUnitId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [drawer, setDrawer] = useState(false)
  const [sort, setSort] = useState<{ by: string; dir: 'asc' | 'desc' }>({ by: 'fullName', dir: 'asc' })
  const dSearch = useDebounce(search.trim(), 300)

  const query = useMemo(() => ({ page, pageSize, search: dSearch || undefined, roleId: roleId || undefined, unitId: unitId || undefined, status: status || undefined, sortBy: sort.by, sortDir: sort.dir }), [page, pageSize, dSearch, roleId, unitId, status, sort])
  const employees = useEmployees(scopeId, query)
  const roles = useRoles(scopeId)
  const tree = useUnitTree()
  const categories = useQuery({ queryKey: ['categories', scopeId], queryFn: () => repos.catalog.listCategories(scopeId) })

  const scopedUnits = useMemo(() => unitsUnder(tree.data ?? [], scopeId), [tree.data, scopeId])
  const roleById = useMemo(() => new Map((roles.data ?? []).map((r) => [r.id, r])), [roles.data])
  const unitById = useMemo(() => new Map((tree.data ?? []).map((u) => [u.id, u])), [tree.data])
  const catById = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c])), [categories.data])

  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1) }

  const columns: Column<Employee>[] = [
    { key: 'fullName', header: t('admin.employees.colEmployee'), sortable: true, card: 'title', cell: (e) => (
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={e.fullName} hue={e.avatarHue} size="sm" />
        <div className="min-w-0">
          <p className="font-medium flex flex-wrap items-center gap-1.5 min-w-0"><span className="truncate">{e.fullName}</span>{e.id === meId && <Badge tone="brand" size="sm">{t('admin.employees.self')}</Badge>}</p>
          <p className="text-[12px] text-ink-3 font-mono truncate">@{e.login}</p>
        </div>
      </div>
    ) },
    { key: 'role', header: t('admin.employees.colRole'), card: 'meta', cell: (e) => {
      const r = roleById.get(e.roleId)
      return <Badge tone={e.isSuperAdmin || (r?.scopeUnitId === null && isProtectedRole(r?.key)) ? 'accent' : r?.isSystem ? 'brand' : 'neutral'}>{r?.name ?? '—'}</Badge>
    } },
    { key: 'unit', header: t('admin.employees.colUnit'), hideBelow: 'md', card: 'field', cell: (e) => {
      const home = e.unitId ? unitById.get(e.unitId) : undefined
      if (!e.unitId) {
        return e.isSuperAdmin
          ? <Badge tone="accent" size="sm">{t('admin.employees.superAdmin')}</Badge>
          : <span className="text-[12.5px] text-warn">{t('admin.employees.noUnit')}</span>
      }
      const level = e.unitLevel ?? home?.level
      const extra = e.unitIds.map((id) => unitById.get(id)?.name ?? id)
      return (
        <div className="flex flex-wrap items-center gap-1.5 min-w-0" title={home?.path}>
          <span className="text-[13px] text-ink-2 truncate max-w-[260px]">{e.unitName ?? home?.name ?? '—'}</span>
          {level && <UnitLevelBadge level={level} />}
          {extra.length > 0 && <span title={extra.join(', ')}><Badge size="sm">{t('admin.employees.extraCount', { n: extra.length })}</Badge></span>}
        </div>
      )
    } },
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
        actions={canWrite && <Button data-hotkey="n" leftIcon={<Plus className="size-4" />} onClick={() => setDrawer(true)}>{t('admin.employees.add')}</Button>} />

      <Toolbar>
        <SearchInput value={search} onChange={reset(setSearch)} placeholder={t('admin.employees.searchPlaceholder')} className="w-full sm:w-72" />
        <Select value={roleId} onChange={(e) => reset(setRoleId)(e.target.value)} className="w-full sm:w-auto sm:min-w-40">
          <option value="">{t('admin.employees.allRoles')}</option>
          {(roles.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
        {scopedUnits.length > 1 && (
          <UnitPicker units={scopedUnits} value={unitId} onChange={reset(setUnitId)} allowEmpty placeholder={t('admin.employees.allUnits')} className="w-full sm:w-auto sm:min-w-52" />
        )}
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
        {drawer && <EmployeeForm scopeId={scopeId} onCancel={() => setDrawer(false)} onSaved={(e) => { setDrawer(false); nav(routes.admin.employee(e.id)) }} />}
      </Drawer>
    </Page>
  )
}
