import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Banknote, CreditCard, Landmark, Shuffle, ShieldCheck, Wallet } from 'lucide-react'
import type { Id, Order, PaymentMethod } from '@/domain'
import { Button, Field, Input, Modal, Segmented, Switch, toast } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtMoney } from '@/shared/lib/format'
import { usePayOrder } from '@/features/orders/queries'
import { paymentMethodLabel } from '@/features/orders/status'

const fmtInput = (n: number) => (n ? n.toLocaleString('ru-RU').replace(/,/g, ' ') : '')
const parseInput = (s: string) => Number(s.replace(/\D/g, '')) || 0

const METHODS: { value: PaymentMethod; icon: ReactNode }[] = [
  { value: 'cash', icon: <Banknote /> },
  { value: 'card', icon: <CreditCard /> },
  { value: 'transfer', icon: <Landmark /> },
  { value: 'insurance', icon: <ShieldCheck /> },
]
type Parts = Record<PaymentMethod, number>
const NO_PARTS: Parts = { cash: 0, card: 0, transfer: 0, insurance: 0 }

/**
 * Take a payment: the whole remaining amount or a part of it, by one method — or split over several methods at once
 * ("Bir nechta usulda to'lash": e.g. part cash, the rest by card). A split is one action: one SMS, one receipt.
 */
export function PayModal({ open, onClose, order, employeeId, onPaid }: { open: boolean; onClose: () => void; order: Order; employeeId: Id; onPaid: (paidAmount: number) => void }) {
  const { t } = useTranslation()
  const remaining = Math.max(0, order.total - order.paidAmount)
  const [amount, setAmount] = useState(remaining)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [split, setSplit] = useState(false)
  const [parts, setParts] = useState<Parts>(NO_PARTS)
  const [sms, setSms] = useState(true)
  const [done, setDone] = useState<{ amount: number; parts: [PaymentMethod, number][] } | null>(null)
  const pay = usePayOrder(employeeId)

  useEffect(() => { if (open) { setAmount(remaining); setSplit(false); setParts(NO_PARTS); setDone(null) } }, [open, remaining])

  const used = (Object.entries(parts) as [PaymentMethod, number][]).filter(([, v]) => v > 0)
  const total = split ? used.reduce((s, [, v]) => s + v, 0) : amount
  const valid = total > 0 && total <= remaining
  // switching to several methods starts from what was typed for the chosen one
  const toggleSplit = () => {
    if (!split) setParts({ ...NO_PARTS, [method]: amount })
    else { setAmount(Math.min(remaining, total) || remaining); if (used[0]) setMethod(used[0][0]) }
    setSplit(!split)
  }
  const setPart = (m: PaymentMethod, v: number) => setParts((p) => ({ ...p, [m]: v }))
  const fillRest = (m: PaymentMethod) => setPart(m, Math.max(0, remaining - (total - parts[m])))

  const submit = async () => {
    if (!valid) return
    const paid: [PaymentMethod, number][] = split ? used : [[method, amount]]
    try {
      // a split over one method is just a normal payment
      await pay.mutateAsync(paid.length > 1
        ? { orderId: order.id, amount: total, method: paid[0]![0], sendSms: sms, parts: paid.map(([m, a]) => ({ method: m, amount: a })) }
        : { orderId: order.id, amount: total, method: paid[0]![0], sendSms: sms })
      setDone({ amount: total, parts: paid })
      setTimeout(() => { onPaid(total); onClose() }, 1100)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title={t('staff.reception.payTitle')} description={`${order.number} · ${t('staff.reception.remaining')}: ${fmtMoney(remaining)}`}
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
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void submit() }}>
            {!split ? (
              <>
                <Field label={t('staff.reception.amount')} hint={amount < remaining && amount > 0 ? t('staff.reception.partialHint', { rest: fmtMoney(remaining - amount) }) : undefined} error={amount > remaining ? t('staff.reception.amountTooBig') : undefined}>
                  {(id) => (
                    <div className="flex items-stretch gap-2">
                      <Input id={id} value={fmtInput(amount)} onChange={(e) => setAmount(parseInput(e.target.value))} inputMode="numeric" mono className="h-12 text-[18px] font-semibold" autoFocus invalid={amount > remaining}
                        rightSlot={<span className="pr-2 text-[13px] text-ink-3">{t('common.sum')}</span>} />
                      <Button type="button" variant="soft" className="h-12" onClick={() => setAmount(remaining)}>{t('staff.reception.fullAmount')}</Button>
                    </div>
                  )}
                </Field>
                <Field label={t('staff.reception.method')}>
                  {() => (
                    <Segmented<PaymentMethod> value={method} onChange={setMethod} className="w-full [&>button]:flex-1"
                      items={METHODS.map((m) => ({ value: m.value, label: paymentMethodLabel(m.value), icon: m.icon }))} />
                  )}
                </Field>
              </>
            ) : (
              <Field label={t('staff.reception.splitTitle')} hint={t('staff.reception.splitHint')} error={total > remaining ? t('staff.reception.amountTooBig') : undefined}>
                {() => (
                  <div className="flex flex-col gap-2" data-pay-split>
                    {METHODS.map((m) => (
                      <div key={m.value} className={cn('flex items-center gap-2 rounded-[var(--radius)] border px-2.5 py-2 transition-colors', parts[m.value] > 0 ? 'border-brand/50 bg-brand-soft/30' : 'border-line')} data-pay-part={m.value}>
                        <span className="flex w-[104px] shrink-0 items-center gap-2 text-[13.5px] font-medium [&>svg]:size-4 [&>svg]:text-ink-3 max-xs:w-[84px]">{m.icon}<span className="truncate">{paymentMethodLabel(m.value)}</span></span>
                        <Input value={fmtInput(parts[m.value])} onChange={(e) => setPart(m.value, parseInput(e.target.value))} inputMode="numeric" mono placeholder="0" className="h-10 min-w-0 text-[15px] font-semibold" aria-label={paymentMethodLabel(m.value)} />
                        <Button type="button" size="sm" variant="ghost" className="shrink-0 px-2" onClick={() => fillRest(m.value)} disabled={total >= remaining && parts[m.value] === 0} data-pay-rest>{t('staff.reception.splitRest')}</Button>
                      </div>
                    ))}
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[var(--radius)] bg-surface-2/70 px-3 py-2 text-[13px]" data-pay-split-sum>
                      <span className="text-ink-3">{t('staff.reception.splitTotal')}: <b className={cn('tabular', total > remaining ? 'text-danger' : 'text-ink')}>{fmtMoney(total)}</b></span>
                      <span className="text-ink-3">{t('staff.reception.splitLeft')}: <b className="tabular text-ink">{fmtMoney(Math.max(0, remaining - total))}</b></span>
                    </div>
                    {total === 0 && <p className="text-[12.5px] text-ink-3">{t('staff.reception.splitEmpty')}</p>}
                  </div>
                )}
              </Field>
            )}
            <button type="button" onClick={toggleSplit} className="-mt-2 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-brand-ink hover:underline" data-pay-split-toggle>
              {split ? <Wallet className="size-4" /> : <Shuffle className="size-4" />}{split ? t('staff.reception.singlePay') : t('staff.reception.splitPay')}
            </button>
            <Switch checked={sms} onChange={setSms} label={t('staff.reception.sendSms')} description={t('staff.reception.sendSmsHint')} />
            <button type="submit" className="hidden" aria-hidden />
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  )
}
