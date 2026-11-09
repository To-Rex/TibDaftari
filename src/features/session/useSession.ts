import { useAdminScope, useAuth, useStaffScope } from '@/features/auth/store'

/**
 * Convenience accessors for staff pages (throws if used outside RequireStaff).
 * `scopeId` = the facility the staff app works in (falls back to the administered unit);
 * `adminScopeId` = the administered unit (admin pages). Prefer `useStaffScope()` / `useAdminScope()` directly.
 */
export function useStaffSession() {
  const staff = useAuth((s) => s.staff)
  const { scopeId, facilityId, scopeUnitId } = useStaffScope()
  const { scopeId: adminScopeId } = useAdminScope()
  if (!staff) throw new Error('useStaffSession outside staff routes')
  return { staff, employeeId: staff.employeeId, scopeId, facilityId, scopeUnitId, adminScopeId }
}

export function usePatientSession() {
  const patient = useAuth((s) => s.patient)
  if (!patient) throw new Error('usePatientSession outside patient routes')
  return patient
}
