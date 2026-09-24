import { create } from 'zustand'
import type { PatientSession, Permission, StaffSession } from '@/domain'
import { repos } from '@/data'
import { onUnauthorized } from '@/data/http/client'
import { storage } from '@/shared/lib/storage'

const STAFF_KEY = 'clinic.staff.token'
const PATIENT_KEY = 'clinic.patient.token'
const BRANCH_KEY = 'clinic.staff.branch'
/** superadmin only: the company currently being managed (null = own/home company) */
const COMPANY_KEY = 'clinic.staff.company'
/** last known sessions — lets the app paint immediately on reload; the API re-validates in the background */
const STAFF_SESSION_KEY = 'clinic.staff.session'
const PATIENT_SESSION_KEY = 'clinic.patient.session'

/** Superadmins may work inside any company: overlay the chosen company id on the session. */
const withActiveCompany = (s: StaffSession | null): StaffSession | null => {
  if (!s || !s.isSuperAdmin) return s
  const active = storage.get<string | null>(COMPANY_KEY, null)
  return active && active !== s.companyId ? { ...s, companyId: active } : s
}

/** Only superadmins and company admins may change the branch scope (incl. "all branches"). */
export const canSwitchBranch = (s: StaffSession): boolean => s.isSuperAdmin || s.roleKey === 'admin'

/**
 * Branch scope for a session. Switchers keep their stored choice (null = all branches, else the login
 * default); everyone else is pinned to an assigned branch — the stored one when it is theirs, otherwise
 * the primary one. An older API without `branchIds` behaves as before.
 */
const resolveBranch = (s: StaffSession, stored: string | null): string | null => {
  if (canSwitchBranch(s)) return stored ?? s.branchId
  const mine = s.branchIds ?? []
  if (!mine.length) return stored ?? s.branchId
  return stored && mine.includes(stored) ? stored : (s.branchId ?? mine[0] ?? null)
}

/** Bumped by every login/logout; an in-flight hydrate() must not overwrite a newer session. */
let sessionEpoch = 0

