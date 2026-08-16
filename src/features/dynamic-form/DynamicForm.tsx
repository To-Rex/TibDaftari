/**
 * DynamicForm — renders an AttributeSchema as an entry form for a ValueMap.
 * Controlled: `values` in, `onChange(values)` out. `readOnly` renders values nicely.
 */
import { useId, useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { FieldDef, FieldValue } from '@/domain'
import { cn } from '@/shared/lib/cn'
import type { DynamicFormProps } from './types'
import { isFieldVisible, sortedFields } from './logic'
import { FieldRenderer } from './FieldRenderer'

const WIDE: FieldDef['type'][] = ['table', 'longtext']

export function DynamicForm({ schema, values, onChange, patient, readOnly, errors, autoFocusFirst, className }: DynamicFormProps) {
  const uid = useId()
  const fields = useMemo(() => sortedFields(schema), [schema])
  const visible = fields.filter((f) => isFieldVisible(f, values))
  const firstEditable = visible.find((f) => f.type !== 'table' && f.type !== 'boolean')?.key

  const setValue = (key: string, v: FieldValue) => onChange({ ...values, [key]: v })

  // group consecutive fields by `group`
  const sections: { group?: string; fields: FieldDef[] }[] = []
  for (const f of visible) {
    const last = sections[sections.length - 1]
    if (last && last.group === f.group) last.fields.push(f)
    else sections.push({ group: f.group, fields: [f] })
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {sections.map((s, si) => (
        <section key={`${s.group ?? '_'}-${si}`} className={cn(si > 0 && 'mt-6')}>
          {s.group && (
            <h4 className="mb-3 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-ink">
              {s.group}
              <span className="h-px flex-1 bg-line" />
            </h4>
          )}
          <div className={cn('flex flex-col', readOnly ? 'divide-y divide-line/70' : 'gap-4')}>
            <AnimatePresence initial={false}>
              {s.fields.map((f) => {
                const wide = WIDE.includes(f.type)
                const id = `${uid}-${f.key}`
                const err = errors?.[f.key]
                return (
                  <motion.div
                    key={f.key}
                    layout="position"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      'grid gap-1.5 sm:gap-x-6',
                      readOnly ? 'py-2.5 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-baseline' : wide ? 'grid-cols-1' : 'sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center',
                    )}
                  >
                    <label htmlFor={id} className={cn('flex min-w-0 flex-col', readOnly ? 'text-[13px] text-ink-3' : 'text-[13.5px] font-medium text-ink-2', !readOnly && !wide && 'sm:min-h-10 sm:justify-center')}>
                      <span className="flex items-center gap-1">
                        <span className="truncate">{f.label}</span>
                        {f.required && !readOnly && <span className="text-danger">*</span>}
                      </span>
                      {f.hint && !readOnly && <span className="text-[12px] font-normal text-ink-3">{f.hint}</span>}
                    </label>
                    <div className="min-w-0">
                      <FieldRenderer field={f} value={values[f.key]} onChange={(v) => setValue(f.key, v)} patient={patient} readOnly={readOnly} error={err} id={id} autoFocus={autoFocusFirst && f.key === firstEditable} />
                      {err && !readOnly && <p className="mt-1.5 text-[12.5px] text-danger">{err}</p>}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </section>
      ))}
    </div>
  )
}
