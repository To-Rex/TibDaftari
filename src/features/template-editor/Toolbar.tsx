import { useTranslation } from 'react-i18next'
import { Grid3X3, Layers, Magnet, Maximize, Minus, Plus, Redo2, SlidersHorizontal, Undo2 } from 'lucide-react'
import type { ElementType } from '@/domain'
import { paperSize } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Tooltip } from '@/shared/ui'
import { ELEMENT_ICONS, ELEMENT_TYPES, createElement } from './elementDefaults'
import { useEditorStore } from './useEditorStore'

/**
 * Editor tools: add elements, undo/redo, zoom, snap & grid.
 *   ≥ xl → vertical strip on the left of the canvas
 *   < xl → horizontal, horizontally-scrollable strip under the top bar; also hosts the
 *          buttons that open the Layers/Placeholders and Properties sheets.
 */
export function Toolbar({ onPickImage, onFit, onOpenPanels, onOpenProps }: { onPickImage: () => void; onFit: () => void; onOpenPanels?: () => void; onOpenProps?: () => void }) {
  const { t } = useTranslation()
  const zoom = useEditorStore((s) => s.zoom)
  const snap = useEditorStore((s) => s.snap)
  const showGrid = useEditorStore((s) => s.showGrid)
  const canUndo = useEditorStore((s) => s.past.length > 0)
  const canRedo = useEditorStore((s) => s.future.length > 0)
  const preview = useEditorStore((s) => s.preview)
  const selectedCount = useEditorStore((s) => s.selectedIds.length)
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

  const btn = 'grid size-10 xl:size-9 shrink-0 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-35 disabled:pointer-events-none [&>svg]:size-[18px]'
  const sep = 'shrink-0 bg-line max-xl:mx-1 max-xl:h-6 max-xl:w-px xl:my-1 xl:h-px xl:w-6'
  return (
    <div className="flex items-center gap-1 bg-surface shrink-0 max-xl:h-12 max-xl:w-full max-xl:flex-row max-xl:overflow-x-auto max-xl:no-scrollbar max-xl:border-b max-xl:border-line max-xl:px-1.5 xl:w-12 xl:flex-col xl:p-1.5 xl:border-r xl:border-line">
      {/* < xl: sheet openers */}
      {(onOpenPanels || onOpenProps) && (
        <span className="contents xl:hidden">
          {onOpenPanels && (
            <Tooltip label={`${t('catalog.editor.layers')} / ${t('catalog.editor.placeholders')}`} side="bottom">
              <button className={btn} onClick={onOpenPanels}><Layers /></button>
            </Tooltip>
          )}
          {onOpenProps && (
            <Tooltip label={t('catalog.editor.properties')} side="bottom">
              <button className={cn(btn, 'relative')} onClick={onOpenProps}>
                <SlidersHorizontal />
                {selectedCount > 0 && <span className="absolute -top-0.5 -right-0.5 grid min-w-4 h-4 px-1 place-items-center rounded-full bg-brand text-white text-[10px] tabular leading-none">{selectedCount}</span>}
              </button>
            </Tooltip>
          )}
          <div className={sep} />
        </span>
      )}

      {ELEMENT_TYPES.map((ty) => { const I = ELEMENT_ICONS[ty]; return (
        <Tooltip key={ty} label={t(`catalog.editor.el.${ty}`)} side="bottom"><button className={btn} onClick={() => add(ty)} disabled={preview}><I /></button></Tooltip>
      ) })}
      <div className={sep} />
      <Tooltip label={`${t('catalog.editor.undo')} (Ctrl+Z)`} side="bottom"><button className={btn} onClick={undo} disabled={!canUndo}><Undo2 /></button></Tooltip>
      <Tooltip label={`${t('catalog.editor.redo')} (Ctrl+Y)`} side="bottom"><button className={btn} onClick={redo} disabled={!canRedo}><Redo2 /></button></Tooltip>
      <div className={sep} />
      <Tooltip label={t('catalog.editor.snap')} side="bottom"><button className={cn(btn, snap && 'bg-brand-soft text-brand-ink')} onClick={toggleSnap}><Magnet /></button></Tooltip>
      <Tooltip label={t('catalog.editor.grid')} side="bottom"><button className={cn(btn, showGrid && 'bg-brand-soft text-brand-ink')} onClick={toggleGrid}><Grid3X3 /></button></Tooltip>
      <div className="flex items-center gap-0.5 shrink-0 max-xl:ml-auto max-xl:flex-row max-xl:pl-1 xl:mt-auto xl:flex-col">
        <button className={btn} onClick={() => setZoom(zoom + 0.1)} aria-label="zoom in"><Plus /></button>
        <button className="min-w-9 h-8 xl:h-auto text-[11px] tabular text-ink-3 hover:text-ink" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
        <button className={btn} onClick={() => setZoom(zoom - 0.1)} aria-label="zoom out"><Minus /></button>
        <Tooltip label={t('catalog.editor.fit')} side="top"><button className={btn} onClick={onFit}><Maximize /></button></Tooltip>
      </div>
    </div>
  )
}
