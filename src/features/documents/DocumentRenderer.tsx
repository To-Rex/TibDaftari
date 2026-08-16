/**
 * Renders a TemplateDoc + RenderContext to HTML at 96dpi (1 unit = 1 CSS px).
 * Used by: template editor preview, doctor confirmation preview, patient portal,
 * print (window.print with @page size). The backend PDF renderer will follow the
 * exact same layout rules, so this is the visual contract.
 */
import { memo, type CSSProperties } from 'react'
import type { RenderContext, TemplateAsset, TemplateDoc, TemplateElement, TextStyle } from '@/domain'
import { fieldFlag, fieldReference, fieldUnit, fieldDef, formatValue, interpolate, paperSize, tableRows } from '@/domain'
import { cn } from '@/shared/lib/cn'

const FONT: Record<TextStyle['fontFamily'], string> = {
  sans: "'Onest Variable', system-ui, sans-serif",
  serif: "'Times New Roman', Times, 'Liberation Serif', Georgia, serif",
  mono: "'JetBrains Mono Variable', ui-monospace, monospace",
}

export function textStyleToCss(s: TextStyle): CSSProperties {
  return {
    fontFamily: FONT[s.fontFamily],
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    fontStyle: s.italic ? 'italic' : undefined,
    textDecoration: s.underline ? 'underline' : undefined,
    color: s.color,
    textAlign: s.align,
    lineHeight: s.lineHeight ?? 1.35,
    letterSpacing: s.letterSpacing,
    background: s.background,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: s.vAlign === 'middle' ? 'center' : s.vAlign === 'bottom' ? 'flex-end' : 'flex-start',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflow: 'hidden',
  }
}

const ABN = '#c2413f'

export interface DocumentRendererProps {
  doc: TemplateDoc
  ctx: RenderContext
  assets: TemplateAsset[]
  /** css scale (1 = 100%) */
  scale?: number
  className?: string
  /** editor mode: don't interpolate, show raw placeholders & element outlines */
  raw?: boolean
  onElementClick?: (id: string) => void
  selectedId?: string | null
  hideElementIds?: string[]
}

export const DocumentRenderer = memo(function DocumentRenderer({ doc, ctx, assets, scale = 1, className, raw, onElementClick, selectedId, hideElementIds }: DocumentRendererProps) {
  const size = paperSize(doc)
  const assetUrl = (id?: string) => assets.find((a) => a.id === id)?.url
  const hidden = new Set(hideElementIds ?? [])
  return (
    <div className={cn('relative origin-top-left', className)} style={{ width: size.w * scale, height: size.h * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: size.w, height: size.h, background: doc.background, transform: `scale(${scale})` }} data-paper>
        {doc.elements.map((el, z) => {
          if (el.hidden || hidden.has(el.id)) return null
          const nodes: (TemplateElement & { __row?: Record<string, unknown> })[] = []
          if (el.repeat && !raw) {
            const rows = tableRows(ctx, el.repeat.fieldKey)
            rows.forEach((row, i) => nodes.push({ ...el, id: `${el.id}#${i}`, y: el.y + i * el.repeat!.step, __row: { ...row, __i: i + 1 } }))
          } else nodes.push(el)
          if (!raw && el.showIf) {
            const keep = nodes.filter((nd) => interpolate(el.showIf!, ctx, nd.__row).trim())
            nodes.length = 0
            nodes.push(...keep)
          }
          return nodes.map((n) => (
            <ElementView key={n.id} el={n} z={z} ctx={ctx} raw={!!raw} assetUrl={assetUrl} selected={selectedId === el.id} onClick={onElementClick ? () => onElementClick(el.id) : undefined} />
          ))
        })}
      </div>
    </div>
  )
})

