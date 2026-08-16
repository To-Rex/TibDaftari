import { createPortal } from 'react-dom'
import type { RenderContext, TemplateAsset, TemplateDoc } from '@/domain'
import { paperSize } from '@/domain'
import { DocumentRenderer } from '@/features/documents/DocumentRenderer'

/** Print-only copy of the document at 100% (everything else hidden via @media print). */
export function PrintPortal({ doc, ctx, assets }: { doc: TemplateDoc; ctx: RenderContext; assets: TemplateAsset[] }) {
  const size = paperSize(doc)
  const mm = (px: number) => `${(px / 96) * 25.4}mm`
  return createPortal(
    <div id="tpl-print-root" style={{ display: 'none' }}>
      <style>{`@media print { body > *:not(#tpl-print-root) { display: none !important; } #tpl-print-root { display: block !important; position: absolute; inset: 0; background: #fff; } @page { size: ${mm(size.w)} ${mm(size.h)}; margin: 0; } }`}</style>
      <DocumentRenderer doc={doc} ctx={ctx} assets={assets} />
    </div>,
    document.body,
  )
}
