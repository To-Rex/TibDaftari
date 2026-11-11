/**
 * Shared shell for the Staff (/app) and Admin (/admin) modules:
 * collapsible sidebar, top bar with the unit switchers, notifications, user menu.
 *
 * Scope: the admin panel works in `scopeUnitId` (the administrator's unit — a viloyat, a tuman or a facility; a
 * superadmin picks any unit of the tree). The staff app always works in ONE facility (`facilityId`) under that
 * scope, so no list ever mixes facilities. Both are validated against the tree the API returns.
 */
import { useEffect, useMemo, useState, type ReactNode, useCallback } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import {
  ReceiptText, FileCheck2, LayoutDashboard, ClipboardList, Users, FlaskConical, BadgeCheck, BarChart3, MessageSquare, Building2, UserCog,
  ShieldCheck, FolderTree, ListChecks, LayoutTemplate, Send, PanelLeftClose, PanelLeftOpen, Bell, LogOut, Menu as MenuIcon, X, Globe2, Receipt, ArrowLeftRight,
  Loader2, Landmark, Sparkles, Bot,
} from 'lucide-react'
import type { OrgUnit, Permission, UnitLevel } from '@/domain'
import { repos } from '@/data'
import { useAuth, usePermissions } from '@/features/auth/store'
import { useUnitTree, useUnitTreeShape } from '@/features/org/queries'
import { UnitSwitcher } from '@/features/org/UnitSwitcher'
import { useGlobalHotkeys } from '@/features/hotkeys/useGlobalHotkeys'
import { HotkeysButton, HotkeysHelp } from '@/features/hotkeys/HotkeysHelp'
import { preloadRouteChunks, warmWorkspaceData } from '@/features/session/warmup'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { Avatar, Badge, LanguageSwitcher, Logo, BrandMark, Menu, ThemeToggle, IconButton, Tooltip } from '@/shared/ui'
import { storage } from '@/shared/lib/storage'

interface NavItem { to: string; label: string; icon: ReactNode; perm?: Permission | Permission[]; end?: boolean; badge?: number; /** "G" + this letter jumps to the page */ key?: string }
interface NavSection { title?: string; items: NavItem[] }

const FACILITY_ONLY: UnitLevel[] = ['facility']

/** The tree + the resolved scope unit and facility for the current session (corrects stale stored choices). */
export function useWorkspace() {
  const staff = useAuth((s) => s.staff)!
  const scopeUnitId = useAuth((s) => s.scopeUnitId)
  const facilityId = useAuth((s) => s.facilityId)
  const setScopeUnit = useAuth((s) => s.setScopeUnit)
  const setFacility = useAuth((s) => s.setFacility)
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)
  // the scope: the stored choice when it exists in the tree, else the home unit, else (superadmin) the first root
  const scopeUnit: OrgUnit | undefined = useMemo(() => {
    if (!tree.data) return undefined
    return (scopeUnitId && shape.byId.get(scopeUnitId)) || (staff.unitId && shape.byId.get(staff.unitId)) || shape.roots[0]
  }, [tree.data, scopeUnitId, staff.unitId, shape])
  const facilities = useMemo(() => (scopeUnit ? shape.facilitiesUnder(scopeUnit.id) : []), [scopeUnit, shape])
  // the facility: the stored one when it lies under the scope, else the home facility, else the first one
  const facility: OrgUnit | undefined = useMemo(() => {
    if (!scopeUnit) return undefined
    return facilities.find((f) => f.id === facilityId) ?? facilities.find((f) => f.id === staff.facilityId) ?? facilities[0]
  }, [scopeUnit, facilities, facilityId, staff.facilityId])
  useEffect(() => {
    if (scopeUnit && scopeUnit.id !== scopeUnitId) setScopeUnit(scopeUnit.id)
  }, [scopeUnit, scopeUnitId, setScopeUnit])
  useEffect(() => {
    if (scopeUnit && (facility?.id ?? null) !== facilityId) setFacility(facility?.id ?? null)
  }, [scopeUnit, facility, facilityId, setFacility])
  return { staff, tree, shape, scopeUnit, facilities, facility, setScopeUnit, setFacility }
}

