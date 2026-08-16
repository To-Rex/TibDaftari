import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category, ResultTemplate, ServiceType, TemplateDoc } from '@/domain'
import { emptyDoc } from '@/domain'
import { Button, Field, Input, Modal, Segmented, Select } from '@/shared/ui'
import { BindingsFields, type Bindings } from './BindingsFields'

export interface NewTemplateInput extends Bindings { name: string; doc: TemplateDoc }

export function NewTemplateModal({ open, onClose, serviceTypes, categories, templates, onSubmit, saving, initial }: {
  open: boolean; onClose: () => void; serviceTypes: ServiceType[]; categories: Category[]; templates: ResultTemplate[]; onSubmit: (i: NewTemplateInput) => void; saving?: boolean
  /** prefill (e.g. "create template for this service" from the catalog) */
  initial?: Partial<Bindings> & { name?: string }
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [b, setB] = useState<Bindings>({ serviceTypeIds: [], categoryIds: [], scope: 'item', language: 'uz' })
  const [from, setFrom] = useState<'blank' | 'copy'>('blank')
  const [copyId, setCopyId] = useState('')
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setB({ serviceTypeIds: initial?.serviceTypeIds ?? [], categoryIds: initial?.categoryIds ?? [], scope: initial?.scope ?? 'item', language: initial?.language ?? 'uz' })
    setFrom('blank'); setCopyId(templates[0]?.id ?? ''); setTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templates])
  const err = touched && !name.trim() ? t('common.required') : undefined
  const submit = () => {
    setTouched(true)
    if (!name.trim()) return
    const src = from === 'copy' ? templates.find((x) => x.id === copyId) : undefined
    onSubmit({ name: name.trim(), ...b, doc: src ? structuredClone(src.doc) : emptyDoc() })
  }
  return (
    <Modal open={open} onClose={onClose} title={t('catalog.templates.new')} description={t('catalog.templates.newHint')} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} loading={saving}>{t('common.create')}</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label={t('common.name')} required error={err}>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} invalid={!!err} placeholder={t('catalog.templates.namePh')} autoFocus />}</Field>
        <Field label={t('catalog.templates.startFrom')}>{() => (
          <div className="flex flex-col gap-2">
            <Segmented value={from} onChange={setFrom} items={[{ value: 'blank', label: t('catalog.templates.blank') }, { value: 'copy', label: t('catalog.templates.copyOf') }]} />
            {from === 'copy' && (
              <Select value={copyId} onChange={(e) => setCopyId(e.target.value)}>
                {templates.map((x) => <option key={x.id} value={x.id}>{x.name} · v{x.version}</option>)}
              </Select>
            )}
          </div>
        )}</Field>
        <BindingsFields value={b} onChange={setB} serviceTypes={serviceTypes} categories={categories} />
      </div>
    </Modal>
  )
}
