import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FieldDef, FieldType } from '@/domain'
import { Checkbox, ConfirmDialog, Field, Input, Select, Switch } from '@/shared/ui'
import { COLUMN_TYPES, FIELD_TYPES, changeFieldType, fieldTypeChanged, slugify, uniqueKey } from './fieldDefaults'
import { OptionsEditor } from './OptionsEditor'
import { ReferenceRangesEditor } from './ReferenceRangesEditor'
import { TableColumnsEditor } from './TableColumnsEditor'
import { PresetRowsEditor } from './PresetRowsEditor'

export interface FieldPropertyEditorProps {
  field: FieldDef
  /** siblings (for unique key + visibleIf choices) */
  siblings: FieldDef[]
  onChange: (f: FieldDef) => void
  /** table columns cannot be tables themselves */
  allowTable?: boolean
  readOnly?: boolean
}

const numOrUndef = (v: string) => (v === '' ? undefined : Number(v))

export function FieldPropertyEditor({ field, siblings, onChange, allowTable = true, readOnly }: FieldPropertyEditorProps) {
  const { t } = useTranslation()
  const [pendingType, setPendingType] = useState<FieldType | null>(null)
  const [keyTouched, setKeyTouched] = useState(false)
  const others = siblings.filter((f) => f.key !== field.key)
  const takenKeys = others.map((f) => f.key)
  const keyDup = takenKeys.includes(field.key)
  const keyBad = !/^[a-z][a-z0-9_]*$/.test(field.key)
  const patch = (p: Partial<FieldDef>) => onChange({ ...field, ...p } as FieldDef)

  const setLabel = (label: string) => {
    const auto = !keyTouched && (field.key === slugify(field.label) || !field.key)
    onChange({ ...field, label, ...(auto ? { key: uniqueKey(slugify(label), takenKeys) } : {}) } as FieldDef)
  }
  const requestType = (tp: FieldType) => {
    if (tp === field.type) return
    if (fieldTypeChanged(field, tp) && hasTypeSpecifics(field)) setPendingType(tp)
    else onChange(changeFieldType(field, tp))
  }
  const visibleCandidates = others.filter((f) => f.type === 'select' || f.type === 'boolean' || f.type === 'multiselect')
  const visTarget = field.visibleIf ? others.find((f) => f.key === field.visibleIf!.key) : undefined

  return (
    <fieldset disabled={readOnly} className="flex flex-col gap-4 disabled:opacity-70">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('catalog.schemas.label')} required>{(id) => <Input id={id} value={field.label} onChange={(e) => setLabel(e.target.value)} />}</Field>
        <Field label={t('catalog.schemas.key')} error={keyDup ? t('catalog.schemas.keyDup') : keyBad ? t('catalog.schemas.keyBad') : undefined} hint={!keyDup && !keyBad ? t('catalog.schemas.keyHint') : undefined}>
          {(id) => <Input id={id} mono value={field.key} invalid={keyDup || keyBad} onChange={(e) => { setKeyTouched(true); patch({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }) }} />}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('catalog.schemas.type')}>{(id) => (
          <Select id={id} value={field.type} onChange={(e) => requestType(e.target.value as FieldType)}>
            {(allowTable ? FIELD_TYPES : COLUMN_TYPES).map((ft) => <option key={ft} value={ft}>{t(`catalog.schemas.types.${ft}`)}</option>)}
          </Select>
        )}</Field>
        <Field label={t('catalog.schemas.unit')}>{(id) => <Input id={id} value={field.unit ?? ''} onChange={(e) => patch({ unit: e.target.value || undefined })} placeholder="g/l, %, mm/soat" />}</Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('catalog.schemas.group')} hint={t('catalog.schemas.groupHint')}>{(id) => <Input id={id} value={field.group ?? ''} onChange={(e) => patch({ group: e.target.value || undefined })} list={`groups-${field.key}`} />}</Field>
        <datalist id={`groups-${field.key}`}>{[...new Set(siblings.map((f) => f.group).filter(Boolean))].map((g) => <option key={g} value={g} />)}</datalist>
        <div className="flex items-end pb-1"><Switch checked={field.required} onChange={(v) => patch({ required: v })} label={t('catalog.schemas.required')} /></div>
      </div>
      <Field label={t('catalog.schemas.hint')}>{(id) => <Input id={id} value={field.hint ?? ''} onChange={(e) => patch({ hint: e.target.value || undefined })} placeholder={t('catalog.schemas.hintPh')} />}</Field>

      {/* visibleIf */}
      {visibleCandidates.length > 0 && (
        <Field label={t('catalog.schemas.visibleIf')} hint={t('catalog.schemas.visibleIfHint')}>{(id) => (
          <div className="grid grid-cols-2 gap-2">
            <Select id={id} value={field.visibleIf?.key ?? ''} onChange={(e) => { const k = e.target.value; if (!k) return patch({ visibleIf: undefined }); const tgt = others.find((f) => f.key === k)!; patch({ visibleIf: { key: k, equals: tgt.type === 'boolean' ? true : (tgt.type === 'select' || tgt.type === 'multiselect' ? (tgt.options[0]?.value ?? '') : '') } }) }}>
              <option value="">{t('catalog.schemas.always')}</option>
              {visibleCandidates.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </Select>
            {visTarget && (visTarget.type === 'boolean' ? (
              <Select value={String(field.visibleIf?.equals)} onChange={(e) => patch({ visibleIf: { key: visTarget.key, equals: e.target.value === 'true' } })}>
                <option value="true">{visTarget.trueLabel ?? t('common.yes')}</option><option value="false">{visTarget.falseLabel ?? t('common.no')}</option>
              </Select>
            ) : (visTarget.type === 'select' || visTarget.type === 'multiselect') ? (
              <Select value={String(field.visibleIf?.equals ?? '')} onChange={(e) => patch({ visibleIf: { key: visTarget.key, equals: e.target.value } })}>
                {visTarget.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            ) : null)}
          </div>
        )}</Field>
      )}

      <div className="h-px bg-line" />
      <TypeSpecific field={field} onChange={onChange} />

      <ConfirmDialog open={!!pendingType} onClose={() => setPendingType(null)} title={t('catalog.schemas.changeTypeTitle')} description={t('catalog.schemas.changeTypeHint')} confirmText={t('catalog.schemas.changeType')} cancelText={t('common.cancel')} danger
        onConfirm={() => { if (pendingType) onChange(changeFieldType(field, pendingType)); setPendingType(null) }} />
    </fieldset>
  )
}

