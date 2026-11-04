import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Banknote, ChevronDown, CreditCard, History, Landmark, LockKeyhole, PencilLine, ShieldCheck, Printer, Wallet, XCircle } from 'lucide-react'
import type { Order, Payment, PaymentMethod } from '@/domain'
import { Badge, Button, Card, IconButton, Menu, toast, type MenuItem } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { fmtDateTime, fmtMoney } from '@/shared/lib/format'
import { paymentMethodLabel, paymentStatusMeta } from '@/features/orders/status'

/** The latest correction of a payment in one line: what it was (or what it was split off), who and when. */
function correctionLine(p: Payment, t: (k: string, o?: Record<string, unknown>) => string) {
  const c = p.corrections?.at(-1)
  if (!c) return null
  const was = c.splitFrom || c.fromAmount !== p.amount ? `${paymentMethodLabel(c.fromMethod)} ${fmtMoney(c.fromAmount)}` : paymentMethodLabel(c.fromMethod)
  const what = c.splitFrom ? t('staff.reception.correctedSplit', { from: was }) : t('staff.reception.correctedFrom', { from: was })
  const who = [c.byName, fmtDateTime(c.at), c.reason && `«${c.reason}»`].filter(Boolean).join(' · ')
  return { what, who }
}

const METHOD_ICON: Record<PaymentMethod, typeof Banknote> = { cash: Banknote, card: CreditCard, transfer: Landmark, insurance: ShieldCheck }

export function OrderTotals({ order, payments, onPay, onPrint, printActions, onCancel, canPay, canCancel, onEditPayment, isLocked }: {
  order: Order; payments: Payment[]; onPay: () => void; onPrint: () => void
  /** extra ways to print (print service / browser / settings) shown in a small menu next to the button */
  printActions?: MenuItem[]; onCancel: () => void; canPay: boolean; canCancel: boolean
  /** correct a payment's method — the pencil on each live payment (absent = no right to) */
  onEditPayment?: (p: Payment) => void
  /** reception: payments over a day old show a lock instead (see `paymentWindow`) */
  isLocked?: (p: Payment) => boolean
}) {
  const { t } = useTranslation()
  const remaining = Math.max(0, order.total - order.paidAmount)
  const pay = paymentStatusMeta(order.payment)
  const closed = order.status === 'cancelled'
  const payable = canPay && !closed && order.itemCount > 0 && remaining > 0
  const cancellable = canCancel && !closed && order.payment === 'unpaid'
  const pct = order.total > 0 ? Math.min(100, Math.round((order.paidAmount / order.total) * 100)) : 0

  return (
    <div className="flex flex-col gap-4">
      <Card className="relative overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold">{t('staff.reception.totals')}</h3>
          <Badge tone={pay.tone} dot>{pay.label}</Badge>
        </div>
        <dl className="mt-4 flex flex-col gap-2 text-[13.5px]">
          <Row label={t('staff.reception.subtotal')} value={fmtMoney(order.subtotal)} />
          {order.discountPercent > 0 && <Row label={`${t('staff.reception.discount')} ${order.discountPercent}%`} value={`− ${fmtMoney(order.discountAmount)}`} className="text-ok" />}
          <div className="my-1 h-px bg-line" />
          <Row label={t('common.total')} value={fmtMoney(order.total)} strong />
          <Row label={t('staff.reception.paid')} value={fmtMoney(order.paidAmount)} className="text-ink-2" />
          <Row label={t('staff.reception.remaining')} value={fmtMoney(remaining)} strong className={remaining > 0 ? 'text-danger' : 'text-ok'} />
        </dl>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <motion.div className="h-full rounded-full bg-ok" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        </div>
        <div className="mt-5 flex flex-col gap-2">
          {payable && <Button size="lg" block data-hotkey="t" leftIcon={<Wallet className="size-4" />} onClick={onPay}>{t('staff.reception.pay')}</Button>}
          <div className={cn('grid gap-2', cancellable && 'xs:grid-cols-2')}>
            <span className="inline-flex items-center gap-1">
              <Button variant="secondary" data-hotkey="p" leftIcon={<Printer className="size-4" />} onClick={onPrint} disabled={order.itemCount === 0}>{t('common.print')}</Button>
              {printActions?.length ? <Menu align="start" trigger={() => <Button variant="secondary" className="px-2" aria-label={t('common.print')}><ChevronDown className="size-4" /></Button>} items={printActions} /> : null}
            </span>
            {cancellable && <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" leftIcon={<XCircle className="size-4" />} onClick={onCancel}>{t('staff.reception.cancelOrder')}</Button>}
          </div>
        </div>
      </Card>

      <Card padded={false}>
        <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between"><h3 className="text-[14px] font-semibold">{t('staff.reception.payments')}</h3><span className="text-[12px] text-ink-3 tabular">{payments.length}</span></div>
        <div className="border-t border-line">
          {payments.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-ink-3">{t('staff.reception.noPayments')}</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {[...payments].reverse().map((p, i) => {
                const Icon = METHOD_ICON[p.method]
                const fix = correctionLine(p, t)
                const editable = !!onEditPayment && !p.refundedAt && !closed
                const locked = editable && !!isLocked?.(p)
                return (
                  <motion.li key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="group flex items-center gap-3 px-4 sm:px-5 py-3" data-payment-row={p.method}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ok-soft text-ok"><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium">{paymentMethodLabel(p.method)}</span>
                      <span className="block text-[12px] text-ink-3 tabular">{fmtDateTime(p.createdAt)}</span>
                      {fix && (
                        <span className="mt-0.5 block text-[11.5px] leading-4" title={`${fix.what} · ${fix.who}`} data-payment-corrected>
                          <span className="flex items-start gap-1 font-medium text-warn"><History className="mt-0.5 size-3 shrink-0" /><span className="min-w-0 break-words">{fix.what}</span></span>
                          <span className="line-clamp-2 break-words text-ink-3">{fix.who}</span>
                        </span>
                      )}
                    </span>
                    <span className={cn('text-[14px] font-semibold tabular', p.refundedAt && 'line-through text-ink-3')}>{fmtMoney(p.amount)}</span>
                    {editable && (locked ? (
                      <IconButton label={t('staff.reception.paymentLocked')} size="sm" className="-mr-1.5 text-ink-3" data-payment-locked
                        onClick={() => toast.warning(t('staff.reception.paymentLocked'), t('staff.reception.paymentLockedHint'))}><LockKeyhole /></IconButton>
                    ) : (
                      <IconButton label={t('staff.reception.editPay')} size="sm" className="-mr-1.5 text-ink-3 hover:text-brand-ink" onClick={() => onEditPayment!(p)} data-payment-edit><PencilLine /></IconButton>
                    ))}
                  </motion.li>
                )
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}

function Row({ label, value, strong, className }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', className)}>
      <dt className={cn('text-ink-3', strong && 'text-ink font-medium')}>{label}</dt>
      <dd className={cn('tabular', strong ? 'text-[16px] font-semibold' : 'font-medium')}>{value}</dd>
    </div>
  )
}
