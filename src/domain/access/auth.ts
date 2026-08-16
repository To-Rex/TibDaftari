import type { Id, IsoDateTime } from '../common'
import type { Permission } from './permissions'

export type Actor = 'staff' | 'patient'

/** Session for a staff member (superadmin / admin / employee). */
export interface StaffSession {
  actor: 'staff'
  employeeId: Id
  companyId: Id
  branchId: Id | null // null = company-wide (admin) — UI asks to pick a branch when needed
  isSuperAdmin: boolean
  roleKey: string
  fullName: string
  permissions: Permission[]
  accessToken: string
  expiresAt: IsoDateTime
}

/** Session for a patient logged in via phone + OTP (or later Google/Apple). */
export interface PatientSession {
  actor: 'patient'
  patientId: Id
  phone: string
  fullName: string
  accessToken: string
  expiresAt: IsoDateTime
}

export type Session = StaffSession | PatientSession

export interface StaffLoginInput {
  login: string
  password: string
}

export interface PatientOtpRequestInput {
  phone: string
}

export interface PatientOtpVerifyInput {
  phone: string
  code: string
  challengeId: string
}

export type OAuthProvider = 'google' | 'apple'
