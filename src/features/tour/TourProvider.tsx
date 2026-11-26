/**
 * Runs the guided tours of one module (the staff app, the admin panel or the patient's cabinet).
 *
 *  · The first time a reader enters the module its general tour starts by itself (the menu, the top bar); after
 *    that every page shows its own short tour on the first visit. Both can be switched off and asked for again
 *    from the «?» button (`TourButton`). What was seen is remembered per user in this browser (`storage.ts`).
 *  · While a tour runs nothing under it reacts: one frame marks what the step is about, the rest is dimmed, the card
 *    beside it is a dialog (so the app's own hotkeys stay silent) driven by its buttons or ← → / Esc.
 *  · A step whose target is not on the page is passed over, so the same tour fits every role and an empty list.
 *
 * `user` is who the memory belongs to — `null` switches everything off (a superadmin gets no tours).
 */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, GraduationCap, X } from 'lucide-react'
import { loadTourTexts } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { Button, toast } from '@/shared/ui'
import { pageTour, shellTour } from './registry'
import { markTourSeen, setTourAuto, tourMemory } from './storage'
import { TOP_SEEN, TOP_STEP_KEYS } from './tours/shell'
import type { TourAudience, TourDef, TourStep } from './types'

/** the side menu of the shell, when it can hide in a drawer (phones): the tour opens it for the steps about it */
export interface TourMenuControl { isDrawer: () => boolean; open: () => void; close: () => void }

export interface TourApi {
  /** tours exist for this reader */
  enabled: boolean
  active: boolean
  /** new pages open their tour by themselves */
  auto: boolean
  setAuto: (on: boolean) => void
  /** the page on screen has a tour of its own */
  hasPageTour: boolean
  startGeneral: () => void
  startPage: () => void
}
const OFF: TourApi = { enabled: false, active: false, auto: false, setAuto: () => {}, hasPageTour: false, startGeneral: () => {}, startPage: () => {} }
const Ctx = createContext<TourApi>(OFF)
export const useTour = () => useContext(Ctx)

interface Run { tour: TourDef; steps: TourStep[]; index: number; manual: boolean; withTop: boolean }
interface Box { top: number; left: number; width: number; height: number }

const HINT_SEEN = 'hint.reopen'
/** the name a tour is remembered under */
const memoryOf = (t: TourDef) => t.memory ?? t.id
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const dialogOpen = () => !!document.querySelector('[role="dialog"]')
const targetsOf = (s: TourStep): string[] => (s.target == null ? [] : Array.isArray(s.target) ? s.target : [s.target])
const onScreen = (el: Element) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
}
const find = (id: string): HTMLElement | undefined => [...document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)].find(onScreen)
/** what a step frames: every target on screen (`together`) or the first of them */
const elementsOf = (s: TourStep): HTMLElement[] => {
  const found = targetsOf(s).map(find).filter((e): e is HTMLElement => !!e)
  return s.together ? found : found.slice(0, 1)
}
/** the frame around the elements, a little wider than them, never outside the window */
function frame(els: HTMLElement[]): Box | null {
  if (!els.length) return null
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
  for (const e of els) {
    const q = e.getBoundingClientRect()
    l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom)
  }
  const pad = 6, edge = 4
  const left = Math.max(edge, l - pad), top = Math.max(edge, t - pad)
  const right = Math.min(window.innerWidth - edge, r + pad), bottom = Math.min(window.innerHeight - edge, b + pad)
  return { left: Math.round(left), top: Math.round(top), width: Math.max(0, Math.round(right - left)), height: Math.max(0, Math.round(bottom - top)) }
}
const sameBox = (a: Box | null, b: Box | null) => (!a || !b ? a === b : a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height)

