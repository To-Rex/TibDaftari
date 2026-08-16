import { useTranslation } from 'react-i18next'
import type { AttributeSchema, FieldElement } from '@/domain'
import { Checkbox } from '@/shared/ui'
import { useEditorStore } from '../useEditorStore'
import { PropRow, PropSection, SelectInput } from './inputs'
import { TextStyleFields } from './TextStyleFields'

export function FieldProps({ el, schema }: { el: FieldElement; schema: AttributeSchema | null }) {
  const { t } = useTranslation()
  const patch = useEditorStore((s) => s.patchElements)
  const set = (p: Partial<FieldElement>) => patch([el.id], (e) => ({ ...e, ...p }) as FieldElement)
  const fields = schema?.fields ?? []
  const known = fields.some((f) => f.key === el.fieldKey)
  return (
    <>
      <PropSection title={t('catalog.editor.binding')}>
        <PropRow label={t('catalog.editor.fieldKey')}>
          <SelectInput value={el.fieldKey} onChange={(v) => set({ fieldKey: v })} options={[{ value: '', label: t('common.select') }, ...(!known && el.fieldKey ? [{ value: el.fieldKey, label: `${el.fieldKey} (?)` }] : []), ...fields.map((f) => ({ value: f.key, label: `${f.label} · ${f.key}` }))]} />
        </PropRow>
        {!schema && <p className="text-[11.5px] text-warn">{t('catalog.editor.noSchemaBound')}</p>}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
          <Checkbox checked={el.showLabel} onChange={(e) => set({ showLabel: e.target.checked })} label={<span className="text-[12.5px]">{t('catalog.editor.showLabel')}</span>} />
          <Checkbox checked={el.showUnit} onChange={(e) => set({ showUnit: e.target.checked })} label={<span className="text-[12.5px]">{t('catalog.editor.showUnit')}</span>} />
          <Checkbox checked={el.showReference} onChange={(e) => set({ showReference: e.target.checked })} label={<span className="text-[12.5px]">{t('catalog.editor.showReference')}</span>} />
          <Checkbox checked={el.highlightAbnormal} onChange={(e) => set({ highlightAbnormal: e.target.checked })} label={<span className="text-[12.5px]">{t('catalog.editor.highlightAbnormal')}</span>} />
        </div>
      </PropSection>
      <PropSection title={t('catalog.editor.style')}>
        <TextStyleFields value={el.style} onChange={(style) => set({ style })} />
      </PropSection>
    </>
  )
}
