/**
 * The organisation tree — Davlat → Viloyat → Tuman/Shahar → Muassasa(lar).
 * There is no company and no branch: one `OrgUnit` type for every level. A facility (`level: 'facility'`) is
 * where cheques are written; the levels above group facilities and carry settings, SMS accounts and texts that
 * are inherited downwards (the nearest level wins). Wire contract: TibDaftari-Backend `app/modules/units`.
 */
import type { AuditStamp, Id, Locale } from './common'
import type { PermissionOverrides } from './access/permissions'

export type UnitLevel = 'country' | 'region' | 'district' | 'facility'
export const UNIT_LEVELS: UnitLevel[] = ['country', 'region', 'district', 'facility']
export const CHILD_LEVEL: Record<UnitLevel, UnitLevel | null> = { country: 'region', region: 'district', district: 'facility', facility: null }

export type FacilityKind = 'ses' | 'clinic' | 'laboratory' | 'polyclinic' | 'hospital' | 'pharmacy' | 'other'
export const FACILITY_KINDS: FacilityKind[] = ['ses', 'clinic', 'laboratory', 'polyclinic', 'hospital', 'pharmacy', 'other']

export type SmsProvider = 'xabarchi' | 'none'
export type SmsPriority = 'urgent' | 'transactional' | 'bulk'
/** inherited = no account of its own (an ancestor's is used) · own = its own Xabarchi key · off = no SMS here and below */
export type UnitSmsMode = 'inherited' | 'own' | 'off'

export type SmsTemplateKind = 'payment_receipt' | 'result_ready' | 'reminder'
export type SmsTemplateOverrides = Partial<Record<SmsTemplateKind, string>>

export interface UnitCounts {
  regions: number
  districts: number
  facilities: number
  employees: number
}

/** Effective settings of a unit (inherited + own) and the raw overrides saved on it. */
export interface UnitSettings {
  /** days after a result is issued during which its SMS link opens the PDF without an SMS code; 0 = always a code */
  documentFreeViewDays: number
  locale?: Locale | null
  own: Record<string, unknown>
}

/** A unit's SMS account as the settings page shows it. */
export interface UnitSms {
  mode: UnitSmsMode
  /** what really sends this unit's SMS: a Xabarchi key somewhere up the tree, or none */
  provider: SmsProvider
  apiKeyMasked?: string | null
  defaultPriority: SmsPriority
  senderNote?: string | null
  /** the unit whose account is in effect (itself or an ancestor); null = nothing configured */
  effectiveUnitId?: string | null
  effectiveUnitName?: string | null
}
export interface UnitSmsInput {
  mode: UnitSmsMode
  /** write-only plaintext; omitted = keep the saved key */
  apiKey?: string
  defaultPriority?: SmsPriority
  senderNote?: string
}

export interface UnitTelegram {
  botUsername: string | null
  connected: boolean
  /** the bot account sits on this very unit (else inherited / the platform bot) */
  own: boolean
  effectiveUnitId?: string | null
}

/** A unit's SMS texts: the effective ones, its own, and whether it still inherits. */
export interface UnitSmsTemplates {
  unitId: Id
  templates: SmsTemplateOverrides
  own: SmsTemplateOverrides
  inherited: boolean
  /** how many units a save changed (1, or the whole subtree with `applyToAll`) */
  applied?: number
}

export interface OrgUnit extends AuditStamp {
  id: Id
  level: UnitLevel
  /** facilities only */
  kind?: FacilityKind | null
  parentId: Id | null
  countryId: Id
  regionId: Id | null
  districtId: Id | null
  countryName?: string | null
  regionName?: string | null
  districtName?: string | null
  name: string
  shortName?: string | null
  /** facilities: the cheque prefix (UR-000123) */
  code?: string | null
  legalName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  timezone: string
  logoUrl?: string | null
  isActive: boolean
  sortOrder: number
  /** 0 = country node */
  depth: number
  /** "O‘zbekiston Respublikasi › Xorazm viloyati › Bog‘ot tumani › Bog‘ot tumani SES" */
  path: string
  settings: UnitSettings
  /** present on the full card (`GET /units/{id}`), absent in the tree */
  sms?: UnitSms | null
  telegram?: UnitTelegram | null
  counts: UnitCounts
}

