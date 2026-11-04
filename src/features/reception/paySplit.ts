/**
 * Money maths of the pay dialog's "several methods" mode (pure, no React).
 *
 * `base` is the method the amount sat on before splitting (Naqd by default). While `auto`, it holds whatever the
 * other methods leave of `target` — typing 5 000 into Karta turns Naqd 100 000 into 95 000, clearing Karta gives it
 * back. Typing into `base` itself fixes it (auto off); from then on each method is independent. The sum never
 * exceeds `remaining`.
 */
import type { PaymentMethod } from '@/domain'

export const PAY_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer', 'insurance']
export type Parts = Record<PaymentMethod, number>
export const NO_PARTS: Parts = { cash: 0, card: 0, transfer: 0, insurance: 0 }

export interface Split {
  parts: Parts
  base: PaymentMethod
  auto: boolean
  target: number
}

const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max))
const sumOf = (parts: Parts, skip: PaymentMethod[] = []) => PAY_METHODS.reduce((s, m) => (skip.includes(m) ? s : s + parts[m]), 0)

export const splitTotal = (s: Split) => sumOf(s.parts)

/** The methods carrying money, in the fixed order. */
export const usedParts = (s: Split): [PaymentMethod, number][] => PAY_METHODS.filter((m) => s.parts[m] > 0).map((m) => [m, s.parts[m]])

export const startSplit = (base: PaymentMethod, amount: number): Split => ({ parts: { ...NO_PARTS, [base]: amount }, base, auto: true, target: amount })

export function setPart(s: Split, m: PaymentMethod, value: number, remaining: number): Split {
  if (m === s.base) return { ...s, auto: false, parts: { ...s.parts, [m]: clamp(value, remaining - sumOf(s.parts, [m])) } }
  // while auto the base gives way, so only the other non-base methods limit this one
  const v = clamp(value, remaining - sumOf(s.parts, s.auto ? [m, s.base] : [m]))
  const parts = { ...s.parts, [m]: v }
  if (s.auto) parts[s.base] = Math.max(0, s.target - sumOf(parts, [s.base]))
  return { ...s, parts }
}

/** "Qolganini": add what is still unpaid to `m` (the base stops giving way, or it would just move the money back). */
export function fillRest(s: Split, m: PaymentMethod, remaining: number): Split {
  const left = remaining - splitTotal(s)
  if (left <= 0) return s
  if (m === s.base && s.auto) return { ...s, target: remaining, parts: { ...s.parts, [m]: s.parts[m] + left } }
  return { ...s, auto: false, parts: { ...s.parts, [m]: s.parts[m] + left } }
}

/** Back to one method: the base if it still carries money, else the biggest part. */
export function dominant(s: Split): PaymentMethod {
  if (s.parts[s.base] > 0) return s.base
  return PAY_METHODS.reduce((best, m) => (s.parts[m] > s.parts[best] ? m : best), s.base)
}

/** Banknote-shaped amounts a patient is likely to hand over for `amount` (for the change calculator). */
export function cashSuggestions(amount: number): number[] {
  if (amount <= 0) return []
  const up = (step: number) => Math.ceil(amount / step) * step
  const out = [up(10_000), up(50_000), up(100_000), up(100_000) + 100_000].filter((v) => v > amount)
  return [...new Set(out)].slice(0, 3)
}
