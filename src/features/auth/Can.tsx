import type { ReactNode } from 'react'
import type { Permission } from '@/domain'
import { usePermissions } from './store'

/** Render children only when the current staff user has (any of) the permission(s). */
export function Can({ perm, children, fallback = null }: { perm: Permission | Permission[]; children: ReactNode; fallback?: ReactNode }) {
  const { can } = usePermissions()
  return <>{can(perm) ? children : fallback}</>
}
