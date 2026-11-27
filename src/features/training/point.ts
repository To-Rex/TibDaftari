/**
 * «Here»: after the checklist has led to the record a task is done on, the control to press there is brought into
 * view and ringed for a few seconds. The control is named by the mark the guided tours already use (`data-tour`);
 * the page may still be loading, so it is waited for — and nothing happens when it never appears.
 *
 * It never competes for the reader's eyes: while a window lies over the page (the payment, the patient form) or a
 * guided tour is explaining it, the ring waits, and shows once the page is the reader's own again.
 */
const CLASS = 'training-point'
/** how long the control is waited for, and how long the ring stays */
const WAIT_MS = 6000
const SHOW_MS = 5200
/** a tour or a window may take its time — the ring waits this long for them at most */
const PATIENCE_MS = 180_000
const TICK_MS = 200

let stop: (() => void) | null = null

const visible = (el: Element) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
}
/** something else has the reader's attention: a guided tour, or a window over the page */
const covered = () => !!document.querySelector('[data-tour-root], [role="dialog"]')

export function pointAt(mark: string | undefined): void {
  stop?.()
  stop = null
  if (!mark || typeof document === 'undefined') return
  let timer = 0
  let shown: HTMLElement | null = null
  let shownAt = 0
  const started = Date.now()
  let deadline = started + WAIT_MS
  const hide = () => { shown?.classList.remove(CLASS); shown = null }
  const off = () => { window.clearTimeout(timer); hide(); if (stop === off) stop = null }
  stop = off
  const tick = () => {
    const now = Date.now()
    if (now - started > PATIENCE_MS) return off()
    if (covered()) {
      // wait it out, then start afresh: the control is looked for again and ringed for its full time
      hide()
      deadline = now + WAIT_MS
      timer = window.setTimeout(tick, TICK_MS)
      return
    }
    if (!shown) {
      const el = [...document.querySelectorAll<HTMLElement>(`[data-tour="${mark}"]`)].find(visible)
      if (!el) {
        if (now < deadline) timer = window.setTimeout(tick, TICK_MS); else off()
        return
      }
      shown = el
      shownAt = now
      const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' })
      el.classList.add(CLASS)
    }
    if (now - shownAt < SHOW_MS) timer = window.setTimeout(tick, TICK_MS); else off()
  }
  // let the page that was just navigated to draw first (and its own tour, if it has one to show, begin)
  timer = window.setTimeout(tick, 350)
}
