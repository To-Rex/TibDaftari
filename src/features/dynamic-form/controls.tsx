/** Small controlled inputs used by FieldRenderer (number, pills, chips). */
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { NumberField, SelectOption } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Input, Select } from '@/shared/ui'
import type { Flag, PatientCtx } from './types'
import { formatNumber, numberFlag, referenceFor } from './logic'

export const flagPill: Record<Flag, string> = {
  normal: 'bg-ok-soft text-ok border-ok/30',
  abnormal: 'bg-warn-soft text-warn border-warn/30',
  critical: 'bg-danger-soft text-danger border-danger/30',
  unknown: 'bg-brand-soft text-brand-ink border-brand/30',
}
const flagText: Record<Flag, string> = {
  normal: 'text-ok',
  abnormal: 'text-warn',
  critical: 'text-danger',
  unknown: 'text-ink-3',
}

const parseNum = (s: string): number | null => {
  const tr = s.trim()
  if (!tr) return null
  const n = Number(tr)
  return Number.isFinite(n) ? n : null
}

/* ---------- Number ---------- */
export function NumberInput({ field, value, onChange, patient, compact, id, invalid, autoFocus, readOnly }: {
  field: NumberField; value: unknown; onChange: (v: number | null) => void; patient?: PatientCtx; compact?: boolean; id?: string; invalid?: boolean; autoFocus?: boolean; readOnly?: boolean
}) {
  const [text, setText] = useState(typeof value === 'number' ? formatNumber(value, field.decimals) : '')
  useEffect(() => {
    // sync when the outside value changes (reset, reload) but keep in-progress typing like "3."
    setText((prev) => {
      const parsed = parseNum(prev)
      if (typeof value === 'number') return parsed === value ? prev : formatNumber(value, field.decimals)
      return parsed == null ? prev : ''
    })
  }, [value, field.decimals])
  const flag = numberFlag(field, value, patient)
  const abnormal = flag === 'abnormal' || flag === 'critical'
  const ref = referenceFor(field, patient)
  const step = field.decimals ? Number(`0.${'0'.repeat(field.decimals - 1)}1`) : 1
  const low = typeof value === 'number' && field.references.some((r) => r.min != null && value < r.min)
  return (
    <div className={cn('flex min-w-0 items-center', compact ? 'gap-1.5' : 'gap-3')}>
      <div className={cn('relative shrink-0', compact ? 'w-full' : 'w-40')}>
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoFocus={autoFocus}
          readOnly={readOnly}
          value={text}
          onChange={(e) => {
            const raw = e.target.value.replace(',', '.')
            setText(raw)
            onChange(parseNum(raw))
          }}
          onBlur={() => {
            if (typeof value === 'number') setText(formatNumber(value, field.decimals))
            else if (parseNum(text) == null) setText('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const cur = typeof value === 'number' ? value : 0
              onChange(Number((cur + (e.key === 'ArrowUp' ? step : -step)).toFixed(field.decimals ?? 0)))
            }
          }}
          invalid={invalid}
          className={cn(
            'tabular font-medium transition-colors',
            compact ? 'h-8 px-2 text-[13px]' : 'text-[15px]',
            field.unit && (compact ? 'pr-9' : 'pr-14'),
            abnormal && 'border-danger/70 bg-danger-soft/40 text-danger focus:border-danger focus:ring-danger/15',
            flag === 'normal' && !compact && 'border-ok/50',
          )}
        />
        {field.unit && (
          <span className={cn('pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 truncate text-ink-3', compact ? 'max-w-7 text-[10.5px]' : 'max-w-11 text-[12px]')}>{field.unit}</span>
        )}
      </div>
      {!compact && (ref || flag !== 'unknown') && (
        <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
          {ref && <span className="truncate tabular text-ink-3">{ref}</span>}
          {flag !== 'unknown' && (
            <span className={cn('inline-flex h-5 items-center rounded-full border px-1.5 text-[11px] font-medium', flagPill[flag])}>
              {flag === 'normal' ? '✓' : low ? '↓' : '↑'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- Select (pills / native) ---------- */
export function SelectControl({ options, value, onChange, compact, id, invalid, autoFocus, readOnly, placeholder }: {
  options: SelectOption[]; value: unknown; onChange: (v: string | null) => void; compact?: boolean; id?: string; invalid?: boolean; autoFocus?: boolean; readOnly?: boolean; placeholder: string
}) {
  const cur = typeof value === 'string' ? value : ''
  if (options.length > 4 || (compact && options.length > 3)) {
    const flag = options.find((o) => o.value === cur)?.flag
    return (
      <Select id={id} value={cur} invalid={invalid} autoFocus={autoFocus} disabled={readOnly} onChange={(e) => onChange(e.target.value || null)} className={cn(compact && 'h-8 px-2 text-[13px]', flag && cn('font-medium', flagText[flag]))}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    )
  }
  return (
    <div id={id} role="radiogroup" className={cn('flex flex-wrap', compact ? 'gap-1' : 'gap-1.5', invalid && 'rounded-lg ring-2 ring-danger/30 ring-offset-2 ring-offset-bg')}>
      {options.map((o) => {
        const active = o.value === cur
        const flag: Flag = o.flag ?? 'unknown'
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={readOnly}
            autoFocus={autoFocus && o === options[0]}
            onClick={() => onChange(active ? null : o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border font-medium transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default',
              compact ? 'h-7 px-2.5 text-[12px]' : 'h-9 px-3.5 text-[13.5px]',
              active ? cn(flagPill[flag], 'shadow-1') : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2 hover:text-ink',
            )}
          >
            {active && <Check className={compact ? 'size-3' : 'size-3.5'} />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Multi select chips ---------- */
export function ChipsControl({ options, value, onChange, compact, id, invalid, readOnly }: {
  options: SelectOption[]; value: unknown; onChange: (v: string[]) => void; compact?: boolean; id?: string; invalid?: boolean; readOnly?: boolean
}) {
  const cur = Array.isArray(value) ? (value as string[]) : []
  const toggle = (v: string) => onChange(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v])
  return (
    <div id={id} className={cn('flex flex-wrap', compact ? 'gap-1' : 'gap-1.5', invalid && 'rounded-lg ring-2 ring-danger/30 ring-offset-2 ring-offset-bg')}>
      {options.map((o) => {
        const active = cur.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            disabled={readOnly}
            onClick={() => toggle(o.value)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default',
              compact ? 'h-7 px-2 text-[12px]' : 'h-8 px-2.5 text-[13px]',
              active ? 'border-brand/40 bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            {active && <Check className="size-3" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
