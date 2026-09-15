import { memo, useEffect, useRef } from 'react'
import { Lock } from 'lucide-react'
import type { TableElement, TemplateElement } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { textStyleToCss } from '@/features/documents/DocumentRenderer'
import { HANDLES, type HandleDir, type Rect } from './geometry'
import { useEditorStore } from './useEditorStore'
import type { ElementPointerHandler, HandlePointerHandler } from './useCanvasInteraction'

const CURSORS: Record<HandleDir, string> = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' }

/** Transparent interaction overlay: one box per element, handles for the selection, marquee & guides. */
export function ElementLayer({ elements, selectedIds, zoom, marquee, onElementPointerDown, onHandlePointerDown }: {
  elements: TemplateElement[]; selectedIds: string[]; zoom: number; marquee: Rect | null; onElementPointerDown: ElementPointerHandler; onHandlePointerDown: HandlePointerHandler
}) {
  const guides = useEditorStore((s) => s.guides)
  const editingId = useEditorStore((s) => s.editingId)
  const single = selectedIds.length === 1 ? elements.find((e) => e.id === selectedIds[0]) : undefined
  return (
    <>
      {elements.map((el) => !el.hidden && (
        <ElementBox key={el.id} el={el} selected={selectedIds.includes(el.id)} zoom={zoom} onPointerDown={onElementPointerDown} editing={editingId === el.id} />
      ))}
      {single && !single.locked && single.type === 'table' && <ColumnDividers el={single} zoom={zoom} />}
      {single && !single.locked && editingId !== single.id && (
        <div className="absolute pointer-events-none" style={{ left: single.x * zoom, top: single.y * zoom, width: single.w * zoom, height: single.h * zoom }}>
          {HANDLES.map((d) => (
            <span key={d} onPointerDown={(e) => onHandlePointerDown(e, single.id, d)} style={{ cursor: CURSORS[d], ...handlePos(d) }}
              className="pointer-events-auto touch-none absolute size-[9px] pointer-coarse:size-4 rounded-[2px] bg-white border-[1.5px] border-brand shadow-[0_0_0_1px_rgb(0_0_0/0.06)] -translate-x-1/2 -translate-y-1/2" />
          ))}
        </div>
      )}
      {marquee && <div className="absolute border border-brand bg-brand/10 pointer-events-none" style={{ left: marquee.x * zoom, top: marquee.y * zoom, width: marquee.w * zoom, height: marquee.h * zoom }} />}
      {guides.map((g, i) => g.axis === 'x'
        ? <div key={i} className="absolute pointer-events-none bg-[#ec4899]" style={{ left: g.pos * zoom, top: g.from * zoom, width: 1, height: (g.to - g.from) * zoom }} />
        : <div key={i} className="absolute pointer-events-none bg-[#ec4899]" style={{ top: g.pos * zoom, left: g.from * zoom, height: 1, width: (g.to - g.from) * zoom }} />)}
    </>
  )
}

function handlePos(d: HandleDir): React.CSSProperties {
  const l = d.includes('w') ? '0%' : d.includes('e') ? '100%' : '50%'
  const t = d.includes('n') ? '0%' : d.includes('s') ? '100%' : '50%'
  return { left: l, top: t }
}

const ElementBox = memo(function ElementBox({ el, selected, zoom, onPointerDown, editing }: { el: TemplateElement; selected: boolean; zoom: number; onPointerDown: ElementPointerHandler; editing: boolean }) {
  const setEditing = useEditorStore((s) => s.setEditing)
  return (
    <div
      data-el-box={el.id}
      onPointerDown={(e) => onPointerDown(e, el.id)}
      onDoubleClick={() => { if (el.type === 'text' && !el.locked) setEditing(el.id) }}
      className={cn('absolute group', el.locked ? 'cursor-not-allowed' : 'cursor-move touch-none', selected ? 'outline outline-[1.5px] outline-brand' : 'hover:outline hover:outline-1 hover:outline-brand/50', el.type === 'line' && el.h < 6 && '-my-1')}
      style={{ left: el.x * zoom, top: el.y * zoom, width: Math.max(el.w * zoom, 4), height: Math.max(el.h * zoom, el.type === 'line' ? 8 : 4), outlineOffset: 1, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined }}
    >
      {el.locked && selected && <span className="absolute -top-2 -right-2 grid size-4 place-items-center rounded-full bg-surface border border-line text-ink-3"><Lock className="size-2.5" /></span>}
      {editing && el.type === 'text' && <InlineTextEditor id={el.id} text={el.text} zoom={zoom} styleCss={{ ...textStyleToCss(el.style), fontSize: el.style.fontSize * zoom, padding: (el.padding ?? 0) * zoom }} />}
    </div>
  )
})

