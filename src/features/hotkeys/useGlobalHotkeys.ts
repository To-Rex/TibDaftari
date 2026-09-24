/**
 * App-wide keyboard shortcuts (outside inputs, no Ctrl/⌘/Alt):
 *   ?          help          /          focus the page's search (`[data-search]` input)
 *   G + letter go to a page   [ / ]      previous / next page of a list (Pagination buttons)
 *   letter     the page's action carrying `data-hotkey="<letter>"` (e.g. N = new, C = new cheque)
 * Nothing fires while a dialog/drawer is open (they have their own keys: Esc, Enter flow).
 */
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export interface NavHotkey { key: string; to: string; label: string }
export interface PageHotkey { key: string; label: string }

const SEQUENCE_MS = 1500
const isEditable = (el: Element | null): boolean => !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || (el as HTMLElement).isContentEditable)
const dialogOpen = () => !!document.querySelector('[role="dialog"]')
const usable = (el: HTMLElement) => el.getClientRects().length > 0 && !(el as HTMLButtonElement).disabled && el.getAttribute('aria-disabled') !== 'true'
const labelOf = (el: HTMLElement) => el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent?.trim() || ''

/** Actions the current page exposes (`data-hotkey` on buttons/links), pagination keys excluded. */
export const pageHotkeys = (): PageHotkey[] => {
  const seen = new Set<string>()
  return [...document.querySelectorAll<HTMLElement>('[data-hotkey]')]
    .filter((el) => usable(el) && !['[', ']'].includes(el.dataset.hotkey ?? ''))
    .map((el) => ({ key: el.dataset.hotkey!, label: labelOf(el) }))
    .filter((h) => (seen.has(h.key) ? false : (seen.add(h.key), true)))
}
export const hasPagination = () => !!document.querySelector('[data-hotkey="]"]')

export function useGlobalHotkeys({ nav, onHelp }: { nav: NavHotkey[]; onHelp: () => void }) {
  const navigate = useNavigate()
  const navRef = useRef(nav)
  navRef.current = nav
  const helpRef = useRef(onHelp)
  helpRef.current = onHelp
  const goPending = useRef(0) // timestamp of a pending "G"

  useEffect(() => {
    const click = (selector: string) => {
      const el = [...document.querySelectorAll<HTMLElement>(selector)].find(usable)
      if (el) el.click()
      return !!el
    }
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      if (isEditable(e.target as Element | null) || dialogOpen()) return
      if (e.key === '?') { e.preventDefault(); helpRef.current(); return }
      if (e.key === '/') {
        const s = [...document.querySelectorAll<HTMLElement>('[data-search]')].find(usable)
        if (s) { e.preventDefault(); s.focus(); if (s instanceof HTMLInputElement) s.select() }
        return
      }
      const k = e.key.length === 1 ? e.key.toLowerCase() : ''
      if (!k) return
      if (goPending.current && Date.now() - goPending.current < SEQUENCE_MS) {
        goPending.current = 0
        const item = navRef.current.find((n) => n.key === k)
        if (item) { e.preventDefault(); navigate(item.to) }
        return
      }
      if (k === 'g') { goPending.current = Date.now(); return }
      if (click(`[data-hotkey="${CSS.escape(k)}"]`)) e.preventDefault()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [navigate])
}
