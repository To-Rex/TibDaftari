import { Check, Mars, Venus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Gender } from '@/domain'
import { cn } from '@/shared/lib/cn'

/**
 * Two input-height tiles instead of a small segmented control: the gender choice is easy to skip by eye
 * in a long form, so the empty state is drawn dashed and the chosen tile in the brand colour.
 */
export function GenderPicker({ id, value, onChange, className }: { id?: string; value: Gender | ''; onChange: (v: Gender) => void; className?: string }) {
  const { t } = useTranslation()
  const items: { value: Gender; label: string; Icon: typeof Mars }[] = [
    { value: 'male', label: t('common.male'), Icon: Mars },
    { value: 'female', label: t('common.female'), Icon: Venus },
  ]
  return (
    <div id={id} role="radiogroup" className={cn('grid grid-cols-2 gap-3', className)}>
      {items.map(({ value: v, label, Icon }) => {
        const active = value === v
        return (
          <button key={v} type="button" role="radio" aria-checked={active} onClick={() => onChange(v)}
            className={cn(
              'relative flex h-12 items-center justify-center gap-2.5 rounded-[var(--radius-sm)] border-2 px-3 text-[15px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
              active
                ? 'border-brand bg-brand-soft text-brand-ink shadow-1'
                : value
                  ? 'border-line bg-surface text-ink-3 hover:border-line-strong hover:text-ink-2'
                  : 'border-dashed border-brand/70 bg-brand-soft/35 text-brand-ink hover:border-brand hover:bg-brand-soft/70',
            )}>
            <span className={cn('grid size-7 shrink-0 place-items-center rounded-full transition-colors', active ? 'bg-brand text-white' : value ? 'bg-surface-2 text-ink-3' : 'bg-brand/15 text-brand-ink')}><Icon className="size-4" /></span>
            {label}
            {active && <Check className="absolute right-3 size-4" />}
          </button>
        )
      })}
    </div>
  )
}