function hasTypeSpecifics(f: FieldDef): boolean {
  switch (f.type) {
    case 'number': return f.references.length > 0 || f.min != null || f.max != null
    case 'select': case 'multiselect': return f.options.length > 0
    case 'table': return f.columns.length > 0 || f.presetRows.length > 0
    case 'text': case 'longtext': return !!f.placeholder || f.maxLength != null
    case 'boolean': return !!f.trueLabel || !!f.falseLabel
    default: return false
  }
}

function TypeSpecific({ field, onChange }: { field: FieldDef; onChange: (f: FieldDef) => void }) {
  const { t } = useTranslation()
  switch (field.type) {
    case 'text':
    case 'longtext':
      return (
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label={t('catalog.schemas.placeholder')}>{(id) => <Input id={id} value={field.placeholder ?? ''} onChange={(e) => onChange({ ...field, placeholder: e.target.value || undefined })} />}</Field>
          <Field label={t('catalog.schemas.maxLength')}>{(id) => <Input id={id} type="number" min={1} mono value={field.maxLength ?? ''} onChange={(e) => onChange({ ...field, maxLength: numOrUndef(e.target.value) })} />}</Field>
        </div>
      )
    case 'number':
      return (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('catalog.schemas.decimals')}>{(id) => <Input id={id} type="number" min={0} max={4} mono value={field.decimals ?? ''} onChange={(e) => onChange({ ...field, decimals: numOrUndef(e.target.value) })} />}</Field>
            <Field label={t('catalog.schemas.min')}>{(id) => <Input id={id} type="number" step="any" mono value={field.min ?? ''} onChange={(e) => onChange({ ...field, min: numOrUndef(e.target.value) })} />}</Field>
            <Field label={t('catalog.schemas.max')}>{(id) => <Input id={id} type="number" step="any" mono value={field.max ?? ''} onChange={(e) => onChange({ ...field, max: numOrUndef(e.target.value) })} />}</Field>
          </div>
          <Field label={t('catalog.schemas.references')} hint={t('catalog.schemas.referencesHint')}>{() => <ReferenceRangesEditor value={field.references} unit={field.unit} onChange={(references) => onChange({ ...field, references })} />}</Field>
        </div>
      )
    case 'select':
    case 'multiselect':
      return (
        <div className="flex flex-col gap-3">
          <Field label={t('catalog.schemas.options')}>{() => <OptionsEditor value={field.options} onChange={(options) => onChange({ ...field, options })} />}</Field>
          <Checkbox checked={!!field.allowOther} onChange={(e) => onChange({ ...field, allowOther: e.target.checked || undefined })} label={t('catalog.schemas.allowOther')} />
        </div>
      )
    case 'boolean':
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('catalog.schemas.trueLabel')}>{(id) => <Input id={id} value={field.trueLabel ?? ''} placeholder={t('common.yes')} onChange={(e) => onChange({ ...field, trueLabel: e.target.value || undefined })} />}</Field>
          <Field label={t('catalog.schemas.falseLabel')}>{(id) => <Input id={id} value={field.falseLabel ?? ''} placeholder={t('common.no')} onChange={(e) => onChange({ ...field, falseLabel: e.target.value || undefined })} />}</Field>
        </div>
      )
    case 'date':
      return <p className="text-[12.5px] text-ink-3">{t('catalog.schemas.dateHint')}</p>
    case 'table':
      return (
        <div className="flex flex-col gap-4">
          <Field label={t('catalog.schemas.columns')} hint={t('catalog.schemas.columnsHint')}>{() => <TableColumnsEditor field={field} onChange={onChange} />}</Field>
          <Field label={t('catalog.schemas.presetRows')} hint={t('catalog.schemas.presetRowsHint')}>{() => <PresetRowsEditor field={field} onChange={onChange} />}</Field>
          <div className="grid grid-cols-3 gap-3 items-end">
            <Switch checked={field.allowAddRows} onChange={(v) => onChange({ ...field, allowAddRows: v })} label={t('catalog.schemas.allowAddRows')} />
            <Switch checked={field.allowRemoveRows} onChange={(v) => onChange({ ...field, allowRemoveRows: v })} label={t('catalog.schemas.allowRemoveRows')} />
            <Field label={t('catalog.schemas.minRows')}>{(id) => <Input id={id} type="number" min={0} mono className="h-9" value={field.minRows ?? ''} onChange={(e) => onChange({ ...field, minRows: numOrUndef(e.target.value) })} />}</Field>
          </div>
        </div>
      )
  }
}
