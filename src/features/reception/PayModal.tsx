import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Calculator, Shuffle, Wallet } from 'lucide-react'
import type { Id, Order, PaymentMethod } from '@/domain'
import { Button, Field, Input, Modal, Switch, toast } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtMoney } from '@/shared/lib/format'
import { usePayOrder } from '@/features/orders/queries'
import { paymentMethodLabel } from '@/features/orders/status'
import { PAY_METHODS, cashSuggestions, dominant, splitTotal, startSplit, usedParts, type Split } from './paySplit'
import { MethodBar, MethodTiles, SplitRows, fmtInput, parseInput, selectAll } from './PaymentMethodFields'

/** the change calculator stays open for cashiers who use it (this browser only) */
const CHANGE_KEY = 'clinic.pay.changeCalc'
const readChangeOpen = () => { try { return localStorage.getItem(CHANGE_KEY) === '1' } catch { return false } }
const saveChangeOpen = (on: boolean) => { try { localStorage.setItem(CHANGE_KEY, on ? '1' : '0') } catch { /* private mode */ } }

/**
 * Take a payment: the whole remaining amount or a part of it, by one method — or split over several methods at once
 * ("Bir nechta usulda to'lash"). In a split the amount stays on its method and gives way as other methods are typed
 * (Naqd 100 000, Karta 5 000 → Naqd 95 000; see `paySplit`). A split is one action: one SMS, one receipt.
 * For cash, the change to hand back is worked out from what the patient gave (not stored).
 */
