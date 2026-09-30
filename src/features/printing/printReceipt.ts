/**
 * "Chop etish" for a cheque: TPrints on this computer when it is reachable, the browser print dialog
 * (the hidden `<Receipt>` sheet) otherwise — or whichever the device's print settings force.
 */
import type { TFunction } from 'i18next'
import type { ReceiptProps } from '@/features/reception/Receipt'
import { toast } from '@/shared/ui'
import { api } from '@/data/http/client'
import { buildReceiptElements } from './receiptElements'
import { printPdfInBrowser } from './printDocument'
import { loadPrintSettings, tprintsPrint, tprintsPrintReceiptPdf, TPrintsError, type PrintMode } from './tprints'

const browserPrint = () => window.print()

const toBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(out)
}

/**
 * Returns how the cheque was printed. `force` overrides the stored mode (menu actions).
 * With `templateId` (an active receipt template of the branch) the cheque is the template rendered by the
 * API as a PDF; otherwise the built-in cheque (TPrints elements / the hidden <Receipt> sheet).
 */
export async function printReceipt(props: ReceiptProps, t: TFunction, force?: Exclude<PrintMode, 'auto'>, templateId?: string): Promise<'service' | 'browser'> {
  const s = loadPrintSettings()
  const mode = force ?? s.mode
  if (templateId) {
    const blob = await api.get<Blob>(`/orders/${props.order.id}/receipt.pdf`, { blob: true, query: { templateId } })
    if (mode === 'browser') { printPdfInBrowser(blob); return 'browser' }
    try {
      await tprintsPrintReceiptPdf(s, toBase64(await blob.arrayBuffer()), `Chek ${props.order.number}`)
      toast.success(t('staff.reception.printing.sent'), s.printer || undefined)
      return 'service'
    } catch (e) {
      const err = e instanceof TPrintsError ? e : new TPrintsError(String(e))
      if (mode === 'auto' && err.unreachable) { toast.warning(t('staff.reception.printing.fallback')); printPdfInBrowser(blob); return 'browser' }
      toast.error(t('staff.reception.printing.failed'), err.message)
      throw err
    }
  }
  if (mode === 'browser') {
    browserPrint()
    return 'browser'
  }
  try {
    await tprintsPrint(s, buildReceiptElements(props, t))
    toast.success(t('staff.reception.printing.sent'), s.printer || undefined)
    return 'service'
  } catch (e) {
    const err = e instanceof TPrintsError ? e : new TPrintsError(String(e))
    // 'auto': the service is simply not running here → the browser dialog keeps the cheque printable
    if (mode === 'auto' && err.unreachable) {
      toast.warning(t('staff.reception.printing.fallback'))
      browserPrint()
      return 'browser'
    }
    toast.error(t('staff.reception.printing.failed'), err.message)
    throw err
  }
}
