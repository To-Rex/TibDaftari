import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Banknote, CreditCard, Landmark, ShieldCheck } from 'lucide-react'
import type { Id, Order, PaymentMethod } from '@/domain'
import { Button, Field, Input, Modal, Segmented, Switch, toast } from '@/shared/ui'
import { errorMessage } from '@/shared/lib/errors'
import { fmtMoney } from '@/shared/lib/format'
import { usePayOrder } from '@/features/orders/queries'
import { paymentMethodLabel } from '@/features/orders/status'

const fmtInput = (n: number) => (n ? n.toLocaleString('ru-RU').replace(/,/g, ' ') : '')
const parseInput = (s: string) => Number(s.replace(/\D/g, '')) || 0

export function PayModal({ open, onClose, order, employeeId, onPaid }: { open: boolean; onClose: () => void; order: Order; employeeId: Id; onPaid: (paidAmount: number) => void }) {
  const { t } = useTranslation()
  const remaining = Math.max(0, order.total - order.paidAmount)
  const [amount, setAmount] = useState(remaining)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [sms, setSms] = useState(true)
  const [done, setDone] = useState(false)
  const pay = usePayOrder(employeeId)

  useEffect(() => { if (open) { setAmount(remaining); setDone(false) } }, [open, remaining])

  const valid = amount > 0 && amount <= remaining
  const submit = async () => {
    if (!valid) return
    try {
      await pay.mutateAsync({ orderId: order.id, amount, method, sendSms: sms })
      setDone(true)
      setTimeout(() => { onPaid(amount); onClose() }, 1100)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title={t('staff.reception.payTitle')} description={`${order.number} · ${t('staff.reception.remaining')}: ${fmtMoney(remaining)}`}
      footer={!done && (
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button size="lg" onClick={() => void submit()} loading={pay.isPending} disabled={!valid} className="min-w-44">{t('staff.reception.payConfirm', { amount: fmtMoney(amount) })}</Button>
        </>
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8">
            <motion.span className="grid size-20 place-items-center rounded-full bg-ok-soft text-ok" initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.08, 1] }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.15 }} />
              </svg>
            </motion.span>
            <p className="mt-4 text-[16px] font-semibold">{t('staff.reception.paidOk')}</p>
            <p className="mt-0.5 text-[13.5px] text-ink-3 tabular">{fmtMoney(amount)} · {paymentMethodLabel(method)}</p>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void submit() }}>
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
                  items={[
                    { value: 'cash', label: paymentMethodLabel('cash'), icon: <Banknote /> },
                    { value: 'card', label: paymentMethodLabel('card'), icon: <CreditCard /> },
                    { value: 'transfer', label: paymentMethodLabel('transfer'), icon: <Landmark /> },
                    { value: 'insurance', label: paymentMethodLabel('insurance'), icon: <ShieldCheck /> },
                  ]} />
              )}
            </Field>
            <Switch checked={sms} onChange={setSms} label={t('staff.reception.sendSms')} description={t('staff.reception.sendSmsHint')} />
            <button type="submit" className="hidden" aria-hidden />
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  )
}
