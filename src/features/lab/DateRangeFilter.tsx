/** Date preset segmented control with optional custom range inputs. */
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarRange } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { presetRange, type DatePreset, type DateRange } from '@/shared/lib/dates'
import { Input, Segmented } from '@/shared/ui'

export type RangePreset = DatePreset | 'custom'
export interface RangeState { preset: RangePreset; range: DateRange }

export const initialRange = (preset: DatePreset = 'today'): RangeState => ({ preset, range: presetRange(preset) })

export function DateRangeFilter({ value, onChange, presets = ['today', 'yesterday', 'last7', 'last30', 'thisMonth'], allowCustom, size = 'md', className }: {
  value: RangeState
  onChange: (v: RangeState) => void
  presets?: DatePreset[]
  allowCustom?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const { t } = useTranslation()
  const items: { value: RangePreset; label: string; icon?: React.ReactNode }[] = presets.map((p) => ({ value: p, label: t(`common.${p}`) }))
  if (allowCustom) items.push({ value: 'custom', label: t('clinical.reports.custom'), icon: <CalendarRange /> })
  return (
    <div className={cn('flex min-w-0 max-w-full flex-wrap items-center gap-2', className)}>
      {/* presets scroll horizontally on narrow screens instead of breaking the layout */}
      <div className="min-w-0 max-w-full overflow-x-auto no-scrollbar">
        <Segmented<RangePreset>
          size={size}
          items={items}
          value={value.preset}
          onChange={(p) => onChange(p === 'custom' ? { preset: 'custom', range: value.range } : { preset: p, range: presetRange(p) })}
        />
      </div>
      <AnimatePresence initial={false}>
        {value.preset === 'custom' && (
          <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.18 }} className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
            <Input type="date" value={value.range.from} max={value.range.to} onChange={(e) => onChange({ preset: 'custom', range: { ...value.range, from: e.target.value } })} className="h-8 w-[150px] max-w-full px-2 text-[13px] tabular" />
            <span className="text-ink-3">–</span>
            <Input type="date" value={value.range.to} min={value.range.from} onChange={(e) => onChange({ preset: 'custom', range: { ...value.range, to: e.target.value } })} className="h-8 w-[150px] max-w-full px-2 text-[13px] tabular" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
