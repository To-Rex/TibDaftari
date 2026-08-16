import type { AuthRepository } from '../../repositories'
import type { PatientSession, StaffSession } from '@/domain'
import { resolvePermissions } from '@/domain'
import { db } from '../db'
import { latency, MockError, token } from '../util'

/** Mock sessions survive page reloads via localStorage (token → subject id). */
const KEY = 'clinic.mock.sessions'
type Stored = { staff: Record<string, { employeeId: string; branchId: string | null }>; patient: Record<string, string> }
const load = (): Stored => { try { return JSON.parse(localStorage.getItem(KEY) ?? '') as Stored } catch { return { staff: {}, patient: {} } } }
const persist = (s: Stored) => localStorage.setItem(KEY, JSON.stringify(s))
const otps = new Map<string, { phone: string; code: string; exp: number }>()

const expires = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

export function buildStaffSession(employeeId: string): StaffSession {
  const d = db()
  const e = d.employees.find((x) => x.id === employeeId)
  if (!e) throw new MockError(401, 'auth_error', 'Hisob topilmadi')
  if (e.status !== 'active') throw new MockError(403, 'inactive', 'Hisob faol emas')
  const role = d.roles.find((r) => r.id === e.roleId)
  const perms = [...resolvePermissions(role, e.overrides)]
  return {
    actor: 'staff', employeeId: e.id, companyId: e.companyId,
    branchId: e.branchIds.length === 1 ? (e.branchIds[0] ?? null) : null,
    isSuperAdmin: role?.key === 'superadmin', roleKey: role?.key ?? 'user', fullName: e.fullName,
    permissions: perms, accessToken: token('tok'), expiresAt: expires(12),
  }
}

export const authMock: AuthRepository = {
  async staffLogin({ login, password }) {
    await latency(500)
    const d = db()
    const e = d.employees.find((x) => x.login.toLowerCase() === login.trim().toLowerCase())
    if (!e || d.credentials[e.login] !== password) throw new MockError(401, 'auth_error', 'Login yoki parol noto‘g‘ri')
    const s = buildStaffSession(e.id)
    e.lastLoginAt = new Date().toISOString()
    const st = load(); st.staff[s.accessToken] = { employeeId: e.id, branchId: s.branchId }; persist(st)
    return s
  },
  async staffMe(token) {
    await latency(120)
    const rec = load().staff[token]
    if (!rec) throw new MockError(401, 'auth_error', 'Sessiya tugagan')
    // refresh permissions from DB — role changes apply immediately
    const fresh = buildStaffSession(rec.employeeId)
    return { ...fresh, accessToken: token, branchId: rec.branchId }
  },
  async requestPatientOtp({ phone }) {
    await latency(600)
    const digits = phone.replace(/\D/g, '')
    const norm = digits.length === 9 ? `998${digits}` : digits
    if (!/^998\d{9}$/.test(norm)) throw new MockError(422, 'invalid_phone', 'Telefon raqam noto‘g‘ri')
    const p = db().patients.find((x) => x.phone === norm)
    if (!p) throw new MockError(404, 'not_found', 'Bu raqam bilan bemor topilmadi. Klinikaga murojaat qiling.')
    const challengeId = token('otp')
    const code = '1234' // mock — shown in UI as dev hint
    otps.set(challengeId, { phone: norm, code, exp: Date.now() + 5 * 60_000 })
    return { challengeId, devCode: code }
  },
  async verifyPatientOtp({ challengeId, code }) {
    await latency(500)
    const c = otps.get(challengeId)
    if (!c || c.exp < Date.now()) throw new MockError(401, 'otp_expired', 'Kod muddati tugagan')
    if (c.code !== code.trim()) throw new MockError(401, 'otp_invalid', 'Kod noto‘g‘ri')
    otps.delete(challengeId)
    const p = db().patients.find((x) => x.phone === c.phone)!
    p.portal.linked = true
    const s: PatientSession = { actor: 'patient', patientId: p.id, phone: p.phone, fullName: p.fullName, accessToken: token('ptok'), expiresAt: expires(24 * 30) }
    const st = load(); st.patient[s.accessToken] = p.id; persist(st)
    return s
  },
  async patientMe(token) {
    await latency(120)
    const pid = load().patient[token]
    const p = pid ? db().patients.find((x) => x.id === pid) : undefined
    if (!p) throw new MockError(401, 'auth_error', 'Sessiya tugagan')
    return { actor: 'patient', patientId: p.id, phone: p.phone, fullName: p.fullName, accessToken: token, expiresAt: expires(24 * 30) }
  },
  async logout(token) {
    const st = load(); delete st.staff[token]; delete st.patient[token]; persist(st)
  },
}