interface AuthState {
  staff: StaffSession | null
  patient: PatientSession | null
  /** currently selected branch for staff (null = all branches for admins) */
  branchId: string | null
  /** superadmin: own company id (session.companyId may be overlaid by setActiveCompany) */
  homeCompanyId: string | null
  hydrated: boolean
  hydrate: () => Promise<void>
  staffLogin: (login: string, password: string) => Promise<StaffSession>
  patientLogin: (session: PatientSession) => void
  setBranch: (id: string | null) => void
  /** superadmin: switch the managed company (null = back to own company); resets branch scope */
  setActiveCompany: (companyId: string | null) => void
  logoutStaff: () => Promise<void>
  logoutPatient: () => Promise<void>
  refreshStaff: () => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  staff: null,
  patient: null,
  branchId: storage.get<string | null>(BRANCH_KEY, null),
  homeCompanyId: null,
  hydrated: false,
  async hydrate() {
    const epoch = sessionEpoch
    const st = storage.get<string | null>(STAFF_KEY, null)
    const pt = storage.get<string | null>(PATIENT_KEY, null)
    // 1) optimistic: restore the last known sessions instantly (no round trip before first paint)
    const cachedStaff = st ? storage.get<StaffSession | null>(STAFF_SESSION_KEY, null) : null
    const cachedPatient = pt ? storage.get<PatientSession | null>(PATIENT_SESSION_KEY, null) : null
    if ((cachedStaff && cachedStaff.accessToken === st) || (cachedPatient && cachedPatient.accessToken === pt)) {
      const home = cachedStaff && cachedStaff.accessToken === st ? cachedStaff : null
      const staff = withActiveCompany(home)
      // read the stored choice afresh — the store may have initialised before the session/branch were written
      const branchId = staff ? resolveBranch(staff, storage.get<string | null>(BRANCH_KEY, get().branchId)) : null
      if (staff) storage.set(BRANCH_KEY, branchId) // a pinned employee's stale choice is corrected on disk too
      set({ staff, patient: cachedPatient && cachedPatient.accessToken === pt ? cachedPatient : null, branchId, homeCompanyId: home?.companyId ?? null, hydrated: true })
    }
    // 2) authoritative: re-validate with the API (permissions/roles may have changed; token may be revoked)
    const [home, patient] = await Promise.all([
      st ? repos.auth.staffMe(st).catch(() => null) : null,
      pt ? repos.auth.patientMe(pt).catch(() => null) : null,
    ])
    if (epoch !== sessionEpoch) {
      // someone logged in/out while we were validating the OLD tokens — their result is authoritative
      set({ hydrated: true })
      return
    }
    if (!home) { storage.remove(STAFF_KEY); storage.remove(STAFF_SESSION_KEY) } else storage.set(STAFF_SESSION_KEY, home)
    if (!patient) { storage.remove(PATIENT_KEY); storage.remove(PATIENT_SESSION_KEY) } else storage.set(PATIENT_SESSION_KEY, patient)
    const staff = withActiveCompany(home)
    const branchId = staff ? resolveBranch(staff, get().branchId) : null
    if (staff) storage.set(BRANCH_KEY, branchId)
    set({ staff, patient, branchId, homeCompanyId: home?.companyId ?? null, hydrated: true })
  },
  async staffLogin(login, password) {
    const s = await repos.auth.staffLogin({ login, password })
    sessionEpoch++
    // a previous staff session of another user in this browser is gone for good
    const prev = get().staff
    if (prev && prev.accessToken !== s.accessToken) void repos.auth.logout(prev.accessToken).catch(() => undefined)
    storage.set(STAFF_KEY, s.accessToken)
    storage.set(STAFF_SESSION_KEY, s)
    const branchId = resolveBranch(s, null)
    storage.set(BRANCH_KEY, branchId)
    storage.remove(COMPANY_KEY)
    set({ staff: s, branchId, homeCompanyId: s.companyId })
    return s
  },
  patientLogin(session) {
    sessionEpoch++
    storage.set(PATIENT_KEY, session.accessToken)
    storage.set(PATIENT_SESSION_KEY, session)
    set({ patient: session })
  },
  setBranch(id) {
    const s = get().staff
    // non-admins stay inside their assigned branches (and never widen to "all branches")
    if (s && !canSwitchBranch(s) && (id === null || !(s.branchIds ?? []).includes(id))) return
    storage.set(BRANCH_KEY, id)
    set({ branchId: id })
  },
  setActiveCompany(companyId) {
    const { staff, homeCompanyId } = get()
    if (!staff?.isSuperAdmin) return
    const home = homeCompanyId ?? staff.companyId
    const next = companyId && companyId !== home ? companyId : null
    if (next) storage.set(COMPANY_KEY, next)
    else storage.remove(COMPANY_KEY)
    storage.set(BRANCH_KEY, null)
    set({ staff: { ...staff, companyId: next ?? home }, branchId: null })
  },
  async logoutStaff() {
    sessionEpoch++
    const t = get().staff?.accessToken
    if (t) await repos.auth.logout(t)
    storage.remove(STAFF_KEY)
    storage.remove(STAFF_SESSION_KEY)
    storage.remove(COMPANY_KEY)
    set({ staff: null, homeCompanyId: null })
  },
  async logoutPatient() {
    sessionEpoch++
    const t = get().patient?.accessToken
    if (t) await repos.auth.logout(t)
    storage.remove(PATIENT_KEY)
    storage.remove(PATIENT_SESSION_KEY)
    set({ patient: null })
  },
  async refreshStaff() {
    const t = get().staff?.accessToken
    if (!t) return
    const epoch = sessionEpoch
    const s = await repos.auth.staffMe(t).catch(() => null)
    if (epoch !== sessionEpoch) return
    if (s) storage.set(STAFF_SESSION_KEY, s)
    set({ staff: withActiveCompany(s), homeCompanyId: s?.companyId ?? null })
  },
}))

/** API said 401 for an actor (expired/revoked token): drop that session so route guards redirect to login. */
onUnauthorized((actor) => {
  sessionEpoch++
  if (actor === 'staff') { storage.remove(STAFF_SESSION_KEY); useAuth.setState({ staff: null }) }
  else if (actor === 'patient') { storage.remove(PATIENT_SESSION_KEY); useAuth.setState({ patient: null }) }
})

/** Permission helpers — usable in components and plain functions. */
export const usePermissions = () => {
  const staff = useAuth((s) => s.staff)
  const set = new Set<Permission>(staff?.permissions ?? [])
  const can = (p: Permission | Permission[]) => (Array.isArray(p) ? p.some((x) => set.has(x)) : set.has(p))
  return { can, isSuperAdmin: !!staff?.isSuperAdmin, permissions: set }
}
