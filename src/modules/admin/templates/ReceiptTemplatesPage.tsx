/** /admin/receipts — cashier cheque templates (receipt scope, 80/58 mm papers); the branch's active one prints from the order page. */
import { TemplateGallery } from './TemplateGallery'

export default function ReceiptTemplatesPage() {
  return <TemplateGallery kind="receipt" />
}