function InlineTextEditor({ id, text, zoom, styleCss }: { id: string; text: string; zoom: number; styleCss: React.CSSProperties }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const patch = useEditorStore((s) => s.patchElements)
  const setEditing = useEditorStore((s) => s.setEditing)
  const startRef = useRef(text)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  useEffect(() => { useEditorStore.getState().pushHistory() }, [])
  return (
    <textarea
      ref={ref}
      defaultValue={text}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => patch([id], (el) => (el.type === 'text' ? { ...el, text: e.target.value } : el), false)}
      onBlur={() => setEditing(null)}
      onKeyDown={(e) => { if (e.key === 'Escape') { patch([id], (el) => (el.type === 'text' ? { ...el, text: startRef.current } : el), false); setEditing(null) } e.stopPropagation() }}
      className="absolute inset-0 resize-none outline-none border-0 bg-transparent select-text"
      style={{ ...styleCss, display: 'block', width: '100%', height: '100%', letterSpacing: styleCss.letterSpacing != null ? Number(styleCss.letterSpacing) * zoom : undefined, boxSizing: 'border-box' }}
    />
  )
}

const ROW_NUMBER_W = 28

/** Draggable vertical dividers between the columns of the selected table — drag to redistribute widths. */
function ColumnDividers({ el, zoom }: { el: TableElement; zoom: number }) {
  const cols = el.columns
  if (cols.length < 2) return null
  const totalW = cols.reduce((s, c) => s + c.width, 0) || 1
  const numW = el.showRowNumber ? ROW_NUMBER_W : 0
  const avail = Math.max(0, el.w - numW)
  const pxPerUnit = avail / totalW
  const xs: number[] = []
  let acc = numW
  for (let i = 0; i < cols.length - 1; i++) { acc += cols[i]!.width * pxPerUnit; xs.push(acc) }

  const onDown = (e: React.PointerEvent, k: number) => {
    e.preventDefault(); e.stopPropagation()
    const store = useEditorStore.getState()
    store.pushHistory()
    const startX = e.clientX
    const startWidths = cols.map((c) => c.width)
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const deltaUnits = (ev.clientX - startX) / zoom / (pxPerUnit || 1)
      const a = startWidths[k]!, b = startWidths[k + 1]!
      const min = 10
      const na = Math.max(min, Math.min(a + b - min, a + deltaUnits))
      const nb = a + b - na
      useEditorStore.getState().patchElements([el.id], (x) => ({ ...(x as TableElement), columns: (x as TableElement).columns.map((c, i) => (i === k ? { ...c, width: Math.round(na) } : i === k + 1 ? { ...c, width: Math.round(nb) } : c)) }) as TemplateElement, false)
    }
    const up = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up) }
    target.addEventListener('pointermove', move); target.addEventListener('pointerup', up); target.addEventListener('pointercancel', up)
  }

  return (
    <>
      {xs.map((x, k) => (
        <div key={k} onPointerDown={(e) => onDown(e, k)} title="⇔"
          className="absolute z-10 w-[9px] -translate-x-1/2 cursor-col-resize touch-none group/div"
          style={{ left: (el.x + x) * zoom, top: el.y * zoom, height: el.h * zoom }}>
          <div className="mx-auto h-full w-px bg-brand/40 group-hover/div:bg-brand group-hover/div:w-[2px]" />
        </div>
      ))}
    </>
  )
}
