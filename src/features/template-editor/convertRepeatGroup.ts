/**
 * Legacy SES blanks draw their tables by hand: vertical/horizontal rule rects, static header texts and
 * a "repeat row" group (`{row.x}` texts + highlight rects repeated every `step` px). Managing rows and
 * columns of such a drawing is painful, so this converts one repeat group into a single real `table`
 * element bound to the same table field — columns, group headers, № column, per-cell highlight fills,
 * borders and text styles are all derived from the drawing. The original elements are removed.
 */
import type { AttributeSchema, RectElement, TableColumn, TableElement, TemplateDoc, TemplateElement, TextElement, TextStyle } from '@/domain'
import { PAPER_PX, TABLE_NUMBER_W, defaultTextStyle } from '@/domain'

/** `{i}` (row number) or `{row.key}` tokens; a row text may combine several ("{i} {row.name}", "{row.name} {row.natija}") */
const TOKEN_RE = /\{i\}|\{row\.([a-zA-Z0-9_-]+)\}/g
const isRowText = (s: string) => /\{/.test(s) && s.replace(TOKEN_RE, '').trim() === ''
/** token list of a row text: null = row number, string = bound column key */
const tokensOf = (s: string): (string | null)[] => [...s.matchAll(TOKEN_RE)].map((m) => m[1] ?? null)

const isThinV = (e: TemplateElement) => (e.type === 'rect' && e.w <= 2 && e.h > 8) || (e.type === 'line' && e.orientation === 'vertical')
const isThinH = (e: TemplateElement) => (e.type === 'rect' && e.h <= 2 && e.w > 8) || (e.type === 'line' && e.orientation === 'horizontal')
const overlapX = (a: { x: number; w: number }, b: { x: number; w: number }) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))

export interface ConvertResult { doc: TemplateDoc; tableId: string }

/**
 * Convert the repeat group containing `elementId` into a table element; returns null if nothing to convert.
 * `schema` (the bound attribute schema, when known) supplies column labels for cells whose blank has no header text.
 */
