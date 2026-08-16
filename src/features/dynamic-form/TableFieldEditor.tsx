/** Editable grid for `table` fields: columns are field defs, cells reuse FieldRenderer (compact). */
import { useCallback, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Trash2 } from 'lucide-react'
import type { FieldValue, TableField } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Button, IconButton } from '@/shared/ui'
import type { PatientCtx } from './types'
import { fieldValueFlag, isEmptyValue } from './logic'
import { FieldRenderer } from './FieldRenderer'

type Row = Record<string, unknown>

const colWidth = (type: string, n: number) => {
  if (type === 'number') return 130
  if (type === 'boolean') return 90
  if (type === 'date') return 150
  if (type === 'select') return n <= 3 ? 240 : 190
  if (type === 'multiselect') return 220
  return undefined
}

export function TableFieldEditor({ field, value, onChange, patient, readOnly, error }: {
  field: TableField; value: FieldValue | undefined; onChange: (v: FieldValue) => void; patient?: PatientCtx; readOnly?: boolean; error?: string
}) {
  const { t } = useTranslation()
  const rows: Row[] = Array.isArray(value) ? (value as Row[]) : []
  const cols = [...field.columns].sort((a, b) => a.order - b.order)
  const wrapRef = useRef<HTMLDivElement>(null)

  const setCell = (ri: number, key: string, v: unknown) => {
    const next = rows.map((r, i) => (i === ri ? { ...r, [key]: v } : r))
    onChange(next as FieldValue)
  }
  const addRow = () => {
    const blank: Row = Object.fromEntries(cols.map((c) => [c.key, c.type === 'multiselect' ? [] : c.type === 'boolean' ? false : null]))
    onChange([...rows, blank] as FieldValue)
    setTimeout(() => focusCell(rows.length, 0), 30)
  }
  const removeRow = (ri: number) => onChange(rows.filter((_, i) => i !== ri) as FieldValue)

  const focusCell = useCallback((ri: number, ci: number) => {
    const td = wrapRef.current?.querySelector<HTMLElement>(`[data-cell="${ri}:${ci}"]`)
    const el = td?.querySelector<HTMLElement>('input:not([type=checkbox]),select,textarea,button,[tabindex]')
    el?.focus()
    if (el instanceof HTMLInputElement) el.select()
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || (e.target instanceof HTMLTextAreaElement && !e.ctrlKey)) return
    const td = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]')
    if (!td) return
    const [r = 0, c = 0] = (td.dataset.cell ?? '0:0').split(':').map(Number)
    e.preventDefault()
    if (r + 1 < rows.length) focusCell(r + 1, c)
    else if (field.allowAddRows && !readOnly) addRow()
  }

  const canRemove = !readOnly && field.allowRemoveRows && rows.length > (field.minRows ?? 0)

  return (
    <div className={cn('overflow-hidden rounded-[var(--radius)] border bg-surface', error ? 'border-danger/60' : 'border-line')}>
      <div ref={wrapRef} onKeyDown={onKeyDown} className="max-h-[560px] overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-2/90 text-left text-[11.5px] uppercase tracking-[0.05em] text-ink-3 backdrop-blur">
              <th className="w-10 px-3 py-2 text-center font-medium">№</th>
              {cols.map((c) => (
                <th key={c.key} style={{ width: colWidth(c.type, c.type === 'select' || c.type === 'multiselect' ? c.options.length : 0) }} className="whitespace-nowrap px-2.5 py-2 font-medium">
                  {c.label}{c.required && !readOnly && <span className="ml-0.5 text-danger">*</span>}
                  {c.unit && <span className="ml-1 normal-case tracking-normal text-ink-3/80">({c.unit})</span>}
                </th>
              ))}
              {canRemove && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((row, ri) => (
                <motion.tr
                  key={ri}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="group border-t border-line/70 transition-colors hover:bg-surface-2/40"
                >
                  <td className="px-3 py-1.5 text-center tabular text-[12px] text-ink-3">{ri + 1}</td>
                  {cols.map((c, ci) => {
                    const v = row[c.key] as FieldValue | undefined
                    const flag = fieldValueFlag(c, v, patient)
                    const abnormal = flag === 'abnormal' || flag === 'critical'
                    const missing = !readOnly && c.required && isEmptyValue(v) && !!error
                    return (
                      <td
                        key={c.key}
                        data-cell={`${ri}:${ci}`}
                        className={cn('px-1.5 py-1 align-middle', abnormal && (flag === 'critical' ? 'bg-danger-soft/50' : 'bg-warn-soft/40'), missing && 'bg-danger-soft/30', readOnly && 'px-2.5 py-2')}
                      >
                        <FieldRenderer field={c} value={v} onChange={(nv) => setCell(ri, c.key, nv)} patient={patient} readOnly={readOnly} compact />
                      </td>
                    )
                  })}
                  {canRemove && (
                    <td className="px-1 text-center">
                      <IconButton label={t('common.delete')} size="sm" onClick={() => removeRow(ri)} className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 text-ink-3 hover:text-danger">
                        <Trash2 />
                      </IconButton>
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
            {rows.length === 0 && (
              <tr><td colSpan={cols.length + 2} className="px-4 py-6 text-center text-[13px] text-ink-3">{t('clinical.form.noRows')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && field.allowAddRows && (
        <div className="flex items-center justify-between border-t border-line/70 bg-surface-2/40 px-2 py-1.5">
          <Button variant="ghost" size="sm" leftIcon={<Plus className="size-4" />} onClick={addRow}>{t('clinical.form.addRow')}</Button>
          <span className="pr-2 text-[12px] tabular text-ink-3">{t('clinical.form.rowsCount', { n: rows.length })}</span>
        </div>
      )}
    </div>
  )
}
