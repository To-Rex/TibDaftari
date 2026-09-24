/**
 * Print an approved result document (its PDF) — through TPrints on the A4/document printer of this
 * computer, or with the browser's own PDF viewer print dialog when the service is not available (or the
 * device is set to "browser"). The PDF is fetched with the staff token, never via a public link.
 */
import type { TFunction } from 'i18next'
import { api } from '@/data/http/client'
import { toast } from '@/shared/ui'
import { loadPrintSettings, tprintsPrintPdf, TPrintsError, type PrintMode } from './tprints'

export interface PrintableDocument { id: string; title: string }

const toBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Browser path: the PDF is loaded into a hidden iframe and the viewer's print dialog is opened (no popup). */
export function printPdfInBrowser(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  frame.src = url
  frame.onload = () => {
    try { frame.contentWindow?.focus(); frame.contentWindow?.print() } catch { window.open(url, '_blank', 'noopener') }
    setTimeout(() => { frame.remove(); URL.revokeObjectURL(url) }, 120_000)
  }
  document.body.appendChild(frame)
}

export async function fetchDocumentPdf(documentId: string): Promise<Blob> {
  return api.get<Blob>(`/documents/${documentId}/pdf`, { blob: true })
}

/** Returns how the document was printed. `force` overrides the stored mode (menu actions). */
export async function printDocument(doc: PrintableDocument, t: TFunction, force?: Exclude<PrintMode, 'auto'>): Promise<'service' | 'browser'> {
  const s = loadPrintSettings()
  const mode = force ?? s.mode
  const blob = await fetchDocumentPdf(doc.id)
  if (mode === 'browser') {
    printPdfInBrowser(blob)
    return 'browser'
  }
  try {
    await tprintsPrintPdf(s, toBase64(await blob.arrayBuffer()), doc.title)
    toast.success(t('staff.reception.printing.resultSent'), s.documentPrinter || undefined)
    return 'service'
  } catch (e) {
    const err = e instanceof TPrintsError ? e : new TPrintsError(String(e))
    if (mode === 'auto' && err.unreachable) {
      toast.warning(t('staff.reception.printing.fallbackPdf'))
      printPdfInBrowser(blob)
      return 'browser'
    }
    toast.error(t('staff.reception.printing.failed'), err.message)
    throw err
  }
}