function ElementView({ el, z, ctx, raw, assetUrl, selected, onClick }: { el: TemplateElement & { __row?: Record<string, unknown> }; z: number; ctx: RenderContext; raw: boolean; assetUrl: (id?: string) => string | undefined; selected: boolean; onClick?: () => void }) {
  const base: CSSProperties = { position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h, opacity: el.opacity ?? 1, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined, zIndex: z, boxSizing: 'border-box' }
  const wrap = (child: React.ReactNode, extra?: CSSProperties) => (
    <div style={{ ...base, ...extra }} data-el={el.id} onMouseDown={onClick} className={cn(onClick && 'cursor-pointer', selected && 'outline outline-2 outline-[#0f7a6b] outline-offset-1', raw && !selected && 'hover:outline hover:outline-1 hover:outline-[#0f7a6b]/50')}>
      {child}
    </div>
  )
  const row = el.__row
  switch (el.type) {
    case 'text': {
      // Legacy PDF semantics: a box shorter than two lines is a single line — clipped, never wrapped.
      const lineH = el.style.fontSize * (el.style.lineHeight ?? 1.35)
      const singleLine = el.h < lineH * 2 && !el.text.includes('\n')
      return wrap(<div style={{ ...textStyleToCss(el.style), width: '100%', height: '100%', padding: el.padding, ...(singleLine ? { whiteSpace: 'nowrap', wordBreak: 'normal' } : {}) }}>{raw ? el.text : interpolate(el.text, ctx, row)}</div>)
    }
    case 'field': {
      const def = fieldDef(ctx.schema, el.fieldKey)
      const label = def?.label ?? el.fieldKey
      const value = raw ? `{values.${el.fieldKey}}` : formatValue(ctx, el.fieldKey)
      const unit = el.showUnit ? fieldUnit(ctx, el.fieldKey) : ''
      const ref = el.showReference ? fieldReference(ctx, el.fieldKey) : ''
      const flag = !raw && el.highlightAbnormal ? fieldFlag(ctx, el.fieldKey) : 'unknown'
      const abnormal = flag === 'abnormal' || flag === 'critical'
      const isTable = def?.type === 'table'
      if (isTable && !raw) {
        // inline field bound to a table: render compact list
        const rows = tableRows(ctx, el.fieldKey)
        return wrap(<div style={{ ...textStyleToCss(el.style), width: '100%', height: '100%' }}>{el.showLabel && <span style={{ fontWeight: 600 }}>{label}: </span>}{rows.length} qator</div>)
      }
      return wrap(
        <div style={{ ...textStyleToCss(el.style), width: '100%', height: '100%', flexDirection: 'row', alignItems: 'baseline', gap: 8, justifyContent: 'flex-start' }}>
          {el.showLabel && <span style={{ flex: '1 1 auto', minWidth: 0 }}>{label}</span>}
          <span style={{ fontWeight: 600, color: abnormal ? ABN : undefined, whiteSpace: 'nowrap' }}>{value || (raw ? '' : '—')}{abnormal && flag === 'critical' ? ' ‼' : abnormal ? ' *' : ''}</span>
          {unit && <span style={{ opacity: 0.7, whiteSpace: 'nowrap', minWidth: 60 }}>{unit}</span>}
          {el.showReference && <span style={{ opacity: 0.7, whiteSpace: 'nowrap', minWidth: 90, textAlign: 'right' }}>{ref}</span>}
        </div>,
      )
    }
    case 'rect':
    case 'ellipse':
      return wrap(null, { background: el.fill, border: el.stroke ? `${el.strokeWidth ?? 1}px solid ${el.stroke}` : undefined, borderRadius: el.type === 'ellipse' ? '50%' : el.radius })
    case 'line':
      return wrap(null, el.orientation === 'horizontal'
        ? { height: 0, borderTop: `${el.strokeWidth}px ${el.dashed ? 'dashed' : 'solid'} ${el.stroke}` }
        : { width: 0, borderLeft: `${el.strokeWidth}px ${el.dashed ? 'dashed' : 'solid'} ${el.stroke}` })
    case 'image': {
      const src = el.src ?? assetUrl(el.assetId)
      return wrap(src ? <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: el.fit, display: 'block' }} /> : <div style={{ width: '100%', height: '100%', border: '1px dashed #999', display: 'grid', placeItems: 'center', fontSize: 10, color: '#999' }}>image</div>)
    }
    case 'table': {
      const def = fieldDef(ctx.schema, el.fieldKey)
      const cols = def?.type === 'table' ? def.columns : []
      const rows: Record<string, unknown>[] = raw
        ? [Object.fromEntries(el.columns.map((c) => [c.bind, `{${c.bind}}`]))]
        : el.fieldKey ? tableRows(ctx, el.fieldKey) : (el.staticRows ?? []).map((r) => Object.fromEntries(el.columns.map((c, i) => [c.bind || String(i), r[i] ?? ''])))
      const totalW = el.columns.reduce((s, c) => s + c.width, 0) || 1
      const numW = el.showRowNumber ? 28 : 0
      const cellStyle = textStyleToCss(el.cellStyle)
      const headStyle = textStyleToCss(el.headerStyle)
      const border = `${el.borderWidth}px solid ${el.borderColor}`
      const fmtCell = (r: Record<string, unknown>, bind: string): { text: string; abnormal: boolean } => {
        const v = r[bind]
        const col = cols.find((c) => c.key === bind)
        if (v == null || v === '') return { text: '', abnormal: false }
        if (col?.type === 'select') { const o = col.options.find((x) => x.value === v); return { text: o?.label ?? String(v), abnormal: o?.flag === 'abnormal' || o?.flag === 'critical' } }
        if (col?.type === 'multiselect' && Array.isArray(v)) return { text: v.map((x) => col.options.find((o) => o.value === x)?.label ?? String(x)).join(', '), abnormal: false }
        if (col?.type === 'boolean') return { text: v ? (col.trueLabel ?? '✓') : (col.falseLabel ?? '—'), abnormal: false }
        if (col?.type === 'number' && typeof v === 'number') { const ref = col.references[0]; const ab = (ref?.min != null && v < ref.min) || (ref?.max != null && v > ref.max); return { text: String(v), abnormal: !!ab } }
        return { text: Array.isArray(v) ? v.join(', ') : String(v), abnormal: false }
      }
      return wrap(
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border }}>
          <colgroup>
            {el.showRowNumber && <col style={{ width: numW }} />}
            {el.columns.map((c) => <col key={c.id} style={{ width: `${((c.width / totalW) * 100).toFixed(2)}%` }} />)}
          </colgroup>
          {el.showHeader && (
            <thead><tr>
              {el.showRowNumber && <th style={{ ...headStyle, display: 'table-cell', border, padding: '4px 6px', height: el.rowHeight, textAlign: 'center' }}>№</th>}
              {el.columns.map((c) => <th key={c.id} style={{ ...headStyle, display: 'table-cell', border, padding: '4px 6px', height: el.rowHeight, textAlign: c.align }}>{c.header}</th>)}
            </tr></thead>
          )}
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: el.zebra && i % 2 === 1 ? el.zebra : undefined }}>
                {el.showRowNumber && <td style={{ ...cellStyle, display: 'table-cell', border, padding: '3px 6px', height: el.rowHeight, textAlign: 'center' }}>{i + 1}</td>}
                {el.columns.map((c) => {
                  const cell = raw ? { text: `{${c.bind}}`, abnormal: false } : fmtCell(r, c.bind)
                  return <td key={c.id} style={{ ...cellStyle, display: 'table-cell', border, padding: '3px 6px', height: el.rowHeight, textAlign: c.align, color: el.highlightAbnormal && cell.abnormal ? ABN : cellStyle.color, fontWeight: el.highlightAbnormal && cell.abnormal ? 600 : cellStyle.fontWeight }}>{cell.text}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>,
        { overflow: 'hidden' },
      )
    }
  }
}