type Side = 'top' | 'bottom' | 'left' | 'right'
/** Where the card stands beside the frame: the wished side when it fits, else the first that does, else over its foot. */
function place(box: Box, w: number, h: number, wish?: Side): { top: number; left: number; side: Side | 'over'; arrow: number } {
  const vw = window.innerWidth, vh = window.innerHeight, m = 12, gap = 14
  const cx = box.left + box.width / 2, cy = box.top + box.height / 2
  const fits: Record<Side, boolean> = {
    bottom: box.top + box.height + gap + h <= vh - m,
    top: box.top - gap - h >= m,
    right: box.left + box.width + gap + w <= vw - m,
    left: box.left - gap - w >= m,
  }
  const order: Side[] = [...(wish ? [wish] : []), 'bottom', 'top', 'right', 'left']
  const side = order.find((s) => fits[s])
  const clampX = (x: number) => Math.min(Math.max(m, x), Math.max(m, vw - w - m))
  const clampY = (y: number) => Math.min(Math.max(m, y), Math.max(m, vh - h - m))
  if (side === 'bottom' || side === 'top') {
    const left = clampX(cx - w / 2)
    return { side, left, top: side === 'bottom' ? box.top + box.height + gap : box.top - gap - h, arrow: Math.min(Math.max(18, cx - left), w - 18) }
  }
  if (side === 'right' || side === 'left') {
    const top = clampY(cy - h / 2)
    return { side, top, left: side === 'right' ? box.left + box.width + gap : box.left - gap - w, arrow: Math.min(Math.max(18, cy - top), h - 18) }
  }
  // no room around it (a table as tall as the window): the card lies over its lower part
  return { side: 'over', left: clampX(cx - w / 2), top: clampY(vh - h - 20), arrow: 0 }
}

