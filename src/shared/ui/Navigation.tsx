import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

/* ---------- Tabs (underline) ---------- */
export interface TabItem<T extends string = string> { value: T; label: ReactNode; count?: number; icon?: ReactNode }
export function Tabs<T extends string>({ items, value, onChange, className, size = 'md' }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('relative flex gap-1 border-b border-line overflow-x-auto no-scrollbar', className)} role="tablist">
      {items.map((it) => {
        const active = it.value === value
        return (
          <button key={it.value} role="tab" aria-selected={active} onClick={() => onChange(it.value)}
            className={cn('relative flex items-center gap-2 whitespace-nowrap px-3 font-medium text-ink-3 transition-colors hover:text-ink', size === 'sm' ? 'h-9 text-[13px]' : 'h-11 text-[14px]', active && 'text-ink')}>
            {it.icon && <span className="[&>svg]:size-4">{it.icon}</span>}
            {it.label}
            {it.count != null && <span className={cn('rounded-full px-1.5 min-w-5 h-5 grid place-items-center text-[11px] tabular', active ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-ink-3')}>{it.count}</span>}
            {active && <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-brand" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({ items, value, onChange, className, size = 'md', wrap, block }: { items: { value: T; label: ReactNode; icon?: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string; size?: 'sm' | 'md'; /** allow items to wrap onto several lines (small screens) */ wrap?: boolean; /** stretch to container width, equal buttons */ block?: boolean }) {
  const id = useRef(`seg-${Math.random().toString(36).slice(2)}`).current
  return (
    <div className={cn('inline-flex items-center rounded-[10px] bg-surface-2 p-1 gap-0.5 max-w-full', wrap && 'flex-wrap', block && 'flex w-full', className)} role="radiogroup">
      {items.map((it) => {
        const active = it.value === value
        return (
          <button key={it.value} role="radio" aria-checked={active} onClick={() => onChange(it.value)}
            className={cn('relative rounded-[7px] font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1.5', size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3 text-[13px]', block && 'flex-1', active ? 'text-ink' : 'text-ink-3 hover:text-ink-2')}>
            {active && <motion.span layoutId={id} className="absolute inset-0 rounded-[7px] bg-surface shadow-1 border border-line/70" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="relative flex items-center gap-1.5 [&>svg]:size-3.5">{it.icon}{it.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Dropdown menu ---------- */
export interface MenuItem { key: string; label: ReactNode; icon?: ReactNode; danger?: boolean; disabled?: boolean; onSelect?: () => void; separatorBefore?: boolean }
export function Menu({ trigger, items, align = 'end', className }: { trigger: (open: boolean) => ReactNode; items: MenuItem[]; align?: 'start' | 'end'; className?: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; right: number }>({ top: 0, left: 0, right: 0 })
  const btnRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!btnRef.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, left: r.left, right: window.innerWidth - r.right })
    setOpen((o) => !o)
  }
  return (
    <>
      <div ref={btnRef} onClick={toggle} className={cn('inline-flex', className)}>{trigger(open)}</div>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'fixed', top: pos.top, ...(align === 'end' ? { right: pos.right } : { left: pos.left }) }}
              className="z-[90] min-w-48 rounded-[var(--radius)] border border-line bg-bg-elevated p-1.5 shadow-3" role="menu" onMouseDown={(e) => e.stopPropagation()}>
              {items.map((it) => (
                <div key={it.key}>
                  {it.separatorBefore && <div className="my-1 h-px bg-line" />}
                  <button role="menuitem" disabled={it.disabled} onClick={() => { it.onSelect?.(); setOpen(false) }}
                    className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors hover:bg-surface-2 disabled:opacity-40 [&>svg]:size-4 [&>svg]:text-ink-3', it.danger && 'text-danger hover:bg-danger-soft [&>svg]:text-danger')}>
                    {it.icon}{it.label}
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

/* ---------- Pagination ---------- */
export function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize, labels }: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void; onPageSize?: (s: number) => void; labels: { perPage: string; of: string; rows: string } }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-[13px] text-ink-3">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="tabular truncate">{from}–{to} {labels.of} {total} <span className="max-xs:hidden">{labels.rows}</span></span>
        {onPageSize && (
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="h-7 rounded-md border border-line bg-surface px-1.5 text-[12.5px]">
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / {labels.perPage.toLowerCase()}</option>)}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="grid size-9 sm:size-8 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-30"><ChevronLeft className="size-4" /></button>
        {/* compact "3 / 12" on phones */}
        <span className="sm:hidden tabular px-1 text-ink-2 font-medium">{page} / {totalPages}</span>
        {pageNumbers(page, totalPages).map((p, i) =>
          p === '…' ? <span key={`e${i}`} className="px-1 max-sm:hidden">…</span> : (
            <button key={p} onClick={() => onPage(p)} className={cn('h-8 min-w-8 px-2 rounded-lg tabular text-[13px] font-medium max-sm:hidden', p === page ? 'bg-brand text-white' : 'hover:bg-surface-2 text-ink-2')}>{p}</button>
          ),
        )}
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="grid size-9 sm:size-8 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-30"><ChevronRight className="size-4" /></button>
      </div>
    </div>
  )
}
function pageNumbers(p: number, n: number): (number | '…')[] {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const s = new Set([1, n, p - 1, p, p + 1].filter((x) => x >= 1 && x <= n))
  const arr = [...s].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  arr.forEach((x, i) => { if (i && x - (arr[i - 1] as number) > 1) out.push('…'); out.push(x) })
  return out
}

/* ---------- Tooltip (CSS only, simple) ---------- */
export function Tooltip({ label, children, side = 'top' }: { label: string; children: ReactNode; side?: 'top' | 'bottom' }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span role="tooltip" className={cn('pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11.5px] font-medium text-bg opacity-0 shadow-2 transition-all duration-150 group-hover/tt:opacity-100 dark:bg-surface-3 dark:text-ink', side === 'top' ? 'bottom-full mb-1.5 translate-y-1 group-hover/tt:translate-y-0' : 'top-full mt-1.5 -translate-y-1 group-hover/tt:translate-y-0')}>{label}</span>
    </span>
  )
}
