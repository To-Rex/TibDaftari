import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { RenderContext, TemplateAsset, TemplateDoc } from '@/domain'
import { paperSize } from '@/domain'
import { DocumentRenderer } from '@/features/documents/DocumentRenderer'
import { cn } from '@/shared/lib/cn'

const PRINT_ROOT = 'portal-print-root'

/**
 * Fits the paper to the container width (max scale 1) and ships a print
 * stylesheet that isolates a 1:1 copy of the page for window.print().
 */
export function DocumentViewer({
  doc,
  ctx,
  assets,
  className,
}: {
  doc: TemplateDoc
  ctx: RenderContext
  assets: TemplateAsset[]
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const size = paperSize(doc)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setScale(Math.min(1, el.clientWidth / size.w))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [size.w])

  const printCss = `
@media print {
  @page { size: ${doc.paper} ${doc.orientation}; margin: 0; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #${PRINT_ROOT}, #${PRINT_ROOT} * { visibility: visible !important; }
  #${PRINT_ROOT} { display: block !important; position: absolute; left: 0; top: 0; width: ${size.w}px; height: ${size.h}px; overflow: hidden; }
}`

  return (
    <>
      <style>{printCss}</style>
      <div ref={ref} className={cn('w-full', className)}>
        <div
          className="shadow-3 mx-auto overflow-hidden rounded-[10px] ring-1 ring-black/5 dark:ring-white/10"
          style={{ width: size.w * scale, height: size.h * scale }}
        >
          <DocumentRenderer doc={doc} ctx={ctx} assets={assets} scale={scale} />
        </div>
      </div>
      {/* 1:1 copy for print only — portaled to body so no ancestor transform offsets it */}
      {createPortal(
        <div id={PRINT_ROOT} className="hidden" aria-hidden>
          <DocumentRenderer doc={doc} ctx={ctx} assets={assets} scale={1} />
        </div>,
        document.body,
      )}
    </>
  )
}
