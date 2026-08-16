import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'link'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  block?: boolean
}

const base =
  'app-button relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none rounded-[var(--radius-sm)] transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-[var(--ease-out)] enabled:hover:-translate-y-px enabled:active:translate-y-0 active:scale-[0.985] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-[0_1px_0_rgb(0_0_0/0.08),inset_0_1px_0_rgb(255_255_255/0.18)] hover:bg-brand-strong',
  secondary: 'bg-surface text-ink border border-line-strong/70 shadow-1 hover:bg-surface-2 hover:border-line-strong',
  soft: 'bg-brand-soft text-brand-ink hover:bg-brand-soft/70 dark:hover:bg-brand-soft/80',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-95',
  link: 'text-brand-ink underline-offset-4 hover:underline px-0 h-auto',
}
const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-[12.5px] rounded-md',
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-[14px]',
  lg: 'h-12 px-5 text-[15px] rounded-[var(--radius)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], block && 'w-full', className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'secondary' | 'soft' | 'danger'
}
const iconSizes = { sm: 'size-8 [&>svg]:size-4', md: 'size-9 [&>svg]:size-[18px]', lg: 'size-11 [&>svg]:size-5' }
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', variant = 'ghost', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(base, 'rounded-full', variants[variant], iconSizes[size], className)}
      {...rest}
    />
  )
})
