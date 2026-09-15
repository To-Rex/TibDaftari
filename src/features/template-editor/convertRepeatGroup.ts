/**
 * Legacy SES blanks draw their tables by hand: vertical/horizontal rule rects, static header texts and
 * a "repeat row" group (`{row.x}` texts + highlight rects repeated every `step` px). Managing rows and
 * columns of such a drawing is painful, so this converts one repeat group into a single real `table`
 * element bound to the same table field — columns, group headers, № column, per-cell highlight fills,
 * borders and text styles are all derived from the drawing. The original elements are removed.
 */
import type { RectElement, TableColumn, TableElement, TemplateDoc, TemplateElement, TextElement, TextStyle } from '@/domain'
import { PAPER_PX, defaultTextStyle } from '@/domain'

const ROW_RE = /^\{row\.([a-zA-Z0-9_-]+)\}$/
const INDEX_RE = /^\{i\}$/

const isThinV = (e: TemplateElement) => (e.type === 'rect' && e.w <= 2 && e.h > 8) || (e.type === 'line' && e.orientation === 'vertical')
const isThinH = (e: TemplateElement) => (e.type === 'rect' && e.h <= 2 && e.w > 8) || (e.type === 'line' && e.orientation === 'horizontal')
const overlapX = (a: { x: number; w: number }, b: { x: number; w: number }) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))

export interface ConvertResult { doc: TemplateDoc; tableId: string }

/** Convert the repeat group containing `elementId` into a table element; returns null if nothing to convert. */
export function convertRepeatGroupToTable(doc: TemplateDoc, elementId: string): ConvertResult | null {
  const els = doc.elements
  const seed = els.find((e) => e.id === elementId)
  if (!seed?.repeat) return null
  const fieldKey = seed.repeat.fieldKey
  const group = els.filter((e) => e.repeat?.fieldKey === fieldKey)
  const rowTexts = group.filter((e): e is TextElement => e.type === 'text' && (ROW_RE.test(e.text.trim()) || INDEX_RE.test(e.text.trim()))).sort((a, b) => a.x - b.x)
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
  // height: the static grid's extent when it reaches below the first row, else all the free space down
  // to the next static element (legacy blanks reserve exactly the rows area), else the page bottom
  const staticBottom = Math.max(0, ...staticV.map((e) => e.y + e.h))
  const nextBelow = Math.min(
    PAPER_PX[doc.paper].h - doc.margin,
    ...els.filter((e) => !e.repeat && !isThinV(e) && !isThinH(e) && e.y >= rowBottom && overlapX(e, { x: tableX, w: tableW }) > 0).map((e) => e.y),
  )
  const bottom = staticBottom > rowBottom + step ? staticBottom : nextBelow - 4
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
    const m = ROW_RE.exec(t.text.trim())
    if (!m) {
      showRowNumber = true
      numberWidth = Math.round(iv.w)
      numberHeader = ownHeader(iv).text
      return
    }
    const bind = m[1]!
    const header = ownHeader(iv)
    const spanning = headerTexts.filter((h) => { const cs = columnsFor(h); return cs.length > 1 && cs.includes(iv) })
    const groupText = spanning.sort((a, b) => a.y - b.y)[0]
    if (groupText) consumedHeaders.add(groupText.id)
    const hl = highlightRects.find((r) => overlapX(r, iv) > iv.w * 0.5 && (r.showIf ?? '').includes(`{row.${bind}}`))
    columns.push({
      id: `${seed.id}_col${idx}`,
      header: header.text ?? bind,
      bind,
      width: Math.round(iv.w),
      align: t.style.align === 'center' ? 'center' : t.style.align === 'right' ? 'right' : 'left',
      ...(groupText ? { group: groupText.text.trim() } : {}),
      ...(hl ? { fillIfSet: hl.fill } : {}),
    })
  })
  if (!columns.length) return null

  const headerStyleSrc = headerTexts.find((h) => consumedHeaders.has(h.id))?.style
  const cellStyleSrc = rowTexts.find((t) => ROW_RE.test(t.text.trim()))?.style
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
