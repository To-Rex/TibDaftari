import { AlignLeft, Circle, Image as ImageIcon, Minus, Square, Table2, Variable, type LucideIcon } from 'lucide-react'
import type { ElementType, TemplateElement, TextStyle } from '@/domain'
import { defaultTextStyle } from '@/domain'

export const ELEMENT_TYPES: ElementType[] = ['text', 'field', 'table', 'rect', 'ellipse', 'line', 'image']
export const ELEMENT_ICONS: Record<ElementType, LucideIcon> = { text: AlignLeft, field: Variable, table: Table2, rect: Square, ellipse: Circle, line: Minus, image: ImageIcon }

let seq = 0
export const newElementId = () => `el_${Date.now().toString(36)}${(seq++).toString(36)}`

const INK = '#14201d'
const MUTED = '#5c6b66'
const LINE = '#c3cec9'

export function createElement(type: ElementType, x: number, y: number, extra: Partial<TemplateElement> = {}): TemplateElement {
  const id = newElementId()
  const base = { id, x, y, rotation: 0, opacity: 1 }
  switch (type) {
    case 'text': return { ...base, type: 'text', w: 220, h: 24, text: 'Matn', style: defaultTextStyle(), ...extra } as TemplateElement
    case 'field': return { ...base, type: 'field', w: 320, h: 22, fieldKey: '', showLabel: true, showUnit: true, showReference: true, highlightAbnormal: true, style: defaultTextStyle({ fontSize: 12 }), ...extra } as TemplateElement
    case 'rect': return { ...base, type: 'rect', w: 160, h: 80, fill: '#f5f7f6', stroke: LINE, strokeWidth: 1, radius: 6, ...extra } as TemplateElement
    case 'ellipse': return { ...base, type: 'ellipse', w: 100, h: 100, fill: 'transparent', stroke: LINE, strokeWidth: 1, ...extra } as TemplateElement
    case 'line': return { ...base, type: 'line', w: 300, h: 2, stroke: LINE, strokeWidth: 1, orientation: 'horizontal', ...extra } as TemplateElement
    case 'image': return { ...base, type: 'image', w: 120, h: 120, fit: 'contain', ...extra } as TemplateElement
    case 'table':
      return {
        ...base, type: 'table', w: 500, h: 160, fieldKey: '', columns: [
          { id: `${id}_c1`, header: 'Ko‘rsatkich', bind: '', width: 200, align: 'left' },
          { id: `${id}_c2`, header: 'Natija', bind: '', width: 100, align: 'center' },
          { id: `${id}_c3`, header: 'Norma', bind: '', width: 120, align: 'center' },
        ],
        headerStyle: defaultTextStyle({ fontSize: 10, fontWeight: 600, color: MUTED }), cellStyle: defaultTextStyle({ fontSize: 10.5, color: INK }),
        rowHeight: 22, borderColor: LINE, borderWidth: 1, showHeader: true, showRowNumber: false, highlightAbnormal: true, ...extra,
      } as TemplateElement
  }
}

export const hasTextStyle = (e: TemplateElement): e is Extract<TemplateElement, { style: TextStyle }> => e.type === 'text' || e.type === 'field'

export const elementLabel = (e: TemplateElement): string => {
  if (e.name) return e.name
  switch (e.type) {
    case 'text': return e.text.replace(/\s+/g, ' ').slice(0, 28) || 'Text'
    case 'field': return e.fieldKey ? `{values.${e.fieldKey}}` : 'Field'
    case 'table': return e.fieldKey ? `Table: ${e.fieldKey}` : 'Table'
    default: return e.type
  }
}
