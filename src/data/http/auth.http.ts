/**
 * HTTP AuthRepository — TibDaftari `/auth/*` endpoints.
 * Tokens are passed explicitly (`token` override) so `staffMe`/`patientMe`/`logout`
 * work before the auth store has persisted anything.
 */
import type { PatientSession, StaffSession } from '@/domain'
import type { AuthRepository } from '../repositories'
import { api, ApiError } from './client'

interface OtpRequestOut {
  challengeId: string
  devCode?: string | null
  expiresIn: number
}

export const authHttp: AuthRepository = {
  staffLogin: (input) => api.post<StaffSession>('/auth/staff/login', input, { actor: 'none' }),

  staffMe: (token) => api.get<StaffSession>('/auth/staff/me', { actor: 'staff', token }),

  requestPatientOtp: async (input) => {
    const out = await api.post<OtpRequestOut>('/auth/patient/otp/request', input, { actor: 'none' })
    return { challengeId: out.challengeId, devCode: out.devCode ?? undefined }
  },

  verifyPatientOtp: (input) => api.post<PatientSession>('/auth/patient/otp/verify', input, { actor: 'none' }),

  patientMe: (token) => api.get<PatientSession>('/auth/patient/me', { actor: 'patient', token }),

  /** Revoke the token server-side; an already-invalid token (401) is treated as logged out. */
  logout: async (token) => {
    try {
      await api.post<{ ok: boolean }>('/auth/logout', undefined, { actor: 'none', token })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return
      throw e
    }
  },
}
