import { useEffect, useMemo, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { RenderContext, TemplateAsset } from '@/domain'
import { paperSize } from '@/domain'
import { DocumentRenderer } from '@/features/documents/DocumentRenderer'
import { cn } from '@/shared/lib/cn'
import { ElementLayer } from './ElementLayer'
import { createElement } from './elementDefaults'
import { useCanvasInteraction } from './useCanvasInteraction'
import { useEditorStore } from './useEditorStore'

export const PLACEHOLDER_MIME = 'application/x-clinic-placeholder'

/**
 * Scrollable canvas: paper rendered by DocumentRenderer (raw or preview) with the
 * interactive overlay on top. Grid, margin guide, drop target for placeholders.
 */
export function EditorCanvas({ ctx, assets, fitSignal, className }: { ctx: RenderContext; assets: TemplateAsset[]; fitSignal: number; className?: string }) {
  const { doc, zoom, showGrid, preview, selectedIds, editingId } = useEditorStore(useShallow((s) => ({ doc: s.doc, zoom: s.zoom, showGrid: s.showGrid, preview: s.preview, selectedIds: s.selectedIds, editingId: s.editingId })))
  const setZoom = useEditorStore((s) => s.setZoom)
  const addElement = useEditorStore((s) => s.addElement)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const { marquee, onElementPointerDown, onHandlePointerDown, onPagePointerDown, toDoc } = useCanvasInteraction(pageRef)
  const size = paperSize(doc)

  // fit to container width
  useEffect(() => {
    if (!fitSignal) return
    const c = scrollRef.current
    if (!c) return
    const z = Math.min((c.clientWidth - 64) / size.w, (c.clientHeight - 64) / size.h)
    setZoom(Math.max(0.25, Math.min(2, z)))
  }, [fitSignal, size.w, size.h, setZoom])

  // ctrl+wheel zoom
  useEffect(() => {
    const c = scrollRef.current
    if (!c) return
    const h = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(useEditorStore.getState().zoom * (e.deltaY < 0 ? 1.08 : 0.92)) } }
    c.addEventListener('wheel', h, { passive: false })
    return () => c.removeEventListener('wheel', h)
  }, [setZoom])

  const gridStyle = useMemo(() => showGrid ? {
    backgroundImage: 'linear-gradient(to right, rgb(15 122 107 / 0.10) 1px, transparent 1px), linear-gradient(to bottom, rgb(15 122 107 / 0.10) 1px, transparent 1px)',
    backgroundSize: `${8 * zoom}px ${8 * zoom}px`,
  } : undefined, [showGrid, zoom])

  const hideIds = useMemo(() => (editingId ? [editingId] : undefined), [editingId])

  return (
    <div ref={scrollRef} className={cn('relative flex-1 min-w-0 overflow-auto bg-surface-2/60 dark:bg-bg [background-image:radial-gradient(rgb(0_0_0/0.06)_1px,transparent_1px)] [background-size:16px_16px] dark:[background-image:radial-gradient(rgb(255_255_255/0.05)_1px,transparent_1px)]', className)}>
      <div className="min-w-full min-h-full grid place-items-center p-8" style={{ width: size.w * zoom + 64, height: size.h * zoom + 64 }}>
        <div
          ref={pageRef}
          className="relative shadow-3 ring-1 ring-black/10 select-none"
          style={{ width: size.w * zoom, height: size.h * zoom, background: doc.background }}
          onPointerDown={onPagePointerDown}
          onDragOver={(e) => { if (e.dataTransfer.types.includes(PLACEHOLDER_MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
          onDrop={(e) => {
            const key = e.dataTransfer.getData(PLACEHOLDER_MIME)
            if (!key) return
            e.preventDefault()
            const p = toDoc(e.clientX, e.clientY)
            const isValue = key.startsWith('values.')
            addElement(isValue ? createElement('field', Math.round(p.x), Math.round(p.y), { fieldKey: key.slice(7) }) : createElement('text', Math.round(p.x), Math.round(p.y), { text: `{${key}}` }))
          }}
        >
          <DocumentRenderer doc={doc} ctx={ctx} assets={assets} scale={zoom} raw={!preview} hideElementIds={hideIds} />
          {!preview && (
            <>
              {gridStyle && <div className="absolute inset-0 pointer-events-none" style={gridStyle} />}
              {doc.margin > 0 && <div className="absolute pointer-events-none border border-dashed border-brand/30" style={{ inset: doc.margin * zoom }} />}
              <div className="absolute inset-0">
                <ElementLayer elements={doc.elements} selectedIds={selectedIds} zoom={zoom} marquee={marquee} onElementPointerDown={onElementPointerDown} onHandlePointerDown={onHandlePointerDown} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
