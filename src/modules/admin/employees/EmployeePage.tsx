import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Activity, KeyRound, LogIn, Pencil, ShieldCheck, UserCog, UserX, UserCheck } from 'lucide-react'
import type { PermissionOverrides } from '@/domain'
import { useStaffSession } from '@/features/session/useSession'
import { usePermissions } from '@/features/auth/store'
import { useEmployee, useSaveEmployee, useSetOverrides } from '@/features/employees/queries'
import { EmployeeForm } from '@/features/employees/EmployeeForm'
import { useRoles } from '@/features/roles/queries'
import { useBranches } from '@/features/org/queries'
import { PermissionMatrix } from '@/features/roles/PermissionMatrix'
import { routes } from '@/shared/config/routes'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDate, fmtRelative } from '@/shared/lib/format'
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Page, PageHeader, SearchInput, Skeleton, Tabs, toast } from '@/shared/ui'

type Tab = 'info' | 'perms' | 'activity'
const sameOverrides = (a: PermissionOverrides, b: PermissionOverrides) => a.allow.join() === b.allow.join() && a.deny.join() === b.deny.join()

export default function EmployeePage() {
  const { t } = useTranslation()
  const { employeeId: routeId = '' } = useParams<{ employeeId: string }>()
  const { companyId, employeeId: meId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.employee.write')
  const employee = useEmployee(routeId)
  const roles = useRoles(companyId)
  const branches = useBranches(companyId)
  const save = useSaveEmployee()
  const setOverrides = useSetOverrides()
  const [tab, setTab] = useState<Tab>('info')
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<PermissionOverrides>({ allow: [], deny: [] })

  const e = employee.data
  const role = useMemo(() => roles.data?.find((r) => r.id === e?.roleId), [roles.data, e?.roleId])
  useEffect(() => { if (e) setDraft(e.overrides) }, [e])
  const dirty = e ? !sameOverrides(draft, e.overrides) : false

  const toggleStatus = async () => {
    if (!e) return
    const next = e.status === 'active' ? 'inactive' : 'active'
    try {
      await save.mutateAsync({ companyId, id: e.id, status: next })
      toast.success(next === 'active' ? t('admin.employees.activated') : t('admin.employees.deactivated'))
      setConfirm(false)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }
  const saveOverrides = async () => {
    if (!e) return
    try {
      await setOverrides.mutateAsync({ id: e.id, overrides: draft })
      toast.success(t('admin.employees.permsSaved'))
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (employee.isError) return <Page width="medium"><EmptyState icon={<UserCog />} title={t('admin.employees.notFound')} /></Page>

  const tabs = [
    { value: 'info' as Tab, label: t('admin.employees.tabInfo'), icon: <UserCog /> },
    { value: 'perms' as Tab, label: t('admin.employees.tabPerms'), icon: <ShieldCheck />, count: e ? e.overrides.allow.length + e.overrides.deny.length || undefined : undefined },
    { value: 'activity' as Tab, label: t('admin.employees.tabActivity'), icon: <Activity /> },
  ]

  return (
    <Page width="medium">
      <PageHeader breadcrumbs={[{ label: t('admin.employees.backToList'), to: routes.admin.employees }, { label: e?.fullName ?? '…' }]}
        title={e ? (
          <span className="flex items-center gap-4">
            <Avatar name={e.fullName} hue={e.avatarHue} size="lg" />
            <span className="flex flex-col">
              <span className="flex items-center gap-2 flex-wrap">{e.fullName}<Badge tone={e.status === 'active' ? 'ok' : 'neutral'} dot>{e.status === 'active' ? t('common.active') : t('common.inactive')}</Badge>{e.id === meId && <Badge tone="brand">{t('admin.employees.self')}</Badge>}</span>
              <span className="text-[13.5px] font-normal text-ink-3 tracking-normal mt-0.5">
                <span className="font-mono">@{e.login}</span> · {role?.name ?? '—'} · {t('admin.employees.lastLogin')}: {e.lastLoginAt ? fmtRelative(e.lastLoginAt) : t('admin.employees.never')}
              </span>
            </span>
          </span>
        ) : <Skeleton className="h-8 w-64" />}
        actions={canWrite && e && tab === 'info' && !editing && <Button variant="secondary" leftIcon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>{t('common.edit')}</Button>} />

      <Tabs items={tabs} value={tab} onChange={setTab} className="mb-5" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
          {!e ? <Skeleton className="h-64" /> : tab === 'info' ? (
            <div className="flex flex-col gap-5">
              <Card>
                {editing ? (
                  <EmployeeForm companyId={companyId} employee={e} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
                ) : (
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 text-[14px]">
                    <Item label={t('admin.employees.fullName')}>{e.fullName}</Item>
                    <Item label={t('admin.employees.login')}><span className="font-mono">{e.login}</span></Item>
                    <Item label={t('admin.employees.phone')}><span className="tabular">{e.phone || '—'}</span></Item>
                    <Item label={t('admin.employees.email')}>{e.email || '—'}</Item>
                    <Item label={t('admin.employees.role')}><Badge tone={role?.isSystem ? 'brand' : 'neutral'}>{role?.name ?? '—'}</Badge></Item>
                    <Item label={t('admin.employees.branches')}>
                      <span className="flex flex-wrap gap-1">{e.branchIds.length ? e.branchIds.map((id) => <Badge key={id}>{branches.data?.find((b) => b.id === id)?.name ?? id}</Badge>) : <span className="text-warn">{t('admin.employees.noBranch')}</span>}</span>
                    </Item>
                    <Item label={t('admin.employees.memberSince')}><span className="tabular">{fmtDate(e.createdAt)}</span></Item>
                    <Item label={t('admin.employees.lastLogin')}><span className="tabular">{e.lastLoginAt ? fmtRelative(e.lastLoginAt) : t('admin.employees.never')}</span></Item>
                  </dl>
                )}
              </Card>
              {canWrite && e.id !== meId && (
                <Card className="border-danger/30">
                  <CardHeader title={<span className="text-danger">{t('admin.employees.danger')}</span>} />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div>
                      <p className="text-[14px] font-medium">{e.status === 'active' ? t('admin.employees.deactivate') : t('admin.employees.activate')}</p>
                      <p className="text-[13px] text-ink-3">{e.status === 'active' ? t('admin.employees.deactivateHint') : t('admin.employees.activateHint')}</p>
                    </div>
                    {e.status === 'active'
                      ? <Button variant="danger" leftIcon={<UserX className="size-4" />} onClick={() => setConfirm(true)}>{t('admin.employees.deactivate')}</Button>
                      : <Button variant="secondary" leftIcon={<UserCheck className="size-4" />} loading={save.isPending} onClick={toggleStatus}>{t('admin.employees.activate')}</Button>}
                  </div>
                </Card>
              )}
            </div>
          ) : tab === 'perms' ? (
            <div className="flex flex-col gap-4">
              <Card>
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div>
                    <h3 className="text-[15px] font-semibold">{t('admin.employees.permsTitle')}</h3>
                    <p className="text-[13px] text-ink-3">{t('admin.employees.permsSub')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={draft.allow.length + draft.deny.length ? 'warn' : 'neutral'}>{t('admin.employees.overridesCount', { allow: draft.allow.length, deny: draft.deny.length })}</Badge>
                    {canWrite && (
                      <>
                        <Button size="sm" variant="ghost" disabled={!draft.allow.length && !draft.deny.length} onClick={() => setDraft({ allow: [], deny: [] })}>{t('admin.employees.permsReset')}</Button>
                        <Button size="sm" disabled={!dirty} loading={setOverrides.isPending} onClick={saveOverrides}>{t('common.save')}</Button>
                      </>
                    )}
                  </div>
                </div>
                <SearchInput value={search} onChange={setSearch} placeholder={t('admin.roles.search')} className="mt-4 sm:max-w-sm" />
              </Card>
              <PermissionMatrix mode="override" rolePermissions={role?.permissions ?? []} overrides={draft} onChange={setDraft} search={search} readOnly={!canWrite} />
            </div>
          ) : (
            <Card>
              <CardHeader title={t('admin.employees.activityTitle')} actions={<Badge tone="brand">{t('admin.employees.activitySoon')}</Badge>} />
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: <LogIn />, label: t('admin.employees.activityLogin') },
                  { icon: <Pencil />, label: t('admin.employees.activityChanges') },
                  { icon: <KeyRound />, label: t('admin.employees.activityActions') },
                ].map((x, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-[var(--radius)] border border-dashed border-line bg-surface-2/40 p-4">
                    <span className="grid size-9 place-items-center rounded-lg bg-surface text-ink-3 [&>svg]:size-4">{x.icon}</span>
                    <span className="text-[13.5px] text-ink-2">{x.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13px] text-ink-3">{t('admin.employees.activitySoonHint')}</p>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={toggleStatus} danger loading={save.isPending}
        title={t('admin.employees.deactivateConfirm', { name: e?.fullName ?? '' })} description={t('admin.employees.deactivateHint')}
        confirmText={t('admin.employees.deactivate')} cancelText={t('common.cancel')} />
    </Page>
  )
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[12.5px] text-ink-3">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  )
}
