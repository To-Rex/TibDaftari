import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { paperSize } from '@/domain'
import { useEditorStore } from './useEditorStore'
import { intersects, normalizeRect, rectOf, resizeRect, round, snapRect, type HandleDir, type Rect } from './geometry'

type Mode =
  | { kind: 'move'; ids: string[]; start: Record<string, Rect>; sx: number; sy: number; moved: boolean }
  | { kind: 'resize'; id: string; dir: HandleDir; start: Rect; sx: number; sy: number; moved: boolean }
  | { kind: 'marquee'; sx: number; sy: number; additive: boolean }

/** Pointer interactions on the editor overlay: select, drag, resize, marquee. */
export function useCanvasInteraction(pageRef: RefObject<HTMLDivElement | null>) {
  const [marquee, setMarqueeState] = useState<Rect | null>(null)
  const marqueeRef = useRef<Rect | null>(null)
  const setMarquee = useCallback((r: Rect | null) => { marqueeRef.current = r; setMarqueeState(r) }, [])
  const mode = useRef<Mode | null>(null)
  const raf = useRef<number | null>(null)

  /** pointer → document coordinates (unscaled px) */
  const toDoc = useCallback((clientX: number, clientY: number) => {
    const el = pageRef.current
    const zoom = useEditorStore.getState().zoom
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return { x: (clientX - r.left) / zoom, y: (clientY - r.top) / zoom }
  }, [pageRef])

  const onElementPointerDown = useCallback((e: ReactPointerEvent, id: string) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const s = useEditorStore.getState()
    if (s.preview) return
    const el = s.doc.elements.find((x) => x.id === id)
    if (!el) return
    let ids = s.selectedIds
    if (e.shiftKey) { s.toggleSelect(id); ids = useEditorStore.getState().selectedIds }
    else if (!ids.includes(id)) { s.select([id]); ids = [id] }
    if (s.editingId && s.editingId !== id) s.setEditing(null)
    const movable = s.doc.elements.filter((x) => ids.includes(x.id) && !x.locked)
    if (!movable.length) return
    const p = toDoc(e.clientX, e.clientY)
    mode.current = { kind: 'move', ids: movable.map((x) => x.id), start: Object.fromEntries(movable.map((x) => [x.id, rectOf(x)])), sx: p.x, sy: p.y, moved: false }
  }, [toDoc])

  const onHandlePointerDown = useCallback((e: ReactPointerEvent, id: string, dir: HandleDir) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const s = useEditorStore.getState()
    const el = s.doc.elements.find((x) => x.id === id)
    if (!el || el.locked) return
    const p = toDoc(e.clientX, e.clientY)
    mode.current = { kind: 'resize', id, dir, start: rectOf(el), sx: p.x, sy: p.y, moved: false }
  }, [toDoc])

  const onPagePointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return
    const s = useEditorStore.getState()
    if (s.preview) return
    if (!e.shiftKey) s.select([])
    const p = toDoc(e.clientX, e.clientY)
    mode.current = { kind: 'marquee', sx: p.x, sy: p.y, additive: e.shiftKey }
  }, [toDoc])

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const m = mode.current
      if (!m) return
      if (raf.current) cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        const s = useEditorStore.getState()
        const p = toDoc(e.clientX, e.clientY)
        const dx = p.x - m.sx
        const dy = p.y - m.sy
        if (m.kind === 'marquee') { setMarquee(normalizeRect(m.sx, m.sy, p.x, p.y)); return }
        if (!m.moved && Math.abs(dx) < 2 && Math.abs(dy) < 2) return
        if (!m.moved) { m.moved = true; s.pushHistory() }
        const page = paperSize(s.doc)
        if (m.kind === 'move') {
          const first = m.start[m.ids[0] ?? ''] ?? { x: 0, y: 0, w: 0, h: 0 }
          const bounds: Rect = m.ids.reduce<Rect>((acc, id) => { const r = m.start[id]!; const x1 = Math.min(acc.x, r.x); const y1 = Math.min(acc.y, r.y); const x2 = Math.max(acc.x + acc.w, r.x + r.w); const y2 = Math.max(acc.y + acc.h, r.y + r.h); return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } }, first)
          let sdx = 0, sdy = 0
          if (s.snap && !e.altKey) {
            const others = s.doc.elements.filter((x) => !m.ids.includes(x.id) && !x.hidden).map(rectOf)
            const r = snapRect({ x: bounds.x + dx, y: bounds.y + dy, w: bounds.w, h: bounds.h }, others, page, { grid: s.showGrid })
            sdx = r.dx; sdy = r.dy
            s.setGuides(r.guides)
          } else if (s.guides.length) s.setGuides([])
          s.patchElements(m.ids, (el) => { const st = m.start[el.id]!; return { ...el, x: round(st.x + dx + sdx), y: round(st.y + dy + sdy) } }, false)
        } else if (m.kind === 'resize') {
          let r = resizeRect(m.start, m.dir, dx, dy, e.shiftKey)
          if (s.snap && !e.altKey && s.showGrid) r = { x: Math.round(r.x / 8) * 8, y: Math.round(r.y / 8) * 8, w: Math.max(4, Math.round(r.w / 8) * 8), h: Math.max(4, Math.round(r.h / 8) * 8) }
          s.patchElements([m.id], (el) => ({ ...el, x: round(r.x), y: round(r.y), w: round(r.w), h: round(r.h) }), false)
        }
      })
    }
    const up = () => {
      const m = mode.current
      if (!m) return
      if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null }
      const s = useEditorStore.getState()
      if (m.kind === 'marquee') {
        const mq = marqueeRef.current
        if (mq && (mq.w > 3 || mq.h > 3)) {
          const hit = s.doc.elements.filter((el) => !el.hidden && intersects(mq, rectOf(el))).map((el) => el.id)
          s.select(m.additive ? [...new Set([...s.selectedIds, ...hit])] : hit)
        }
        setMarquee(null)
      }
      s.setGuides([])
      mode.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up) }
  }, [toDoc, setMarquee])

  return { marquee, onElementPointerDown, onHandlePointerDown, onPagePointerDown, toDoc }
}

export type ElementPointerHandler = (e: ReactPointerEvent, id: string) => void
export type HandlePointerHandler = (e: ReactPointerEvent, id: string, dir: HandleDir) => void
