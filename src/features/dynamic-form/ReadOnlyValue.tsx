/** Pretty read-only rendering of a single field value (confirm page, previews). */
import { useTranslation } from 'react-i18next'
import { Check, Minus } from 'lucide-react'
import type { FieldDef, FieldValue } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { fmtDate } from '@/shared/lib/format'
import { Badge } from '@/shared/ui'
import type { PatientCtx } from './types'
import { fieldValueFlag, flagTone, formatNumber, isEmptyValue, referenceFor } from './logic'
import { flagPill } from './controls'

export function ReadOnlyValue({ field, value, patient, compact }: { field: FieldDef; value: FieldValue | undefined; patient?: PatientCtx; compact?: boolean }) {
  const { t } = useTranslation()
  if (isEmptyValue(value)) return <span className="text-ink-3">—</span>
  const flag = fieldValueFlag(field, value, patient)
  const abnormal = flag === 'abnormal' || flag === 'critical'
  switch (field.type) {
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value)
      const ref = referenceFor(field, patient)
      return (
        <span className={cn('inline-flex flex-wrap items-baseline', compact ? 'gap-1' : 'gap-2')}>
          <span className={cn('tabular font-semibold', compact ? 'text-[13px]' : 'text-[15px]', abnormal && 'text-danger')}>{formatNumber(n, field.decimals)}</span>
          {field.unit && <span className="text-[12px] text-ink-3">{field.unit}</span>}
          {!compact && ref && <span className="text-[12px] tabular text-ink-3">({ref})</span>}
          {flag !== 'unknown' && !compact && (
            <span className={cn('inline-flex h-5 items-center rounded-full border px-1.5 text-[11px] font-medium', flagPill[flag])}>{flag === 'normal' ? '✓' : (field.references.some((r) => r.min != null && n < r.min) ? '↓' : '↑')}</span>
          )}
        </span>
      )
    }
    case 'select': {
      const opt = field.options.find((o) => o.value === value)
      const label = opt?.label ?? String(value)
      if (compact) return <span className={cn('font-medium', abnormal && 'text-danger', flag === 'normal' && 'text-ok')}>{label}</span>
      return <Badge tone={flag === 'unknown' ? 'neutral' : flagTone(flag)}>{label}</Badge>
    }
    case 'multiselect': {
      const arr = Array.isArray(value) ? (value as string[]) : []
      return (
        <span className="inline-flex flex-wrap gap-1">
          {arr.map((v) => <Badge key={v} tone="brand" size={compact ? 'sm' : 'md'}>{field.options.find((o) => o.value === v)?.label ?? v}</Badge>)}
        </span>
      )
    }
    case 'boolean':
      return (
        <span className={cn('inline-flex items-center gap-1.5 font-medium', value ? 'text-ink' : 'text-ink-3')}>
          {value ? <Check className="size-3.5 text-ok" /> : <Minus className="size-3.5" />}
          {value ? (field.trueLabel ?? t('common.yes')) : (field.falseLabel ?? t('common.no'))}
        </span>
      )
    case 'date':
      return <span className="tabular">{fmtDate(String(value))}</span>
    case 'longtext':
      return <span className="whitespace-pre-wrap leading-relaxed">{String(value)}</span>
    case 'text':
      return <span>{String(value)}</span>
    case 'table':
      return null
  }
}