export function AppShell({ module }: { module: 'staff' | 'admin' }) {
  const { t } = useTranslation()
  const { can, isSuperAdmin } = usePermissions()
  const ws = useWorkspace()
  const { scopeUnit, facility, facilities, tree } = ws
  const [collapsed, setCollapsed] = useState(() => storage.get('clinic.sidebar', false))
  const [mobileOpen, setMobileOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setMobileOpen(false), [loc.pathname])
  useEffect(() => storage.set('clinic.sidebar', collapsed), [collapsed])

  // the unit the pages of this module work in
  const workUnitId = module === 'staff' ? (facility?.id ?? scopeUnit?.id ?? null) : (scopeUnit?.id ?? null)
  // instant navigation: shared data prefetched once per unit, route chunks loaded on idle
  const qc = useQueryClient()
  useEffect(() => { if (workUnitId) { warmWorkspaceData(qc, workUnitId, module); preloadRouteChunks() } }, [qc, workUnitId, module])

  // the staff app waits until the tree is known and a facility is picked (a scope with no facility opens as it is)
  const waiting = !tree.data || (module === 'staff' && facilities.length > 0 && !facility)

  // the sidebar counters (lab / confirm / SMS queues) follow the unit the pages show
  const pending = useQuery({
    queryKey: ['shell-badges', workUnitId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const d = await repos.reports.dashboard(workUnitId as string, { dateFrom: today, dateTo: today })
      return { lab: d.pendingLab, confirm: d.pendingApproval, sms: d.smsQueued }
    },
    refetchInterval: 30_000,
    enabled: !waiting && !!workUnitId,
  })

  const sections: NavSection[] = useMemo(() => {
    if (module === 'admin') {
      return [
        { items: [{ to: routes.admin.root, label: t('nav.dashboard'), icon: <LayoutDashboard />, end: true, key: 'd' }] },
        { title: t('nav.organisation'), items: [
          { to: routes.admin.unit, label: t('nav.unit'), icon: <Building2 />, perm: 'admin.unit.read', key: 'k' },
          { to: routes.admin.units, label: t('nav.units'), icon: <Landmark />, perm: ['admin.unit.manage', 'admin.unit.read'], key: 'f' },
          { to: routes.admin.employees, label: t('nav.employees'), icon: <UserCog />, perm: 'admin.employee.read', key: 'x' },
          { to: routes.admin.roles, label: t('nav.roles'), icon: <ShieldCheck />, perm: 'admin.role.write', key: 'r' },
        ] },
        { title: t('nav.catalog'), items: [
          { to: routes.admin.catalog, label: t('nav.catalog'), icon: <FolderTree />, perm: 'admin.catalog.read', key: 'z' },
          { to: routes.admin.schemas, label: t('nav.schemas'), icon: <ListChecks />, perm: 'admin.schema.write', key: 's' },
          { to: routes.admin.templates, label: t('nav.templates'), icon: <LayoutTemplate />, perm: 'admin.template.read', key: 'a' },
          { to: routes.admin.receipts, label: t('nav.receipts'), icon: <ReceiptText />, perm: 'admin.template.read', key: 'c' },
        ] },
        { title: t('common.settings'), items: [
          { to: routes.admin.sms, label: t('nav.smsSettings'), icon: <Send />, perm: 'admin.settings.write', key: 'm' },
          { to: routes.admin.platform, label: t('nav.territory'), icon: <Globe2 />, perm: ['platform.unit.manage', 'reports.operations.read'] as Permission[], key: 'p' },
          { to: routes.admin.assistantSettings, label: t('nav.assistantSettings'), icon: <Bot />, perm: 'admin.settings.write', key: 'i' },
        ] },
        { items: [{ to: routes.admin.assistant, label: t('nav.assistant'), icon: <Sparkles />, perm: 'assistant.use', key: 'y' }] },
      ]
    }
    return [
      { items: [{ to: routes.app.root, label: t('nav.dashboard'), icon: <LayoutDashboard />, end: true, key: 'd' }] },
      { title: t('nav.reception'), items: [
        { to: routes.app.reception, label: t('nav.reception'), icon: <ClipboardList />, perm: 'reception.order.create', key: 'q' },
        { to: routes.app.patients, label: t('nav.patients'), icon: <Users />, perm: 'reception.patient.read', key: 'b' },
        { to: routes.app.orders, label: t('nav.orders'), icon: <Receipt />, perm: ['reception.order.create', 'reports.operations.read'], key: 'c' },
      ] },
      { title: t('nav.lab'), items: [
        { to: routes.app.lab, label: t('nav.lab'), icon: <FlaskConical />, perm: 'lab.worklist.read', badge: pending.data?.lab, key: 'l' },
        // the registrar desk (approved results only) reaches the same page as "Natijalar"
        can('confirm.result.read')
          ? { to: routes.app.confirm, label: t('nav.confirm'), icon: <BadgeCheck />, perm: 'confirm.result.read', badge: pending.data?.confirm, key: 't' }
          : { to: routes.app.confirm, label: t('nav.results'), icon: <FileCheck2 />, perm: 'confirm.result.view', key: 't' },
      ] },
      { items: [
        { to: routes.app.reports, label: t('nav.reports'), icon: <BarChart3 />, perm: ['reports.finance.read', 'reports.operations.read'], key: 'h' },
        { to: routes.app.messages, label: t('nav.messages'), icon: <MessageSquare />, perm: ['messaging.send', 'messaging.broadcast'], badge: pending.data?.sms, key: 'x' },
      ] },
      { items: [{ to: routes.app.assistant, label: t('nav.assistant'), icon: <Sparkles />, perm: 'assistant.use', key: 'y' }] },
    ]
  }, [module, t, pending.data, can])

  const visible = sections.map((s) => ({ ...s, items: s.items.filter((i) => !i.perm || can(i.perm)) })).filter((s) => s.items.length)
  // keyboard: "G" + letter jumps to a page the user may open; "?" opens the reference
  const navHotkeys = useMemo(() => visible.flatMap((s) => s.items.filter((i) => i.key).map((i) => ({ key: i.key!, to: i.to, label: i.label }))), [visible])
  const [help, setHelp] = useState(false)
  const openHelp = useCallback(() => setHelp(true), [])
  useGlobalHotkeys({ nav: navHotkeys, onHelp: openHelp })
  const canAdmin = can(['admin.unit.read', 'admin.employee.read', 'admin.catalog.read', 'admin.template.read']) || isSuperAdmin

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 items-center border-b border-line px-4', collapsed ? 'justify-center' : 'justify-between')}>
        {collapsed ? <BrandMark /> : <Logo />}
        {!collapsed && (
          <IconButton label="collapse" size="sm" onClick={() => setCollapsed(true)} className="max-lg:hidden"><PanelLeftClose /></IconButton>
        )}
      </div>
      <nav className="app-sidebar-nav flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {visible.map((s, i) => (
          <div key={i}>
            {s.title && !collapsed && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{s.title}</p>}
            <ul className="space-y-0.5">
              {s.items.map((it) => (
                <li key={it.to}>
                  <NavLink to={it.to} end={it.end} title={it.key ? `${it.label} · G ${it.key.toUpperCase()}` : it.label} className={({ isActive }) => cn('app-sidebar-link group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors', collapsed && 'justify-center px-0', isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}>
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.span layoutId={`nav-${module}`} className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                        <span className={cn('app-nav-icon shrink-0 [&>svg]:size-[18px]', isActive ? 'text-brand' : 'text-ink-3 group-hover:text-ink-2')}>{it.icon}</span>
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
          <NavLink to={routes.admin.root} className={cn('app-sidebar-link flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink', collapsed && 'justify-center px-0')}>
            <ArrowLeftRight className="size-[18px] text-ink-3" />{!collapsed && t('nav.admin')}
          </NavLink>
        )}
        {module === 'admin' && (
          <NavLink to={routes.app.root} className={cn('app-sidebar-link flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink', collapsed && 'justify-center px-0')}>
            <ArrowLeftRight className="size-[18px] text-ink-3" />{!collapsed && t('nav.staffApp')}
          </NavLink>
        )}
        {collapsed && <IconButton label="expand" size="sm" onClick={() => setCollapsed(false)} className="mx-auto mt-1 max-lg:hidden"><PanelLeftOpen /></IconButton>}
      </div>
    </div>
  )

  return (
    <div className="app-shell relative min-h-dvh overflow-x-clip bg-bg">
      {/* Desktop sidebar */}
      <aside className={cn('app-shell-sidebar fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-bg-elevated/95 transition-[width] duration-300 ease-[var(--ease-out)] lg:block', collapsed ? 'w-[72px]' : 'w-[248px]')}>{sidebar}</aside>
      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink/40 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: 'spring', stiffness: 400, damping: 36 }} className="app-mobile-sidebar fixed inset-y-0 left-0 z-50 w-[min(260px,88vw)] border-r border-line bg-bg-elevated lg:hidden">
              <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 grid size-8 place-items-center rounded-full hover:bg-surface-2"><X className="size-4" /></button>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={cn('app-shell-content relative transition-[padding] duration-300 ease-[var(--ease-out)]', collapsed ? 'lg:pl-[72px]' : 'lg:pl-[248px]')}>
        <TopBar onMenu={() => setMobileOpen(true)} module={module} onHelp={openHelp} ws={ws} />
        {waiting ? <div className="grid min-h-[40vh] place-items-center" data-unit-pending><Loader2 className="size-6 animate-spin text-ink-3" /></div> : <Outlet />}
      </div>
    <HotkeysHelp open={help} onClose={() => setHelp(false)} nav={navHotkeys} />
      </div>
  )
}

