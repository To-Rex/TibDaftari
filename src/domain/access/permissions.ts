/**
 * Permission catalog — the single source of truth for what can be granted.
 * Key format: `<module>.<resource>.<action>`.
 * Roles are sets of these keys; employees may carry allow/deny overrides.
 */
export const PERMISSIONS = [
  // Reception / registration
  'reception.patient.read',
  'reception.patient.write',
  'reception.order.create',
  'reception.order.cancel',
  'reception.payment.create',
  'reception.payment.refund',
  // Laboratory
  'lab.worklist.read',
  'lab.result.write',
  'lab.result.submit',
  // Doctor confirmation
  'confirm.result.read',
  'confirm.result.approve',
  'confirm.result.resend',
  // Reports
  'reports.finance.read',
  'reports.operations.read',
  'reports.export',
  // Messaging
  'messaging.send',
  'messaging.broadcast',
  // Admin — organisation
  'admin.company.read',
  'admin.company.write',
  'admin.branch.write',
  'admin.employee.read',
  'admin.employee.write',
  'admin.role.write',
  // Admin — catalog & templates
  'admin.catalog.read',
  'admin.catalog.write',
  'admin.schema.write',
  'admin.template.read',
  'admin.template.write',
  'admin.template.publish',
  'admin.settings.write',
  // Platform (superadmin only)
  'platform.company.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export type PermissionModule =
  | 'reception'
  | 'lab'
  | 'confirm'
  | 'reports'
  | 'messaging'
  | 'admin'
  | 'platform'

export const moduleOf = (p: Permission): PermissionModule =>
  p.split('.')[0] as PermissionModule

export const permissionsByModule = (): Record<PermissionModule, Permission[]> =>
  PERMISSIONS.reduce(
    (acc, p) => {
      const m = moduleOf(p)
      ;(acc[m] ||= []).push(p)
      return acc
    },
    {} as Record<PermissionModule, Permission[]>,
  )

export interface Role {
  id: string
  companyId: string | null // null = platform-wide built-in
  key: string // stable machine key, e.g. 'laborant'
  name: string
  description?: string
  permissions: Permission[]
  isSystem: boolean
  /** employees of the requesting company using this role (server-computed) */
  employeeCount?: number
}

export interface PermissionOverrides {
  allow: Permission[]
  deny: Permission[]
}

/** Effective permission set = role ∪ allow − deny. Pure, easily unit-tested. */
export function resolvePermissions(
  role: Pick<Role, 'permissions'> | undefined,
  overrides: PermissionOverrides | undefined,
): Set<Permission> {
  const set = new Set<Permission>(role?.permissions ?? [])
  overrides?.allow.forEach((p) => set.add(p))
  overrides?.deny.forEach((p) => set.delete(p))
  return set
}

export const hasPermission = (set: Set<Permission>, p: Permission | Permission[]) =>
  Array.isArray(p) ? p.some((x) => set.has(x)) : set.has(p)
