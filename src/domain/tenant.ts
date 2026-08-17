import type { AuditStamp, Id, Locale } from './common'
import type { PermissionOverrides } from './access/permissions'

export interface Company extends AuditStamp {
  id: Id
  name: string
  legalName?: string
  slug: string
  logoUrl?: string
  phone?: string
  email?: string
  address?: string
  locale: Locale
  isActive: boolean
  /** Per-company SMS provider — each clinic owns its Xabarchi account. */
  sms: {
    provider: 'xabarchi' | 'none'
    apiKeyMasked?: string // 'xab_live_••••1234' — plaintext never leaves the backend
    /** Write-only: plaintext key sent by the settings form when the user typed one; never returned. */
    apiKey?: string
    defaultPriority: 'urgent' | 'transactional' | 'bulk'
    senderNote?: string
  }
  branchCount: number
  employeeCount: number
}

export interface Branch extends AuditStamp {
  id: Id
  companyId: Id
  name: string
  code: string // used in cheque numbers e.g. UR-000123
  address?: string
  phone?: string
  timezone: string
  isActive: boolean
  /** Sequence for human-readable order numbers, per branch. */
  orderSeq: number
}

export type EmployeeStatus = 'active' | 'inactive'

export interface Employee extends AuditStamp {
  id: Id
  companyId: Id
  branchIds: Id[] // employee may serve several branches
  fullName: string
  login: string
  phone?: string
  email?: string
  roleId: Id
  overrides: PermissionOverrides
  /** Optional restriction to catalog categories (e.g. a lab technician of Bacteriology). */
  categoryIds: Id[]
  status: EmployeeStatus
  avatarHue: number // 0..360 — deterministic avatar colour
  lastLoginAt?: string
}
