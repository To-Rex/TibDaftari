import { create } from 'zustand'
import type { PatientSession, Permission, StaffSession } from '@/domain'
import { INSTALLER_ROLE_KEY } from '@/domain'
import { normalizePermission } from '@/domain'
import { repos } from '@/data'
import { onUnauthorized } from '@/data/http/client'
import { storage } from '@/shared/lib/storage'

const STAFF_KEY = 'clinic.staff.token'
const PATIENT_KEY = 'clinic.patient.token'
/** the unit the administrator works in (any level of the tree); the admin panel is scoped to it */
const SCOPE_KEY = 'clinic.staff.scope'
/** the facility the staff app works in (cheques, patients, lab, confirm, reports, messages) */
const FACILITY_KEY = 'clinic.staff.facility'
/** last known sessions — lets the app paint immediately on reload; the API re-validates in the background */
const STAFF_SESSION_KEY = 'clinic.staff.session'
const PATIENT_SESSION_KEY = 'clinic.patient.session'

/**
 * The working scope of a staff session: `scopeUnitId` = the unit the administrator manages (home unit by default,
 * any unit of the tree for a superadmin), `facilityId` = the facility the staff app works in (the home facility by
 * default; an administrator of a region picks one of its facilities). The AppShell validates both against the
 * tree the API returns and corrects stale choices.
 */
const defaults = (s: StaffSession | null) => ({
  scopeUnitId: s?.unitId ?? null,
  facilityId: s?.facilityId ?? null,
})

const readChoice = (key: string): string | null => storage.get<string | null>(key, null)

/** Old sessions may carry pre-unit permission keys; normalise them once. */
const normalizeSession = (s: StaffSession | null): StaffSession | null =>
  s ? { ...s, permissions: s.permissions.map(normalizePermission) as Permission[] } : s

/** Bumped by every login/logout; an in-flight hydrate() must not overwrite a newer session. */
let sessionEpoch = 0

