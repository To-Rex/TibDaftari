import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowRight, Building2, CheckCircle2, CircleAlert, FolderTree, GitBranch, LayoutTemplate, ListChecks, Send, ShieldCheck, UserCog, Bell } from 'lucide-react'
import { repos } from '@/data'
import { useStaffSession } from '@/features/session/useSession'
import { useCompany } from '@/features/org/queries'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { fmtDate, fmtRelative } from '@/shared/lib/format'
import { Avatar, Badge, Card, CardHeader, EmptyState, MotionItem, MotionList, Page, PageHeader, Skeleton, Stat, fadeUp, stagger } from '@/shared/ui'

interface Check { key: string; ok: boolean; label: string; fail: string; to: string }

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const { companyId } = useStaffSession()
  const company = useCompany(companyId)
  const overview = useQuery({
    queryKey: ['admin-overview', companyId],
    queryFn: async () => {
      const [branches, employees, serviceTypes, templates, schemas] = await Promise.all([
        repos.tenant.listBranches(companyId),
        repos.staff.listEmployees(companyId, { pageSize: 200 }),
        repos.catalog.listServiceTypes(companyId),
        repos.templates.list(companyId),
        repos.catalog.listSchemas(companyId),
      ])
      return { branches, employees: employees.items, serviceTypes, templates, schemas }
    },
  })
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => repos.messaging.notifications() })

  const checks = useMemo<Check[]>(() => {
    const o = overview.data
    const c = company.data
    if (!o || !c) return []
    const activeTpl = o.templates.filter((x) => x.status === 'active')
    const generic = activeTpl.some((x) => !x.serviceTypeIds.length && !x.categoryIds.length)
    const missing = o.serviceTypes.filter((s) => s.isActive && !generic && !activeTpl.some((x) => x.serviceTypeIds.includes(s.id) || x.categoryIds.includes(s.categoryId)))
    const branchless = o.employees.filter((e) => e.status === 'active' && !e.branchIds.length)
    const published = o.schemas.filter((s) => s.status === 'published').length
    const smsOk = c.sms.provider === 'xabarchi' && !!c.sms.apiKeyMasked
    return [
      { key: 'sms', ok: smsOk, label: t('admin.dashboard.checkSms'), fail: t('admin.dashboard.checkSmsFail'), to: routes.admin.sms },
      { key: 'tpl', ok: !missing.length, label: t('admin.dashboard.checkTemplates'), fail: t('admin.dashboard.checkTemplatesFail', { count: missing.length }), to: routes.admin.templates },
      { key: 'br', ok: !branchless.length, label: t('admin.dashboard.checkBranchless'), fail: t('admin.dashboard.checkBranchlessFail', { count: branchless.length }), to: routes.admin.employees },
      { key: 'sch', ok: published > 0, label: t('admin.dashboard.checkSchemas'), fail: t('admin.dashboard.checkSchemasFail'), to: routes.admin.schemas },
    ]
  }, [overview.data, company.data, t])

  const links = [
    { to: routes.admin.company, icon: <Building2 />, title: t('admin.dashboard.quickCompany'), sub: t('admin.dashboard.quickCompanySub') },
    { to: routes.admin.branches, icon: <GitBranch />, title: t('admin.dashboard.quickBranches'), sub: t('admin.dashboard.quickBranchesSub') },
    { to: routes.admin.employees, icon: <UserCog />, title: t('admin.dashboard.quickEmployees'), sub: t('admin.dashboard.quickEmployeesSub') },
    { to: routes.admin.roles, icon: <ShieldCheck />, title: t('admin.dashboard.quickRoles'), sub: t('admin.dashboard.quickRolesSub') },
    { to: routes.admin.catalog, icon: <FolderTree />, title: t('admin.dashboard.quickCatalog'), sub: t('admin.dashboard.quickCatalogSub') },
    { to: routes.admin.templates, icon: <LayoutTemplate />, title: t('admin.dashboard.quickTemplates'), sub: t('admin.dashboard.quickTemplatesSub') },
    { to: routes.admin.sms, icon: <Send />, title: t('admin.dashboard.quickSms'), sub: t('admin.dashboard.quickSmsSub') },
  ]

  const o = overview.data
  const c = company.data
  const done = checks.filter((x) => x.ok).length
  const activeSt = o?.serviceTypes.filter((s) => s.isActive).length ?? 0
  const activeTpl = o?.templates.filter((x) => x.status === 'active').length ?? 0
  const activeEmp = o?.employees.filter((e) => e.status === 'active').length ?? 0

  return (
    <Page>
      <PageHeader title={t('admin.dashboard.title')} description={t('admin.dashboard.subtitle')} />

      {/* Company card */}
      <Card className="mb-6 relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-brand/8 blur-3xl" />
        {c ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <Avatar name={c.name} src={c.logoUrl} size="xl" className="rounded-2xl shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-semibold tracking-tight break-words min-w-0">{c.name}</h2>
                <Badge tone={c.isActive ? 'ok' : 'neutral'} dot>{c.isActive ? t('common.active') : t('common.inactive')}</Badge>
              </div>
              {c.legalName && <p className="text-[13.5px] text-ink-3 mt-0.5">{c.legalName}</p>}
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2 min-w-0">
                {c.address && <span className="break-words min-w-0">{c.address}</span>}
                {c.phone && <span className="tabular">{c.phone}</span>}
                <span className="text-ink-3">{t('admin.dashboard.since')}: {fmtDate(c.createdAt)}</span>
                <span className="font-mono text-ink-3 break-all">{t('admin.dashboard.companyId')}: {c.id}</span>
              </div>
            </div>
            <Link to={routes.admin.company} className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand-ink hover:underline underline-offset-4 shrink-0">
              {t('common.edit')} <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-5"><Skeleton className="size-16 rounded-2xl" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-3.5 w-72" /></div></div>
        )}
      </Card>

      {/* Stats */}
      <MotionList variants={stagger} initial="hidden" animate="show" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3 sm:gap-4 mb-6">
        {[
          { label: t('admin.dashboard.branches'), value: o?.branches.length, sub: o && t('admin.dashboard.ofTotal', { active: o.branches.filter((b) => b.isActive).length, total: o.branches.length }), icon: <GitBranch />, tone: 'brand' as const },
          { label: t('admin.dashboard.employees'), value: o?.employees.length, sub: o && t('admin.dashboard.ofTotal', { active: activeEmp, total: o.employees.length }), icon: <UserCog />, tone: 'info' as const },
          { label: t('admin.dashboard.serviceTypes'), value: o?.serviceTypes.length, sub: o && t('admin.dashboard.ofTotal', { active: activeSt, total: o.serviceTypes.length }), icon: <ListChecks />, tone: 'accent' as const },
          { label: t('admin.dashboard.activeTemplates'), value: activeTpl, sub: o && t('admin.dashboard.ofTotal', { active: activeTpl, total: o.templates.length }), icon: <LayoutTemplate />, tone: 'ok' as const },
        ].map((s) => (
          <MotionItem key={s.label} variants={fadeUp}>
            <Stat label={s.label} value={o ? s.value : <Skeleton className="h-7 w-12" />} sub={s.sub} icon={s.icon} tone={s.tone} />
          </MotionItem>
        ))}
      </MotionList>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] 3xl:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-6">
          {/* Health */}
          <Card>
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
                      {ch.ok ? <CheckCircle2 className="size-5 text-ok shrink-0" /> : <CircleAlert className="size-5 text-warn shrink-0" />}
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
          </Card>

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
