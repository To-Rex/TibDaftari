import type { AuditStamp, Id, Money } from './common'

/* ------------------------------------------------------------------
   Catalog = Category tree → ServiceType (analysis / disease / service)
   → AttributeSchema (dynamic fields whose values are entered per order
   item and later bound into result templates).
   Every catalogue row is OWNED by a unit of the organisation tree (`ownerUnitId`, any level) and is visible to
   the owner's whole subtree: a national catalogue on the country node, regional additions on a viloyat, a
   facility's own services on the facility.
------------------------------------------------------------------- */

export interface Category extends AuditStamp {
  id: Id
  ownerUnitId: Id
  parentId: Id | null
  name: string
  code?: string
  icon?: string // lucide icon name
  color?: string // hex, purely presentational
  order: number
  isActive: boolean
  /** department phone printed on result documents ({category.phone}); legacy `category.tel_lab` */
  phone?: string
  /** Which workflow this part of the tree follows. New modules add kinds. */
  workflow: WorkflowKind
}

export type WorkflowKind =
  | 'lab' // registration → lab entry → doctor confirm → result document
  | 'consultation' // (next phase) doctor visit with conclusion document
  | 'procedure' // (next phase)
  | 'inpatient' // (next phase)
  | 'pharmacy' // (next phase)

export interface ServiceType extends AuditStamp {
  id: Id
  ownerUnitId: Id
  categoryId: Id
  name: string
  code?: string
  description?: string
  /** base price */
  price: Money
  /** price overrides per unit — apply to that unit and everything under it (nearest level wins) */
  unitPrices: Record<Id, Money>
  /** units where the service is switched off (and everything under them); empty = offered everywhere */
  disabledUnitIds: Id[]
  /** when listed for a unit: the price / availability in effect there */
  effectivePrice?: Money | null
  available?: boolean | null
  turnaroundDays: number
  order: number
  isActive: boolean
  /** Which attribute schema (versioned) captures the result/diagnosis data. */
  schemaId: Id | null
  /** Result document granularity: per order item (default) or per whole order. */
  documentScope: 'item' | 'order'
  /** default template used when several are bound; template bindings live on the template */
  defaultTemplateId: Id | null
  stats?: { ordered30d: number }
}

/** Is the service offered at this unit? Prefers the API's `available`; without a unit (management views) hides nothing. */
export const serviceAvailableIn = (s: Pick<ServiceType, 'disabledUnitIds' | 'available'>, unitId: Id | null | undefined): boolean => {
  if (!unitId) return true
  if (s.available != null) return s.available
  return !(s.disabledUnitIds ?? []).includes(unitId)
}

/** The price in effect for a unit: the API's `effectivePrice`, else the unit's own override, else the base price. */
export const servicePriceIn = (s: Pick<ServiceType, 'price' | 'unitPrices' | 'effectivePrice'>, unitId: Id | null | undefined): Money => {
  if (s.effectivePrice != null) return s.effectivePrice
  if (unitId && s.unitPrices && s.unitPrices[unitId] != null) return s.unitPrices[unitId]
  return s.price
}

/* ---------------------------- Attribute schema ---------------------------- */

export type FieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'date'
  | 'table'

export interface SelectOption {
  value: string
  label: string
  color?: string
  /** marks abnormal / positive answers so UI and templates can highlight them */
  flag?: 'normal' | 'abnormal' | 'critical'
}

/** Reference range depending on gender / age (months). All optional. */
export interface ReferenceRange {
  gender?: 'male' | 'female'
  ageFromMonths?: number
  ageToMonths?: number
  min?: number
  max?: number
  text?: string // free-text norm e.g. "bo'lmasligi kerak"
}

export interface FieldDefBase {
  key: string // stable, snake_case, unique in schema
  label: string
  hint?: string
  type: FieldType
  required: boolean
  order: number
  group?: string // visual grouping in the entry form
  unit?: string
  /** show only when another field has a value */
  visibleIf?: { key: string; equals: string | number | boolean }
}

export interface TextField extends FieldDefBase {
  type: 'text' | 'longtext'
  placeholder?: string
  maxLength?: number
}
export interface NumberField extends FieldDefBase {
  type: 'number'
  decimals?: number
  min?: number
  max?: number
  references: ReferenceRange[]
}
export interface SelectField extends FieldDefBase {
  type: 'select' | 'multiselect'
  options: SelectOption[]
  allowOther?: boolean
}
export interface BooleanField extends FieldDefBase {
  type: 'boolean'
  trueLabel?: string
  falseLabel?: string
}
export interface DateField extends FieldDefBase {
  type: 'date'
}
/** Dynamic table: columns are field defs themselves; rows are added by the user
 *  or pre-seeded (e.g. list of parasites, list of antibiotics). */
export interface TableField extends FieldDefBase {
  type: 'table'
  columns: Exclude<FieldDef, TableField>[]
  presetRows: Record<string, unknown>[] // seeded rows, keyed by column key
  allowAddRows: boolean
  allowRemoveRows: boolean
  minRows?: number
}

export type FieldDef =
  | TextField
  | NumberField
  | SelectField
  | BooleanField
  | DateField
  | TableField

export interface AttributeSchema extends AuditStamp {
  id: Id
  ownerUnitId: Id
  name: string
  description?: string
  version: number
  status: 'draft' | 'published' | 'archived'
  fields: FieldDef[]
  /** service types currently using this schema — denormalised for admin lists */
  usedBy: number
}

/* ---------------------------- Values ---------------------------- */

export type FieldValue = string | number | boolean | string[] | Record<string, unknown>[] | null

export type ValueMap = Record<string, FieldValue>

/** Evaluate abnormality for a number against references. Pure helper. */
export function evaluateNumber(
  field: NumberField,
  value: number,
  ctx: { gender?: 'male' | 'female'; ageMonths?: number },
): 'normal' | 'low' | 'high' | 'unknown' {
  const ref = (field.references ?? []).find((r) => {
    if (r.gender && ctx.gender && r.gender !== ctx.gender) return false
    if (r.ageFromMonths != null && ctx.ageMonths != null && ctx.ageMonths < r.ageFromMonths)
      return false
    if (r.ageToMonths != null && ctx.ageMonths != null && ctx.ageMonths > r.ageToMonths) return false
    return r.min != null || r.max != null
  })
  if (!ref) return 'unknown'
  if (ref.min != null && value < ref.min) return 'low'
  if (ref.max != null && value > ref.max) return 'high'
  return 'normal'
}

export function referenceText(field: NumberField, ctx: { gender?: 'male' | 'female' }): string {
  const ref = (field.references ?? []).find((r) => !r.gender || !ctx.gender || r.gender === ctx.gender)
  if (!ref) return ''
  if (ref.text) return ref.text
  if (ref.min != null && ref.max != null) return `${ref.min} – ${ref.max}`
  if (ref.min != null) return `≥ ${ref.min}`
  if (ref.max != null) return `≤ ${ref.max}`
  return ''
}
