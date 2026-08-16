/** Renders one field control by type. Used both in the form rows and (compact) in table cells. */
import { useTranslation } from 'react-i18next'
import type { FieldValue } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Input, Switch, Textarea } from '@/shared/ui'
import type { FieldRendererProps } from './types'
import { ChipsControl, NumberInput, SelectControl } from './controls'
import { ReadOnlyValue } from './ReadOnlyValue'
import { TableFieldEditor } from './TableFieldEditor'

export function FieldRenderer({ field, value, onChange, patient, readOnly, error, compact, id, autoFocus }: FieldRendererProps) {
  const { t } = useTranslation()
  const invalid = !!error
  if (readOnly && field.type !== 'table') return <ReadOnlyValue field={field} value={value} patient={patient} compact={compact} />

  switch (field.type) {
    case 'text':
      return (
        <Input
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          invalid={invalid}
          autoFocus={autoFocus}
          className={cn(compact && 'h-8 px-2 text-[13px]')}
        />
      )
    case 'longtext':
      return (
        <Textarea
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          invalid={invalid}
          autoFocus={autoFocus}
          rows={compact ? 2 : 3}
          className={cn(compact && 'min-h-8 py-1.5 px-2 text-[13px]')}
        />
      )
    case 'number':
      return <NumberInput field={field} value={value} onChange={(v) => onChange(v)} patient={patient} compact={compact} id={id} invalid={invalid} autoFocus={autoFocus} />
    case 'select':
      return <SelectControl options={field.options} value={value} onChange={(v) => onChange(v)} compact={compact} id={id} invalid={invalid} autoFocus={autoFocus} placeholder={t('common.select')} />
    case 'multiselect':
      return <ChipsControl options={field.options} value={value} onChange={(v) => onChange(v as FieldValue)} compact={compact} id={id} invalid={invalid} />
    case 'boolean': {
      const checked = value === true
      return (
        <div className={cn('flex items-center', compact ? 'h-8' : 'h-10')}>
          <Switch
            size={compact ? 'sm' : 'md'}
            checked={checked}
            onChange={(v) => onChange(v)}
            label={compact ? undefined : (checked ? (field.trueLabel ?? t('common.yes')) : (field.falseLabel ?? t('common.no')))}
          />
        </div>
      )
    }
    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
          invalid={invalid}
          autoFocus={autoFocus}
          className={cn('tabular', compact ? 'h-8 w-full px-2 text-[13px]' : 'w-48')}
        />
      )
    case 'table':
      return <TableFieldEditor field={field} value={value} onChange={onChange} patient={patient} readOnly={readOnly} error={error} />
  }
}
