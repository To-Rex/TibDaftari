/** Patient portal shell — calm, single-column, mobile-first. */
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Home, FileText, CalendarDays, UserRound, LogOut } from 'lucide-react'
import { useAuth } from '@/features/auth/store'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { Avatar, LanguageSwitcher, Logo, Menu, ThemeToggle } from '@/shared/ui'

/** Portal content column: centered, but widens on large monitors so it never looks like a strip. */
export const PORTAL_WIDTH = 'max-w-5xl 2xl:max-w-6xl 3xl:max-w-[1600px]'

export function PortalShell() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { patient, logoutPatient } = useAuth()
  const p = patient!
  const items = [
    { to: routes.portal.root, label: t('nav.portalHome'), icon: <Home />, end: true },
    { to: routes.portal.results, label: t('nav.portalResults'), icon: <FileText /> },
    { to: routes.portal.visits, label: t('nav.portalVisits'), icon: <CalendarDays /> },
    { to: routes.portal.profile, label: t('nav.portalProfile'), icon: <UserRound /> },
  ]
  return (
    <div className="portal-shell relative min-h-dvh overflow-x-clip bg-bg">
      <header className="portal-shell-header sticky top-0 z-30 border-b border-line bg-bg/86 backdrop-blur-md">
        <div className={cn('mx-auto flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 xs:px-4 sm:px-6', PORTAL_WIDTH)}>
          <div className="shrink-0"><Logo className="max-xs:[&>span:last-child]:hidden" /></div>
          {/* Desktop/tablet nav (md+); phones use the bottom bar */}
          <nav className="ml-1 lg:ml-6 hidden md:flex min-w-0 items-center gap-1">
            {items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} title={it.label} className={({ isActive }) => cn('portal-nav-link relative flex h-9 items-center gap-2 rounded-full px-3 text-[14px] font-medium transition-colors lg:px-3.5', isActive ? 'text-brand-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}>
                {({ isActive }) => (<>{isActive && <motion.span layoutId="portal-nav" className="absolute inset-0 rounded-full bg-brand-soft" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}<span className="relative flex items-center gap-2 [&>svg]:size-4">{it.icon}<span className="max-lg:text-[13.5px]">{it.label}</span></span></>)}
              </NavLink>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <LanguageSwitcher compact />
            <ThemeToggle />
            <Menu trigger={() => (<button className="ml-0.5 flex items-center gap-2 rounded-full p-1 xs:pr-2 hover:bg-surface-2"><Avatar name={p.fullName} size="sm" /><span className="max-lg:hidden text-[13px] font-medium">{p.fullName.split(' ')[1] ?? p.fullName}</span></button>)}
              items={[{ key: 'logout', label: t('common.logout'), icon: <LogOut />, danger: true, onSelect: () => void logoutPatient().then(() => nav(routes.home)) }]} />
          </div>
        </div>
      </header>
      <div className={cn('mx-auto pb-24 md:pb-8', PORTAL_WIDTH)}><Outlet /></div>
      {/* Mobile bottom nav — labels drop on watch-size screens so 4 icons always fit */}
      <nav className="portal-bottom-nav fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-bg-elevated/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} title={it.label} className={({ isActive }) => cn('portal-bottom-link relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium', isActive ? 'text-brand' : 'text-ink-3')}>
            <span className="[&>svg]:size-5">{it.icon}</span><span className="max-w-full truncate max-[340px]:hidden">{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
