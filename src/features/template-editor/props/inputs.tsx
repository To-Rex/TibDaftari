import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { inputBase } from '@/shared/ui'

/** Compact labelled row used across the properties panel. */
export function PropRow({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('grid grid-cols-[76px_1fr] items-center gap-2 min-h-8', className)}>
      <span className="text-[12px] text-ink-3 truncate">{label}</span>
      <span className="min-w-0 flex items-center gap-1.5">{children}</span>
    </label>
  )
}

export function PropSection({ title, children, defaultOpen = true }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-line last:border-b-0">
      <summary className="flex items-center justify-between cursor-pointer select-none px-3 h-9 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3 hover:text-ink list-none [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-ink-3 transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="px-3 pb-3 flex flex-col gap-1.5">{children}</div>
    </details>
  )
}

const small = 'h-8 text-[12.5px] px-2 rounded-md'

export function NumInput({ value, onChange, min, max, step = 1, className, suffix, disabled }: { value: number | undefined; onChange: (v: number) => void; min?: number; max?: number; step?: number; className?: string; suffix?: string; disabled?: boolean }) {
  return (
    <span className={cn('relative flex-1 min-w-0', className)}>
      <input type="number" value={value ?? ''} min={min} max={max} step={step} disabled={disabled}
        onChange={(e) => { const v = e.target.value === '' ? 0 : Number(e.target.value); if (!Number.isNaN(v)) onChange(v) }}
        className={cn(inputBase, small, 'font-mono tabular pr-6 w-full')} />
      {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] text-ink-3">{suffix}</span>}
    </span>
  )
}

export function TextInput({ value, onChange, placeholder, className, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; mono?: boolean }) {
  return <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(inputBase, small, 'w-full', mono && 'font-mono', className)} />
}

export function SelectInput<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={cn(inputBase, small, 'w-full cursor-pointer', className)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

/** Colour swatch + hex, with an optional "none" toggle. */
export function ColorInput({ value, onChange, allowNone, noneLabel = '—' }: { value: string | undefined; onChange: (v: string | undefined) => void; allowNone?: boolean; noneLabel?: string }) {
  const none = !value || value === 'transparent' || value === 'none'
  const hex = none ? '#ffffff' : /^#[0-9a-f]{6}$/i.test(value!) ? value! : '#000000'
  return (
    <span className="flex items-center gap-1.5 flex-1 min-w-0">
      <span className="relative size-8 shrink-0 rounded-md border border-line overflow-hidden" style={{ background: none ? 'repeating-conic-gradient(#ccc 0 25%, transparent 0 50%) 0 0/8px 8px' : value }}>
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer size-full" />
      </span>
      <input value={none ? '' : value} placeholder={noneLabel} onChange={(e) => onChange(e.target.value || undefined)} className={cn(inputBase, small, 'font-mono w-full')} />
      {allowNone && <button type="button" onClick={() => onChange(none ? '#000000' : undefined)} className={cn('h-8 px-2 rounded-md text-[11px] border border-line', none ? 'bg-surface-2 text-ink' : 'text-ink-3 hover:bg-surface-2')}>{noneLabel}</button>}
    </span>
  )
}

export function ToggleChip({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return <button type="button" title={title} onClick={onClick} className={cn('h-8 min-w-8 px-2 rounded-md border text-[12px] grid place-items-center transition-colors [&>svg]:size-4', active ? 'bg-brand-soft border-brand/40 text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2')}>{children}</button>
}
