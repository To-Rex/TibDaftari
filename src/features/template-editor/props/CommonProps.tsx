import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Copy, Eye, EyeOff, Lock, Trash2, Unlock } from 'lucide-react'
import type { AttributeSchema, TemplateElement } from '@/domain'
import { useEditorStore } from '../useEditorStore'
import { NumInput, PropRow, PropSection, SelectInput, TextInput, ToggleChip } from './inputs'

/** Position/size/appearance shared by all elements + z-order + advanced repeat/showIf. */
export function CommonProps({ el, schema }: { el: TemplateElement; schema: AttributeSchema | null }) {
  const { t } = useTranslation()
  const { patchElements, reorder, duplicateSelected, removeSelected } = useEditorStore.getState()
  const p = (patch: Partial<TemplateElement>) => patchElements([el.id], (e) => ({ ...e, ...patch }) as TemplateElement)
  const tableFields = schema?.fields.filter((f) => f.type === 'table') ?? []
  const ib = 'grid size-8 place-items-center rounded-md border border-line text-ink-2 hover:bg-surface-2 [&>svg]:size-4'
  return (
    <>
      <PropSection title={t('catalog.editor.geometry')}>
        <PropRow label="X · Y"><NumInput value={el.x} onChange={(v) => p({ x: v })} /><NumInput value={el.y} onChange={(v) => p({ y: v })} /></PropRow>
        <PropRow label="W · H"><NumInput value={el.w} min={1} onChange={(v) => p({ w: v })} /><NumInput value={el.h} min={0} onChange={(v) => p({ h: v })} /></PropRow>
        <PropRow label={t('catalog.editor.rotation')}><NumInput value={el.rotation ?? 0} min={-180} max={180} onChange={(v) => p({ rotation: v || undefined })} suffix="°" /><NumInput value={Math.round((el.opacity ?? 1) * 100)} min={0} max={100} onChange={(v) => p({ opacity: v / 100 })} suffix="%" /></PropRow>
        <PropRow label={t('catalog.editor.name')}><TextInput value={el.name ?? ''} onChange={(v) => p({ name: v || undefined })} placeholder={t('catalog.editor.namePh')} /></PropRow>
        <PropRow label={t('catalog.editor.state')}>
          <ToggleChip active={!!el.locked} onClick={() => p({ locked: !el.locked || undefined })} title={t('catalog.editor.locked')}>{el.locked ? <Lock /> : <Unlock />}</ToggleChip>
          <ToggleChip active={!!el.hidden} onClick={() => p({ hidden: !el.hidden || undefined })} title={t('catalog.editor.hidden')}>{el.hidden ? <EyeOff /> : <Eye />}</ToggleChip>
          <span className="flex-1" />
          <button type="button" className={ib} title={t('catalog.editor.duplicate')} onClick={duplicateSelected}><Copy /></button>
          <button type="button" className={`${ib} text-danger hover:bg-danger-soft`} title={t('common.delete')} onClick={removeSelected}><Trash2 /></button>
        </PropRow>
        <PropRow label={t('catalog.editor.zOrder')}>
          <button type="button" className={ib} title={t('catalog.editor.bringToFront')} onClick={() => reorder(el.id, 'front')}><ArrowUpToLine /></button>
          <button type="button" className={ib} title={t('catalog.editor.bringForward')} onClick={() => reorder(el.id, 'up')}><ArrowUp /></button>
          <button type="button" className={ib} title={t('catalog.editor.sendBackward')} onClick={() => reorder(el.id, 'down')}><ArrowDown /></button>
          <button type="button" className={ib} title={t('catalog.editor.sendToBack')} onClick={() => reorder(el.id, 'back')}><ArrowDownToLine /></button>
        </PropRow>
      </PropSection>
      <PropSection title={t('catalog.editor.advanced')} defaultOpen={!!(el.repeat || el.showIf)}>
        <PropRow label={t('catalog.editor.repeat')}>
          <SelectInput value={el.repeat?.fieldKey ?? ''} onChange={(v) => p({ repeat: v ? { fieldKey: v, step: el.repeat?.step ?? el.h + 4 } : undefined })} options={[{ value: '', label: t('catalog.editor.none') }, ...tableFields.map((f) => ({ value: f.key, label: f.label }))]} />
          {el.repeat && <NumInput value={el.repeat.step} min={1} onChange={(v) => p({ repeat: { fieldKey: el.repeat!.fieldKey, step: v } })} suffix="px" className="max-w-[84px]" />}
        </PropRow>
        {el.repeat && <p className="text-[11.5px] text-ink-3 -mt-1">{t('catalog.editor.repeatHint')}</p>}
        <PropRow label={t('catalog.editor.showIf')}><TextInput value={el.showIf ?? ''} mono onChange={(v) => p({ showIf: v || undefined })} placeholder="{values.note}" /></PropRow>
        <p className="text-[11.5px] text-ink-3 -mt-1">{t('catalog.editor.showIfHint')}</p>
      </PropSection>
    </>
  )
}
