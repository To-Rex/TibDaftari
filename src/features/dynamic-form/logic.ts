/** Pure helpers for the dynamic form: visibility, validation, flags. */
import type { AttributeSchema, FieldDef, FieldValue, NumberField, SelectField, ValueMap } from '@/domain'
import { evaluateNumber } from '@/domain'
import i18n from '@/shared/i18n'
import type { Flag, PatientCtx } from './types'

export const isEmptyValue = (v: unknown): boolean =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0)

export const isFieldVisible = (field: FieldDef, values: ValueMap): boolean =>
  !field.visibleIf || values[field.visibleIf.key] === field.visibleIf.equals

export const sortedFields = (schema: AttributeSchema): FieldDef[] =>
  [...schema.fields].sort((a, b) => a.order - b.order)

/** Flag for a number value using patient context. */
export function numberFlag(field: NumberField, value: unknown, patient?: PatientCtx): Flag {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'unknown'
  const r = evaluateNumber(field, value, { gender: patient?.gender, ageMonths: patient?.ageMonths })
  return r === 'normal' ? 'normal' : r === 'unknown' ? 'unknown' : 'abnormal'
}

/** Flag for a select value (option.flag). */
export function selectFlag(field: SelectField, value: unknown): Flag {
  if (typeof value !== 'string' || !value) return 'unknown'
  return field.options.find((o) => o.value === value)?.flag ?? 'unknown'
}

export function fieldValueFlag(field: FieldDef, value: FieldValue | undefined, patient?: PatientCtx): Flag {
  if (field.type === 'number') return numberFlag(field, value, patient)
  if (field.type === 'select') return selectFlag(field, value)
  return 'unknown'
}

/** Reference text for the patient (gender + age aware, unlike domain.referenceText). */
export function referenceFor(field: NumberField, patient?: PatientCtx): string {
  const ref =
    field.references.find((r) => {
      if (r.gender && patient?.gender && r.gender !== patient.gender) return false
      if (r.ageFromMonths != null && patient?.ageMonths != null && patient.ageMonths < r.ageFromMonths) return false
      if (r.ageToMonths != null && patient?.ageMonths != null && patient.ageMonths > r.ageToMonths) return false
      return true
    }) ?? field.references[0]
  if (!ref) return ''
  if (ref.text) return ref.text
  if (ref.min != null && ref.max != null) return `${ref.min} – ${ref.max}`
  if (ref.min != null) return `≥ ${ref.min}`
  if (ref.max != null) return `≤ ${ref.max}`
  return ''
}

export const formatNumber = (v: number, decimals?: number): string =>
  decimals != null ? v.toFixed(decimals).replace(/\.?0+$/, (m) => (m.startsWith('.') ? '' : m)) : String(v)

/**
 * Validate values against schema: required (visible fields only), number min/max,
 * table minRows and required table columns. Returns key → message.
 */
export function validateValues(schema: AttributeSchema, values: ValueMap): Record<string, string> {
  const errors: Record<string, string> = {}
  const t = (k: string, o?: Record<string, unknown>) => i18n.t(`clinical.form.${k}`, o)
  for (const f of schema.fields) {
    if (!isFieldVisible(f, values)) continue
    const v = values[f.key]
    if (f.required && isEmptyValue(v)) {
      errors[f.key] = t('required')
      continue
    }
    if (f.type === 'number' && typeof v === 'number') {
      if (f.min != null && v < f.min) errors[f.key] = t('min', { min: f.min })
      else if (f.max != null && v > f.max) errors[f.key] = t('max', { max: f.max })
    }
    if (f.type === 'table') {
      const rows = Array.isArray(v) ? (v as Record<string, unknown>[]) : []
      if (f.minRows != null && rows.length < f.minRows) {
        errors[f.key] = t('minRows', { n: f.minRows })
        continue
      }
      const reqCols = f.columns.filter((c) => c.required)
      const bad = rows.findIndex((r) => reqCols.some((c) => isEmptyValue(r[c.key])))
      if (bad >= 0 && rows.length > 0) errors[f.key] = t('rowIncomplete', { n: bad + 1 })
    }
  }
  return errors
}

export const flagTone = (flag: Flag): 'ok' | 'warn' | 'danger' | 'neutral' =>
  flag === 'normal' ? 'ok' : flag === 'abnormal' ? 'warn' : flag === 'critical' ? 'danger' : 'neutral'
