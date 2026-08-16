import { useAuth } from '@/features/auth/store'

/** Convenience accessors for staff pages (throws if used outside RequireStaff). */
export function useStaffSession() {
  const staff = useAuth((s) => s.staff)
  const branchId = useAuth((s) => s.branchId)
  if (!staff) throw new Error('useStaffSession outside staff routes')
  return { staff, companyId: staff.companyId, employeeId: staff.employeeId, branchId }
}

export function usePatientSession() {
  const patient = useAuth((s) => s.patient)
  if (!patient) throw new Error('usePatientSession outside patient routes')
  return patient
}