function TopBar({ onMenu, module, onHelp, ws }: { onMenu: () => void; module: 'staff' | 'admin'; onHelp: () => void; ws: ReturnType<typeof useWorkspace> }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const logoutStaff = useAuth((s) => s.logoutStaff)
  const { staff: s, shape, scopeUnit, facilities, facility, setScopeUnit, setFacility } = ws
  const notif = useQuery({ queryKey: ['notifications'], queryFn: () => repos.messaging.notifications(), refetchInterval: 60_000 })
  const unread = notif.data?.filter((n) => !n.read).length ?? 0
  // the scope switcher: every unit the employee may administer (their subtree(s)); for a superadmin the whole tree
  // a superadmin: the whole tree; everyone else: their own scope roots (home + extra units) with everything under
  // them — a viloyat administrator or installer switches among the viloyat, its tumanlar and muassasalar
  const scopeChoices = useMemo(() => {
    if (s.isSuperAdmin) return shape.flat
    const own = s.unitIds.filter((id) => shape.byId.has(id))
    // `ancestors` returns the lineage including the unit itself — keep only units with no OTHER own unit above
    const tops = own.filter((id) => !shape.ancestors(id).some((a) => a.id !== id && own.includes(a.id)))
    return tops.flatMap((id) => shape.under(id))
  }, [s.isSuperAdmin, s.unitIds, shape])
  const facilityUnits = useMemo(() => (scopeUnit ? shape.under(scopeUnit.id) : []), [scopeUnit, shape])

  return (
    <header className="app-topbar sticky top-0 z-30 flex h-14 items-center gap-1.5 border-b border-line bg-bg/86 px-2 backdrop-blur-md xs:gap-2 xs:px-3 sm:h-16 sm:gap-3 sm:px-6">
      <IconButton label="menu" className="lg:hidden shrink-0" onClick={onMenu}><MenuIcon /></IconButton>
      <div className="lg:hidden max-xs:hidden shrink-0"><Logo compact /></div>

      {/* Scope switcher — the administered unit (admin panel; a superadmin sees it everywhere) */}
      {(module === 'admin' || s.isSuperAdmin) && scopeUnit && (
        <UnitSwitcher units={scopeChoices} value={scopeUnit.id} hint={t('org.switcher.scope')} recentKey="clinic.recent.scope" disabled={scopeChoices.length < 2}
          onChange={(id) => { setScopeUnit(id); if (module === 'admin') nav(routes.admin.root) }}
          triggerProps={scopeChoices.length > 1 ? { 'data-scope-switcher': true } : { 'data-scope-fixed': true }} />
      )}

      {/* Facility switcher — the staff app works in one facility under the scope */}
      {module === 'staff' && scopeUnit && facilities.length > 0 && (
        <UnitSwitcher units={facilityUnits} levels={FACILITY_ONLY} value={facility?.id ?? null} placeholder={t('org.pickFacility')} hint={t('org.switcher.workplace')} recentKey="clinic.recent.facility" disabled={facilities.length < 2}
          onChange={(id) => setFacility(id)}
          triggerProps={facilities.length > 1 ? { 'data-facility-switcher': true } : { 'data-facility-fixed': true }} />
      )}
      {module === 'admin' && <Badge tone="brand" size="sm" className="max-sm:hidden">{t('nav.admin')}</Badge>}

      <div className="flex-1 min-w-2" />

      <div className="flex shrink-0 items-center gap-0 xs:gap-1">
        <HotkeysButton onClick={onHelp} />
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
            <button type="button" className="ml-0.5 xs:ml-1 flex items-center gap-2 rounded-full p-1 sm:pr-2 hover:bg-surface-2">
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

/** Depth-first flatten of nested unit nodes (parents before children). */
export { Tooltip }
