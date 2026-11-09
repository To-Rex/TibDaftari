import type { Id, IsoDateTime } from '../common'
import type { UnitLevel } from '../org'
import type { Permission } from './permissions'

export type Actor = 'staff' | 'patient'

/** The employee's home unit as the API returns it with the session (enough for the first paint). */
export interface SessionUnit {
  id: Id
  level: UnitLevel
  name: string
  code?: string | null
  countryId: Id
  /** "O‘zbekiston Respublikasi › Xorazm viloyati › Bog‘ot tumani › Bog‘ot tumani SES" */
  path: string
}

/** Session for a staff member (superadmin / administrator / employee). */
export interface StaffSession {
  actor: 'staff'
  employeeId: Id
  /** home unit (any level of the tree); null for a superadmin, who picks any unit */
  unitId: Id | null
  /** every scope root of the employee (home + extra units): they may work in these subtrees */
  unitIds: Id[]
  unit: SessionUnit | null
  /** the home unit when it is a facility — where this employee's cheques are written */
  facilityId: Id | null
  isSuperAdmin: boolean
  roleKey: string
  /** the held role; the UI locks the editing of one's own role with it */
  roleId: Id | null
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
