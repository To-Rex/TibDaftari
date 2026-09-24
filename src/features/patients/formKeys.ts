/**
 * Keyboard flow for front-desk forms: Enter moves to the next field (a tile radio group is one stop,
 * ← → pick a tile), Enter on the last stop submits, Ctrl/⌘+Enter submits from anywhere; textareas keep
 * Enter for new lines and buttons keep their own Enter. Fields that "fill up" (phone, passport, PINFL)
 * call `autoAdvance` so the cursor moves on without a keystroke.
 */
import type { KeyboardEvent } from 'react'

const STOP = 'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), [role="radio"]:not([disabled])'
const isVisible = (el: HTMLElement) => el.getClientRects().length > 0

/** Ordered focus stops of a form; a radiogroup contributes one stop (its checked tile, else the first). */
export function formStops(form: HTMLElement): HTMLElement[] {
  const groups = new Set<Element>()
  const out: HTMLElement[] = []
  for (const el of form.querySelectorAll<HTMLElement>(STOP)) {
    if (!isVisible(el)) continue
    const group = el.getAttribute('role') === 'radio' ? el.closest('[role="radiogroup"]') : null
    if (!group) { out.push(el); continue }
    if (groups.has(group)) continue
    groups.add(group)
    out.push(group.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ?? el)
  }
  return out
}

const groupOf = (el: HTMLElement) => (el.getAttribute('role') === 'radio' ? el.closest('[role="radiogroup"]') : null)

export function focusStop(el: HTMLElement): void {
  el.focus()
  if (el instanceof HTMLInputElement && ['text', 'tel', 'search', 'email', 'number', 'password'].includes(el.type)) el.select()
}

/** Focus the stop after `el`; false when `el` is the last one. */
export function focusNextStop(form: HTMLElement, el: HTMLElement): boolean {
  const stops = formStops(form)
  const group = groupOf(el)
  const i = stops.findIndex((s) => s === el || (group !== null && groupOf(s) === group))
  const next = stops[i + 1]
  if (!next) return false
  focusStop(next)
  return true
}

/** Move on from a field that just became complete (e.g. the 9th digit of a phone number). */
export function autoAdvance(el: HTMLElement): void {
  const form = el.closest('form')
  if (form) focusNextStop(form, el)
}

/** `onKeyDown` for the form element. */
export function formKeyDown(e: KeyboardEvent<HTMLFormElement>): void {
  if ((e.nativeEvent as globalThis.KeyboardEvent).isComposing) return
  const form = e.currentTarget
  const el = e.target as HTMLElement
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); return }
  const radio = el.getAttribute('role') === 'radio'
  if (radio && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault()
    const tiles = [...(groupOf(el)?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])]
    const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
    const next = tiles[(tiles.indexOf(el) + dir + tiles.length) % tiles.length]
    if (next) { next.click(); next.focus() }
    return
  }
  if (e.key !== 'Enter' || e.shiftKey || e.altKey) return
  if (el.tagName === 'TEXTAREA') return
  if (el.tagName === 'BUTTON' && !radio) return
  if (el instanceof HTMLInputElement && el.type === 'submit') return
  e.preventDefault()
  if (radio) el.click()
  if (!focusNextStop(form, el)) form.requestSubmit()
}