export function PayModal({ open, onClose, order, employeeId, onPaid }: { open: boolean; onClose: () => void; order: Order; employeeId: Id; onPaid: (paidAmount: number) => void }) {
  const { t } = useTranslation()
  const remaining = Math.max(0, order.total - order.paidAmount)
  const [amount, setAmount] = useState(remaining)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [split, setSplit] = useState<Split | null>(null)
  const [given, setGiven] = useState(0)
  const [changeOpen, setChangeOpen] = useState(readChangeOpen)
  const [sms, setSms] = useState(true)
  const [done, setDone] = useState<{ amount: number; parts: [PaymentMethod, number][]; change: number } | null>(null)
  const inputs = useRef<Partial<Record<PaymentMethod, HTMLInputElement | null>>>({})
  const pay = usePayOrder(employeeId)

  useEffect(() => { if (open) { setAmount(remaining); setSplit(null); setGiven(0); setDone(null) } }, [open, remaining])

  const paid: [PaymentMethod, number][] = split ? usedParts(split) : amount > 0 ? [[method, amount]] : []
  const total = split ? splitTotal(split) : amount
  const left = Math.max(0, remaining - total)
  const valid = total > 0 && total <= remaining
  const cash = paid.find(([m]) => m === 'cash')?.[1] ?? 0
  const change = changeOpen && given > 0 && cash > 0 ? given - cash : null
  const toggleChange = () => { const on = !changeOpen; setChangeOpen(on); saveChangeOpen(on); if (!on) setGiven(0) }

  const toggleSplit = () => {
    if (!split) {
      const s = startSplit(method, Math.min(amount, remaining) || remaining)
      setSplit(s)
      // the next amount typed is for another method
      const next = PAY_METHODS.find((m) => m !== s.base)
      requestAnimationFrame(() => { if (next) inputs.current[next]?.focus() })
    } else {
      setAmount(Math.min(remaining, total) || remaining)
      setMethod(dominant(split))
      setSplit(null)
    }
  }

  const submit = async () => {
    if (!valid) return
    try {
      // a split over one method is just a normal payment
      await pay.mutateAsync(paid.length > 1
        ? { orderId: order.id, amount: total, method: paid[0]![0], sendSms: sms, parts: paid.map(([m, a]) => ({ method: m, amount: a })) }
        : { orderId: order.id, amount: total, method: paid[0]![0], sendSms: sms })
      setDone({ amount: total, parts: paid, change: change && change > 0 ? change : 0 })
      setTimeout(() => { onPaid(total); onClose() }, change && change > 0 ? 2600 : 1100)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title={t('staff.reception.payTitle')} description={`${order.number} · ${order.patientName}`}
      footer={!done && (
        <>
          <Button variant="ghost" onClick={onClose} className="max-sm:px-2">{t('common.cancel')}</Button>
          <Button size="lg" onClick={() => void submit()} loading={pay.isPending} disabled={!valid} className="min-w-44 max-sm:min-w-0 max-sm:flex-1 max-sm:px-3" data-pay-confirm>{t('staff.reception.payConfirm', { amount: fmtMoney(total) })}</Button>
        </>
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8" data-pay-done>
            <motion.span className="grid size-20 place-items-center rounded-full bg-ok-soft text-ok" initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.08, 1] }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.15 }} />
              </svg>
            </motion.span>
            <p className="mt-4 text-[16px] font-semibold">{t('staff.reception.paidOk')}</p>
            <p className="mt-0.5 text-center text-[13.5px] text-ink-3 tabular">
              {fmtMoney(done.amount)} · {done.parts.length > 1 ? done.parts.map(([m, a]) => `${paymentMethodLabel(m)} ${fmtMoney(a, false)}`).join(' + ') : paymentMethodLabel(done.parts[0]![0])}
            </p>
            {done.change > 0 && (
              <p className="mt-3 rounded-lg bg-ok-soft px-3 py-1.5 text-[15px] font-semibold text-ok tabular" data-pay-done-change>{t('staff.reception.cashChange')}: {fmtMoney(done.change)}</p>
            )}
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void submit() }}>
            {/* what is due, and how this payment covers it (one bar segment per method) */}
            <div className="rounded-[var(--radius)] border border-line bg-surface-2/40 p-3.5" data-pay-summary>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('staff.reception.dueNow')}</div>
                  <div className="text-[22px] font-semibold leading-tight tabular">{fmtMoney(remaining)}</div>
                </div>
                {order.paidAmount > 0 && (
                  <div className="shrink-0 text-right text-[12px] leading-5 text-ink-3 tabular">
                    <div>{t('common.total')}: <span className="text-ink-2">{fmtMoney(order.total, false)}</span></div>
                    <div>{t('staff.reception.paid')}: <span className="text-ok">{fmtMoney(order.paidAmount, false)}</span></div>
                  </div>
                )}
              </div>
              <div className="mt-3"><MethodBar parts={paid} of={remaining} /></div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12.5px]" data-pay-split-sum>
                <span className="text-ink-3">{t('staff.reception.splitTotal')}: <b className={cn('tabular', total > remaining ? 'text-danger' : 'text-ink')} data-pay-total>{fmtMoney(total)}</b></span>
                <span className="text-ink-3">{t('staff.reception.splitLeft')}: <b className={cn('tabular', left > 0 ? 'text-warn' : 'text-ok')} data-pay-left>{fmtMoney(left)}</b></span>
              </div>
            </div>

            {!split ? (
              <>
                <Field label={t('staff.reception.method')}>
                  {() => (
                    <MethodTiles value={method} onChange={setMethod} label={t('staff.reception.method')} />
                  )}
                </Field>
                <Field label={t('staff.reception.amount')} hint={amount < remaining && amount > 0 ? t('staff.reception.partialHint', { rest: fmtMoney(remaining - amount) }) : undefined} error={amount > remaining ? t('staff.reception.amountTooBig') : undefined}>
                  {(id) => (
                    <div className="flex items-stretch gap-2">
                      <Input id={id} value={fmtInput(amount)} onChange={(e) => setAmount(parseInput(e.target.value))} onFocus={selectAll} inputMode="numeric" mono className="h-12 text-[18px] font-semibold" autoFocus invalid={amount > remaining} data-pay-amount
                        rightSlot={<span className="pr-2 text-[13px] text-ink-3">{t('common.sum')}</span>} />
                      <Button type="button" variant="soft" className="h-12" onClick={() => setAmount(remaining)} disabled={amount === remaining}>{t('staff.reception.fullAmount')}</Button>
                    </div>
                  )}
                </Field>
              </>
            ) : (
              <Field label={t('staff.reception.splitTitle')} hint={total === 0 ? t('staff.reception.splitEmpty') : split.auto ? t('staff.reception.splitHintAuto', { method: paymentMethodLabel(split.base) }) : t('staff.reception.splitHint')}>
                {() => (
                  <SplitRows split={split} onChange={setSplit} cap={remaining} inputs={inputs} />
                )}
              </Field>
            )}

            <div className="-mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <button type="button" onClick={toggleSplit} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-brand-ink hover:underline" data-pay-split-toggle>
                {split ? <Wallet className="size-4" /> : <Shuffle className="size-4" />}{split ? t('staff.reception.singlePay') : t('staff.reception.splitPay')}
              </button>
              {cash > 0 && (
                <button type="button" onClick={toggleChange} aria-expanded={changeOpen} className={cn('inline-flex w-fit items-center gap-1.5 text-[13px] font-medium hover:underline', changeOpen ? 'text-ink-2' : 'text-brand-ink')} data-pay-change-toggle>
                  <Calculator className="size-4" />{t('staff.reception.cashCalc')}
                </button>
              )}
            </div>

            {/* change for cash: what the patient handed over minus the cash part (a helper only, not sent) */}
            {cash > 0 && changeOpen && (
              <Field label={t('staff.reception.cashGiven')}>
                {(id) => (
                  <div className="flex flex-col gap-2" data-pay-change>
                    <div className="flex items-stretch gap-2">
                      <Input id={id} value={fmtInput(given)} onChange={(e) => setGiven(parseInput(e.target.value))} onFocus={selectAll} inputMode="numeric" mono placeholder={fmtInput(cash)} className="text-[15px] font-semibold"
                        rightSlot={<span className="pr-2 text-[13px] text-ink-3">{t('common.sum')}</span>} data-pay-given />
                      <div className={cn('flex min-w-[124px] flex-col justify-center rounded-[var(--radius-sm)] px-3 leading-tight', change == null ? 'bg-surface-2/70 text-ink-3' : change >= 0 ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger')} data-pay-change-value>
                        <span className="text-[11px] font-medium uppercase tracking-[0.06em] opacity-80">{change != null && change < 0 ? t('staff.reception.cashShort') : t('staff.reception.cashChange')}</span>
                        <span className="text-[15px] font-semibold tabular">{change == null ? '—' : fmtMoney(Math.abs(change))}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cashSuggestions(cash).map((v) => (
                        <button key={v} type="button" onClick={() => setGiven(v)} className={cn('rounded-full border px-2.5 py-1 text-[12.5px] font-medium tabular transition-colors', given === v ? 'border-brand bg-brand-soft/50 text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2')} data-pay-given-chip>
                          {fmtMoney(v, false)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Field>
            )}

            <Switch checked={sms} onChange={setSms} label={t('staff.reception.sendSms')} description={t('staff.reception.sendSmsHint')} />
            <button type="submit" className="hidden" aria-hidden />
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  )
}
