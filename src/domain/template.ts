import type { AuditStamp, Id } from './common'

/* ------------------------------------------------------------------
   Result-document template ("andoza"). Absolute layout in CSS px at
   96 dpi. A4 portrait = 794 × 1123. Elements are z-ordered by index.
   Bindings use `{path}` placeholders resolved against a render context:
     {patient.fullName} {order.number} {item.serviceName} {employee.doctor}
     {values.<fieldKey>} {company.name} {branch.name} {today}
   Tables bind to a `table` field key or to a static column set.
------------------------------------------------------------------- */

export type PaperSize = 'A4' | 'A5' | 'Letter'
export type Orientation = 'portrait' | 'landscape'

export const PAPER_PX: Record<PaperSize, { w: number; h: number }> = {
  A4: { w: 794, h: 1123 },
  A5: { w: 559, h: 794 },
  Letter: { w: 816, h: 1056 },
}

export interface ElementBase {
  id: string
  type: ElementType
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  opacity?: number
  locked?: boolean
  hidden?: boolean
  name?: string
  /** repeat this element for each row of a table field; y advances by `step` */
  repeat?: { fieldKey: string; step: number }
  /** render only if expression resolves to non-empty */
  showIf?: string
}

export type ElementType = 'text' | 'rect' | 'line' | 'image' | 'ellipse' | 'table' | 'field'

export interface TextStyle {
  fontFamily: 'sans' | 'serif' | 'mono'
  fontSize: number
  fontWeight: 400 | 500 | 600 | 700
  italic?: boolean
  underline?: boolean
  color: string
  align: 'left' | 'center' | 'right' | 'justify'
  vAlign?: 'top' | 'middle' | 'bottom'
  lineHeight?: number
  letterSpacing?: number
  background?: string
}

export interface TextElement extends ElementBase {
  type: 'text'
  text: string // may contain {placeholders}
  style: TextStyle
  padding?: number
}

/** A bound field value with automatic label/unit/reference rendering. */
export interface FieldElement extends ElementBase {
  type: 'field'
  fieldKey: string
  showLabel: boolean
  showUnit: boolean
  showReference: boolean
  highlightAbnormal: boolean
  style: TextStyle
}

export interface RectElement extends ElementBase {
  type: 'rect' | 'ellipse'
  fill?: string
  stroke?: string
  strokeWidth?: number
  radius?: number
}

export interface LineElement extends ElementBase {
  type: 'line'
  stroke: string
  strokeWidth: number
  orientation: 'horizontal' | 'vertical'
  dashed?: boolean
}

export interface ImageElement extends ElementBase {
  type: 'image'
  /** asset id (logo/stamp/signature) resolved at render time, or data URI for ad-hoc images */
  assetId?: string
  src?: string
  fit: 'contain' | 'cover' | 'fill'
}

export interface TableColumn {
  id: string
  header: string
  /** bind to a column key of the table field, or a template expression for static tables */
  bind: string
  width: number // px; auto-normalised to element width
  align: 'left' | 'center' | 'right'
}

export interface TableElement extends ElementBase {
  type: 'table'
  /** table field key from schema; empty string = static rows */
  fieldKey: string
  columns: TableColumn[]
  staticRows?: string[][]
  headerStyle: TextStyle
  cellStyle: TextStyle
  rowHeight: number
  borderColor: string
  borderWidth: number
  zebra?: string
  showHeader: boolean
  showRowNumber: boolean
  highlightAbnormal: boolean
}

export type TemplateElement =
  | TextElement
  | FieldElement
  | RectElement
  | LineElement
  | ImageElement
  | TableElement

export interface TemplateDoc {
  paper: PaperSize
  orientation: Orientation
  background: string
  margin: number
  elements: TemplateElement[]
}

export type TemplateStatus = 'draft' | 'active' | 'archived'

export interface ResultTemplate extends AuditStamp {
  id: Id
  companyId: Id
  name: string
  description?: string
  status: TemplateStatus
  version: number
  /** service types this template can render (N:N). Empty = generic. */
  serviceTypeIds: Id[]
  categoryIds: Id[]
  scope: 'item' | 'order'
  language: 'uz' | 'ru' | 'en'
  doc: TemplateDoc
  thumbnailUrl?: string
  usage: number
}

export interface TemplateAsset {
  id: Id
  companyId: Id
  kind: 'logo' | 'stamp' | 'signature' | 'image'
  name: string
  url: string // data URI in mock
  width: number
  height: number
  employeeId?: Id // signature belongs to a doctor
}

/* ---------------------------- Helpers ---------------------------- */

export const paperSize = (doc: Pick<TemplateDoc, 'paper' | 'orientation'>) => {
  const p = PAPER_PX[doc.paper]
  return doc.orientation === 'portrait' ? { w: p.w, h: p.h } : { w: p.h, h: p.w }
}

export const defaultTextStyle = (over: Partial<TextStyle> = {}): TextStyle => ({
  fontFamily: 'sans',
  fontSize: 13,
  fontWeight: 400,
  color: '#14201d',
  align: 'left',
  vAlign: 'top',
  lineHeight: 1.35,
  ...over,
})

export const emptyDoc = (): TemplateDoc => ({
  paper: 'A4',
  orientation: 'portrait',
  background: '#ffffff',
  margin: 40,
  elements: [],
})

/** Placeholder catalogue offered by the editor. Kept in domain so backend can mirror it. */
export const STANDARD_PLACEHOLDERS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: 'patient',
    items: [
      { key: 'patient.fullName', label: 'F.I.Sh.' },
      { key: 'patient.phone', label: 'Telefon' },
      { key: 'patient.birthDate', label: 'Tug‘ilgan sana' },
      { key: 'patient.age', label: 'Yosh' },
      { key: 'patient.gender', label: 'Jins' },
      { key: 'patient.address', label: 'Manzil' },
      { key: 'patient.passportNumber', label: 'Passport' },
    ],
  },
  {
    group: 'order',
    items: [
      { key: 'order.number', label: 'Chek raqami' },
      { key: 'order.date', label: 'Chek sanasi' },
      { key: 'item.serviceName', label: 'Xizmat nomi' },
      { key: 'item.approvedAt', label: 'Tasdiqlangan sana' },
      { key: 'item.technician', label: 'Laborant' },
      { key: 'item.doctor', label: 'Vrach' },
      { key: 'item.labNote', label: 'Izoh' },
    ],
  },
  {
    group: 'organisation',
    items: [
      { key: 'company.name', label: 'Tashkilot' },
      { key: 'company.phone', label: 'Tashkilot telefoni' },
      { key: 'company.address', label: 'Tashkilot manzili' },
      { key: 'branch.name', label: 'Filial' },
      { key: 'branch.address', label: 'Filial manzili' },
      { key: 'category.name', label: 'Bo‘lim (kategoriya)' },
      { key: 'category.phone', label: 'Bo‘lim telefoni' },
      { key: 'today', label: 'Bugungi sana' },
    ],
  },
]

/** Reserved dataset key for order-scoped tables (one row per order item). */
export const ITEMS_DATASET = 'items'
export const ITEMS_DATASET_COLUMNS = [
  { key: 'i', label: '№' },
  { key: 'code', label: 'Kod' },
  { key: 'name', label: 'Xizmat' },
  { key: 'status', label: 'Holat' },
] as const