/** A child of `parentId` (its level follows from the parent); without a parent a country node (platform only). */
export interface UnitCreateInput {
  parentId?: Id | null
  countryId?: Id
  regionId?: Id
  districtId?: Id
  kind?: FacilityKind
  name: string
  shortName?: string
  code?: string
  legalName?: string
  phone?: string
  email?: string
  address?: string
  timezone?: string
  isActive?: boolean
  sortOrder?: number
}

export interface UnitUpdateInput {
  name?: string
  shortName?: string | null
  code?: string
  kind?: FacilityKind
  legalName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  timezone?: string
  isActive?: boolean
  sortOrder?: number
  logoUrl?: string | null
  documentFreeViewDays?: number
  locale?: Locale | null
}

export interface UnitTreeQuery {
  countryId?: Id
  /** only this unit and its subtree */
  rootId?: Id
  includeInactive?: boolean
}

export interface SmsTestResult {
  ok: boolean
  providerMessageId?: string
  to?: string
}

/** Superadmin reset ("like newborn") of a unit and everything under it. */
export interface ResetPreview {
  id: string
  name: string
  level: UnitLevel
  /** what to type to confirm: the facility code, else the unit name */
  confirmWord: string
  parts: { key: string; counts: Record<string, number>; requires: string[] }[]
}
export interface ResetResult { parts: string[]; counts: Record<string, number> }

export type EmployeeStatus = 'active' | 'inactive'

export interface Employee extends AuditStamp {
  id: Id
  /** home unit (any level); null for a superadmin */
  unitId: Id | null
  /** extra units the employee also works in */
  unitIds: Id[]
  unitName?: string | null
  unitLevel?: UnitLevel | null
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
  isSuperAdmin?: boolean
  lastLoginAt?: string
}

/* ---------------------------- tree helpers (pure) ---------------------------- */

export interface UnitNode extends OrgUnit { children: UnitNode[] }

/** Flat units (any order) → roots with nested children, siblings ordered by sortOrder then name. */
export function buildUnitTree(units: OrgUnit[]): UnitNode[] {
  const nodes = new Map<Id, UnitNode>(units.map((u) => [u.id, { ...u, children: [] }]))
  const roots: UnitNode[] = []
  for (const n of nodes.values()) {
    const parent = n.parentId ? nodes.get(n.parentId) : undefined
    if (parent) parent.children.push(n)
    else roots.push(n)
  }
  const sort = (xs: UnitNode[]) => { xs.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)); xs.forEach((x) => sort(x.children)) }
  sort(roots)
  return roots
}

/** The tree flattened depth-first (parents before children) — what a switcher or a select renders. */
export function flattenUnitTree(roots: UnitNode[]): UnitNode[] {
  const out: UnitNode[] = []
  const walk = (n: UnitNode) => { out.push(n); n.children.forEach(walk) }
  roots.forEach(walk)
  return out
}

/** `rootId` and everything under it, from a flat unit list. */
export function unitsUnder(units: OrgUnit[], rootId: Id): OrgUnit[] {
  const byParent = new Map<Id | null, OrgUnit[]>()
  for (const u of units) {
    const list = byParent.get(u.parentId) ?? []
    list.push(u)
    byParent.set(u.parentId, list)
  }
  const out: OrgUnit[] = []
  const root = units.find((u) => u.id === rootId)
  if (!root) return out
  const walk = (u: OrgUnit) => { out.push(u); (byParent.get(u.id) ?? []).forEach(walk) }
  walk(root)
  return out
}

/** Active facilities under `rootId` (the root itself when it is one), tree order. */
export const facilitiesUnder = (units: OrgUnit[], rootId: Id): OrgUnit[] =>
  flattenUnitTree(buildUnitTree(unitsUnder(units, rootId))).filter((u) => u.level === 'facility' && u.isActive)

/** Root → … → the unit, from a flat list (missing ancestors are skipped). */
export function unitAncestors(units: OrgUnit[], id: Id): OrgUnit[] {
  const byId = new Map(units.map((u) => [u.id, u]))
  const chain: OrgUnit[] = []
  let cur = byId.get(id)
  while (cur) { chain.unshift(cur); cur = cur.parentId ? byId.get(cur.parentId) : undefined }
  return chain
}

export const isFacility = (u: Pick<OrgUnit, 'level'> | null | undefined): boolean => u?.level === 'facility'
