import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { UserPlus, Users } from 'lucide-react'
import type { Patient } from '@/domain'
import { Avatar, Badge, Button, Card, DataTable, EmptyState, Page, PageHeader, Pagination, SearchInput, Toolbar, type Column } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { ageFrom, fmtDate, fmtMoney, fmtNumber, fmtPhone, fmtRelative } from '@/shared/lib/format'
import { routes } from '@/shared/config/routes'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { usePatientsList } from '@/features/patients/queries'
import { PatientDrawer } from '@/features/patients/PatientDrawer'

const TAGS = ['VIP', 'Shartnoma', 'Bola', 'Homilador']

export default function PatientsPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const [sp, setSp] = useSearchParams()
  const [search, setSearch] = useState('')
  const dq = useDebounce(search.trim(), 300)
  const [tag, setTag] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [drawer, setDrawer] = useState(false)

  useEffect(() => { if (sp.get('new') === '1' && can('reception.patient.write')) { setDrawer(true); sp.delete('new'); setSp(sp, { replace: true }) } }, [sp, setSp, can])

  const params = useMemo(() => ({ page, pageSize, search: dq || undefined, tag, sortBy, sortDir }), [page, pageSize, dq, tag, sortBy, sortDir])
  const q = usePatientsList(companyId, params)
  const onSort = (key: string) => { if (key === sortBy) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortBy(key); setSortDir(key === 'fullName' ? 'asc' : 'desc') }; setPage(1) }

  const cols: Column<Patient>[] = [
    { key: 'fullName', header: t('common.fullName'), sortable: true, cell: (p) => (
      <span className="flex items-center gap-3"><Avatar name={p.fullName} size="sm" /><span className="flex min-w-0 flex-col"><span className="flex items-center gap-2 font-medium"><span className="truncate">{p.fullName}</span>{p.tags.map((tg) => <Badge key={tg} size="sm" tone={tg === 'VIP' ? 'accent' : 'brand'}>{tg}</Badge>)}</span><span className="text-[12px] text-ink-3 tabular">{fmtPhone(p.phone)}</span></span></span>
    ) },
    { key: 'birthDate', header: t('staff.patients.colAge'), cell: (p) => <span className="tabular text-ink-2">{p.birthDate ? `${ageFrom(p.birthDate)} · ${fmtDate(p.birthDate)}` : '—'}</span>, hideBelow: 'lg' },
    { key: 'stats.lastVisitAt', sortable: true, header: t('staff.patients.colLastVisit'), cell: (p) => <span className="text-ink-2">{p.stats.lastVisitAt ? fmtRelative(p.stats.lastVisitAt) : '—'}</span>, hideBelow: 'md' },
    { key: 'stats.orders', sortable: true, header: t('staff.patients.colOrders'), align: 'center', cell: (p) => <span className="tabular">{p.stats.orders}</span>, hideBelow: 'sm', width: '90px' },
    { key: 'stats.totalSpent', sortable: true, header: t('staff.patients.colSpent'), align: 'right', cell: (p) => <span className="font-medium">{fmtMoney(p.stats.totalSpent, false)}</span> },
    { key: 'discountPercent', header: t('staff.patients.colDiscount'), align: 'center', cell: (p) => (p.discountPercent ? <Badge size="sm" tone="ok">{p.discountPercent}%</Badge> : <span className="text-ink-3">—</span>), hideBelow: 'lg', width: '90px' },
    { key: 'createdAt', header: t('staff.patients.colCreated'), sortable: true, cell: (p) => <span className="tabular text-ink-3">{fmtDate(p.createdAt)}</span>, hideBelow: 'lg' },
  ]

  return (
    <Page>
      <PageHeader title={t('staff.patients.title')} description={q.data ? t('staff.patients.count', { n: fmtNumber(q.data.total) }) : t('staff.patients.subtitle')}
        actions={can('reception.patient.write') && <Button leftIcon={<UserPlus className="size-4" />} onClick={() => setDrawer(true)}>{t('staff.patients.new')}</Button>} />
      <Toolbar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={t('staff.patients.searchPh')} className="w-full sm:w-80" />
        <div className="flex flex-wrap items-center gap-1.5">
          {TAGS.map((tg) => (
            <button key={tg} onClick={() => { setTag(tag === tg ? undefined : tg); setPage(1) }} className={cn('h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors', tag === tg ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2')}>{tg}</button>
          ))}
        </div>
      </Toolbar>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card padded={false} className="overflow-hidden">
          <DataTable columns={cols} rows={q.data?.items ?? []} rowKey={(p) => p.id} loading={q.isFetching} sortBy={sortBy} sortDir={sortDir} onSort={onSort} onRowClick={(p) => nav(routes.app.patient(p.id))}
            empty={<EmptyState icon={<Users />} title={t('common.empty')} description={t('common.emptyHint')} />} />
          {q.data && q.data.total > 0 && (
            <div className="border-t border-line px-4 py-3">
              <Pagination page={q.data.page} totalPages={q.data.totalPages} total={q.data.total} pageSize={q.data.pageSize} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1) }} labels={{ perPage: t('common.perPage'), of: t('common.of'), rows: t('common.rows') }} />
            </div>
          )}
        </Card>
      </motion.div>
      <PatientDrawer open={drawer} onClose={() => setDrawer(false)} companyId={companyId} onSaved={(p) => { setDrawer(false); nav(routes.app.patient(p.id)) }} onPickExisting={(p) => { setDrawer(false); nav(routes.app.patient(p.id)) }} />
    </Page>
  )
}