export function TourProvider({ audience, user, name, menu, known, children }: {
  audience: TourAudience
  /** whose memory: `staff:<id>` / `patient:<id>`; null = no tours at all */
  user: string | null
  /** the reader's first name, for the welcome */
  name: string
  menu?: TourMenuControl
  /** whether a `data-tour` target exists for this reader although it may be off screen now (menu entries in a closed drawer) */
  known?: (id: string) => boolean | undefined
  children: ReactNode
}) {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const tRef = useRef(t)
  tRef.current = t
  const [run, setRun] = useState<Run | null>(null)
  const runRef = useRef(run)
  runRef.current = run
  const [auto, setAutoState] = useState(() => (user ? tourMemory(user).auto : false))
  useEffect(() => setAutoState(user ? tourMemory(user).auto : false), [user])
  const menuRef = useRef(menu)
  menuRef.current = menu
  const knownRef = useRef(known)
  knownRef.current = known
  /** the page a tour just ended on: its own tour waits for the next visit, not to pile one on another */
  const rested = useRef<string | null>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const page = useMemo(() => pageTour(pathname, audience), [pathname, audience])

  const exists = useCallback((id: string) => knownRef.current?.(id) ?? !!find(id), [])
  const stepPresent = useCallback((s: TourStep) => (targetsOf(s).length === 0 || targetsOf(s).some(exists)) && (!s.items || s.items.some((i) => exists(i.when))), [exists])

  const begin = useCallback((tour: TourDef, manual: boolean): boolean => {
    if (!user || runRef.current) return false
    const withTop = manual || !tourMemory(user).seen[TOP_SEEN]
    const steps = tour.steps.filter((s) => (withTop || !TOP_STEP_KEYS.has(s.key)) && stepPresent(s))
    // a tour is worth starting only when it has something to point at
    if (!steps.some((s) => targetsOf(s).length > 0)) return false
    lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setRun({ tour, steps, index: 0, manual, withTop })
    return true
  }, [user, stepPresent])

  const end = useCallback((completed: boolean) => {
    const r = runRef.current
    setRun(null)
    if (!r || !user) return
    const general = !r.tour.route
    markTourSeen(user, [memoryOf(r.tour), ...(general && r.withTop ? [TOP_SEEN] : [])], r.tour.version ?? 1)
    rested.current = window.location.pathname
    if (menuRef.current?.isDrawer()) menuRef.current.close()
    lastFocus.current?.focus?.({ preventScroll: true })
    lastFocus.current = null
    // closed before the end for the first time: say once where the tours live
    if (!completed && !r.manual && !tourMemory(user).seen[HINT_SEEN]) {
      markTourSeen(user, [HINT_SEEN])
      toast.info(tRef.current('tour.ui.reopenTitle'), tRef.current('tour.ui.reopenHint'))
    }
  }, [user])

  // a page change under a running tour (the browser's Back) ends it without a word — it will be offered again
  const runPath = useRef(pathname)
  useEffect(() => {
    if (runPath.current !== pathname) { runPath.current = pathname; setRun(null) }
  }, [pathname])

  // the first visit: the general tour of the module, later the tour of each page
  useEffect(() => {
    if (!user || run) return
    const mem = tourMemory(user)
    if (!mem.auto) return
    const shell = shellTour(audience)
    const shellDue = (mem.seen[memoryOf(shell)] ?? 0) < (shell.version ?? 1)
    const due = shellDue ? shell : page && (mem.seen[memoryOf(page)] ?? 0) < (page.version ?? 1) && rested.current !== pathname ? page : undefined
    if (rested.current && rested.current !== pathname) rested.current = null
    if (!due) return
    // `on` goes off when the page changes or the tour is no longer due
    const live = { on: true }
    // someone already working on the page is not interrupted: its tour waits for the next visit
    let busy = false
    const touch = () => { busy = true }
    if (!shellDue) { window.addEventListener('pointerdown', touch, true); window.addEventListener('keydown', touch, true) }
    void (async () => {
      // the tours' sentences are fetched while the page settles; without them (offline) the tour waits for another visit
      const texts = loadTourTexts().then(() => true, () => false)
      await sleep(500)
      // wait until the page has drawn what the tour points at and stopped changing: nothing is being loaded and
      // the same targets are there three looks in a row (a list that arrives late brings its steps with it)
      let last = -1, calm = 0
      for (let i = 0; live.on && i < 50 && calm < 3; i++) {
        const n = due.steps.filter((s) => targetsOf(s).length > 0 && stepPresent(s)).length
        calm = n > 0 && n === last && qc.isFetching() === 0 ? calm + 1 : 0
        last = n
        await sleep(200)
      }
      if (live.on && calm >= 3 && (await texts) && live.on && !busy && !dialogOpen() && document.visibilityState === 'visible') begin(due, false)
    })()
    return () => { live.on = false; window.removeEventListener('pointerdown', touch, true); window.removeEventListener('keydown', touch, true) }
  }, [user, audience, pathname, page, run, auto, begin, stepPresent, qc])

  const api = useMemo<TourApi>(() => (!user ? OFF : {
    enabled: true,
    active: !!run,
    auto,
    setAuto: (on) => { setTourAuto(user, on); setAutoState(on) },
    hasPageTour: !!page,
    startGeneral: () => { void loadTourTexts().then(() => { begin(shellTour(audience), true) }, () => toast.error(tRef.current('common.error'))) },
    startPage: () => { void loadTourTexts().then(() => { if (!page || !begin(page, true)) toast.info(tRef.current('tour.ui.pageNone')) }, () => toast.error(tRef.current('common.error'))) },
  }), [user, run, auto, page, audience, begin])

  return (
    <Ctx.Provider value={api}>
      {children}
      {run && createPortal(
        <TourView run={run} name={name} menu={menuRef} exists={exists}
          onIndex={(index) => setRun((r) => (r ? { ...r, index } : r))} onEnd={end} />,
        document.body,
      )}
    </Ctx.Provider>
  )
}

