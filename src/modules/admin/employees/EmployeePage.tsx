import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Activity, KeyRound, LogIn, Pencil, ShieldCheck, UserCog, UserX, UserCheck, Lock } from 'lucide-react'
import type { PermissionOverrides } from '@/domain'
import { useAdminScope, useAuth, usePermissions } from '@/features/auth/store'
import { useEmployee, useSaveEmployee, useSetOverrides } from '@/features/employees/queries'
import { EmployeeForm } from '@/features/employees/EmployeeForm'
import { UnitLevelBadge } from '@/features/employees/UnitLevelBadge'
import { useRoles } from '@/features/roles/queries'
import { useUnitTree, useUnitTreeShape } from '@/features/org/queries'
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
  const { scopeId } = useAdminScope()
  const meId = useAuth((s) => s.staff?.employeeId)
  const { can, isSuperAdmin } = usePermissions()
  const canWrite = can('admin.employee.write')
  const employee = useEmployee(routeId)
  const roles = useRoles(scopeId)
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)
  const save = useSaveEmployee()
  const setOverrides = useSetOverrides()
  const [tab, setTab] = useState<Tab>('info')
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<PermissionOverrides>({ allow: [], deny: [] })

  const e = employee.data
  // one's own permission overrides are a superadmin's call (no self-escalation)
  const permsLocked = !!e && e.id === meId && !isSuperAdmin
  const role = useMemo(() => roles.data?.find((r) => r.id === e?.roleId), [roles.data, e?.roleId])
  const homeUnit = e?.unitId ? shape.byId.get(e.unitId) : undefined
  const roleOrigin = role ? (role.scopeUnitId === null ? t('admin.roles.systemRole') : shape.byId.get(role.scopeUnitId)?.name) : undefined
  useEffect(() => { if (e) setDraft(e.overrides) }, [e])
  const dirty = e ? !sameOverrides(draft, e.overrides) : false

  const toggleStatus = async () => {
    if (!e) return
    const next = e.status === 'active' ? 'inactive' : 'active'
    try {
      await save.mutateAsync({ scopeId, id: e.id, status: next })
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
          <span className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Avatar name={e.fullName} hue={e.avatarHue} size="lg" className="shrink-0" />
            <span className="flex flex-col min-w-0">
              <span className="flex items-center gap-2 flex-wrap break-words">
                {e.fullName}
                <Badge tone={e.status === 'active' ? 'ok' : 'neutral'} dot>{e.status === 'active' ? t('common.active') : t('common.inactive')}</Badge>
                {e.isSuperAdmin && <Badge tone="accent">{t('admin.employees.superAdmin')}</Badge>}
                {e.id === meId && <Badge tone="brand">{t('admin.employees.self')}</Badge>}
              </span>
              <span className="text-[13.5px] font-normal text-ink-3 tracking-normal mt-0.5 break-words">
                <span className="font-mono">@{e.login}</span> · {role?.name ?? '—'}{e.unitName ? ` · ${e.unitName}` : ''} · {t('admin.employees.lastLogin')}: {e.lastLoginAt ? fmtRelative(e.lastLoginAt) : t('admin.employees.never')}
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
                  <EmployeeForm scopeId={scopeId} employee={e} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
                ) : (
                  <dl className="grid gap-x-8 gap-y-4 grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] text-[14px]">
                    <Item label={t('admin.employees.fullName')}>{e.fullName}</Item>
                    <Item label={t('admin.employees.login')}><span className="font-mono">{e.login}</span></Item>
                    <Item label={t('admin.employees.phone')}><span className="tabular">{e.phone || '—'}</span></Item>
                    <Item label={t('admin.employees.email')}><span className="break-all">{e.email || '—'}</span></Item>
                    <Item label={t('admin.employees.role')}>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={role?.isSystem ? 'brand' : 'neutral'}>{role?.name ?? '—'}</Badge>
                        {roleOrigin && <span className="text-[12.5px] text-ink-3">{roleOrigin}</span>}
                      </span>
                    </Item>
                    <Item label={t('admin.employees.unit')}>
                      {e.unitId ? (
                        <span className="flex flex-wrap items-center gap-1.5" title={homeUnit?.path}>
                          <span>{e.unitName ?? homeUnit?.name ?? '—'}</span>
                          {(e.unitLevel ?? homeUnit?.level) && <UnitLevelBadge level={(e.unitLevel ?? homeUnit?.level)!} />}
                        </span>
                      ) : e.isSuperAdmin ? <Badge tone="accent">{t('admin.employees.superAdmin')}</Badge> : <span className="text-warn">{t('admin.employees.noUnit')}</span>}
                    </Item>
                    <Item label={t('admin.employees.extraUnits')}>
                      <span className="flex flex-wrap gap-1">{e.unitIds.length ? e.unitIds.map((id) => <Badge key={id}>{shape.byId.get(id)?.name ?? id}</Badge>) : <span className="text-ink-3">—</span>}</span>
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
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium">{e.status === 'active' ? t('admin.employees.deactivate') : t('admin.employees.activate')}</p>
                      <p className="text-[13px] text-ink-3">{e.status === 'active' ? t('admin.employees.deactivateHint') : t('admin.employees.activateHint')}</p>
                    </div>
                    {e.status === 'active'
                      ? <Button variant="danger" className="max-sm:w-full" leftIcon={<UserX className="size-4" />} onClick={() => setConfirm(true)}>{t('admin.employees.deactivate')}</Button>
                      : <Button variant="secondary" className="max-sm:w-full" leftIcon={<UserCheck className="size-4" />} loading={save.isPending} onClick={toggleStatus}>{t('admin.employees.activate')}</Button>}
                  </div>
                </Card>
              )}
            </div>
          ) : tab === 'perms' ? (
            <div className="flex flex-col gap-4">
              <Card>
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold">{t('admin.employees.permsTitle')}</h3>
                    <p className="text-[13px] text-ink-3">{t('admin.employees.permsSub')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={draft.allow.length + draft.deny.length ? 'warn' : 'neutral'}>{t('admin.employees.overridesCount', { allow: draft.allow.length, deny: draft.deny.length })}</Badge>
                    {canWrite && !permsLocked && (
                      <>
                        <Button size="sm" variant="ghost" disabled={!draft.allow.length && !draft.deny.length} onClick={() => setDraft({ allow: [], deny: [] })}>{t('admin.employees.permsReset')}</Button>
                        <Button size="sm" disabled={!dirty} loading={setOverrides.isPending} onClick={saveOverrides}>{t('common.save')}</Button>
                      </>
                    )}
                  </div>
                </div>
                {permsLocked && <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-3" data-self-perms-locked><Lock className="size-3.5" />{t('admin.employees.selfPermsLocked')}</p>}
                </Card>
              <div className="sticky top-16 z-20 -mx-1 px-1 py-2 bg-bg/90 backdrop-blur-md">
                <SearchInput value={search} onChange={setSearch} placeholder={t('admin.roles.search')} className="sm:max-w-sm" />
              </div>
              <PermissionMatrix mode="override" rolePermissions={role?.permissions ?? []} overrides={draft} onChange={setDraft} search={search} readOnly={!canWrite || permsLocked} />
            </div>
          ) : (
            <Card>
              <CardHeader className="max-xs:flex-col max-xs:items-start" title={t('admin.employees.activityTitle')} actions={<Badge tone="brand">{t('admin.employees.activitySoon')}</Badge>} />
              <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))]">
                {[
                  { icon: <LogIn />, label: t('admin.employees.activityLogin') },
                  { icon: <Pencil />, label: t('admin.employees.activityChanges') },
                  { icon: <KeyRound />, label: t('admin.employees.activityActions') },
                ].map((x, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-[var(--radius)] border border-dashed border-line bg-surface-2/40 p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-ink-3 [&>svg]:size-4">{x.icon}</span>
                    <span className="text-[13.5px] text-ink-2 break-words min-w-0">{x.label}</span>
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
