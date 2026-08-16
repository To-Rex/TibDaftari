import { create } from 'zustand'
import type { PatientSession, Permission, StaffSession } from '@/domain'
import { repos } from '@/data'
import { storage } from '@/shared/lib/storage'

const STAFF_KEY = 'clinic.staff.token'
const PATIENT_KEY = 'clinic.patient.token'
const BRANCH_KEY = 'clinic.staff.branch'

interface AuthState {
  staff: StaffSession | null
  patient: PatientSession | null
  /** currently selected branch for staff (null = all branches for admins) */
  branchId: string | null
  hydrated: boolean
  hydrate: () => Promise<void>
  staffLogin: (login: string, password: string) => Promise<StaffSession>
  patientLogin: (session: PatientSession) => void
  setBranch: (id: string | null) => void
  logoutStaff: () => Promise<void>
  logoutPatient: () => Promise<void>
  refreshStaff: () => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  staff: null,
  patient: null,
  branchId: storage.get<string | null>(BRANCH_KEY, null),
  hydrated: false,
  async hydrate() {
    const st = storage.get<string | null>(STAFF_KEY, null)
    const pt = storage.get<string | null>(PATIENT_KEY, null)
    const [staff, patient] = await Promise.all([
      st ? repos.auth.staffMe(st).catch(() => null) : null,
      pt ? repos.auth.patientMe(pt).catch(() => null) : null,
    ])
    if (!staff) storage.remove(STAFF_KEY)
    if (!patient) storage.remove(PATIENT_KEY)
    const branchId = staff ? (get().branchId ?? staff.branchId) : null
    set({ staff, patient, branchId, hydrated: true })
  },
  async staffLogin(login, password) {
    const s = await repos.auth.staffLogin({ login, password })
    storage.set(STAFF_KEY, s.accessToken)
    storage.set(BRANCH_KEY, s.branchId)
    set({ staff: s, branchId: s.branchId })
    return s
  },
  patientLogin(session) {
    storage.set(PATIENT_KEY, session.accessToken)
    set({ patient: session })
  },
  setBranch(id) {
    storage.set(BRANCH_KEY, id)
    set({ branchId: id })
  },
  async logoutStaff() {
    const t = get().staff?.accessToken
    if (t) await repos.auth.logout(t)
    storage.remove(STAFF_KEY)
    set({ staff: null })
  },
  async logoutPatient() {
    const t = get().patient?.accessToken
    if (t) await repos.auth.logout(t)
    storage.remove(PATIENT_KEY)
    set({ patient: null })
  },
  async refreshStaff() {
    const t = get().staff?.accessToken
    if (!t) return
    const s = await repos.auth.staffMe(t).catch(() => null)
    set({ staff: s })
  },
}))

/** Permission helpers — usable in components and plain functions. */
export const usePermissions = () => {
  const staff = useAuth((s) => s.staff)
  const set = new Set<Permission>(staff?.permissions ?? [])
  const can = (p: Permission | Permission[]) => (Array.isArray(p) ? p.some((x) => set.has(x)) : set.has(p))
  return { can, isSuperAdmin: !!staff?.isSuperAdmin, permissions: set }
}
