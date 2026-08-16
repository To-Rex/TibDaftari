import { AlignLeft, Calendar, CheckSquare, Hash, List, ListChecks, Table2, Type, type LucideIcon } from 'lucide-react'
import type { FieldDef, FieldType, TableField } from '@/domain'

export const FIELD_TYPES: FieldType[] = ['text', 'longtext', 'number', 'select', 'multiselect', 'boolean', 'date', 'table']
export const COLUMN_TYPES: Exclude<FieldType, 'table'>[] = ['text', 'longtext', 'number', 'select', 'multiselect', 'boolean', 'date']

export const FIELD_TYPE_ICONS: Record<FieldType, LucideIcon> = {
  text: Type, longtext: AlignLeft, number: Hash, select: List, multiselect: ListChecks, boolean: CheckSquare, date: Calendar, table: Table2,
}

/** Latin/Cyrillic-tolerant slug for stable field keys. */
export function slugify(label: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
  }
  return label
    .toLowerCase()
    .replace(/[а-яёўқғҳ]/g, (c) => map[c] ?? c)
    .replace(/[‘’'`ʻ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'field'
}

export function uniqueKey(base: string, taken: string[], self?: string): string {
  if (!taken.includes(base) || base === self) return base
  let i = 2
  while (taken.includes(`${base}_${i}`)) i++
  return `${base}_${i}`
}

/** Create a fresh field of a given type with sensible defaults. */
export function newField(type: FieldType, label: string, key: string, order: number): FieldDef {
  const base = { key, label, required: false, order }
  switch (type) {
    case 'text': return { ...base, type: 'text' }
    case 'longtext': return { ...base, type: 'longtext' }
    case 'number': return { ...base, type: 'number', decimals: 1, references: [] }
    case 'select': return { ...base, type: 'select', options: [] }
    case 'multiselect': return { ...base, type: 'multiselect', options: [] }
    case 'boolean': return { ...base, type: 'boolean' }
    case 'date': return { ...base, type: 'date' }
    case 'table': return { ...base, type: 'table', columns: [], presetRows: [], allowAddRows: true, allowRemoveRows: true }
  }
}

/** Change type: keep base props, reset type-specific ones. */
export function changeFieldType(f: FieldDef, type: FieldType): FieldDef {
  const next = newField(type, f.label, f.key, f.order)
  const carried: Partial<FieldDef> = { hint: f.hint, group: f.group, unit: f.unit, required: f.required, visibleIf: f.visibleIf }
  // text↔longtext and select↔multiselect keep their specifics
  if ((f.type === 'text' || f.type === 'longtext') && (type === 'text' || type === 'longtext')) return { ...f, type } as FieldDef
  if ((f.type === 'select' || f.type === 'multiselect') && (type === 'select' || type === 'multiselect')) return { ...f, type } as FieldDef
  return { ...next, ...carried } as FieldDef
}

export function fieldTypeChanged(a: FieldDef, b: FieldType): boolean {
  const same = (x: FieldType, y: FieldType) => x === y || (['text', 'longtext'].includes(x) && ['text', 'longtext'].includes(y)) || (['select', 'multiselect'].includes(x) && ['select', 'multiselect'].includes(y))
  return !same(a.type, b)
}

export const isTable = (f: FieldDef): f is TableField => f.type === 'table'

export function cloneField(f: FieldDef, taken: string[]): FieldDef {
  const key = uniqueKey(`${f.key}_copy`, taken)
  return { ...structuredClone(f), key, label: `${f.label} (2)` }
}
