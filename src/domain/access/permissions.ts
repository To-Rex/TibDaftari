/**
 * Permission catalog — the single source of truth for what can be granted.
 * Key format: `<module>.<resource>.<action>`.
 * Roles are sets of these keys; employees may carry allow/deny overrides.
 * WHERE a permission applies is not part of the key: it comes from the employee's unit (their home unit and
 * everything under it in the Davlat → Viloyat → Tuman → Muassasa tree).
 */
export const PERMISSIONS = [
  // Reception / registration
  'reception.patient.read',
  'reception.patient.write',
  'reception.order.create',
  'reception.order.cancel',
  /** delete a cheque that never "happened" (unpaid, no lab work started) */
  'reception.order.delete',
  'reception.payment.create',
  'reception.payment.refund',
  /** change a payment more than a day after it was taken (money back on a removed service, delete the cheque) —
   *  reception only within the day; admin and rahbar any time */
  'reception.payment.late_edit',
  // Laboratory
  'lab.worklist.read',
  'lab.result.write',
  'lab.result.submit',
  // Doctor confirmation
  'confirm.result.read',
  /** approved results only: view, print, re-send the SMS (the registrar desk) */
  'confirm.result.view',
  'confirm.result.approve',
  'confirm.result.resend',
  // Reports
  'reports.finance.read',
  /** revenue for the last 7 days only (the registrar desk) */
  'reports.finance.recent',
  'reports.operations.read',
  'reports.export',
  // Messaging
  'messaging.send',
  'messaging.broadcast',
  // Admin — the organisation unit (its profile / settings) and the units under it
  'admin.unit.read',
  'admin.unit.write',
  /** create / edit the units under this one (tumanlar, muassasalar) */
  'admin.unit.manage',
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
  /** wipe a unit and everything under it ("like newborn") — superadmin and the installer, inside their scope */
  'admin.unit.reset',
  /** the AI assistant («Yordamchi»): chat and its tools — each tool is gated by the keys above */
  'assistant.use',
  // Platform (superadmin only): the whole tree, every country
  'platform.unit.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const SUPERADMIN_ROLE_KEY = 'superadmin'
/** O‘rnatuvchi — works like a superadmin, but only inside the units a superadmin gave them (their viloyat, several
 *  viloyats of the same country, or the whole country); never another country, never the platform keys. */
export const INSTALLER_ROLE_KEY = 'installer'
/** granted, re-scoped and edited by superadmins only */
export const PROTECTED_ROLE_KEYS: readonly string[] = [SUPERADMIN_ROLE_KEY, INSTALLER_ROLE_KEY]
export const isProtectedRole = (key: string | undefined | null) => !!key && PROTECTED_ROLE_KEYS.includes(key)

/** Keys saved before the unit model (roles / overrides of old sessions) are read through this map. */
export const RENAMED_PERMISSIONS: Record<string, Permission> = {
  'admin.company.read': 'admin.unit.read',
  'admin.company.write': 'admin.unit.write',
  'admin.branch.write': 'admin.unit.manage',
  'platform.company.manage': 'platform.unit.manage',
}
export const normalizePermission = (p: string): Permission => (RENAMED_PERMISSIONS[p] ?? p) as Permission

export type PermissionModule =
  | 'reception'
  | 'lab'
  | 'confirm'
  | 'reports'
  | 'messaging'
  | 'admin'
  | 'platform'
  | 'assistant'

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
  /** null = system role (available in every unit); else usable inside that unit's subtree */
  scopeUnitId: string | null
  key: string // stable machine key, e.g. 'laborant'
  name: string
  description?: string
  permissions: Permission[]
  isSystem: boolean
  /** employees of the requesting scope using this role (server-computed) */
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
  const set = new Set<Permission>((role?.permissions ?? []).map(normalizePermission))
  overrides?.allow.forEach((p) => set.add(normalizePermission(p)))
  overrides?.deny.forEach((p) => set.delete(normalizePermission(p)))
  return set
}

export const hasPermission = (set: Set<Permission>, p: Permission | Permission[]) =>
  Array.isArray(p) ? p.some((x) => set.has(x)) : set.has(p)
