import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Permission } from '@/domain'
import { useAuth, usePermissions } from '@/features/auth/store'
import { routes } from '@/shared/config/routes'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/shared/ui'
import { ShieldOff } from 'lucide-react'

export function RequireStaff() {
  const staff = useAuth((s) => s.staff)
  const loc = useLocation()
  if (!staff) return <Navigate to={routes.staffLogin} replace state={{ from: loc.pathname }} />
  return <Outlet />
}

export function RequirePatient() {
  const patient = useAuth((s) => s.patient)
  const loc = useLocation()
  if (!patient) return <Navigate to={routes.patientLogin} replace state={{ from: loc.pathname }} />
  return <Outlet />
}

export function RequirePerm({ perm }: { perm: Permission | Permission[] }) {
  const { can } = usePermissions()
  const { t } = useTranslation()
  if (!can(perm)) return <EmptyState icon={<ShieldOff />} title={t('common.noAccess')} className="min-h-[60vh]" />
  return <Outlet />
}
