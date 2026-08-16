/**
 * Shared shell for the Staff (/app) and Admin (/admin) modules:
 * collapsible sidebar, top bar with branch switcher, notifications, user menu.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import {
  LayoutDashboard, ClipboardList, Users, FlaskConical, BadgeCheck, BarChart3, MessageSquare, Building2, GitBranch, UserCog,
  ShieldCheck, FolderTree, ListChecks, LayoutTemplate, Send, PanelLeftClose, PanelLeftOpen, Bell, LogOut, ChevronDown, Menu as MenuIcon, X, Globe2, Receipt, ArrowLeftRight,
} from 'lucide-react'
import type { Permission } from '@/domain'
import { repos } from '@/data'
import { useAuth, usePermissions } from '@/features/auth/store'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { Avatar, Badge, LanguageSwitcher, Logo, BrandMark, Menu, ThemeToggle, IconButton, Tooltip } from '@/shared/ui'
import { storage } from '@/shared/lib/storage'

interface NavItem { to: string; label: string; icon: ReactNode; perm?: Permission | Permission[]; end?: boolean; badge?: number }
interface NavSection { title?: string; items: NavItem[] }

export function AppShell({ module }: { module: 'staff' | 'admin' }) {
  const { t } = useTranslation()
  const { can, isSuperAdmin } = usePermissions()
  const staff = useAuth((s) => s.staff)!
  const [collapsed, setCollapsed] = useState(() => storage.get('clinic.sidebar', false))
  const [mobileOpen, setMobileOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setMobileOpen(false), [loc.pathname])
  useEffect(() => storage.set('clinic.sidebar', collapsed), [collapsed])

  const pending = useQuery({
    queryKey: ['shell-badges', staff.companyId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const d = await repos.reports.dashboard(staff.companyId, { dateFrom: today, dateTo: today })
      return { lab: d.pendingLab, confirm: d.pendingApproval, sms: d.smsQueued }
    },
    refetchInterval: 30_000,
  })

  const sections: NavSection[] = useMemo(() => {
    if (module === 'admin') {
      return [
        { items: [{ to: routes.admin.root, label: t('nav.dashboard'), icon: <LayoutDashboard />, end: true }] },
        { title: t('nav.company'), items: [
          { to: routes.admin.company, label: t('nav.company'), icon: <Building2 />, perm: 'admin.company.read' },
          { to: routes.admin.branches, label: t('nav.branches'), icon: <GitBranch />, perm: 'admin.branch.write' },
          { to: routes.admin.employees, label: t('nav.employees'), icon: <UserCog />, perm: 'admin.employee.read' },
          { to: routes.admin.roles, label: t('nav.roles'), icon: <ShieldCheck />, perm: 'admin.role.write' },
        ] },
        { title: t('nav.catalog'), items: [
          { to: routes.admin.catalog, label: t('nav.catalog'), icon: <FolderTree />, perm: 'admin.catalog.read' },
          { to: routes.admin.schemas, label: t('nav.schemas'), icon: <ListChecks />, perm: 'admin.schema.write' },
          { to: routes.admin.templates, label: t('nav.templates'), icon: <LayoutTemplate />, perm: 'admin.template.read' },
        ] },
        { title: t('common.settings'), items: [
          { to: routes.admin.sms, label: t('nav.smsSettings'), icon: <Send />, perm: 'admin.settings.write' },
          ...(isSuperAdmin ? [{ to: routes.admin.platform, label: t('nav.platform'), icon: <Globe2 />, perm: 'platform.company.manage' as Permission }] : []),
        ] },
      ]
    }
    return [
      { items: [{ to: routes.app.root, label: t('nav.dashboard'), icon: <LayoutDashboard />, end: true }] },
      { title: t('nav.reception'), items: [
        { to: routes.app.reception, label: t('nav.reception'), icon: <ClipboardList />, perm: 'reception.order.create' },
        { to: routes.app.patients, label: t('nav.patients'), icon: <Users />, perm: 'reception.patient.read' },
        { to: routes.app.orders, label: t('nav.orders'), icon: <Receipt />, perm: ['reception.order.create', 'reports.operations.read'] },
      ] },
      { title: t('nav.lab'), items: [
        { to: routes.app.lab, label: t('nav.lab'), icon: <FlaskConical />, perm: 'lab.worklist.read', badge: pending.data?.lab },
        { to: routes.app.confirm, label: t('nav.confirm'), icon: <BadgeCheck />, perm: 'confirm.result.read', badge: pending.data?.confirm },
      ] },
      { items: [
        { to: routes.app.reports, label: t('nav.reports'), icon: <BarChart3 />, perm: ['reports.finance.read', 'reports.operations.read'] },
        { to: routes.app.messages, label: t('nav.messages'), icon: <MessageSquare />, perm: ['messaging.send', 'messaging.broadcast'], badge: pending.data?.sms },
      ] },
    ]
  }, [module, t, isSuperAdmin, pending.data])

  const visible = sections.map((s) => ({ ...s, items: s.items.filter((i) => !i.perm || can(i.perm)) })).filter((s) => s.items.length)
  const canAdmin = can(['admin.company.read', 'admin.employee.read', 'admin.catalog.read', 'admin.template.read'])

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 items-center border-b border-line px-4', collapsed ? 'justify-center' : 'justify-between')}>
        {collapsed ? <BrandMark /> : <Logo />}
        {!collapsed && (
          <IconButton label="collapse" size="sm" onClick={() => setCollapsed(true)} className="max-lg:hidden"><PanelLeftClose /></IconButton>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {visible.map((s, i) => (
          <div key={i}>
            {s.title && !collapsed && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{s.title}</p>}
            <ul className="space-y-0.5">
              {s.items.map((it) => (
                <li key={it.to}>
                  <NavLink to={it.to} end={it.end} className={({ isActive }) => cn('group relative flex items-center gap-3 rounded-[10px] px-3 h-10 text-[14px] font-medium transition-colors', collapsed && 'justify-center px-0', isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}>
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.span layoutId={`nav-${module}`} className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                        <span className={cn('[&>svg]:size-[18px] shrink-0', isActive ? 'text-brand' : 'text-ink-3 group-hover:text-ink-2')}>{it.icon}</span>
                        {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                        {!!it.badge && (collapsed
                          ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" />
                          : <span className="rounded-full bg-accent/15 px-1.5 h-5 min-w-5 grid place-items-center text-[11px] font-semibold text-accent tabular">{it.badge}</span>)}
                        {collapsed && <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[12px] text-bg opacity-0 shadow-2 transition-opacity group-hover:opacity-100 dark:bg-surface-3 dark:text-ink z-50">{it.label}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        {module === 'staff' && canAdmin && (
          <NavLink to={routes.admin.root} className={cn('flex items-center gap-3 rounded-[10px] px-3 h-10 text-[13.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink', collapsed && 'justify-center px-0')}>
            <ArrowLeftRight className="size-[18px] text-ink-3" />{!collapsed && t('nav.admin')}
          </NavLink>
        )}
        {module === 'admin' && (
          <NavLink to={routes.app.root} className={cn('flex items-center gap-3 rounded-[10px] px-3 h-10 text-[13.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink', collapsed && 'justify-center px-0')}>
            <ArrowLeftRight className="size-[18px] text-ink-3" />{!collapsed && t('nav.staffApp')}
          </NavLink>
        )}
        {collapsed && <IconButton label="expand" size="sm" onClick={() => setCollapsed(false)} className="mx-auto mt-1 max-lg:hidden"><PanelLeftOpen /></IconButton>}
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-bg">
      {/* Desktop sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 z-40 hidden lg:block border-r border-line bg-bg-elevated transition-[width] duration-300 ease-[var(--ease-out)]', collapsed ? 'w-[72px]' : 'w-[248px]')}>{sidebar}</aside>
      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink/40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: 'spring', stiffness: 400, damping: 36 }} className="fixed inset-y-0 left-0 z-50 w-[min(260px,88vw)] bg-bg-elevated border-r border-line lg:hidden">
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 grid size-8 place-items-center rounded-full hover:bg-surface-2"><X className="size-4" /></button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={cn('transition-[padding] duration-300 ease-[var(--ease-out)]', collapsed ? 'lg:pl-[72px]' : 'lg:pl-[248px]')}>
        <TopBar onMenu={() => setMobileOpen(true)} module={module} />
        <Outlet />
      </div>
    </div>
  )
}

function TopBar({ onMenu, module }: { onMenu: () => void; module: 'staff' | 'admin' }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { staff, branchId, setBranch, logoutStaff } = useAuth()
  const s = staff!
  const branches = useQuery({ queryKey: ['branches', s.companyId], queryFn: () => repos.tenant.listBranches(s.companyId) })
  const notif = useQuery({ queryKey: ['notifications'], queryFn: () => repos.messaging.notifications(), refetchInterval: 60_000 })
  const unread = notif.data?.filter((n) => !n.read).length ?? 0
  const myBranches = (branches.data ?? []).filter((b) => b.isActive)
  const current = myBranches.find((b) => b.id === branchId)
  const canAll = s.isSuperAdmin || s.roleKey === 'admin' || s.roleKey === 'rahbar'

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center gap-1.5 xs:gap-2 sm:gap-3 border-b border-line bg-bg/80 px-2 xs:px-3 sm:px-6 backdrop-blur-md">
      <IconButton label="menu" className="lg:hidden shrink-0" onClick={onMenu}><MenuIcon /></IconButton>
      <div className="lg:hidden max-xs:hidden shrink-0"><Logo compact /></div>

      {/* Branch switcher */}
      <Menu
        align="start"
        trigger={(open) => (
          <button title={current ? current.name : t('common.allBranches')} className={cn('inline-flex h-9 min-w-0 shrink items-center gap-1.5 sm:gap-2 rounded-full border border-line bg-surface px-2.5 sm:px-3 text-[13px] font-medium shadow-1 hover:border-line-strong transition-colors', open && 'border-brand')}>
            <GitBranch className="size-4 shrink-0 text-brand" />
            <span className="max-sm:hidden max-w-[120px] md:max-w-[160px] 2xl:max-w-[240px] truncate">{current ? current.name : t('common.allBranches')}</span>
            <ChevronDown className="size-3.5 shrink-0 text-ink-3" />
          </button>
        )}
        items={[
          ...(canAll ? [{ key: 'all', label: t('common.allBranches'), onSelect: () => setBranch(null), icon: <Building2 /> }] : []),
          ...myBranches.map((b) => ({ key: b.id, label: <span className="flex flex-col"><span>{b.name}</span><span className="text-[11.5px] text-ink-3">{b.code}</span></span>, onSelect: () => setBranch(b.id), icon: <GitBranch /> })),
        ]}
      />
      {module === 'admin' && <Badge tone="brand" size="sm" className="max-sm:hidden">{t('nav.admin')}</Badge>}

      <div className="flex-1 min-w-2" />

      <div className="flex shrink-0 items-center gap-0 xs:gap-1">
        <LanguageSwitcher compact />
        <ThemeToggle />
        <Menu
          trigger={() => (
            <span className="relative">
              <IconButton label="notifications"><Bell /></IconButton>
              {unread > 0 && <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-accent text-[10px] font-bold text-white ring-2 ring-bg">{unread}</span>}
            </span>
          )}
          items={(notif.data ?? []).slice(0, 6).map((n) => ({
            key: n.id,
            label: (
              <span className="flex flex-col gap-0.5 max-w-[280px]">
                <span className={cn('text-[13.5px]', !n.read && 'font-semibold')}>{n.title}</span>
                <span className="text-[12px] text-ink-3 whitespace-normal">{n.body}</span>
              </span>
            ),
            onSelect: () => { void repos.messaging.markRead(n.id); if (n.link) nav(n.link) },
          }))}
        />
        <Menu
          trigger={() => (
            <button className="ml-0.5 xs:ml-1 flex items-center gap-2 rounded-full p-1 sm:pr-2 hover:bg-surface-2">
              <Avatar name={s.fullName} size="sm" />
              <span className="max-md:hidden max-w-[160px] text-left leading-tight">
                <span className="block truncate text-[13px] font-medium">{s.fullName}</span>
                <span className="block text-[11px] text-ink-3 capitalize">{s.roleKey}</span>
              </span>
            </button>
          )}
          items={[
            { key: 'logout', label: t('common.logout'), icon: <LogOut />, danger: true, onSelect: () => { void logoutStaff().then(() => nav(routes.staffLogin)) } },
          ]}
        />
      </div>
    </header>
  )
}

/** Small helper for pages: current branch scope (null = all). */
export const useBranchScope = () => useAuth((s) => s.branchId)
export { Tooltip }
