/**
 * Correcting how a taken payment was paid — e.g. card typed as cash, or part of it was by card. The amount, time,
 * cashier and facility stay (the backend keeps them), so only the method split of that money changes in the reports.
 * One method, or several balanced like in `PayModal` (they must cover the whole payment). Reception only within a day
 * of the payment; admin / rahbar any time (`paymentWindow`).
 */
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Clock3, PencilLine, Shuffle, Wallet } from 'lucide-react'
import type { Order, Payment, PaymentMethod } from '@/domain'
import { Button, Field, Modal, Textarea, toast } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDateTime, fmtMoney } from '@/shared/lib/format'
import { useChangePaymentMethod } from '@/features/orders/queries'
import { PAYMENT_EDIT_HOURS } from '@/features/orders/paymentWindow'
import { paymentMethodLabel } from '@/features/orders/status'
import { PAY_METHODS, dominant, splitTotal, startSplit, usedParts, type Split } from './paySplit'
import { METHOD_ICON, METHOD_TONE, MethodBar, MethodTiles, SplitRows } from './PaymentMethodFields'

const partsText = (parts: [PaymentMethod, number][]) => parts.map(([m, a]) => `${paymentMethodLabel(m)} ${fmtMoney(a, false)}`).join(' + ')

export function EditPaymentModal({ order, payment, onClose, showDeadline }: { order: Order; payment: Payment | null; onClose: () => void; /** reception: say until when it can be corrected */ showDeadline?: boolean }) {
  const { t } = useTranslation()
  const change = useChangePaymentMethod(order.id)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [split, setSplit] = useState<Split | null>(null)
  const [reason, setReason] = useState('')
  const inputs = useRef<Partial<Record<PaymentMethod, HTMLInputElement | null>>>({})

  // a fresh form per opening (a refetch of the same payment keeps what is typed); the last payment stays on screen
  // while the dialog animates out
  const [openId, setOpenId] = useState<string | null>(null)
  const [shown, setShown] = useState<Payment | null>(null)
  if (payment && payment.id !== openId) { setOpenId(payment.id); setShown(payment); setMethod(payment.method); setSplit(null); setReason('') }
  if (!payment && openId) setOpenId(null)
  const p = payment ?? shown
  if (!p) return null

  const amount = p.amount
  const current = p.method
  const parts: [PaymentMethod, number][] = split ? usedParts(split) : [[method, amount]]
  const total = split ? splitTotal(split) : amount
  const left = amount - total
  const unchanged = parts.length === 1 && parts[0]![0] === current
  const valid = total === amount && !unchanged

  const toggleSplit = () => {
    if (!split) {
      const s = startSplit(method, amount)
      setSplit(s)
      // the next amount typed is for another method
      const next = PAY_METHODS.find((m) => m !== s.base)
      requestAnimationFrame(() => { if (next) inputs.current[next]?.focus() })
    } else {
      setMethod(dominant(split))
      setSplit(null)
    }
  }

  const submit = async () => {
    if (!valid) return
    try {
      await change.mutateAsync({ paymentId: p.id, parts: parts.map(([m, a]) => ({ method: m, amount: a })), reason: reason.trim() || undefined })
      toast.success(t('staff.reception.editPaySaved'), `${paymentMethodLabel(current)} → ${partsText(parts)}`)
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const CurrentIcon = METHOD_ICON[current]
  const deadline = new Date(Date.parse(p.createdAt) + PAYMENT_EDIT_HOURS * 3_600_000).toISOString()

  return (
    <Modal open={!!payment} onClose={onClose} size="sm" title={t('staff.reception.editPay')} description={`${order.number} · ${fmtDateTime(p.createdAt)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button leftIcon={<PencilLine className="size-4" />} loading={change.isPending} disabled={!valid} onClick={() => void submit()} className="min-w-36" data-edit-pay-save>{t('staff.reception.editPaySave')}</Button>
        </>
      }>
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        {/* the fixed amount, and what it becomes */}
        <div className="rounded-[var(--radius)] border border-line bg-surface-2/40 p-3.5" data-edit-pay-summary>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('staff.reception.editPayAmount')}</div>
              <div className="text-[22px] font-semibold leading-tight tabular">{fmtMoney(amount)}</div>
            </div>
            <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium', METHOD_TONE[current].chip)}>
              <CurrentIcon className="size-3.5" />{paymentMethodLabel(current)}
            </span>
          </div>
          <div className="mt-3"><MethodBar parts={parts} of={amount} /></div>
          <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px]" data-edit-pay-preview>
            <span className="text-ink-3">{paymentMethodLabel(current)}</span>
            <ArrowRight className="size-3.5 text-ink-3" />
            {unchanged || total === 0
              ? <span className="text-ink-3">{t('staff.reception.editPaySame')}</span>
              : <b className="tabular">{partsText(parts)}</b>}
            {left > 0 && total > 0 && <span className="ml-auto font-medium text-warn tabular" data-edit-pay-left>{t('staff.reception.editPayLeft', { amount: fmtMoney(left) })}</span>}
          </div>
        </div>

        {!split ? (
          <Field label={t('staff.reception.editPayTo')}>
            {() => <MethodTiles value={method} onChange={setMethod} label={t('staff.reception.editPayTo')} marked={current} markedText={t('staff.reception.editPayNow')} />}
          </Field>
        ) : (
          <Field label={t('staff.reception.splitTitle')} hint={split.auto ? t('staff.reception.splitHintAuto', { method: paymentMethodLabel(split.base) }) : t('staff.reception.splitHint')}>
            {() => <SplitRows split={split} onChange={setSplit} cap={amount} inputs={inputs} />}
          </Field>
        )}
        <button type="button" onClick={toggleSplit} className="-mt-2 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-brand-ink hover:underline" data-edit-pay-split-toggle>
          {split ? <Wallet className="size-4" /> : <Shuffle className="size-4" />}{split ? t('staff.reception.editPaySingle') : t('staff.reception.editPaySplit')}
        </button>

        <Field label={t('staff.reception.editPayReason')} optionalText={t('common.optional')}>
          {(id) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder={t('staff.reception.editPayReasonPh')} data-edit-pay-reason />}
        </Field>

        <p className="-mt-1 text-[12.5px] leading-relaxed text-ink-3">{t('staff.reception.editPayHint')}</p>
        {showDeadline && (
          <p className="-mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-3" data-edit-pay-deadline><Clock3 className="size-3.5 shrink-0" />{t('staff.reception.editPayUntil', { time: fmtDateTime(deadline) })}</p>
        )}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  )
}
