import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import type { ReferenceRange } from '@/domain'
import { Button, IconButton, Input, Select } from '@/shared/ui'

const numOrUndef = (v: string) => (v === '' ? undefined : Number(v))

export function ReferenceRangesEditor({ value, onChange, unit }: { value: ReferenceRange[]; onChange: (v: ReferenceRange[]) => void; unit?: string }) {
  const { t } = useTranslation()
  const set = (i: number, patch: Partial<ReferenceRange>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div className="rounded-[var(--radius)] border border-line overflow-hidden">
      <div className="grid grid-cols-[92px_64px_64px_1fr_1fr_1.4fr_28px] gap-1.5 items-center px-2 py-1.5 bg-surface-2/70 text-[11px] uppercase tracking-[0.05em] text-ink-3">
        <span>{t('common.gender')}</span><span>{t('catalog.schemas.ageFrom')}</span><span>{t('catalog.schemas.ageTo')}</span><span>Min</span><span>Max</span><span>{t('catalog.schemas.refText')}</span><span />
      </div>
      <div className="flex flex-col divide-y divide-line">
        {value.map((r, i) => (
          <div key={i} className="grid grid-cols-[92px_64px_64px_1fr_1fr_1.4fr_28px] gap-1.5 items-center px-2 py-1.5">
            <Select value={r.gender ?? ''} onChange={(e) => set(i, { gender: (e.target.value || undefined) as ReferenceRange['gender'] })} className="h-8 text-[12.5px] px-2 pr-6">
              <option value="">{t('catalog.schemas.anyGender')}</option><option value="male">{t('common.male')}</option><option value="female">{t('common.female')}</option>
            </Select>
            <Input type="number" min={0} className="h-8 text-[12.5px] px-2" mono value={r.ageFromMonths ?? ''} onChange={(e) => set(i, { ageFromMonths: numOrUndef(e.target.value) })} placeholder="0" />
            <Input type="number" min={0} className="h-8 text-[12.5px] px-2" mono value={r.ageToMonths ?? ''} onChange={(e) => set(i, { ageToMonths: numOrUndef(e.target.value) })} placeholder="∞" />
            <Input type="number" step="any" className="h-8 text-[12.5px] px-2" mono value={r.min ?? ''} onChange={(e) => set(i, { min: numOrUndef(e.target.value) })} />
            <Input type="number" step="any" className="h-8 text-[12.5px] px-2" mono value={r.max ?? ''} onChange={(e) => set(i, { max: numOrUndef(e.target.value) })} />
            <Input className="h-8 text-[12.5px] px-2" value={r.text ?? ''} onChange={(e) => set(i, { text: e.target.value || undefined })} placeholder={t('catalog.schemas.refTextPh')} />
            <IconButton size="sm" label={t('common.delete')} onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-ink-3 hover:text-danger"><Trash2 /></IconButton>
          </div>
        ))}
        {value.length === 0 && <p className="px-3 py-3 text-[12.5px] text-ink-3">{t('catalog.schemas.noRanges')}</p>}
      </div>
      <div className="px-2 py-1.5 border-t border-line bg-surface-2/40 flex items-center justify-between">
        <Button size="xs" variant="ghost" leftIcon={<Plus className="size-3.5" />} onClick={() => onChange([...value, {}])}>{t('catalog.schemas.addRange')}</Button>
        <span className="text-[11.5px] text-ink-3">{t('catalog.schemas.ageMonthsHint')}{unit ? ` · ${unit}` : ''}</span>
      </div>
    </div>
  )
}
