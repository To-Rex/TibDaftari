import { useEffect } from 'react'
import { useEditorStore } from './useEditorStore'

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

/** Global keyboard shortcuts for the template editor. */
export function useEditorShortcuts(onSave: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const h = (e: KeyboardEvent) => {
      const s = useEditorStore.getState()
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      if (mod && k === 's') { e.preventDefault(); onSave(); return }
      if (isTyping()) return
      if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); s.undo(); return }
      if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); s.redo(); return }
      if (s.preview) return
      if (mod && k === 'a') { e.preventDefault(); s.select(s.doc.elements.filter((x) => !x.hidden).map((x) => x.id)); return }
      if (mod && k === 'd') { e.preventDefault(); s.duplicateSelected(); return }
      if (mod && k === 'c') { e.preventDefault(); s.copy(); return }
      if (mod && k === 'v') { e.preventDefault(); s.paste(); return }
      if (mod && k === 'g') { e.preventDefault(); s.toggleGrid(); return }
      if (mod && (k === '=' || k === '+')) { e.preventDefault(); s.setZoom(s.zoom + 0.1); return }
      if (mod && k === '-') { e.preventDefault(); s.setZoom(s.zoom - 0.1); return }
      if (mod && k === '0') { e.preventDefault(); s.setZoom(1); return }
      if (k === 'escape') { s.select([]); return }
      if (!s.selectedIds.length) return
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); s.removeSelected(); return }
      if (k === 'l' && !mod) { s.patchElements(s.selectedIds, (x) => ({ ...x, locked: !x.locked || undefined })); return }
      if (k === 'h' && !mod) { s.patchElements(s.selectedIds, (x) => ({ ...x, hidden: !x.hidden || undefined })); return }
      if (k === ']' ) { const id = s.selectedIds[0]; if (id) s.reorder(id, mod ? 'front' : 'up'); return }
      if (k === '[' ) { const id = s.selectedIds[0]; if (id) s.reorder(id, mod ? 'back' : 'down'); return }
      const step = e.shiftKey ? 10 : 1
      const d: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }
      const v = d[k]
      if (v) {
        e.preventDefault()
        const ids = s.doc.elements.filter((x) => s.selectedIds.includes(x.id) && !x.locked).map((x) => x.id)
        if (!e.repeat) s.pushHistory()
        s.patchElements(ids, (x) => ({ ...x, x: x.x + v[0], y: x.y + v[1] }), false)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onSave, enabled])
}