export function convertRepeatGroupToTable(doc: TemplateDoc, elementId: string, schema?: AttributeSchema | null): ConvertResult | null {
  const els = doc.elements
  const seed = els.find((e) => e.id === elementId)
  if (!seed?.repeat) return null
  const fieldKey = seed.repeat.fieldKey
  const group = els.filter((e) => e.repeat?.fieldKey === fieldKey)
  const rowTexts = group.filter((e): e is TextElement => e.type === 'text' && isRowText(e.text.trim())).sort((a, b) => a.x - b.x)
  const tableField = schema?.fields.find((f) => f.type === 'table' && f.key === fieldKey)
  const labels: Record<string, string> = Object.fromEntries((tableField?.type === 'table' ? tableField.columns : []).map((c) => [c.key, c.label]))
  if (!rowTexts.length) return null
  const step = seed.repeat.step
  const rowTop = Math.min(...rowTexts.map((t) => t.y))
  const rowBottom = rowTop + step
  const rowSpanX = { x: Math.min(...rowTexts.map((t) => t.x)), w: Math.max(...rowTexts.map((t) => t.x + t.w)) - Math.min(...rowTexts.map((t) => t.x)) }

  // --- grid rules that belong to this table: static rules crossing (or ending right above) the first
  // data row, plus the group's own per-row vertical rules (some legacy blanks draw the grid row by row)
  const nearX = (e: TemplateElement) => e.x >= rowSpanX.x - 12 && e.x <= rowSpanX.x + rowSpanX.w + 12
  const staticV = els.filter((e) => !e.repeat && isThinV(e) && nearX(e) && e.y <= rowTop + 2 && e.y + e.h >= rowTop - 4)
  const groupV = group.filter((e) => isThinV(e) && nearX(e))
  const vRules = [...staticV, ...groupV]
  const edges = [...new Set(vRules.map((e) => Math.round(e.x)))].sort((a, b) => a - b)
  const tableX = edges.length >= 2 ? edges[0]! : Math.round(rowSpanX.x - 2)
  const tableRight = edges.length >= 2 ? edges[edges.length - 1]! : Math.round(rowSpanX.x + rowSpanX.w + 2)
  const tableW = Math.max(40, tableRight - tableX)
  const hRules = els.filter((e) => !e.repeat && isThinH(e) && overlapX(e, { x: tableX, w: tableW }) > tableW * 0.5)
  const topRules = hRules.filter((e) => e.y < rowTop).sort((a, b) => a.y - b.y)
  const tableY = topRules.length ? Math.round(topRules[0]!.y) : Math.round(rowTop - step)
  // height: the static grid's extent when it reaches below the first row; an open-ended grid (drawn row by
  // row) ran down the page as far as the rows went, so the table gets the same room — down to the page margin
  const staticBottom = Math.max(0, ...staticV.map((e) => e.y + e.h))
  const bottom = staticBottom > rowBottom + step ? staticBottom : PAPER_PX[doc.paper].h - doc.margin
  const tableH = Math.max(step * 2, Math.round(bottom - tableY))

  // --- column intervals: from rule edges when they exist, else from the texts themselves
  const intervals: { x: number; w: number; text?: TextElement }[] = []
  if (edges.length >= 2) {
    for (let i = 0; i < edges.length - 1; i++) intervals.push({ x: edges[i]!, w: edges[i + 1]! - edges[i]! })
    for (const t of rowTexts) {
      const cx = t.x + Math.min(t.w, 8) // left edge anchor — legacy texts start a couple px inside the cell
      const iv = intervals.find((it) => cx >= it.x - 1 && cx < it.x + it.w) ?? intervals.reduce((best, it) => (overlapX(it, t) > overlapX(best, t) ? it : best), intervals[0]!)
      if (!iv.text) iv.text = t
    }
  } else {
    for (const t of rowTexts) intervals.push({ x: t.x, w: t.w, text: t })
  }
  const withText = intervals.filter((iv) => iv.text)
  if (!withText.length) return null

  // --- header band texts (static, above the first row, inside the table)
  const headerTexts = els.filter((e): e is TextElement => e.type === 'text' && !e.repeat && e.y >= tableY - 2 && e.y + e.h <= rowTop + 4 && overlapX(e, { x: tableX, w: tableW }) > e.w * 0.5)
  const columnsFor = (h: TextElement) => intervals.filter((iv) => overlapX(iv, h) > Math.min(iv.w, h.w) * 0.5)
  const highlightRects = group.filter((e): e is RectElement => e.type === 'rect' && !!e.fill && !!e.showIf)

  let showRowNumber = false
  let numberWidth: number | undefined
  let numberHeader: string | undefined
  const columns: TableColumn[] = []
  const consumedHeaders = new Set<string>()
  // legacy headers are often several stacked one-line texts ("Текширилган" / "микроорганизмлар") — join them
  const ownHeader = (iv: { x: number; w: number }) => {
    const single = headerTexts.filter((h) => { const cs = columnsFor(h); return cs.length === 1 && cs[0] === iv }).sort((a, b) => a.y - b.y)
    single.forEach((h) => consumedHeaders.add(h.id))
    const text = single.map((h) => h.text.trim()).filter(Boolean).join(' ')
    return { text: text || undefined, style: single[0]?.style }
  }
  intervals.forEach((iv, idx) => {
    const t = iv.text
    if (!t) return
    const toks = tokensOf(t.text.trim())
    const binds = toks.filter((k): k is string => k !== null)
    const own = ownHeader(iv)
    const spanning = headerTexts.filter((h) => { const cs = columnsFor(h); return cs.length > 1 && cs.includes(iv) })
    const groupText = spanning.sort((a, b) => a.y - b.y)[0]
    if (groupText) consumedHeaders.add(groupText.id)
    // "{i}" inside a cell ("{i} {row.name}") becomes a narrow № column carved out of that cell
    let numW = 0
    if (toks.includes(null)) {
      showRowNumber = true
      numW = binds.length ? Math.min(TABLE_NUMBER_W, iv.w / 3) : iv.w
      numberWidth = Math.round(numW)
      if (!binds.length) numberHeader = own.text
    }
    if (!binds.length) return
    // several bound tokens in one cell → one column each; the cell's own header (if any) spans them as a group
    const each = (iv.w - numW) / binds.length
    const groupName = binds.length > 1 ? (own.text ?? groupText?.text.trim()) : groupText?.text.trim()
    binds.forEach((bind, k) => {
      const hl = highlightRects.find((r) => overlapX(r, iv) > iv.w * 0.5 && (r.showIf ?? '').includes(`{row.${bind}}`))
      columns.push({
        id: `${seed.id}_col${idx}${binds.length > 1 ? `_${k}` : ''}`,
        header: (binds.length === 1 ? own.text : undefined) ?? labels[bind] ?? bind,
        bind,
        width: Math.round(each),
        align: t.style.align === 'center' ? 'center' : t.style.align === 'right' ? 'right' : 'left',
        ...(groupName ? { group: groupName } : {}),
        ...(hl ? { fillIfSet: hl.fill } : {}),
      })
    })
  })
  if (!columns.length) return null

  const headerStyleSrc = headerTexts.find((h) => consumedHeaders.has(h.id))?.style
  const cellStyleSrc = rowTexts.find((t) => tokensOf(t.text.trim()).some((k) => k !== null))?.style
  const headerStyle: TextStyle = headerStyleSrc ? { ...headerStyleSrc, align: 'center', vAlign: 'middle' } : defaultTextStyle({ fontSize: 11, fontWeight: 600 })
  const cellStyle: TextStyle = cellStyleSrc ? { ...cellStyleSrc, vAlign: 'middle' } : defaultTextStyle({ fontSize: 11 })
  const ruleColor = (vRules[0] as RectElement | undefined)?.fill ?? (hRules[0] as RectElement | undefined)?.fill ?? '#000000'

  const table: TableElement = {
    id: `${seed.id}_table`,
    type: 'table',
    name: 'Jadval',
    x: tableX,
    y: tableY,
    w: tableW,
    h: tableH,
    fieldKey,
    columns,
    headerStyle,
    cellStyle,
    rowHeight: step,
    nowrap: true,
    borderColor: ruleColor,
    borderWidth: 1,
    showHeader: headerTexts.some((h) => consumedHeaders.has(h.id)),
    showRowNumber,
    ...(numberWidth ? { numberWidth } : {}),
    ...(numberHeader ? { numberHeader } : {}),
    highlightAbnormal: false,
  }

  // --- remove everything the table now draws: the repeat group, the grid rules and the consumed header texts
  const inside = (e: TemplateElement) => e.x >= tableX - 3 && e.x + e.w <= tableX + tableW + 3 && e.y >= tableY - 3 && e.y + e.h <= tableY + tableH + 3
  const remove = new Set<string>([
    ...group.map((e) => e.id),
    ...vRules.filter(inside).map((e) => e.id),
    ...hRules.filter((e) => inside(e) || Math.abs(e.y - tableY) <= 2).map((e) => e.id),
    ...consumedHeaders,
  ])
  const at = els.findIndex((e) => remove.has(e.id))
  const kept = els.filter((e) => !remove.has(e.id))
  kept.splice(Math.max(0, at), 0, table)
  return { doc: { ...doc, elements: kept }, tableId: table.id }
}
