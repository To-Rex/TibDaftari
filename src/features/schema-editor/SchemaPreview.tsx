import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import type { FieldDef } from '@/domain'
import { referenceText } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Badge, EmptyState } from '@/shared/ui'
import { FIELD_TYPE_ICONS } from './fieldDefaults'

/**
 * Lightweight read-only preview of how the schema will look as an entry form.
 * (The real DynamicForm lives in features/dynamic-form and is not imported here on purpose.)
 */
export function SchemaPreview({ fields, selectedKey, onSelect }: { fields: FieldDef[]; selectedKey?: string | null; onSelect?: (k: string) => void }) {
  const { t } = useTranslation()
  const groups = useMemo(() => {
    const out: { name: string | undefined; fields: FieldDef[] }[] = []
    for (const f of [...fields].sort((a, b) => a.order - b.order)) {
      const last = out.at(-1)
      if (last && last.name === f.group) last.fields.push(f)
      else out.push({ name: f.group, fields: [f] })
    }
    return out
  }, [fields])
  if (fields.length === 0) return <EmptyState title={t('catalog.schemas.previewEmpty')} className="py-10" />
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.name && <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{g.name}</p>}
          <div className="flex flex-col gap-2">
            {g.fields.map((f) => <PreviewField key={f.key} f={f} all={fields} selected={selectedKey === f.key} onClick={onSelect ? () => onSelect(f.key) : undefined} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviewField({ f, all, selected, onClick }: { f: FieldDef; all: FieldDef[]; selected: boolean; onClick?: () => void }) {
  const { t } = useTranslation()
  const I = FIELD_TYPE_ICONS[f.type]
  const dep = f.visibleIf ? all.find((x) => x.key === f.visibleIf!.key) : undefined
  return (
    <motion.div layout onClick={onClick} className={cn('rounded-[var(--radius)] border p-3 transition-colors', selected ? 'border-brand/60 bg-brand-soft/30' : 'border-line bg-surface', onClick && 'cursor-pointer hover:border-line-strong')}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium leading-5">{f.label}{f.required && <span className="text-danger"> *</span>}</p>
          {f.hint && <p className="text-[12px] text-ink-3">{f.hint}</p>}
        </div>
        <Badge size="sm" className="gap-1"><I className="size-3" />{t(`catalog.schemas.types.${f.type}`)}</Badge>
      </div>
      <div className="mt-2"><Control f={f} /></div>
      {dep && <p className="mt-1.5 text-[11.5px] text-ink-3 italic">{t('catalog.schemas.previewVisibleIf', { field: dep.label })}</p>}
    </motion.div>
  )
}

function Control({ f }: { f: FieldDef }) {
  const { t } = useTranslation()
  const box = 'h-9 rounded-[var(--radius-sm)] border border-line bg-surface-2/50 px-3 flex items-center text-[13px] text-ink-3'
  switch (f.type) {
    case 'text': return <div className={box}>{f.placeholder ?? '…'}</div>
    case 'longtext': return <div className={cn(box, 'h-16 items-start pt-2')}>{f.placeholder ?? '…'}</div>
    case 'date': return <div className={cn(box, 'w-44')}>dd.mm.yyyy</div>
    case 'number': {
      const ref = referenceText(f, {})
      return (
        <div className="flex items-center gap-2">
          <div className={cn(box, 'w-32 justify-end font-mono')}>0{f.decimals ? '.' + '0'.repeat(f.decimals) : ''}</div>
          {f.unit && <span className="text-[13px] text-ink-2">{f.unit}</span>}
          {ref && <span className="ml-auto text-[12px] text-ink-3 tabular">{t('catalog.schemas.norm')}: {ref}</span>}
        </div>
      )
    }
    case 'select':
    case 'multiselect':
      return (
        <div className="flex flex-wrap gap-1.5">
          {f.options.map((o) => (
            <span key={o.value} className={cn('inline-flex items-center gap-1.5 h-7 rounded-full border px-2.5 text-[12.5px]', o.flag === 'critical' ? 'border-danger/40 text-danger bg-danger-soft/50' : o.flag === 'abnormal' ? 'border-warn/40 text-warn bg-warn-soft/50' : 'border-line text-ink-2')}>
              {o.color && <span className="size-2 rounded-full" style={{ background: o.color }} />}{o.label}
            </span>
          ))}
          {f.allowOther && <span className="inline-flex items-center h-7 rounded-full border border-dashed border-line px-2.5 text-[12.5px] text-ink-3">{t('catalog.schemas.other')}</span>}
          {f.options.length === 0 && <span className="text-[12.5px] text-ink-3">{t('catalog.schemas.noOptions')}</span>}
        </div>
      )
    case 'boolean':
      return <div className="inline-flex rounded-lg bg-surface-2 p-0.5 text-[12.5px]"><span className="px-3 py-1 rounded-md bg-surface shadow-1">{f.trueLabel ?? t('common.yes')}</span><span className="px-3 py-1 text-ink-3">{f.falseLabel ?? t('common.no')}</span></div>
    case 'table':
      return (
        <div className="rounded-[var(--radius-sm)] border border-line overflow-hidden">
          <div className="grid text-[12px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, f.columns.length)}, minmax(0,1fr))` }}>
            {f.columns.map((c) => <div key={c.key} className="bg-surface-2/70 px-2 py-1.5 font-medium text-ink-2 truncate">{c.label}{c.unit ? <span className="text-ink-3 font-normal"> ({c.unit})</span> : ''}</div>)}
            {f.presetRows.slice(0, 3).map((r, i) => (
              <Fragment key={i}>{f.columns.map((c) => <div key={c.key} className="px-2 py-1.5 border-t border-line text-ink-3 truncate">{r[c.key] == null ? '·' : String(r[c.key])}</div>)}</Fragment>
            ))}
          </div>
          <div className="px-2 py-1 text-[11.5px] text-ink-3 bg-surface-2/40 border-t border-line">{t('catalog.schemas.previewTableMeta', { rows: f.presetRows.length, add: f.allowAddRows ? t('common.yes') : t('common.no') })}</div>
        </div>
      )
  }
}
