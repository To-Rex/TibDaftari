import { create } from 'zustand'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

type Kind = 'success' | 'error' | 'info' | 'warning'
interface Toast { id: number; kind: Kind; title: string; description?: string }
interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}
let seq = 1
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = seq++
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), t.kind === 'error' ? 6000 : 3800)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

/** Imperative API: toast.success('Saqlandi') */
export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push({ kind: 'success', title, description }),
  error: (title: string, description?: string) => useToastStore.getState().push({ kind: 'error', title, description }),
  info: (title: string, description?: string) => useToastStore.getState().push({ kind: 'info', title, description }),
  warning: (title: string, description?: string) => useToastStore.getState().push({ kind: 'warning', title, description }),
}

const icons: Record<Kind, typeof CheckCircle2> = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle }
const colors: Record<Kind, string> = { success: 'text-ok', error: 'text-danger', info: 'text-info', warning: 'text-warn' }

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.kind]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 460, damping: 32 }}
              className="pointer-events-auto flex items-start gap-3 rounded-[var(--radius)] border border-line bg-bg-elevated p-3.5 pr-2 shadow-3"
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', colors[t.kind])} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium leading-5">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-ink-3 leading-5">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="grid size-7 place-items-center rounded-full text-ink-3 hover:bg-surface-2" aria-label="dismiss">
                <X className="size-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
