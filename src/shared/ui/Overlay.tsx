import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { IconButton } from './Button'

const useLockScroll = (open: boolean) => {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
}
const useEscape = (open: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
}

const spring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const

/* ---------- Modal ---------- */
export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  hideClose?: boolean
  className?: string
}
const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-[min(96vw,1400px)]' }

export function Modal({ open, onClose, title, description, children, footer, size = 'md', hideClose, className }: ModalProps) {
  useLockScroll(open)
  useEscape(open, onClose)
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) setTimeout(() => ref.current?.querySelector<HTMLElement>('input,textarea,select,button:not([aria-label])')?.focus(), 30)
  }, [open])
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal>
          <motion.div initial={reduce ? false : { opacity: 0 }} animate={reduce ? undefined : { opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: reduce ? 0.01 : 0.2 }} className="app-modal-backdrop absolute inset-0 bg-ink/40 backdrop-blur-[2px] dark:bg-black/60" onClick={onClose} />
          <motion.div
            ref={ref}
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={reduce ? { duration: 0.01 } : spring}
            className={cn('app-modal-surface relative flex max-h-[92dvh] w-full flex-col rounded-t-[var(--radius-lg)] border border-line bg-bg-elevated shadow-3 sm:rounded-[var(--radius-lg)]', sizes[size], className)}
          >
            {(title || !hideClose) && (
              <div className="flex items-start gap-4 px-6 pt-5 pb-3">
                <div className="min-w-0 flex-1">
                  {title && <h2 className="text-[17px] font-semibold leading-6">{title}</h2>}
                  {description && <p className="mt-0.5 text-[13.5px] text-ink-3">{description}</p>}
                </div>
                {!hideClose && <IconButton label="close" size="sm" onClick={onClose} className="-mr-2 -mt-1"><X /></IconButton>}
              </div>
            )}
            <div className="px-6 pb-5 overflow-y-auto min-h-0 flex-1">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-line flex items-center justify-end gap-2 bg-surface/60 rounded-b-[var(--radius-lg)]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ---------- Drawer (side sheet) ---------- */
export function Drawer({ open, onClose, title, description, children, footer, side = 'right', width = 'max-w-xl', className }: { open: boolean; onClose: () => void; title?: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; side?: 'right' | 'left'; width?: string; className?: string }) {
  useLockScroll(open)
  useEscape(open, onClose)
  const reduce = useReducedMotion()
  const x = side === 'right' ? 40 : -40
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-[80] flex', side === 'right' ? 'justify-end' : 'justify-start')} role="dialog" aria-modal>
          <motion.div initial={reduce ? false : { opacity: 0 }} animate={reduce ? undefined : { opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: reduce ? 0.01 : 0.2 }} className="app-modal-backdrop absolute inset-0 bg-ink/40 backdrop-blur-[2px] dark:bg-black/60" onClick={onClose} />
          <motion.div initial={reduce ? false : { x, opacity: 0.6 }} animate={reduce ? undefined : { x: 0, opacity: 1 }} exit={reduce ? undefined : { x, opacity: 0 }} transition={reduce ? { duration: 0.01 } : spring} className={cn('app-drawer-surface relative flex h-full w-full flex-col border-l border-line bg-bg-elevated shadow-3', width, className)}>
            <div className="flex items-start gap-4 px-6 pt-5 pb-3 border-b border-line">
              <div className="min-w-0 flex-1">
                {title && <h2 className="text-[17px] font-semibold leading-6">{title}</h2>}
                {description && <p className="mt-0.5 text-[13.5px] text-ink-3">{description}</p>}
              </div>
              <IconButton label="close" size="sm" onClick={onClose} className="-mr-2 -mt-1"><X /></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-line flex items-center justify-end gap-2 bg-surface/60">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ---------- Confirm dialog ---------- */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmText, cancelText, danger, loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: ReactNode; description?: ReactNode; confirmText: string; cancelText: string; danger?: boolean; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title} description={description} hideClose
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-3.5 rounded-[var(--radius-sm)] text-[14px] font-medium text-ink-2 hover:bg-surface-2">{cancelText}</button>
          <button type="button" onClick={onConfirm} disabled={loading} className={cn('h-9 px-4 rounded-[var(--radius-sm)] text-[14px] font-medium text-white disabled:opacity-60', danger ? 'bg-danger' : 'bg-brand')}>{confirmText}</button>
        </>
      }
    >
      <span className="sr-only">confirm</span>
    </Modal>
  )
}
