/**
 * "Chop etish" for a cheque: TPrints on this computer when it is reachable, the browser print dialog
 * (the hidden `<Receipt>` sheet) otherwise — or whichever the device's print settings force.
 */
import type { TFunction } from 'i18next'
import type { ReceiptProps } from '@/features/reception/Receipt'
import { toast } from '@/shared/ui'
import { buildReceiptElements } from './receiptElements'
import { loadPrintSettings, tprintsPrint, TPrintsError, type PrintMode } from './tprints'

const browserPrint = () => window.print()

/** Returns how the cheque was printed. `force` overrides the stored mode (menu actions). */
export async function printReceipt(props: ReceiptProps, t: TFunction, force?: Exclude<PrintMode, 'auto'>): Promise<'service' | 'browser'> {
  const s = loadPrintSettings()
  const mode = force ?? s.mode
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
