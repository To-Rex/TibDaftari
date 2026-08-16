import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import type { TableField } from '@/domain'
import { Button, IconButton, Input, Select } from '@/shared/ui'

/** Simple grid of preset rows keyed by column key (e.g. list of parasites / antibiotics). */
export function PresetRowsEditor({ field, onChange }: { field: TableField; onChange: (f: TableField) => void }) {
  const { t } = useTranslation()
  const rows = field.presetRows
  const cols = field.columns
  const setRows = (presetRows: Record<string, unknown>[]) => onChange({ ...field, presetRows })
  const setCell = (i: number, key: string, v: unknown) => setRows(rows.map((r, j) => (j === i ? { ...r, [key]: v === '' ? undefined : v } : r)))
  if (cols.length === 0) return <p className="text-[12.5px] text-ink-3">{t('catalog.schemas.presetNeedsColumns')}</p>
  return (
    <div className="rounded-[var(--radius)] border border-line overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead><tr className="bg-surface-2/70 text-[11px] uppercase tracking-[0.05em] text-ink-3">
            <th className="px-2 py-1.5 text-left w-8">#</th>
            {cols.map((c) => <th key={c.key} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">{c.label}</th>)}
            <th className="w-8" />
          </tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-2 text-ink-3 tabular">{i + 1}</td>
                {cols.map((c) => (
                  <td key={c.key} className="px-1 py-1 min-w-[120px]">
                    {c.type === 'select' ? (
                      <Select value={String(r[c.key] ?? '')} onChange={(e) => setCell(i, c.key, e.target.value)} className="h-8 text-[12.5px] px-2 pr-6">
                        <option value="">—</option>{c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select>
                    ) : c.type === 'boolean' ? (
                      <Select value={r[c.key] == null ? '' : String(r[c.key])} onChange={(e) => setCell(i, c.key, e.target.value === '' ? '' : e.target.value === 'true')} className="h-8 text-[12.5px] px-2 pr-6">
                        <option value="">—</option><option value="true">{c.trueLabel ?? t('common.yes')}</option><option value="false">{c.falseLabel ?? t('common.no')}</option>
                      </Select>
                    ) : (
                      <Input type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'} step="any" className="h-8 text-[12.5px] px-2" mono={c.type === 'number'} value={r[c.key] == null ? '' : String(r[c.key])}
                        onChange={(e) => setCell(i, c.key, c.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />
                    )}
                  </td>
                ))}
                <td className="px-1"><IconButton size="sm" label={t('common.delete')} onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-ink-3 hover:text-danger"><Trash2 /></IconButton></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-3 py-3 text-[12.5px] text-ink-3">{t('catalog.schemas.noPresetRows')}</p>}
      </div>
      <div className="px-2 py-1.5 border-t border-line bg-surface-2/40">
        <Button size="xs" variant="ghost" leftIcon={<Plus className="size-3.5" />} onClick={() => setRows([...rows, {}])}>{t('catalog.schemas.addRow')}</Button>
      </div>
    </div>
  )
}
