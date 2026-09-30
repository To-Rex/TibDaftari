/** /admin/templates — result document (blank) templates: item- and order-scope. Cheques have their own page (ReceiptTemplatesPage). */
import { TemplateGallery } from './TemplateGallery'

export default function TemplatesPage() {
  return <TemplateGallery kind="result" />
}
