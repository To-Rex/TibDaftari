import { useTranslation } from 'react-i18next'
import type { ImageElement, LineElement, RectElement } from '@/domain'
import { Button } from '@/shared/ui'
import { useEditorStore } from '../useEditorStore'
import { ColorInput, NumInput, PropRow, PropSection, SelectInput, ToggleChip } from './inputs'

export function RectProps({ el }: { el: RectElement }) {
  const { t } = useTranslation()
  const patch = useEditorStore((s) => s.patchElements)
  const set = (p: Partial<RectElement>) => patch([el.id], (e) => ({ ...e, ...p }) as RectElement)
  return (
    <PropSection title={t('catalog.editor.appearance')}>
      <PropRow label={t('catalog.editor.fill')}><ColorInput value={el.fill} onChange={(v) => set({ fill: v })} allowNone noneLabel={t('catalog.editor.none')} /></PropRow>
      <PropRow label={t('catalog.editor.stroke')}><ColorInput value={el.stroke} onChange={(v) => set({ stroke: v })} allowNone noneLabel={t('catalog.editor.none')} /></PropRow>
      <PropRow label={t('catalog.editor.strokeWidth')}><NumInput value={el.strokeWidth ?? 1} min={0} max={20} step={0.5} onChange={(v) => set({ strokeWidth: v })} suffix="px" />
        {el.type === 'rect' && <NumInput value={el.radius ?? 0} min={0} max={200} onChange={(v) => set({ radius: v || undefined })} suffix="r" />}
      </PropRow>
    </PropSection>
  )
}

export function LineProps({ el }: { el: LineElement }) {
  const { t } = useTranslation()
  const patch = useEditorStore((s) => s.patchElements)
  const set = (p: Partial<LineElement>) => patch([el.id], (e) => ({ ...e, ...p }) as LineElement)
  return (
    <PropSection title={t('catalog.editor.appearance')}>
      <PropRow label={t('catalog.editor.orientation')}>
        <SelectInput value={el.orientation} options={[{ value: 'horizontal', label: t('catalog.editor.horizontal') }, { value: 'vertical', label: t('catalog.editor.vertical') }]}
          onChange={(v) => set(v === el.orientation ? {} : { orientation: v, w: el.h, h: el.w })} />
      </PropRow>
      <PropRow label={t('catalog.editor.stroke')}><ColorInput value={el.stroke} onChange={(v) => set({ stroke: v ?? '#000000' })} /></PropRow>
      <PropRow label={t('catalog.editor.strokeWidth')}>
        <NumInput value={el.strokeWidth} min={0.5} max={20} step={0.5} onChange={(v) => set({ strokeWidth: v })} suffix="px" />
        <ToggleChip active={!!el.dashed} onClick={() => set({ dashed: !el.dashed || undefined })}>{t('catalog.editor.dashed')}</ToggleChip>
      </PropRow>
    </PropSection>
  )
}

export function ImageProps({ el, onPick, assetName }: { el: ImageElement; onPick: () => void; assetName?: string }) {
  const { t } = useTranslation()
  const patch = useEditorStore((s) => s.patchElements)
  const set = (p: Partial<ImageElement>) => patch([el.id], (e) => ({ ...e, ...p }) as ImageElement)
  return (
    <PropSection title={t('catalog.editor.image')}>
      <PropRow label={t('catalog.editor.asset')}>
        <span className="truncate text-[12.5px] flex-1">{assetName ?? (el.src ? t('catalog.editor.customImage') : t('catalog.editor.noImage'))}</span>
        <Button size="xs" variant="secondary" onClick={onPick}>{t('catalog.editor.choose')}</Button>
      </PropRow>
      <PropRow label={t('catalog.editor.fit')}>
        <SelectInput value={el.fit} onChange={(v) => set({ fit: v })} options={[{ value: 'contain', label: 'contain' }, { value: 'cover', label: 'cover' }, { value: 'fill', label: 'fill' }]} />
      </PropRow>
    </PropSection>
  )
}
