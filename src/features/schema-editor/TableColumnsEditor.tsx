import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import type { FieldDef, TableField } from '@/domain'
import { Button, Drawer, IconButton, Menu } from '@/shared/ui'
import { COLUMN_TYPES, FIELD_TYPE_ICONS, newField, slugify, uniqueKey } from './fieldDefaults'
import { FieldPropertyEditor } from './FieldPropertyEditor'

type Col = TableField['columns'][number]

/** Columns of a table field — each is a field def; edited recursively in a drawer. */
export function TableColumnsEditor({ field, onChange }: { field: TableField; onChange: (f: TableField) => void }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<string | null>(null)
  const cols = field.columns
  const setCols = (columns: Col[]) => onChange({ ...field, columns: columns.map((c, i) => ({ ...c, order: i })) })
  const add = (type: Col['type']) => {
    const label = `${t(`catalog.schemas.types.${type}`)} ${cols.length + 1}`
    const key = uniqueKey(slugify(label), cols.map((c) => c.key))
    const f = newField(type, label, key, cols.length) as Col
    setCols([...cols, f])
    setEditing(key)
  }
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= cols.length) return; const arr = [...cols]; const [a, b] = [arr[i]!, arr[j]!]; arr[i] = b; arr[j] = a; setCols(arr) }
  const editingCol = cols.find((c) => c.key === editing)

  return (
    <div className="rounded-[var(--radius)] border border-line overflow-hidden">
      <div className="flex flex-col divide-y divide-line">
        {cols.map((c, i) => { const I = FIELD_TYPE_ICONS[c.type]; return (
          <div key={c.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-2/60 cursor-pointer" onClick={() => setEditing(c.key)}>
            <span className="grid size-7 place-items-center rounded-md bg-surface-2 text-ink-2"><I className="size-3.5" /></span>
            <span className="flex-1 min-w-0"><span className="block truncate text-[13px] font-medium">{c.label}{c.required && <span className="text-danger"> *</span>}</span><span className="block truncate text-[11.5px] font-mono text-ink-3">{c.key}{c.unit ? ` · ${c.unit}` : ''}</span></span>
            <span onClick={(e) => e.stopPropagation()} className="flex items-center">
              <IconButton size="sm" label={t('catalog.tree.moveUp')} onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp /></IconButton>
              <IconButton size="sm" label={t('catalog.tree.moveDown')} onClick={() => move(i, 1)} disabled={i === cols.length - 1}><ArrowDown /></IconButton>
              <IconButton size="sm" label={t('common.edit')} onClick={() => setEditing(c.key)}><Pencil /></IconButton>
              <IconButton size="sm" label={t('common.delete')} onClick={() => setCols(cols.filter((_, j) => j !== i))} className="text-ink-3 hover:text-danger"><Trash2 /></IconButton>
            </span>
          </div>
        ) })}
        {cols.length === 0 && <p className="px-3 py-3 text-[12.5px] text-ink-3">{t('catalog.schemas.noColumns')}</p>}
      </div>
      <div className="px-2 py-1.5 border-t border-line bg-surface-2/40">
        <Menu align="start" trigger={() => <Button size="xs" variant="ghost" leftIcon={<Plus className="size-3.5" />}>{t('catalog.schemas.addColumn')}</Button>}
          items={COLUMN_TYPES.map((ft) => { const I = FIELD_TYPE_ICONS[ft]; return { key: ft, label: t(`catalog.schemas.types.${ft}`), icon: <I />, onSelect: () => add(ft) } })} />
      </div>

      <Drawer open={!!editingCol} onClose={() => setEditing(null)} title={t('catalog.schemas.columnEditor')} description={editingCol ? `${field.label} → ${editingCol.label}` : undefined} width="max-w-xl"
        footer={<Button onClick={() => setEditing(null)}>{t('common.done')}</Button>}>
        {editingCol && (
          <FieldPropertyEditor
            field={editingCol}
            siblings={cols}
            allowTable={false}
            onChange={(next: FieldDef) => {
              const nc = next as Col
              const columns = cols.map((c) => (c.key === editingCol.key ? nc : c))
              // rename key inside preset rows
              const presetRows = nc.key !== editingCol.key ? field.presetRows.map((r) => { const { [editingCol.key]: v, ...rest } = r; return v === undefined ? rest : { ...rest, [nc.key]: v } }) : field.presetRows
              onChange({ ...field, columns, presetRows })
              if (nc.key !== editingCol.key) setEditing(nc.key)
            }}
          />
        )}
      </Drawer>
    </div>
  )
}
