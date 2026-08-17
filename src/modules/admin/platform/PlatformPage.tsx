import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, LogIn, Pencil, Plus } from 'lucide-react'
import type { Column } from '@/shared/ui'
import type { Company } from '@/domain'
import { useAuth, usePermissions } from '@/features/auth/store'
import { useNavigate } from 'react-router-dom'
import { routes } from '@/shared/config/routes'
import { useCompanies, useSaveCompany } from '@/features/org/queries'
import { CompanyDrawer } from '@/features/org/CompanyDrawer'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDate } from '@/shared/lib/format'
import { Avatar, Badge, Button, Card, ConfirmDialog, DataTable, EmptyState, IconButton, Page, PageHeader, Pagination, SearchInput, Switch, Toolbar, toast } from '@/shared/ui'

export default function PlatformPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const canManage = can('platform.company.manage')
  const nav = useNavigate()
  const setActiveCompany = useAuth((s) => s.setActiveCompany)
  const enter = (c: Company) => { setActiveCompany(c.id); toast.success(t('admin.platform.switched', { name: c.name })); nav(routes.admin.root) }
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [drawer, setDrawer] = useState<{ open: boolean; company: Company | null }>({ open: false, company: null })
  const [confirm, setConfirm] = useState<Company | null>(null)
  const dSearch = useDebounce(search.trim(), 300)
  const query = useMemo(() => ({ page, pageSize, search: dSearch || undefined }), [page, pageSize, dSearch])
  const companies = useCompanies(query)
  const save = useSaveCompany()

  const toggleActive = async (c: Company, next: boolean) => {
    try {
      await save.mutateAsync({ id: c.id, isActive: next })
      toast.success(next ? t('admin.platform.activated') : t('admin.platform.deactivated'))
      setConfirm(null)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const columns: Column<Company>[] = [
    { key: 'name', header: t('admin.platform.colCompany'), card: 'title', cell: (c) => (
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={c.name} src={c.logoUrl} size="sm" className="rounded-lg" />
        <div className="min-w-0">
          <p className="font-medium truncate">{c.name}</p>
          <p className="text-[12px] text-ink-3 truncate">{c.legalName || <span className="font-mono">/{c.slug}</span>}</p>
        </div>
      </div>
    ) },
    { key: 'branchCount', header: t('admin.platform.colBranches'), align: 'right', hideBelow: 'sm', cell: (c) => <span className="tabular">{c.branchCount}</span> },
    { key: 'employeeCount', header: t('admin.platform.colEmployees'), align: 'right', hideBelow: 'sm', cell: (c) => <span className="tabular">{c.employeeCount}</span> },
    { key: 'sms', header: t('admin.platform.colSms'), hideBelow: 'md', card: 'meta', cell: (c) => <Badge tone={c.sms.provider === 'xabarchi' && c.sms.apiKeyMasked ? 'ok' : 'neutral'} dot>{c.sms.provider === 'xabarchi' ? t('admin.sms.providerXabarchi') : t('admin.sms.providerNone')}</Badge> },
    { key: 'createdAt', header: t('admin.platform.colCreated'), hideBelow: 'lg', cell: (c) => <span className="tabular text-ink-3">{fmtDate(c.createdAt)}</span> },
    { key: 'isActive', header: t('admin.platform.colStatus'), card: 'field', cell: (c) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Switch size="sm" checked={c.isActive} disabled={!canManage || save.isPending} onChange={(v) => (v ? void toggleActive(c, true) : setConfirm(c))} label={<span className="text-[13px] text-ink-2">{c.isActive ? t('admin.platform.active') : t('admin.platform.inactive')}</span>} />
      </div>
    ) },
    { key: 'actions', header: '', align: 'right', card: 'actions', cell: (c) => (
      <div className="flex flex-wrap items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <Button size="xs" variant="soft" leftIcon={<LogIn className="size-3.5" />} onClick={() => enter(c)}>{t('admin.platform.impersonate')}</Button>
        {canManage && <IconButton label={t('common.edit')} size="sm" onClick={() => setDrawer({ open: true, company: c })}><Pencil /></IconButton>}
      </div>
    ) },
  ]

  const data = companies.data

  return (
    <Page>
      <PageHeader eyebrow="Superadmin" title={t('admin.platform.title')} description={t('admin.platform.subtitle')}
        actions={canManage && <Button leftIcon={<Plus className="size-4" />} onClick={() => setDrawer({ open: true, company: null })}>{t('admin.platform.add')}</Button>} />

      <Toolbar actions={data && <span className="text-[13px] text-ink-3 tabular">{t('admin.platform.total', { count: data.total })}</span>}>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={t('admin.platform.searchPlaceholder')} className="w-full sm:w-72" />
      </Toolbar>

      <Card padded={false} className="overflow-hidden">
        <DataTable<Company>
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(c) => c.id}
          loading={companies.isFetching}
          onRowClick={canManage ? (c) => setDrawer({ open: true, company: c }) : undefined}
          empty={<EmptyState icon={<Building2 />} title={t('admin.platform.empty')} description={t('common.emptyHint')} />}
        />
        {data && data.total > 0 && (
          <div className="border-t border-line px-4 py-3">
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1) }}
              labels={{ perPage: t('common.perPage'), of: t('common.of'), rows: t('common.rows') }} />
          </div>
        )}
      </Card>

      <CompanyDrawer open={drawer.open} onClose={() => setDrawer((d) => ({ ...d, open: false }))} company={drawer.company} />
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => confirm && void toggleActive(confirm, false)} danger loading={save.isPending}
        title={t('admin.platform.deactivateConfirm', { name: confirm?.name ?? '' })} description={t('admin.platform.deactivateHint')} confirmText={t('common.confirm')} cancelText={t('common.cancel')} />
    </Page>
  )
}
