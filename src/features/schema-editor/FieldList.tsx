import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Copy, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import type { FieldDef, FieldType } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Badge, Button, EmptyState, Menu } from '@/shared/ui'
import { FIELD_TYPES, FIELD_TYPE_ICONS } from './fieldDefaults'

export function FieldList({ fields, selectedKey, onSelect, onAdd, onMove, onDuplicate, onRemove, readOnly }: {
  fields: FieldDef[]; selectedKey: string | null; onSelect: (k: string) => void; onAdd: (t: FieldType) => void
  onMove: (k: string, d: -1 | 1) => void; onDuplicate: (k: string) => void; onRemove: (k: string) => void; readOnly?: boolean
}) {
  const { t } = useTranslation()
  const addMenu = (
    <Menu align="start" trigger={() => <Button size="sm" variant="soft" leftIcon={<Plus className="size-4" />} disabled={readOnly}>{t('catalog.schemas.addField')}</Button>}
      items={FIELD_TYPES.map((ft) => { const I = FIELD_TYPE_ICONS[ft]; return { key: ft, label: t(`catalog.schemas.types.${ft}`), icon: <I />, onSelect: () => onAdd(ft) } })} />
  )
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap px-3 sm:px-4 pt-4 pb-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t('catalog.schemas.fields')} <span className="tabular font-normal">{fields.length}</span></h3>
        {addMenu}
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {fields.length === 0 ? (
          <EmptyState title={t('catalog.schemas.noFields')} description={t('catalog.schemas.noFieldsHint')} className="py-10" />
        ) : (
          <AnimatePresence initial={false}>
            {fields.map((f, i) => (
              <FieldRow key={f.key} field={f} index={i} last={i === fields.length - 1} selected={f.key === selectedKey} onSelect={() => onSelect(f.key)} onMove={(d) => onMove(f.key, d)} onDuplicate={() => onDuplicate(f.key)} onRemove={() => onRemove(f.key)} readOnly={readOnly} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

const FieldRow = memo(function FieldRow({ field, index, last, selected, onSelect, onMove, onDuplicate, onRemove, readOnly }: {
  field: FieldDef; index: number; last: boolean; selected: boolean; onSelect: () => void; onMove: (d: -1 | 1) => void; onDuplicate: () => void; onRemove: () => void; readOnly?: boolean
}) {
  const { t } = useTranslation()
  const I = FIELD_TYPE_ICONS[field.type]
  const meta = field.type === 'select' || field.type === 'multiselect' ? t('catalog.schemas.nOptions', { n: field.options.length })
    : field.type === 'table' ? t('catalog.schemas.nColumns', { n: field.columns.length })
    : field.type === 'number' && field.references.length ? t('catalog.schemas.nRanges', { n: field.references.length }) : null
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.18 }}
      onClick={onSelect}
      className={cn('group relative flex items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5 mb-1.5 cursor-pointer transition-all', selected ? 'border-brand/60 bg-brand-soft/40 shadow-1' : 'border-transparent hover:bg-surface-2 hover:border-line')}>
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', selected ? 'bg-brand text-white' : 'bg-surface-2 text-ink-2')}><I className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13.5px] font-medium">{field.label || <span className="text-ink-3">{t('catalog.schemas.untitled')}</span>}</p>
          {field.required && <span className="text-danger text-[12px]">*</span>}
        </div>
        <p className="truncate text-[12px] text-ink-3 font-mono">{field.key}{field.unit ? <span className="font-sans"> · {field.unit}</span> : ''}{meta ? <span className="font-sans"> · {meta}</span> : ''}</p>
      </div>
      {field.group && <Badge size="sm">{field.group}</Badge>}
      {!readOnly && (
        <span className="max-lg:opacity-100 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Menu trigger={() => <span className="grid size-9 lg:size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-ink"><MoreHorizontal className="size-4" /></span>}
            items={[
              { key: 'up', label: t('catalog.tree.moveUp'), icon: <ArrowUp />, disabled: index === 0, onSelect: () => onMove(-1) },
              { key: 'down', label: t('catalog.tree.moveDown'), icon: <ArrowDown />, disabled: last, onSelect: () => onMove(1) },
              { key: 'dup', label: t('catalog.schemas.duplicate'), icon: <Copy />, onSelect: onDuplicate, separatorBefore: true },
              { key: 'del', label: t('common.delete'), icon: <Trash2 />, danger: true, onSelect: onRemove, separatorBefore: true },
            ]} />
        </span>
      )}
    </motion.div>
  )
})
