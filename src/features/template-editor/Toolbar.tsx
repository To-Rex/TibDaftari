import { useTranslation } from 'react-i18next'
import { Grid3X3, Magnet, Maximize, Minus, Plus, Redo2, Undo2 } from 'lucide-react'
import type { ElementType } from '@/domain'
import { paperSize } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Tooltip } from '@/shared/ui'
import { ELEMENT_ICONS, ELEMENT_TYPES, createElement } from './elementDefaults'
import { useEditorStore } from './useEditorStore'

/** Left vertical toolbar: add elements, undo/redo, zoom, snap & grid. */
export function Toolbar({ onPickImage, onFit }: { onPickImage: () => void; onFit: () => void }) {
  const { t } = useTranslation()
  const zoom = useEditorStore((s) => s.zoom)
  const snap = useEditorStore((s) => s.snap)
  const showGrid = useEditorStore((s) => s.showGrid)
  const canUndo = useEditorStore((s) => s.past.length > 0)
  const canRedo = useEditorStore((s) => s.future.length > 0)
  const preview = useEditorStore((s) => s.preview)
  const { setZoom, toggleSnap, toggleGrid, undo, redo, addElement } = useEditorStore.getState()

  const add = (type: ElementType) => {
    if (type === 'image') return onPickImage()
    const s = useEditorStore.getState()
    const page = paperSize(s.doc)
    const el = createElement(type, 0, 0)
    el.x = Math.round(page.w / 2 - el.w / 2)
    el.y = Math.round(Math.min(page.h - el.h - s.doc.margin, s.doc.margin + 200 + s.doc.elements.length * 6))
    addElement(el)
  }

  const btn = 'grid size-9 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-35 disabled:pointer-events-none [&>svg]:size-[18px]'
  return (
    <div className="flex flex-col items-center gap-1 p-1.5 border-r border-line bg-surface w-12 shrink-0">
      {ELEMENT_TYPES.map((ty) => { const I = ELEMENT_ICONS[ty]; return (
        <Tooltip key={ty} label={t(`catalog.editor.el.${ty}`)} side="bottom"><button className={btn} onClick={() => add(ty)} disabled={preview}><I /></button></Tooltip>
      ) })}
      <div className="my-1 h-px w-6 bg-line" />
      <Tooltip label={`${t('catalog.editor.undo')} (Ctrl+Z)`} side="bottom"><button className={btn} onClick={undo} disabled={!canUndo}><Undo2 /></button></Tooltip>
      <Tooltip label={`${t('catalog.editor.redo')} (Ctrl+Y)`} side="bottom"><button className={btn} onClick={redo} disabled={!canRedo}><Redo2 /></button></Tooltip>
      <div className="my-1 h-px w-6 bg-line" />
      <Tooltip label={t('catalog.editor.snap')} side="bottom"><button className={cn(btn, snap && 'bg-brand-soft text-brand-ink')} onClick={toggleSnap}><Magnet /></button></Tooltip>
      <Tooltip label={t('catalog.editor.grid')} side="bottom"><button className={cn(btn, showGrid && 'bg-brand-soft text-brand-ink')} onClick={toggleGrid}><Grid3X3 /></button></Tooltip>
      <div className="mt-auto flex flex-col items-center gap-0.5">
        <button className={btn} onClick={() => setZoom(zoom + 0.1)} aria-label="zoom in"><Plus /></button>
        <button className="text-[11px] tabular text-ink-3 hover:text-ink" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
        <button className={btn} onClick={() => setZoom(zoom - 0.1)} aria-label="zoom out"><Minus /></button>
        <Tooltip label={t('catalog.editor.fit')} side="top"><button className={btn} onClick={onFit}><Maximize /></button></Tooltip>
      </div>
    </div>
  )
}
