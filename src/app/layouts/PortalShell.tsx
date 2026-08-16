/** Patient portal shell — calm, single-column, mobile-first. */
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Home, FileText, CalendarDays, UserRound, LogOut } from 'lucide-react'
import { useAuth } from '@/features/auth/store'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { Avatar, LanguageSwitcher, Logo, Menu, ThemeToggle } from '@/shared/ui'

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
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="ml-6 hidden md:flex items-center gap-1">
            {items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => cn('relative flex h-9 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium transition-colors', isActive ? 'text-brand-ink' : 'text-ink-2 hover:text-ink hover:bg-surface-2')}>
                {({ isActive }) => (<>{isActive && <motion.span layoutId="portal-nav" className="absolute inset-0 rounded-full bg-brand-soft" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}<span className="relative flex items-center gap-2 [&>svg]:size-4">{it.icon}{it.label}</span></>)}
              </NavLink>
            ))}
          </nav>
          <div className="flex-1" />
          <LanguageSwitcher compact />
          <ThemeToggle />
          <Menu trigger={() => (<button className="ml-1 flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-surface-2"><Avatar name={p.fullName} size="sm" /><span className="max-sm:hidden text-[13px] font-medium">{p.fullName.split(' ')[1] ?? p.fullName}</span></button>)}
            items={[{ key: 'logout', label: t('common.logout'), icon: <LogOut />, danger: true, onSelect: () => void logoutPatient().then(() => nav(routes.home)) }]} />
        </div>
      </header>
      <div className="mx-auto max-w-5xl pb-24 md:pb-8"><Outlet /></div>
      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-bg-elevated/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium', isActive ? 'text-brand' : 'text-ink-3')}>
            <span className="[&>svg]:size-5">{it.icon}</span>{it.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
