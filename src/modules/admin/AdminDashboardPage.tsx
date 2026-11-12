import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowRight, Building2, CircleCheck, CircleAlert, FolderTree, Hospital, Landmark, LayoutTemplate, ListChecks, ReceiptText, Send, ShieldCheck, UserCog, Bell } from 'lucide-react'
import { repos } from '@/data'
import type { Permission } from '@/domain'
import { useAdminScope, usePermissions } from '@/features/auth/store'
import { useUnit, useUnitTree } from '@/features/org/queries'
import { UnitBreadcrumb } from '@/features/org/UnitBreadcrumb'
import { UnitLevelBadge } from '@/features/org/unitUi'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { fmtDate, fmtNumber, fmtRelative } from '@/shared/lib/format'
import { Avatar, Badge, Card, CardHeader, EmptyState, MotionItem, MotionList, Page, PageHeader, Skeleton, Stat, fadeUp, stagger } from '@/shared/ui'

interface Check { key: string; ok: boolean; label: string; fail: string; to: string }

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const { scopeId } = useAdminScope()
  const { can } = usePermissions()
  const unit = useUnit(scopeId)
  const tree = useUnitTree()
  const overview = useQuery({
    queryKey: ['admin-overview', scopeId],
    queryFn: async () => {
      const [activeEmployees, serviceTypes, templates, schemas] = await Promise.all([
        repos.staff.listEmployees(scopeId, { pageSize: 1, status: 'active' }),
        repos.catalog.listServiceTypes(scopeId),
        repos.templates.list(scopeId),
        repos.catalog.listSchemas(scopeId),
      ])
      return { activeEmployees: activeEmployees.total, serviceTypes, templates, schemas }
    },
    enabled: !!scopeId,
  })
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => repos.messaging.notifications() })

  const checks = useMemo<Check[]>(() => {
    const o = overview.data
    const u = unit.data
    if (!o || !u) return []
    const activeTpl = o.templates.filter((x) => x.status === 'active' && x.scope !== 'receipt') // cheque templates are not result documents
    const generic = activeTpl.some((x) => !x.serviceTypeIds.length && !x.categoryIds.length)
    const missing = o.serviceTypes.filter((s) => s.isActive && !generic && !activeTpl.some((x) => x.serviceTypeIds.includes(s.id) || x.categoryIds.includes(s.categoryId)))
    const published = o.schemas.filter((s) => s.status === 'published').length
    // an SMS account somewhere on the path (own or inherited) — or SMS switched off on purpose
    const smsOk = u.sms?.provider === 'xabarchi' || u.sms?.mode === 'off'
    // a unit above the facilities needs at least one facility to write cheques in; a facility must be active
    const facilitiesOk = u.level === 'facility' ? u.isActive : u.counts.facilities > 0
    return [
      { key: 'sms', ok: smsOk, label: t('admin.dashboard.checkSms'), fail: t('admin.dashboard.checkSmsFail'), to: routes.admin.sms },
      { key: 'tpl', ok: !missing.length, label: t('admin.dashboard.checkTemplates'), fail: t('admin.dashboard.checkTemplatesFail', { count: missing.length }), to: routes.admin.templates },
      { key: 'fac', ok: facilitiesOk, label: t(u.level === 'facility' ? 'admin.dashboard.checkActive' : 'admin.dashboard.checkFacilities'), fail: t(u.level === 'facility' ? 'admin.dashboard.checkActiveFail' : 'admin.dashboard.checkFacilitiesFail'), to: u.level === 'facility' ? routes.admin.unit : routes.admin.units },
      { key: 'sch', ok: published > 0, label: t('admin.dashboard.checkSchemas'), fail: t('admin.dashboard.checkSchemasFail'), to: routes.admin.schemas },
    ]
  }, [overview.data, unit.data, t])

  // the pages this account may open (a read-only leader sees no roles / SMS settings card)
  const links = ([
    { to: routes.admin.unit, icon: <Building2 />, title: t('admin.dashboard.quickUnit'), sub: t('admin.dashboard.quickUnitSub'), perm: 'admin.unit.read' },
    { to: routes.admin.units, icon: <Landmark />, title: t('admin.dashboard.quickUnits'), sub: t('admin.dashboard.quickUnitsSub'), perm: ['admin.unit.manage', 'admin.unit.read'] },
    { to: routes.admin.employees, icon: <UserCog />, title: t('admin.dashboard.quickEmployees'), sub: t('admin.dashboard.quickEmployeesSub'), perm: 'admin.employee.read' },
    { to: routes.admin.roles, icon: <ShieldCheck />, title: t('admin.dashboard.quickRoles'), sub: t('admin.dashboard.quickRolesSub'), perm: 'admin.role.write' },
    { to: routes.admin.catalog, icon: <FolderTree />, title: t('admin.dashboard.quickCatalog'), sub: t('admin.dashboard.quickCatalogSub'), perm: 'admin.catalog.read' },
    { to: routes.admin.templates, icon: <LayoutTemplate />, title: t('admin.dashboard.quickTemplates'), sub: t('admin.dashboard.quickTemplatesSub'), perm: 'admin.template.read' },
    { to: routes.admin.receipts, icon: <ReceiptText />, title: t('admin.dashboard.quickReceipts'), sub: t('admin.dashboard.quickReceiptsSub'), perm: 'admin.template.read' },
    { to: routes.admin.sms, icon: <Send />, title: t('admin.dashboard.quickSms'), sub: t('admin.dashboard.quickSmsSub'), perm: 'admin.settings.write' },
  ] as { to: string; icon: ReactNode; title: string; sub: string; perm: Permission | Permission[] }[]).filter((l) => can(l.perm))
  // the setup checks are for whoever may fix them; a read-only account sees the numbers and the activity only
  const canSetup = can(['admin.unit.write', 'admin.settings.write', 'admin.template.write', 'admin.schema.write'])

  const o = overview.data
  const u = unit.data
  const done = checks.filter((x) => x.ok).length
  const activeSt = o?.serviceTypes.filter((s) => s.isActive).length ?? 0
  const activeTpl = o?.templates.filter((x) => x.status === 'active').length ?? 0

  return (
    <Page>
      <PageHeader title={t('admin.dashboard.title')} description={t('admin.dashboard.subtitle')} />

      {/* Unit card */}
      <Card className="mb-6 relative overflow-hidden" data-dashboard-unit>
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-brand/8 blur-3xl" />
        {u ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <Avatar name={u.name} src={u.logoUrl ?? undefined} size="xl" className="rounded-2xl shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-semibold tracking-tight break-words min-w-0">{u.name}</h2>
                <UnitLevelBadge unit={u} size="md" />
                <Badge tone={u.isActive ? 'ok' : 'neutral'} dot>{u.isActive ? t('common.active') : t('common.inactive')}</Badge>
              </div>
              {tree.data && <UnitBreadcrumb units={tree.data} unitId={u.id} compact className="mt-1" />}
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2 min-w-0">
                {u.address && <span className="break-words min-w-0">{u.address}</span>}
                {u.phone && <span className="tabular">{u.phone}</span>}
                <span className="text-ink-3">{t('admin.dashboard.since')}: {fmtDate(u.createdAt)}</span>
                {u.code && <span className="font-mono text-ink-3">{u.code}</span>}
              </div>
            </div>
            <Link to={routes.admin.unit} className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand-ink hover:underline underline-offset-4 shrink-0">
              {can('admin.unit.write') ? t('common.edit') : t('common.open')} <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-5"><Skeleton className="size-16 rounded-2xl" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-3.5 w-72" /></div></div>
        )}
      </Card>

      {/* Stats */}
      <MotionList variants={stagger} initial="hidden" animate="show" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3 sm:gap-4 mb-6">
        {[
          u?.level === 'facility'
            ? { label: t('admin.dashboard.facility'), value: u ? (u.isActive ? t('common.active') : t('common.inactive')) : undefined, sub: u?.code ?? undefined, icon: <Hospital />, tone: 'brand' as const }
            : { label: t('admin.dashboard.facilities'), value: u ? fmtNumber(u.counts.facilities) : undefined, sub: u && u.level !== 'district' ? t('admin.dashboard.districtsCount', { count: u.counts.districts }) : undefined, icon: <Hospital />, tone: 'brand' as const },
          { label: t('admin.dashboard.employees'), value: u ? fmtNumber(u.counts.employees) : undefined, sub: o && u ? t('admin.dashboard.ofTotal', { active: o.activeEmployees, total: u.counts.employees }) : undefined, icon: <UserCog />, tone: 'info' as const },
          { label: t('admin.dashboard.serviceTypes'), value: o ? fmtNumber(o.serviceTypes.length) : undefined, sub: o && t('admin.dashboard.ofTotal', { active: activeSt, total: o.serviceTypes.length }), icon: <ListChecks />, tone: 'accent' as const },
          { label: t('admin.dashboard.activeTemplates'), value: o ? fmtNumber(activeTpl) : undefined, sub: o && t('admin.dashboard.ofTotal', { active: activeTpl, total: o.templates.length }), icon: <LayoutTemplate />, tone: 'ok' as const },
        ].map((s) => (
          <MotionItem key={s.label} variants={fadeUp}>
            <Stat label={s.label} value={s.value ?? <Skeleton className="h-7 w-12" />} sub={s.sub} icon={s.icon} tone={s.tone} />
          </MotionItem>
        ))}
      </MotionList>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] 3xl:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-6">
          {/* Health */}
          {canSetup && <Card>
            <CardHeader className="max-xs:flex-col max-xs:items-start" title={t('admin.dashboard.health')} description={t('admin.dashboard.healthSub')}
              actions={checks.length ? <Badge tone={done === checks.length ? 'ok' : 'warn'}>{t('admin.dashboard.healthScore', { done, total: checks.length })}</Badge> : null} />
            {checks.length ? (
              <>
                <div className="mb-4 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(done / checks.length) * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className={cn('h-full rounded-full', done === checks.length ? 'bg-ok' : 'bg-warn')} />
                </div>
                <MotionList variants={stagger} initial="hidden" animate="show" className="flex flex-col divide-y divide-line/70">
                  {checks.map((ch) => (
                    <MotionItem key={ch.key} variants={fadeUp} className="flex items-center gap-3 py-3 min-w-0">
                      {ch.ok ? <CircleCheck className="size-5 text-ok shrink-0" /> : <CircleAlert className="size-5 text-warn shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-[14px] leading-5 break-words', ch.ok ? 'text-ink' : 'text-ink font-medium')}>{ch.label}</p>
                        {!ch.ok && <p className="text-[12.5px] text-ink-3">{ch.fail}</p>}
                      </div>
                      {!ch.ok && <Link to={ch.to} className="text-[13px] font-medium text-brand-ink hover:underline underline-offset-4 shrink-0">{t('admin.dashboard.fix')}</Link>}
                    </MotionItem>
                  ))}
                </MotionList>
              </>
            ) : (
              <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5" />)}</div>
            )}
          </Card>}

          {/* Quick links */}
          <div>
            <h3 className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t('admin.dashboard.quickLinks')}</h3>
            <MotionList variants={stagger} initial="hidden" animate="show" className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]">
              {links.map((l) => (
                <MotionItem key={l.to} variants={fadeUp}>
                  <Link to={l.to} className="app-link-card group flex items-center gap-3.5 rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-1 transition-[box-shadow,transform,border-color] duration-250 hover:-translate-y-px hover:shadow-2 hover:border-line-strong">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-ink [&>svg]:size-5">{l.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium break-words">{l.title}</span>
                      <span className="block text-[12.5px] text-ink-3 truncate">{l.sub}</span>
                    </span>
                    <ArrowRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </MotionItem>
              ))}
            </MotionList>
          </div>
        </div>

        {/* Recent activity */}
        <Card className="self-start">
          <CardHeader title={t('admin.dashboard.recent')} />
          {notifications.isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : notifications.data?.length ? (
            <MotionList variants={stagger} initial="hidden" animate="show" className="flex flex-col divide-y divide-line/70">
              {notifications.data.map((n) => (
                <MotionItem key={n.id} variants={fadeUp} className="flex items-start gap-3 py-3">
                  <span className={cn('mt-0.5 grid size-8 place-items-center rounded-lg shrink-0 [&>svg]:size-4', n.kind === 'warning' ? 'bg-warn-soft text-warn' : n.kind === 'success' ? 'bg-ok-soft text-ok' : 'bg-info-soft text-info')}><Bell /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium leading-5 break-words">{n.title}</p>
                    <p className="text-[13px] text-ink-3 leading-5 break-words">{n.body}</p>
                    <p className="text-[12px] text-ink-3 mt-1">{fmtRelative(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="mt-2 size-2 rounded-full bg-accent shrink-0" />}
                </MotionItem>
              ))}
            </MotionList>
          ) : (
            <EmptyState icon={<Bell />} title={t('admin.dashboard.recentEmpty')} className="py-8" />
          )}
        </Card>
      </div>
    </Page>
  )
}
