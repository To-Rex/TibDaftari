import type { Id, IsoDateTime } from '../common'
import type { Permission } from './permissions'

export type Actor = 'staff' | 'patient'

/** Session for a staff member (superadmin / admin / employee). */
export interface StaffSession {
  actor: 'staff'
  employeeId: Id
  companyId: Id
  branchId: Id | null // null = company-wide (admin) — UI asks to pick a branch when needed
  /** branches the employee is assigned to; only superadmin/admin may work outside them */
  branchIds: Id[]
  isSuperAdmin: boolean
  roleKey: string
  fullName: string
  permissions: Permission[]
  accessToken: string
  expiresAt: IsoDateTime
}

/** Session for a patient logged in via phone + OTP, or with the portal login + password issued at reception. */
export interface PatientSession {
  actor: 'patient'
  patientId: Id
  phone: string
  fullName: string
  accessToken: string
  expiresAt: IsoDateTime
  /** otp = phone + SMS code (sees every patient of the phone); login = portal login (this patient only). Absent on old cached sessions = otp. */
  via?: 'otp' | 'login'
  login?: string | null
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

export interface PatientPasswordLoginInput {
  login: string
  password: string
}

export interface PatientPasswordChangeInput {
  currentPassword: string
  newPassword: string
}

export type OAuthProvider = 'google' | 'apple'
