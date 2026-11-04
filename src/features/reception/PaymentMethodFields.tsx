/**
 * The payment method controls shared by taking a payment (`PayModal`) and correcting one (`EditPaymentModal`):
 * method tiles, the several-methods rows (balanced by `paySplit`) and the bar that shows how the amount is covered.
 */
import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Banknote, CreditCard, Landmark, ShieldCheck, X } from 'lucide-react'
import type { PaymentMethod } from '@/domain'
import { Button, IconButton, Input } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { paymentMethodLabel } from '@/features/orders/status'
import { PAY_METHODS, fillRest, setPart, splitTotal, type Split } from './paySplit'

export const fmtInput = (n: number) => (n ? n.toLocaleString('ru-RU').replace(/,/g, ' ') : '')
export const parseInput = (s: string) => Number(s.replace(/\D/g, '')) || 0
export const selectAll = (e: { currentTarget: HTMLInputElement }) => e.currentTarget.select()

export const METHOD_ICON: Record<PaymentMethod, typeof Banknote> = { cash: Banknote, card: CreditCard, transfer: Landmark, insurance: ShieldCheck }
/** one colour per method: the bar segment and the row's icon */
export const METHOD_TONE: Record<PaymentMethod, { bar: string; chip: string }> = {
  cash: { bar: 'bg-ok', chip: 'bg-ok-soft text-ok' },
  card: { bar: 'bg-info', chip: 'bg-info-soft text-info' },
  transfer: { bar: 'bg-warn', chip: 'bg-warn-soft text-warn' },
  insurance: { bar: 'bg-brand', chip: 'bg-brand-soft text-brand-ink' },
}

/** One method of four, as big tiles. `marked` gets a small caption (e.g. the payment's current method). */
export function MethodTiles({ value, onChange, label, marked, markedText }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void; label: string; marked?: PaymentMethod; markedText?: string }) {
  return (
    <div className="grid grid-cols-4 gap-2 max-xs:grid-cols-2" role="radiogroup" aria-label={label}>
      {PAY_METHODS.map((m) => {
        const Icon = METHOD_ICON[m]
        const on = m === value
        return (
          <button key={m} type="button" role="radio" aria-checked={on} onClick={() => onChange(m)} data-pay-method={m}
            className={cn('relative flex min-w-0 flex-col items-center gap-1.5 rounded-[var(--radius)] border px-1.5 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20',
              on ? 'border-brand bg-brand-soft/50 text-brand-ink' : 'border-line text-ink-2 hover:border-line-strong hover:bg-surface-2/60')}>
            <Icon className="size-5" /><span className="max-w-full truncate">{paymentMethodLabel(m)}</span>
            {m === marked && markedText && <span className="-mt-1 max-w-full truncate text-[10.5px] font-normal leading-tight text-ink-3" data-pay-method-marked>{markedText}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** The four methods as amount rows; `cap` is the most they may add up to (balancing rules in `paySplit`). */
export function SplitRows({ split, onChange, cap, inputs }: { split: Split; onChange: (s: Split) => void; cap: number; inputs?: MutableRefObject<Partial<Record<PaymentMethod, HTMLInputElement | null>>> }) {
  const { t } = useTranslation()
  const left = Math.max(0, cap - splitTotal(split))
  return (
    <div className="flex flex-col gap-2" data-pay-split>
      {PAY_METHODS.map((m) => {
        const Icon = METHOD_ICON[m]
        const v = split.parts[m]
        const auto = m === split.base && split.auto
        return (
          <div key={m} className={cn('flex items-center gap-2 rounded-[var(--radius)] border px-2.5 py-2 transition-colors', v > 0 ? 'border-brand/40 bg-brand-soft/25' : 'border-line')} data-pay-part={m}>
            <span className="flex w-[116px] shrink-0 items-center gap-2 max-xs:w-[104px]">
              <span className={cn('grid size-7 shrink-0 place-items-center rounded-md transition-colors', v > 0 ? METHOD_TONE[m].chip : 'bg-surface-2 text-ink-3')}><Icon className="size-4" /></span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-medium leading-tight">{paymentMethodLabel(m)}</span>
                {auto && <span className="block truncate text-[11px] leading-tight text-ink-3" data-pay-auto>{t('staff.reception.splitAuto')}</span>}
              </span>
            </span>
            <Input ref={(el) => { if (inputs) inputs.current[m] = el }} value={fmtInput(v)} onChange={(e) => onChange(setPart(split, m, parseInput(e.target.value), cap))} onFocus={selectAll}
              inputMode="numeric" mono placeholder="0" className="h-10 min-w-0 text-[15px] font-semibold" aria-label={paymentMethodLabel(m)} />
            {/* same width on every row, so the inputs stay aligned */}
            <span className={cn('flex shrink-0 justify-end', left > 0 ? 'w-[84px] max-xs:w-[72px]' : 'w-8')}>
              {left > 0 ? (
                <Button type="button" size="sm" variant="ghost" className="px-2" onClick={() => onChange(fillRest(split, m, cap))} data-pay-rest>{t('staff.reception.splitRest')}</Button>
              ) : v > 0 && !auto ? (
                <IconButton type="button" label={t('staff.reception.splitClear')} size="sm" onClick={() => onChange(setPart(split, m, 0, cap))} data-pay-clear><X /></IconButton>
              ) : null}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** How `of` is covered: one coloured segment per method, the rest empty. */
export function MethodBar({ parts, of }: { parts: [PaymentMethod, number][]; of: number }) {
  const pct = (v: number) => (of > 0 ? Math.min(100, (v / of) * 100) : 0)
  return (
    <div className="flex h-2 gap-px overflow-hidden rounded-full bg-surface-3" aria-hidden>
      {parts.map(([m, a]) => (
        <motion.span key={m} className={cn('h-full', METHOD_TONE[m].bar)} initial={false} animate={{ width: `${pct(a)}%` }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} />
      ))}
    </div>
  )
}
