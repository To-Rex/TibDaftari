/**
 * Printable cheque (80mm thermal-style, also fine on A4). Rendered into a
 * body-level portal that is hidden on screen and becomes the only visible
 * content under @media print. Printed documents may use raw colours.
 */
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { Branch, Company, Order, OrderItem, Payment } from '@/domain'
import { fmtDateTime, fmtMoney, fmtPhone } from '@/shared/lib/format'
import { paymentMethodLabel } from '@/features/orders/status'

export interface ReceiptProps {
  order: Order
  items: OrderItem[]
  payments: Payment[]
  company?: Pick<Company, 'name' | 'phone' | 'address'> | null
  branch?: Pick<Branch, 'name' | 'address' | 'phone'> | null
  cashier?: string
}

const CSS = `
#receipt-print { display: none; }
@media print {
  @page { size: auto; margin: 8mm; }
  body > *:not(#receipt-print) { display: none !important; }
  #receipt-print { display: block !important; position: absolute; inset: 0; background: #fff; color: #000; font-family: 'JetBrains Mono Variable', ui-monospace, Consolas, monospace; font-size: 12px; line-height: 1.4; }
  #receipt-print .sheet { width: 80mm; margin: 0 auto; }
  #receipt-print h1 { font-size: 15px; font-weight: 700; margin: 0; }
  #receipt-print .muted { color: #444; font-size: 11px; }
  #receipt-print .rule { border-top: 1px dashed #000; margin: 6px 0; }
  #receipt-print table { width: 100%; border-collapse: collapse; }
  #receipt-print td { padding: 2px 0; vertical-align: top; }
  #receipt-print td.r { text-align: right; white-space: nowrap; }
  #receipt-print .tot td { font-weight: 700; font-size: 13px; }
  #receipt-print .center { text-align: center; }
}
`

export function Receipt({ order, items, payments, company, branch, cashier }: ReceiptProps) {
  const { t } = useTranslation()
  const live = items.filter((i) => i.status !== 'cancelled')
  const remaining = Math.max(0, order.total - order.paidAmount)
  return createPortal(
    <div id="receipt-print" aria-hidden>
      <style>{CSS}</style>
      <div className="sheet">
        <div className="center">
          <h1>{company?.name ?? ''}</h1>
          {branch && <div className="muted">{branch.name}{branch.address ? `, ${branch.address}` : ''}</div>}
          {(branch?.phone ?? company?.phone) && <div className="muted">{fmtPhone(branch?.phone ?? company?.phone)}</div>}
        </div>
        <div className="rule" />
        <table>
          <tbody>
            <tr><td>{t('staff.reception.receipt.number')}</td><td className="r">{order.number}</td></tr>
            <tr><td>{t('common.date')}</td><td className="r">{fmtDateTime(order.createdAt)}</td></tr>
            <tr><td>{t('staff.reception.receipt.patient')}</td><td className="r">{order.patientName}</td></tr>
            <tr><td>{t('common.phone')}</td><td className="r">{fmtPhone(order.patientPhone)}</td></tr>
            {cashier && <tr><td>{t('staff.reception.receipt.cashier')}</td><td className="r">{cashier}</td></tr>}
          </tbody>
        </table>
        <div className="rule" />
        <table>
          <tbody>
            {live.map((it, i) => (
              <tr key={it.id}>
                <td>{i + 1}. {it.serviceName}</td>
                <td className="r">{fmtMoney(it.finalPrice, false)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rule" />
        <table>
          <tbody>
            <tr><td>{t('staff.reception.subtotal')}</td><td className="r">{fmtMoney(order.subtotal, false)}</td></tr>
            {order.discountPercent > 0 && <tr><td>{t('staff.reception.discount')} {order.discountPercent}%</td><td className="r">-{fmtMoney(order.discountAmount, false)}</td></tr>}
            <tr className="tot"><td>{t('common.total')}</td><td className="r">{fmtMoney(order.total)}</td></tr>
            <tr><td>{t('staff.reception.paid')}</td><td className="r">{fmtMoney(order.paidAmount, false)}</td></tr>
            {remaining > 0 && <tr><td>{t('staff.reception.remaining')}</td><td className="r">{fmtMoney(remaining, false)}</td></tr>}
          </tbody>
        </table>
        {payments.length > 0 && (
          <>
            <div className="rule" />
            <table>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}><td className="muted">{fmtDateTime(p.createdAt)} · {paymentMethodLabel(p.method)}</td><td className="r">{fmtMoney(p.amount, false)}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <div className="rule" />
        <div className="center muted">{t('staff.reception.receipt.footer')}</div>
      </div>
    </div>,
    document.body,
  )
}
