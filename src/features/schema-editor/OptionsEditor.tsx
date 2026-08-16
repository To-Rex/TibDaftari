import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { SelectOption } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Button, IconButton, Input, Segmented } from '@/shared/ui'
import { slugify, uniqueKey } from './fieldDefaults'

const FLAGS = ['normal', 'abnormal', 'critical'] as const
const COLORS = ['', '#2f8a4c', '#e6a23c', '#c2413f', '#5b8def', '#8b5cf6']

export function OptionsEditor({ value, onChange }: { value: SelectOption[]; onChange: (v: SelectOption[]) => void }) {
  const { t } = useTranslation()
  const set = (i: number, patch: Partial<SelectOption>) => onChange(value.map((o, j) => (j === i ? { ...o, ...patch } : o)))
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= value.length) return; const arr = [...value]; const [a, b] = [arr[i]!, arr[j]!]; arr[i] = b; arr[j] = a; onChange(arr) }
  const add = () => { const label = `${t('catalog.schemas.option')} ${value.length + 1}`; onChange([...value, { value: uniqueKey(slugify(label), value.map((o) => o.value)), label }]) }
  return (
    <div className="rounded-[var(--radius)] border border-line overflow-hidden">
      <div className="flex flex-col divide-y divide-line">
        {value.map((o, i) => (
          <div key={i} className="flex flex-col gap-1.5 px-2 py-2">
            <div className="flex items-center gap-1.5">
              <Input className="h-8 text-[13px] px-2 flex-1" value={o.label} placeholder={t('catalog.schemas.optionLabel')}
                onChange={(e) => { const label = e.target.value; const auto = o.value === slugify(o.label) || !o.value; set(i, { label, ...(auto ? { value: uniqueKey(slugify(label), value.filter((_, j) => j !== i).map((x) => x.value)) } : {}) }) }} />
              <Input className="h-8 text-[12px] px-2 w-32" mono value={o.value} onChange={(e) => set(i, { value: e.target.value })} placeholder="value" />
              <IconButton size="sm" label={t('catalog.tree.moveUp')} onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp /></IconButton>
              <IconButton size="sm" label={t('catalog.tree.moveDown')} onClick={() => move(i, 1)} disabled={i === value.length - 1}><ArrowDown /></IconButton>
              <IconButton size="sm" label={t('common.delete')} onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-ink-3 hover:text-danger"><Trash2 /></IconButton>
            </div>
            <div className="flex items-center gap-2 pl-0.5">
              <Segmented size="sm" value={o.flag ?? 'normal'} onChange={(v) => set(i, { flag: v === 'normal' ? undefined : v })} items={FLAGS.map((f) => ({ value: f, label: t(`catalog.schemas.flags.${f}`) }))} />
              <span className="flex items-center gap-1 ml-auto">
                {COLORS.map((c) => (
                  <button key={c || 'none'} type="button" onClick={() => set(i, { color: c || undefined })} className={cn('size-5 rounded-full border transition-transform hover:scale-110', (o.color ?? '') === c ? 'ring-2 ring-brand ring-offset-1 ring-offset-bg-elevated' : 'border-line')} style={{ background: c || 'transparent' }} aria-label={c || 'none'}>
                    {!c && <span className="block size-full rounded-full bg-[linear-gradient(135deg,transparent_45%,var(--c-line-strong)_45%,var(--c-line-strong)_55%,transparent_55%)]" />}
                  </button>
                ))}
              </span>
            </div>
          </div>
        ))}
        {value.length === 0 && <p className="px-3 py-3 text-[12.5px] text-ink-3">{t('catalog.schemas.noOptions')}</p>}
      </div>
      <div className="px-2 py-1.5 border-t border-line bg-surface-2/40">
        <Button size="xs" variant="ghost" leftIcon={<Plus className="size-3.5" />} onClick={add}>{t('catalog.schemas.addOption')}</Button>
      </div>
    </div>
  )
}