/** One running tour on the screen: the frame, the dimmed rest, the card. */
function TourView({ run, name, menu, exists, onIndex, onEnd }: {
  run: Run; name: string; menu: RefObject<TourMenuControl | undefined>; exists: (id: string) => boolean
  onIndex: (i: number) => void; onEnd: (completed: boolean) => void
}) {
  const { t } = useTranslation()
  const { steps, index, tour } = run
  const step = steps[index]!
  const total = steps.length
  const last = index === total - 1
  const pointed = targetsOf(step).length > 0
  /** the frame and the step it was measured for — it keeps its last place while the next target is being found */
  const [spot, setSpot] = useState<{ key: string; box: Box } | null>(null)
  const box = spot && spot.key === step.key ? spot.box : null
  /** the frame travels to a new step with a glide, then follows scrolling at once */
  const [gliding, setGliding] = useState(true)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [, setViewport] = useState(0)
  const card = useRef<HTMLDivElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  /** +1 forward, -1 back: a step that turns out to be missing is passed in the same direction */
  const dir = useRef(1)

  const go = useCallback((to: number) => {
    if (to < 0) return
    if (to >= total) { onEnd(true); return }
    dir.current = to >= index ? 1 : -1
    onIndex(to)
  }, [index, total, onEnd, onIndex])

  // find what the step points at, bring it into view, then follow it (scrolling, a layout that settles)
  useEffect(() => {
    setGliding(true)
    const m = menu.current
    if (m?.isDrawer()) { if (step.menu) m.open(); else m.close() }
    if (!pointed) { setSpot(null); return }
    let alive = true
    let raf = 0
    let seenAt = 0
    let shown = false
    const started = performance.now()
    const loop = () => {
      if (!alive) return
      const els = elementsOf(step)
      const now = performance.now()
      if (els.length) {
        if (!shown) {
          shown = true
          const r = els[0]!.getBoundingClientRect()
          const tall = r.height > window.innerHeight * 0.6
          if (tall) { if (r.top < 72 || r.top > window.innerHeight * 0.5) window.scrollBy({ top: r.top - 88, behavior: 'smooth' }) }
          else if (r.top < 72 || r.bottom > window.innerHeight - 12 || r.left < 0 || r.right > window.innerWidth) els[0]!.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
        }
        seenAt = now
        const next = frame(els)
        if (next) setSpot((prev) => (prev && prev.key === step.key && sameBox(prev.box, next) ? prev : { key: step.key, box: next }))
      } else if (now - (seenAt || started) > 1600) {
        // not on the page after all (or gone): on to the next one, the way the reader was going
        alive = false
        const to = index + dir.current
        if (to < 0) { dir.current = 1; go(index + 1) } else go(to)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const settle = setTimeout(() => setGliding(false), 420)
    return () => { alive = false; cancelAnimationFrame(raf); clearTimeout(settle) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, index])

  // the card's own size (texts differ in length and language) and the window's
  useLayoutEffect(() => {
    const el = card.current
    if (!el) return
    const measure = () => setSize((s) => (s && s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [index, tour])
  useEffect(() => {
    const on = () => setViewport((n) => n + 1)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const ready = !pointed || !!box
  useEffect(() => { if (ready) primary.current?.focus({ preventScroll: true }) }, [ready, index, tour])

  // keys: Esc closes, ← → walk, Tab stays inside the card; nothing reaches the page underneath
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onEnd(false) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); go(index + 1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); go(index - 1) }
      else if (e.key === 'Tab') {
        const f = [...(card.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])]
        if (!f.length) return
        const i = f.indexOf(document.activeElement as HTMLElement)
        e.preventDefault()
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]!.focus()
      }
      // no key reaches the page's own shortcuts while it is being explained (the browser's keys still work)
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [go, index, onEnd])

  const base = `${tour.i18n}.${step.key}`
  const title = t(`${base}.title`, { name })
  const body = t(`${base}.body`, { name, defaultValue: '' })
  const items = step.items?.filter((i) => exists(i.when))
  const pos = pointed && box && size ? place(box, size.w, size.h, step.placement) : null
  const welcome = !pointed && index === 0
  const titleId = `tour-title-${index}`
  const bodyId = `tour-body-${index}`

  return (
    <div className="fixed inset-0 z-[250]" data-tour-root={tour.id} data-tour-step={step.key}>
      {/* nothing under the tour reacts while it runs */}
      <div className="absolute inset-0" onPointerDown={(e) => e.preventDefault()} onWheel={(e) => e.stopPropagation()} />
      <div className={cn('tour-spot', gliding && 'is-gliding')} data-empty={!pointed || !spot || undefined}
        style={pointed && spot ? { top: spot.box.top, left: spot.box.left, width: spot.box.width, height: spot.box.height } : { top: '50%', left: '50%', width: 0, height: 0 }} />
      <motion.div
        key={`${tour.id}:${step.key}`} ref={card} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: ready && (!pointed || !!pos) ? 1 : 0, scale: 1 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn('tour-card fixed border border-line bg-bg-elevated text-ink shadow-3', welcome ? 'w-[min(27rem,calc(100vw-1.5rem))] rounded-[var(--radius-lg)] p-6 text-center sm:p-7' : 'w-[min(22.5rem,calc(100vw-1.5rem))] rounded-[var(--radius)] p-4')}
        style={pointed ? (pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }) : { top: '50%', left: '50%', translate: '-50% -50%' }}
        data-side={pos?.side}
      >
        {pos && pos.side !== 'over' && (
          <span aria-hidden className={cn('absolute size-3 rotate-45 border-line bg-bg-elevated',
            pos.side === 'bottom' && '-top-[6.5px] border-l border-t', pos.side === 'top' && '-bottom-[6.5px] border-b border-r',
            pos.side === 'right' && '-left-[6.5px] border-b border-l', pos.side === 'left' && '-right-[6.5px] border-r border-t')}
            style={pos.side === 'bottom' || pos.side === 'top' ? { left: pos.arrow - 6 } : { top: pos.arrow - 6 }} />
        )}
        {welcome ? (
          <>
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand-ink"><GraduationCap className="size-7" /></span>
            <h2 id={titleId} className="mt-4 text-[20px] font-semibold leading-snug tracking-[-0.02em]">{title}</h2>
            <p id={bodyId} className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{body}</p>
            <div className="mt-6 flex flex-col-reverse items-stretch gap-2 xs:flex-row xs:justify-center">
              <Button variant="ghost" onClick={() => onEnd(false)} data-tour-skip>{t('tour.ui.skip')}</Button>
              <Button ref={primary} onClick={() => go(index + 1)} rightIcon={<ArrowRight className="size-4" />} data-tour-next>{t('tour.ui.start')}</Button>
            </div>
            <p className="mt-4 text-[12px] text-ink-3 max-sm:hidden">{t('tour.ui.keys')}</p>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="min-w-0 text-[15.5px] font-semibold leading-snug">{title}</h2>
              <button type="button" onClick={() => onEnd(false)} aria-label={t('tour.ui.close')} title={t('tour.ui.close')} data-tour-skip
                className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"><X className="size-4" /></button>
            </div>
            <div id={bodyId} aria-live="polite">
              {body && <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">{body}</p>}
              {!!items?.length && (
                <dl className="mt-2.5 space-y-2">
                  {items.map((it) => (
                    <div key={it.when} className="flex gap-2.5 text-[13.5px] leading-snug">
                      <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand" />
                      <div className="min-w-0"><dt className="inline font-semibold text-ink">{t(it.label)}</dt><dd className="inline text-ink-2"> — {t(it.text)}</dd></div>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px] tabular text-ink-3">
                <span>{t('tour.ui.step', { n: index + 1, total })}</span>
                <span aria-hidden className="h-1 w-12 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} /></span>
              </div>
              <div className="flex items-center gap-1.5">
                {index > 0 && <Button variant="ghost" size="sm" onClick={() => go(index - 1)} leftIcon={<ArrowLeft className="size-3.5" />} data-tour-back>{t('tour.ui.back')}</Button>}
                <Button ref={primary} size="sm" onClick={() => go(index + 1)} rightIcon={last ? <Check className="size-3.5" /> : <ArrowRight className="size-3.5" />} data-tour-next>{last ? t('tour.ui.done') : t('tour.ui.next')}</Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
