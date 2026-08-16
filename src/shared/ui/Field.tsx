import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

/* ---------- Field wrapper: label, hint, error ---------- */
export interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  optionalText?: string
  className?: string
  children: (id: string) => ReactNode
  inline?: boolean
}
export function Field({ label, hint, error, required, optionalText, className, children, inline }: FieldProps) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', inline && 'sm:flex-row sm:items-center sm:gap-4', className)}>
      {label && (
        <label htmlFor={id} className={cn('text-[13px] font-medium text-ink-2 leading-none flex items-center gap-1', inline && 'sm:w-44 sm:shrink-0')}>
          {label}
          {required && <span className="text-danger">*</span>}
          {!required && optionalText && <span className="text-ink-3 font-normal">· {optionalText}</span>}
        </label>
      )}
      <div className="flex-1 min-w-0">
        {children(id)}
        {error ? (
          <p className="mt-1.5 text-[12.5px] text-danger animate-in">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-[12.5px] text-ink-3">{hint}</p>
        ) : null}
      </div>
    </div>
  )
}

/* ---------- Input ---------- */
export const inputBase =
  'w-full h-10 rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3 shadow-[inset_0_1px_0_rgb(0_0_0/0.02)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/12 focus:outline-none disabled:opacity-60 disabled:bg-surface-2 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  leftIcon?: ReactNode
  rightSlot?: ReactNode
  mono?: boolean
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, leftIcon, rightSlot, mono, ...rest }, ref) {
  if (!leftIcon && !rightSlot) return <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, mono && 'font-mono tabular', className)} {...rest} />
  return (
    <div className="relative">
      {leftIcon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 [&>svg]:size-4">{leftIcon}</span>}
      <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, leftIcon && 'pl-9', rightSlot && 'pr-10', mono && 'font-mono tabular', className)} {...rest} />
      {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">{rightSlot}</span>}
    </div>
  )
})

export interface SearchInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  value: string
  onChange: (v: string) => void
}
export function SearchInput({ value, onChange, className, ...rest }: SearchInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      leftIcon={<Search />}
      rightSlot={
        value ? (
          <button type="button" onClick={() => onChange('')} className="size-6 grid place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="clear">
            <X className="size-3.5" />
          </button>
        ) : null
      }
      className={className}
      {...rest}
    />
  )
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea({ className, invalid, ...rest }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, 'h-auto min-h-[88px] py-2.5 resize-y leading-relaxed', className)} {...rest} />
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} aria-invalid={invalid || undefined} className={cn(inputBase, 'appearance-none pr-9 cursor-pointer', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
    </div>
  )
})

/* ---------- Checkbox / Switch ---------- */
export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label className={cn('inline-flex items-center gap-2.5 cursor-pointer select-none text-[14px]', rest.disabled && 'opacity-50 cursor-not-allowed', className)}>
      <input type="checkbox" className="peer sr-only" {...rest} />
      <span className="grid size-[18px] place-items-center rounded-[5px] border border-line-strong bg-surface transition-all peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20 [&>svg]:scale-0 [&>svg]:transition-transform peer-checked:[&>svg]:scale-100">
        <svg viewBox="0 0 12 12" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5l2.5 2.5 4.5-5" /></svg>
      </span>
      {label && <span>{label}</span>}
    </label>
  )
}

export function Switch({ checked, onChange, label, description, disabled, size = 'md' }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?: boolean; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'w-8 h-[18px] after:size-3.5 after:translate-x-[2px] peer-checked:after:translate-x-[16px]' : 'w-10 h-[22px] after:size-[18px] after:translate-x-[2px] peer-checked:after:translate-x-[20px]'
  return (
    <label className={cn('flex items-start gap-3 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className={cn('relative shrink-0 rounded-full bg-line-strong transition-colors duration-200 peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20 after:absolute after:top-1/2 after:-translate-y-1/2 after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgb(0_0_0/0.25)] after:transition-transform after:duration-200 after:ease-[var(--ease-spring)]', dims)} />
      {(label || description) && (
        <span className="flex flex-col -mt-0.5">
          {label && <span className="text-[14px] font-medium leading-5">{label}</span>}
          {description && <span className="text-[12.5px] text-ink-3">{description}</span>}
        </span>
      )}
    </label>
  )
}
