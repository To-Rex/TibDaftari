import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Columns3, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react'
import type { AttributeSchema, TableColumn, TableElement } from '@/domain'
import { Checkbox } from '@/shared/ui'
import { ITEMS_DATASET, ITEMS_DATASET_COLUMNS } from '@/domain'
import { routes } from '@/shared/config/routes'
import { useEditorStore } from '../useEditorStore'
import { ColorInput, NumInput, PropRow, PropSection, SelectInput, TextInput } from './inputs'
import { TextStyleFields } from './TextStyleFields'

const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

export function TableProps({ el, schema }: { el: TableElement; schema: AttributeSchema | null }) {
  const { t } = useTranslation()
  const patch = useEditorStore((s) => s.patchElements)
  const set = (p: Partial<TableElement>) => patch([el.id], (e) => ({ ...e, ...p }) as TableElement)
  const orderScope = useEditorStore((s) => s.meta?.scope === 'order')
  const tableFields = schema?.fields.filter((f) => f.type === 'table') ?? []
  const bound = tableFields.find((f) => f.key === el.fieldKey)
  const itemsBound = orderScope && el.fieldKey === ITEMS_DATASET
  const isStatic = !el.fieldKey
  const bindOptions = bound ? bound.columns.map((c) => ({ value: c.key, label: `${c.label} · ${c.key}` })) : itemsBound ? ITEMS_DATASET_COLUMNS.map((c) => ({ value: c.key, label: `${c.label} · ${c.key}` })) : []

  /* ------------------------------ columns ------------------------------ */
  const setCol = (i: number, p: Partial<TableColumn>) => set({ columns: el.columns.map((c, j) => (j === i ? { ...c, ...p } : c)) })
  const moveCol = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= el.columns.length) return
    const cols = [...el.columns]; const [a, b] = [cols[i]!, cols[j]!]; cols[i] = b; cols[j] = a
    // static rows travel with their column
    const rows = (el.staticRows ?? []).map((r) => { const n = [...r]; const [ra, rb] = [n[i] ?? '', n[j] ?? '']; n[i] = rb; n[j] = ra; return n })
    set({ columns: cols, staticRows: isStatic ? rows : el.staticRows })
  }
  const removeCol = (i: number) => set({ columns: el.columns.filter((_, j) => j !== i), staticRows: isStatic ? (el.staticRows ?? []).map((r) => r.filter((_, j) => j !== i)) : el.staticRows })
  const duplicateCol = (i: number) => {
    const src = el.columns[i]!
    const cols = [...el.columns]; cols.splice(i + 1, 0, { ...src, id: uid(`${el.id}_c`) })
    set({ columns: cols, staticRows: isStatic ? (el.staticRows ?? []).map((r) => { const n = [...r]; n.splice(i + 1, 0, r[i] ?? ''); return n }) : el.staticRows })
  }
  const addCol = () => {
    const c = bound?.columns.find((bc) => !el.columns.some((x) => x.bind === bc.key))
    set({
      columns: [...el.columns, { id: uid(`${el.id}_c`), header: c?.label ?? t('catalog.editor.column'), bind: c?.key ?? '', width: 100, align: 'left' }],
      staticRows: isStatic ? (el.staticRows ?? []).map((r) => [...r, '']) : el.staticRows,
    })
  }
  const equalize = () => set({ columns: el.columns.map((c) => ({ ...c, width: 100 })) })
  const bindAll = () => { if (!bound) return; set({ columns: bound.columns.map((c, i) => ({ id: `${el.id}_b${i}`, header: c.label + (c.unit ? ` (${c.unit})` : ''), bind: c.key, width: c.type === 'number' ? 80 : 160, align: c.type === 'number' ? 'center' : 'left' })) }) }

  /* ------------------------------ static rows ------------------------------ */
  const rows = el.staticRows ?? []
  const blankRow = () => el.columns.map(() => '')
  const setCell = (ri: number, ci: number, v: string) => set({ staticRows: rows.map((r, i) => (i === ri ? el.columns.map((_, j) => (j === ci ? v : (r[j] ?? ''))) : r)) })
  const addRow = (at = rows.length) => { const n = [...rows]; n.splice(at, 0, blankRow()); set({ staticRows: n }) }
  const duplicateRow = (ri: number) => { const n = [...rows]; n.splice(ri + 1, 0, [...(rows[ri] ?? blankRow())]); set({ staticRows: n }) }
  const removeRow = (ri: number) => set({ staticRows: rows.filter((_, i) => i !== ri) })
  const moveRow = (ri: number, d: -1 | 1) => { const j = ri + d; if (j < 0 || j >= rows.length) return; const n = [...rows]; const [a, b] = [n[ri]!, n[j]!]; n[ri] = b; n[j] = a; set({ staticRows: n }) }

  const ib = 'grid size-7 place-items-center rounded text-ink-3 hover:bg-surface-2 hover:text-ink [&>svg]:size-3.5 disabled:opacity-30'
  const presetCount = bound ? bound.presetRows.length : itemsBound ? undefined : 0

  return (
    <>
      <PropSection title={t('catalog.editor.binding')}>
        <PropRow label={t('catalog.editor.tableField')}>
          <SelectInput value={el.fieldKey} onChange={(v) => set({ fieldKey: v })} options={[{ value: '', label: t('catalog.editor.staticTable') }, ...(orderScope ? [{ value: ITEMS_DATASET, label: t('catalog.editor.ph.items') }] : []), ...tableFields.map((f) => ({ value: f.key, label: f.label }))]} />
        </PropRow>
        {bound && <button type="button" className="text-[12px] text-brand-ink hover:underline text-left" onClick={bindAll}>{t('catalog.editor.bindAllColumns', { n: bound.columns.length })}</button>}
      </PropSection>

      <PropSection title={`${t('catalog.editor.columns')} · ${el.columns.length}`}>
        <div className="flex flex-col gap-2">
          {el.columns.map((c, i) => (
            <div key={c.id} className="rounded-lg border border-line p-2 flex flex-col gap-1.5 bg-surface-2/30">
              <div className="flex items-center gap-1">
                <TextInput value={c.header} onChange={(v) => setCol(i, { header: v })} placeholder={t('catalog.editor.header')} className="flex-1" />
                <button type="button" className={ib} disabled={i === 0} title={t('catalog.editor.moveUp')} onClick={() => moveCol(i, -1)}><ArrowUp /></button>
                <button type="button" className={ib} disabled={i === el.columns.length - 1} title={t('catalog.editor.moveDown')} onClick={() => moveCol(i, 1)}><ArrowDown /></button>
                <button type="button" className={ib} title={t('catalog.editor.duplicateColumn')} onClick={() => duplicateCol(i)}><Copy /></button>
                <button type="button" className={`${ib} hover:text-danger`} title={t('common.delete')} onClick={() => removeCol(i)}><Trash2 /></button>
              </div>
              <div className="grid grid-cols-[1fr_64px_72px] gap-1">
                {bound || itemsBound ? (
                  <SelectInput value={c.bind} onChange={(v) => setCol(i, { bind: v })} options={[{ value: '', label: '—' }, ...bindOptions]} />
                ) : (
                  <TextInput value={c.bind} mono onChange={(v) => setCol(i, { bind: v })} placeholder={t('catalog.editor.columnKey')} />
                )}
                <NumInput value={c.width} min={10} onChange={(v) => setCol(i, { width: v })} />
                <SelectInput value={c.align} onChange={(v) => setCol(i, { align: v })} options={[{ value: 'left', label: '⇤' }, { value: 'center', label: '↔' }, { value: 'right', label: '⇥' }]} />
              </div>
              {el.hideEmptyRows && (
                <Checkbox checked={!!c.valueColumn} onChange={(e) => setCol(i, { valueColumn: e.target.checked || undefined })} label={<span className="text-[12px]">{t('catalog.editor.valueColumn')}</span>} />
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={addCol} className="inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-[12.5px] text-brand-ink hover:bg-brand-soft/60"><Plus className="size-3.5" />{t('catalog.editor.addColumn')}</button>
            {el.columns.length > 1 && <button type="button" onClick={equalize} className="inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-[12.5px] text-ink-2 hover:bg-surface-2" title={t('catalog.editor.equalizeHint')}><Columns3 className="size-3.5" />{t('catalog.editor.equalizeWidths')}</button>}
          </div>
          <p className="text-[11.5px] text-ink-3">{t('catalog.editor.columnDragHint')}</p>
        </div>
      </PropSection>

      <PropSection title={isStatic ? `${t('catalog.editor.rows')} · ${rows.length}` : t('catalog.editor.rows')}>
        {isStatic ? (
          <div className="flex flex-col gap-2">
            <p className="text-[11.5px] text-ink-3">{t('catalog.editor.staticRowsHint')}</p>
            {rows.map((r, ri) => (
              <div key={ri} className="rounded-lg border border-line p-2 flex flex-col gap-1 bg-surface-2/30">
                <div className="flex items-center gap-1">
                  <span className="w-6 text-center text-[11px] tabular text-ink-3">{ri + 1}</span>
                  <div className="flex-1" />
                  <button type="button" className={ib} disabled={ri === 0} title={t('catalog.editor.moveUp')} onClick={() => moveRow(ri, -1)}><ArrowUp /></button>
                  <button type="button" className={ib} disabled={ri === rows.length - 1} title={t('catalog.editor.moveDown')} onClick={() => moveRow(ri, 1)}><ArrowDown /></button>
                  <button type="button" className={ib} title={t('catalog.editor.insertRowBelow')} onClick={() => addRow(ri + 1)}><Plus /></button>
                  <button type="button" className={ib} title={t('catalog.editor.duplicateRow')} onClick={() => duplicateRow(ri)}><Copy /></button>
                  <button type="button" className={`${ib} hover:text-danger`} title={t('common.delete')} onClick={() => removeRow(ri)}><Trash2 /></button>
                </div>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, el.columns.length)}, minmax(0, 1fr))` }}>
                  {el.columns.map((c, ci) => (
                    <TextInput key={c.id} value={r[ci] ?? ''} onChange={(v) => setCell(ri, ci, v)} placeholder={c.header || `#${ci + 1}`} />
                  ))}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => addRow()} className="inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-[12.5px] text-brand-ink hover:bg-brand-soft/60 self-start"><Plus className="size-3.5" />{t('catalog.editor.addRow')}</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[12px] text-ink-2">
              {itemsBound ? t('catalog.editor.rowsFromItems') : t('catalog.editor.rowsFromSchema', { n: presetCount ?? 0 })}
            </p>
            {bound && schema && (
              <a href={routes.admin.schema(schema.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] text-brand-ink hover:underline">
                <ExternalLink className="size-3.5" />{t('catalog.editor.manageRowsInSchema')}
              </a>
            )}
            <PropRow label={t('catalog.editor.maxRows')}>
              <NumInput value={el.maxRows ?? 0} min={0} max={500} onChange={(v) => set({ maxRows: v > 0 ? v : undefined })} suffix={el.maxRows ? '' : t('catalog.editor.all')} />
            </PropRow>
            <Checkbox checked={!!el.hideEmptyRows} onChange={(e) => set({ hideEmptyRows: e.target.checked || undefined })} label={<span className="text-[12.5px]">{t('catalog.editor.hideEmptyRows')}</span>} />
            {el.hideEmptyRows && <p className="text-[11.5px] text-ink-3">{t('catalog.editor.hideEmptyRowsHint')}</p>}
          </div>
        )}
      </PropSection>

      <PropSection title={t('catalog.editor.tableOptions')}>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          <Checkbox checked={el.showHeader} onChange={(e) => set({ showHeader: e.target.checked })} label={<span className="text-[12.5px]">{t('catalog.editor.showHeader')}</span>} />
          <Checkbox checked={el.showRowNumber} onChange={(e) => set({ showRowNumber: e.target.checked })} label={<span className="text-[12.5px]">{t('catalog.editor.showRowNumber')}</span>} />
          <Checkbox checked={el.highlightAbnormal} onChange={(e) => set({ highlightAbnormal: e.target.checked })} label={<span className="text-[12.5px]">{t('catalog.editor.highlightAbnormal')}</span>} />
        </div>
        <PropRow label={t('catalog.editor.rowHeight')}><NumInput value={el.rowHeight} min={10} max={80} onChange={(v) => set({ rowHeight: v })} suffix="px" /></PropRow>
        <PropRow label={t('catalog.editor.border')}><ColorInput value={el.borderColor} onChange={(v) => set({ borderColor: v ?? '#000000' })} /><NumInput value={el.borderWidth} min={0} max={6} step={0.5} onChange={(v) => set({ borderWidth: v })} className="max-w-[72px]" /></PropRow>
        <PropRow label={t('catalog.editor.zebra')}><ColorInput value={el.zebra} onChange={(v) => set({ zebra: v })} allowNone noneLabel={t('catalog.editor.none')} /></PropRow>
      </PropSection>
      <PropSection title={t('catalog.editor.headerStyle')} defaultOpen={false}><TextStyleFields value={el.headerStyle} onChange={(headerStyle) => set({ headerStyle })} /></PropSection>
      <PropSection title={t('catalog.editor.cellStyle')} defaultOpen={false}><TextStyleFields value={el.cellStyle} onChange={(cellStyle) => set({ cellStyle })} /></PropSection>
    </>
  )
}
