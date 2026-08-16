/**
 * Pure template rendering helpers shared by the editor preview, the patient
 * portal preview and (later) the backend PDF renderer contract.
 * No React here.
 */
import type { AttributeSchema, FieldDef, NumberField, ValueMap } from './catalog'
import { evaluateNumber, referenceText } from './catalog'

/** One order item inside an order-scoped document (e.g. hepatitis panel = several services on one sheet). */
export interface RenderItem {
  /** service code (catalog `ServiceType.code`, e.g. LG-85) — the stable key templates bind to via {svc.CODE.field} */
  code: string
  serviceTypeId: string
  serviceName: string
  status: string
  values: ValueMap
  schema: AttributeSchema | null
  approvedAt?: string
  technician?: string
  doctor?: string
}

export interface RenderContext {
  /** present for order-scoped documents; templates use {svc.<code>.<field>} and the `items` table dataset */
  items?: RenderItem[]
  patient: {
    fullName: string
    phone: string
    birthDate?: string
    age?: string
    gender?: string
    address?: string
    passportNumber?: string
    genderRaw?: 'male' | 'female'
    ageMonths?: number
  }
  order: { number: string; date: string }
  item: {
    serviceName: string
    approvedAt?: string
    technician?: string
    doctor?: string
    labNote?: string
  }
  company: { name: string; phone?: string; address?: string }
  branch: { name: string; address?: string }
  /** department (category) of the service — its phone is printed in SES letterheads */
  category: { name: string; phone?: string }
  today: string
  values: ValueMap
  schema: AttributeSchema | null
}

const PLACEHOLDER = /\{([a-zA-Z0-9_.\-]+)\}/g

export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k]
    return undefined
  }, obj)
}

/** Replace {a.b} placeholders. Unknown → empty string. Arrays joined with ", ". */
export function interpolate(text: string, ctx: RenderContext, row?: Record<string, unknown>): string {
  return text.replace(PLACEHOLDER, (_, path: string) => {
    if (row && path === 'i') return fmt(row.__i)
    if (row && path.startsWith('row.')) return fmt(row[path.slice(4)])
    if (path.startsWith('values.')) return fmt(formatValue(ctx, path.slice(7)))
    if (path.startsWith('svc.')) return fmt(serviceValue(ctx, path.slice(4)))
    return fmt(getPath(ctx, path))
  })
}

function fmt(v: unknown): string {
  if (v == null) return ''
  if (Array.isArray(v)) return v.map(fmt).join(', ')
  if (typeof v === 'boolean') return v ? '✓' : '—'
  return String(v)
}

export function fieldDef(schema: AttributeSchema | null, key: string): FieldDef | undefined {
  return schema?.fields.find((f) => f.key === key)
}

/** Human-readable value: select → option label, boolean → labels, number → with decimals. */
export function formatValue(ctx: RenderContext, key: string): string {
  const raw = ctx.values[key]
  const def = fieldDef(ctx.schema, key)
  if (raw == null || raw === '') return ''
  if (!def) return fmt(raw)
  switch (def.type) {
    case 'select':
      return def.options.find((o) => o.value === raw)?.label ?? String(raw)
    case 'multiselect':
      return (raw as string[]).map((v) => def.options.find((o) => o.value === v)?.label ?? v).join(', ')
    case 'boolean':
      return raw ? (def.trueLabel ?? 'Ha') : (def.falseLabel ?? 'Yo‘q')
    case 'number':
      return typeof raw === 'number' ? raw.toFixed(def.decimals ?? 0).replace(/\.0+$/, '') : String(raw)
    default:
      return fmt(raw)
  }
}

export function fieldFlag(
  ctx: RenderContext,
  key: string,
): 'normal' | 'abnormal' | 'critical' | 'unknown' {
  const def = fieldDef(ctx.schema, key)
  const raw = ctx.values[key]
  if (!def || raw == null || raw === '') return 'unknown'
  if (def.type === 'number' && typeof raw === 'number') {
    const r = evaluateNumber(def as NumberField, raw, {
      gender: ctx.patient.genderRaw,
      ageMonths: ctx.patient.ageMonths,
    })
    return r === 'normal' ? 'normal' : r === 'unknown' ? 'unknown' : 'abnormal'
  }
  if (def.type === 'select') {
    const f = def.options.find((o) => o.value === raw)?.flag
    return f ?? 'unknown'
  }
  return 'unknown'
}

export function fieldReference(ctx: RenderContext, key: string): string {
  const def = fieldDef(ctx.schema, key)
  if (!def) return ''
  if (def.type === 'number') return referenceText(def, { gender: ctx.patient.genderRaw })
  return ''
}

export function fieldUnit(ctx: RenderContext, key: string): string {
  return fieldDef(ctx.schema, key)?.unit ?? ''
}

export function tableRows(ctx: RenderContext, fieldKey: string): Record<string, unknown>[] {
  if (fieldKey === 'items') return itemRows(ctx)
  const v = ctx.values[fieldKey]
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : []
}

/* ---------------------------- Order-scoped documents ---------------------------- */

const norm = (s: string) => s.trim().toLowerCase()

/** Find an order item by its service code (case-insensitive). */
export function findItem(ctx: RenderContext, code: string): RenderItem | undefined {
  const c = norm(code)
  return ctx.items?.find((it) => norm(it.code) === c)
}

/**
 * Resolve `svc.<code>.<key>`:
 *   key = name | status | approvedAt | technician | doctor  → item meta
 *   key = <fieldKey>                                         → formatted value from that item's schema
 * Missing item/field → ''.
 */
export function serviceValue(ctx: RenderContext, path: string): string {
  const dot = path.lastIndexOf('.')
  if (dot < 0) return ''
  const code = path.slice(0, dot)
  const key = path.slice(dot + 1)
  const it = findItem(ctx, code)
  if (!it) return ''
  switch (key) {
    case 'name': return it.serviceName
    case 'status': return it.status
    case 'approvedAt': return it.approvedAt ?? ''
    case 'technician': return it.technician ?? ''
    case 'doctor': return it.doctor ?? ''
    default: {
      const sub: RenderContext = { ...ctx, values: it.values, schema: it.schema }
      return formatValue(sub, key)
    }
  }
}

/** Rows for the `items` dataset (table element bound to fieldKey "items"). */
export function itemRows(ctx: RenderContext): Record<string, unknown>[] {
  return (ctx.items ?? []).map((it, i) => {
    const sub: RenderContext = { ...ctx, values: it.values, schema: it.schema }
    const row: Record<string, unknown> = { code: it.code, name: it.serviceName, status: it.status, i: i + 1 }
    for (const f of it.schema?.fields ?? []) if (f.type !== 'table') row[f.key] = formatValue(sub, f.key)
    return row
  })
}
