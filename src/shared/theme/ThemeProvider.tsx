import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { storage } from '@/shared/lib/storage'

export type ThemeMode = 'light' | 'dark' | 'system'
interface Ctx {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  setMode: (m: ThemeMode, origin?: { x: number; y: number }) => void
  toggle: (origin?: { x: number; y: number }) => void
}
const ThemeCtx = createContext<Ctx | null>(null)
const KEY = 'clinic.theme'

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => storage.get<ThemeMode>(KEY, 'system'))
  const [sys, setSys] = useState(systemDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = () => setSys(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  const resolved: 'light' | 'dark' = mode === 'system' ? (sys ? 'dark' : 'light') : mode

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  const apply = useCallback((m: ThemeMode, origin?: { x: number; y: number }) => {
    storage.set(KEY, m)
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!doc.startViewTransition || reduce || !origin) {
      setModeState(m)
      return
    }
    const t = doc.startViewTransition(() => setModeState(m))
    void t.ready.then(() => {
      const r = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y))
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${r}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      mode,
      resolved,
      setMode: apply,
      toggle: (o) => apply(resolved === 'dark' ? 'light' : 'dark', o),
    }),
    [mode, resolved, apply],
  )
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => {
  const c = useContext(ThemeCtx)
  if (!c) throw new Error('useTheme outside ThemeProvider')
  return c
}