interface AuthState {
  staff: StaffSession | null
  patient: PatientSession | null
  /** the unit the admin panel is scoped to (null until the tree is known for a superadmin) */
  scopeUnitId: string | null
  /** the facility the staff app works in (null = not chosen yet / none under the scope) */
  facilityId: string | null
  hydrated: boolean
  hydrate: () => Promise<void>
  staffLogin: (login: string, password: string) => Promise<StaffSession>
  patientLogin: (session: PatientSession) => void
  /** change the administered unit; the facility is re-picked by the shell inside the new scope */
  setScopeUnit: (id: string | null) => void
  setFacility: (id: string | null) => void
  logoutStaff: () => Promise<void>
  logoutPatient: () => Promise<void>
  refreshStaff: () => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  staff: null,
  patient: null,
  scopeUnitId: readChoice(SCOPE_KEY),
  facilityId: readChoice(FACILITY_KEY),
  hydrated: false,
  async hydrate() {
    const epoch = sessionEpoch
    const st = storage.get<string | null>(STAFF_KEY, null)
    const pt = storage.get<string | null>(PATIENT_KEY, null)
    // 1) optimistic: restore the last known sessions instantly (no round trip before first paint)
    const cachedStaff = st ? normalizeSession(storage.get<StaffSession | null>(STAFF_SESSION_KEY, null)) : null
    const cachedPatient = pt ? storage.get<PatientSession | null>(PATIENT_SESSION_KEY, null) : null
    if ((cachedStaff && cachedStaff.accessToken === st) || (cachedPatient && cachedPatient.accessToken === pt)) {
      const staff = cachedStaff && cachedStaff.accessToken === st ? cachedStaff : null
      const d = defaults(staff)
      set({
        staff,
        patient: cachedPatient && cachedPatient.accessToken === pt ? cachedPatient : null,
        scopeUnitId: readChoice(SCOPE_KEY) ?? d.scopeUnitId,
        facilityId: readChoice(FACILITY_KEY) ?? d.facilityId,
        hydrated: true,
      })
    }
    // 2) authoritative: re-validate with the API (permissions/roles may have changed; token may be revoked)
    const [staff, patient] = await Promise.all([
      st ? repos.auth.staffMe(st).then(normalizeSession).catch(() => null) : null,
      pt ? repos.auth.patientMe(pt).catch(() => null) : null,
    ])
    if (epoch !== sessionEpoch) {
      // someone logged in/out while we were validating the OLD tokens — their result is authoritative
      set({ hydrated: true })
      return
    }
    if (!staff) { storage.remove(STAFF_KEY); storage.remove(STAFF_SESSION_KEY) } else storage.set(STAFF_SESSION_KEY, staff)
    if (!patient) { storage.remove(PATIENT_KEY); storage.remove(PATIENT_SESSION_KEY) } else storage.set(PATIENT_SESSION_KEY, patient)
    const d = defaults(staff)
    set({ staff, patient, scopeUnitId: readChoice(SCOPE_KEY) ?? d.scopeUnitId, facilityId: readChoice(FACILITY_KEY) ?? d.facilityId, hydrated: true })
  },
  async staffLogin(login, password) {
    const s = normalizeSession(await repos.auth.staffLogin({ login, password }))!
    sessionEpoch++
    // a previous staff session of another user in this browser is gone for good
    const prev = get().staff
    if (prev && prev.accessToken !== s.accessToken) void repos.auth.logout(prev.accessToken).catch(() => undefined)
    storage.set(STAFF_KEY, s.accessToken)
    storage.set(STAFF_SESSION_KEY, s)
    // a fresh login always lands on the home unit / home facility
    const d = defaults(s)
    storage.remove(SCOPE_KEY)
    storage.remove(FACILITY_KEY)
    set({ staff: s, scopeUnitId: d.scopeUnitId, facilityId: d.facilityId })
    return s
  },
  patientLogin(session) {
    sessionEpoch++
    storage.set(PATIENT_KEY, session.accessToken)
    storage.set(PATIENT_SESSION_KEY, session)
    set({ patient: session })
  },
  setScopeUnit(id) {
    if (id) storage.set(SCOPE_KEY, id); else storage.remove(SCOPE_KEY)
    // the facility belongs to the old scope; the shell picks a new one inside the new scope
    storage.remove(FACILITY_KEY)
    set({ scopeUnitId: id, facilityId: null })
  },
  setFacility(id) {
    if (id) storage.set(FACILITY_KEY, id); else storage.remove(FACILITY_KEY)
    set({ facilityId: id })
  },
  async logoutStaff() {
    sessionEpoch++
    const t = get().staff?.accessToken
    if (t) await repos.auth.logout(t)
    storage.remove(STAFF_KEY)
    storage.remove(STAFF_SESSION_KEY)
    storage.remove(SCOPE_KEY)
    storage.remove(FACILITY_KEY)
    set({ staff: null, scopeUnitId: null, facilityId: null })
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
    const s = await repos.auth.staffMe(t).then(normalizeSession).catch(() => null)
    if (epoch !== sessionEpoch) return
    if (s) storage.set(STAFF_SESSION_KEY, s)
    set({ staff: s })
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
  const isSuperAdmin = !!staff?.isSuperAdmin
  const isInstaller = !isSuperAdmin && staff?.roleKey === INSTALLER_ROLE_KEY
  /** may wipe units: a superadmin anywhere, an installer inside their scope */
  const canReset = isSuperAdmin || set.has('admin.unit.reset')
  return { can, isSuperAdmin, isInstaller, canReset, permissions: set }
}

/**
 * The working scope for pages:
 *  - staff app pages (`useStaffScope`): the facility (falls back to the administered unit while none is chosen)
 *  - admin pages (`useAdminScope`): the administered unit
 * Both return the `scopeId` to pass to repositories. The AppShell guarantees they are set before pages render.
 */
export const useStaffScope = () => {
  const facilityId = useAuth((s) => s.facilityId)
  const scopeUnitId = useAuth((s) => s.scopeUnitId)
  const staff = useAuth((s) => s.staff)
  return { scopeId: facilityId ?? scopeUnitId ?? staff?.unitId ?? '', facilityId, scopeUnitId }
}
export const useAdminScope = () => {
  const scopeUnitId = useAuth((s) => s.scopeUnitId)
  const staff = useAuth((s) => s.staff)
  return { scopeId: scopeUnitId ?? staff?.unitId ?? '', scopeUnitId }
}
