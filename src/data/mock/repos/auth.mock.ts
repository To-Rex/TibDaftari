import type { AuthRepository } from '../../repositories'
import type { PatientSession, StaffSession } from '@/domain'
import { resolvePermissions } from '@/domain'
import { db } from '../db'
import { latency, MockError, uid } from '../util'

const staffTokens = new Map<string, StaffSession>()
const patientTokens = new Map<string, PatientSession>()
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
    permissions: perms, accessToken: uid('tok'), expiresAt: expires(12),
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
    staffTokens.set(s.accessToken, s)
    return s
  },
  async staffMe(token) {
    await latency(120)
    const s = staffTokens.get(token)
    if (!s) throw new MockError(401, 'auth_error', 'Sessiya tugagan')
    // refresh permissions from DB — role changes apply immediately
    const fresh = buildStaffSession(s.employeeId)
    const merged = { ...fresh, accessToken: token, branchId: s.branchId }
    staffTokens.set(token, merged)
    return merged
  },
  async requestPatientOtp({ phone }) {
    await latency(600)
    const digits = phone.replace(/\D/g, '')
    const norm = digits.length === 9 ? `998${digits}` : digits
    if (!/^998\d{9}$/.test(norm)) throw new MockError(422, 'invalid_phone', 'Telefon raqam noto‘g‘ri')
    const p = db().patients.find((x) => x.phone === norm)
    if (!p) throw new MockError(404, 'not_found', 'Bu raqam bilan bemor topilmadi. Klinikaga murojaat qiling.')
    const challengeId = uid('otp')
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
    const s: PatientSession = { actor: 'patient', patientId: p.id, phone: p.phone, fullName: p.fullName, accessToken: uid('ptok'), expiresAt: expires(24 * 30) }
    patientTokens.set(s.accessToken, s)
    return s
  },
  async patientMe(token) {
    await latency(120)
    const s = patientTokens.get(token)
    if (!s) throw new MockError(401, 'auth_error', 'Sessiya tugagan')
    return s
  },
  async logout(token) {
    staffTokens.delete(token)
    patientTokens.delete(token)
  },
}
