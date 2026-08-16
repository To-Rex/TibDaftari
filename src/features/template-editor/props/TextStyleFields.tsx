import { useTranslation } from 'react-i18next'
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDownToLine, ArrowUpToLine, Bold, FoldVertical, Italic, Underline } from 'lucide-react'
import type { TextStyle } from '@/domain'
import { ColorInput, NumInput, PropRow, SelectInput, ToggleChip } from './inputs'

/** Full TextStyle editor (used by text, field, table header/cell). */
export function TextStyleFields({ value, onChange, showBackground = true }: { value: TextStyle; onChange: (s: TextStyle) => void; showBackground?: boolean }) {
  const { t } = useTranslation()
  const set = (p: Partial<TextStyle>) => onChange({ ...value, ...p })
  return (
    <>
      <PropRow label={t('catalog.editor.font')}>
        <SelectInput value={value.fontFamily} onChange={(v) => set({ fontFamily: v })} options={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Mono' }]} />
        <NumInput value={value.fontSize} min={5} max={120} step={0.5} onChange={(v) => set({ fontSize: v })} suffix="px" className="max-w-[84px]" />
      </PropRow>
      <PropRow label={t('catalog.editor.weight')}>
        <SelectInput value={String(value.fontWeight) as '400'} onChange={(v) => set({ fontWeight: Number(v) as TextStyle['fontWeight'] })} options={[{ value: '400', label: 'Regular' }, { value: '500', label: 'Medium' }, { value: '600', label: 'Semibold' }, { value: '700', label: 'Bold' }]} />
        <ToggleChip active={(value.fontWeight ?? 400) >= 600} onClick={() => set({ fontWeight: value.fontWeight >= 600 ? 400 : 700 })} title="Bold"><Bold /></ToggleChip>
        <ToggleChip active={!!value.italic} onClick={() => set({ italic: !value.italic || undefined })} title="Italic"><Italic /></ToggleChip>
        <ToggleChip active={!!value.underline} onClick={() => set({ underline: !value.underline || undefined })} title="Underline"><Underline /></ToggleChip>
      </PropRow>
      <PropRow label={t('catalog.editor.color')}><ColorInput value={value.color} onChange={(v) => set({ color: v ?? '#000000' })} /></PropRow>
      <PropRow label={t('catalog.editor.align')}>
        {(['left', 'center', 'right', 'justify'] as const).map((a) => { const I = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify }[a]; return <ToggleChip key={a} active={value.align === a} onClick={() => set({ align: a })}><I /></ToggleChip> })}
        <span className="w-px h-6 bg-line mx-0.5" />
        {(['top', 'middle', 'bottom'] as const).map((a) => { const I = { top: ArrowUpToLine, middle: FoldVertical, bottom: ArrowDownToLine }[a]; return <ToggleChip key={a} active={(value.vAlign ?? 'top') === a} onClick={() => set({ vAlign: a })}><I /></ToggleChip> })}
      </PropRow>
      <PropRow label={t('catalog.editor.lineHeight')}>
        <NumInput value={value.lineHeight ?? 1.35} min={0.8} max={3} step={0.05} onChange={(v) => set({ lineHeight: v })} />
        <NumInput value={value.letterSpacing ?? 0} min={-2} max={10} step={0.1} onChange={(v) => set({ letterSpacing: v || undefined })} suffix="ls" />
      </PropRow>
      {showBackground && <PropRow label={t('catalog.editor.background')}><ColorInput value={value.background} onChange={(v) => set({ background: v })} allowNone noneLabel={t('catalog.editor.none')} /></PropRow>}
    </>
  )
}
