import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { AttributeSchema, TableColumn, TableElement } from '@/domain'
import { Checkbox } from '@/shared/ui'
import { useEditorStore } from '../useEditorStore'
import { ColorInput, NumInput, PropRow, PropSection, SelectInput, TextInput } from './inputs'
import { TextStyleFields } from './TextStyleFields'

export function TableProps({ el, schema }: { el: TableElement; schema: AttributeSchema | null }) {
  const { t } = useTranslation()
  const patch = useEditorStore((s) => s.patchElements)
  const set = (p: Partial<TableElement>) => patch([el.id], (e) => ({ ...e, ...p }) as TableElement)
  const tableFields = schema?.fields.filter((f) => f.type === 'table') ?? []
  const bound = tableFields.find((f) => f.key === el.fieldKey)
  const bindOptions = bound ? bound.columns.map((c) => ({ value: c.key, label: `${c.label} · ${c.key}` })) : []
  const setCol = (i: number, p: Partial<TableColumn>) => set({ columns: el.columns.map((c, j) => (j === i ? { ...c, ...p } : c)) })
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= el.columns.length) return; const cols = [...el.columns]; const [a, b] = [cols[i]!, cols[j]!]; cols[i] = b; cols[j] = a; set({ columns: cols }) }
  const addCol = () => { const c = bound?.columns.find((bc) => !el.columns.some((x) => x.bind === bc.key)); set({ columns: [...el.columns, { id: `${el.id}_c${Date.now().toString(36)}`, header: c?.label ?? t('catalog.editor.column'), bind: c?.key ?? '', width: 100, align: 'left' }] }) }
  const bindAll = () => { if (!bound) return; set({ columns: bound.columns.map((c, i) => ({ id: `${el.id}_b${i}`, header: c.label + (c.unit ? ` (${c.unit})` : ''), bind: c.key, width: c.type === 'number' ? 80 : 160, align: c.type === 'number' ? 'center' : 'left' })) }) }
  const ib = 'grid size-7 place-items-center rounded text-ink-3 hover:bg-surface-2 hover:text-ink [&>svg]:size-3.5 disabled:opacity-30'

  return (
    <>
      <PropSection title={t('catalog.editor.binding')}>
        <PropRow label={t('catalog.editor.tableField')}>
          <SelectInput value={el.fieldKey} onChange={(v) => set({ fieldKey: v })} options={[{ value: '', label: t('catalog.editor.staticTable') }, ...tableFields.map((f) => ({ value: f.key, label: f.label }))]} />
        </PropRow>
        {bound && <button className="text-[12px] text-brand-ink hover:underline text-left" onClick={bindAll}>{t('catalog.editor.bindAllColumns', { n: bound.columns.length })}</button>}
      </PropSection>
      <PropSection title={`${t('catalog.editor.columns')} · ${el.columns.length}`}>
        <div className="flex flex-col gap-2">
          {el.columns.map((c, i) => (
            <div key={c.id} className="rounded-lg border border-line p-2 flex flex-col gap-1.5 bg-surface-2/30">
              <div className="flex items-center gap-1">
                <TextInput value={c.header} onChange={(v) => setCol(i, { header: v })} placeholder={t('catalog.editor.header')} className="flex-1" />
                <button className={ib} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></button>
                <button className={ib} disabled={i === el.columns.length - 1} onClick={() => move(i, 1)}><ArrowDown /></button>
                <button className={`${ib} hover:text-danger`} onClick={() => set({ columns: el.columns.filter((_, j) => j !== i) })}><Trash2 /></button>
              </div>
              <div className="grid grid-cols-[1fr_64px_72px] gap-1">
                {bound ? (
                  <SelectInput value={c.bind} onChange={(v) => setCol(i, { bind: v })} options={[{ value: '', label: '—' }, ...bindOptions]} />
                ) : (
                  <TextInput value={c.bind} mono onChange={(v) => setCol(i, { bind: v })} placeholder="{row.x}" />
                )}
                <NumInput value={c.width} min={10} onChange={(v) => setCol(i, { width: v })} />
                <SelectInput value={c.align} onChange={(v) => setCol(i, { align: v })} options={[{ value: 'left', label: '⇤' }, { value: 'center', label: '↔' }, { value: 'right', label: '⇥' }]} />
              </div>
            </div>
          ))}
          <button onClick={addCol} className="inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-[12.5px] text-brand-ink hover:bg-brand-soft/60 self-start"><Plus className="size-3.5" />{t('catalog.editor.addColumn')}</button>
        </div>
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
