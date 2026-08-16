import type { AttributeSchema, FieldDef, FieldValue, ValueMap } from '@/domain'

/** Patient context used for reference ranges / abnormal evaluation. */
export interface PatientCtx {
  gender?: 'male' | 'female'
  ageMonths?: number
}

export interface DynamicFormProps {
  schema: AttributeSchema
  values: ValueMap
  onChange: (values: ValueMap) => void
  patient?: PatientCtx
  readOnly?: boolean
  errors?: Record<string, string>
  autoFocusFirst?: boolean
  className?: string
}

export interface FieldRendererProps {
  field: FieldDef
  value: FieldValue | undefined
  onChange: (value: FieldValue) => void
  patient?: PatientCtx
  readOnly?: boolean
  error?: string
  /** compact = inside a table cell: no label, tighter controls */
  compact?: boolean
  id?: string
  autoFocus?: boolean
}

export type Flag = 'normal' | 'abnormal' | 'critical' | 'unknown'
