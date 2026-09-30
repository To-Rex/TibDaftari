import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Branch, Category, ResultTemplate, ServiceType, TemplateDoc } from '@/domain'
import { emptyDoc } from '@/domain'
import { Button, Field, Input, Modal, Segmented, Select } from '@/shared/ui'
import { BindingsFields, type Bindings } from './BindingsFields'
import type { TemplateKind } from './kind'

export interface NewTemplateInput extends Bindings { name: string; doc: TemplateDoc; /** cheques: 'default' = the standard cheque, built by the API */ startFrom: 'default' | 'blank' | 'copy' }

export function NewTemplateModal({ open, onClose, serviceTypes, categories, branches, templates, onSubmit, saving, initial, kind = 'result' }: {
  open: boolean; onClose: () => void; serviceTypes: ServiceType[]; categories: Category[]; branches?: Branch[]; templates: ResultTemplate[]; onSubmit: (i: NewTemplateInput) => void; saving?: boolean
  /** 'receipt' → a cheque template (scope fixed, 80 mm paper); default: a result document */
  kind?: TemplateKind
  /** prefill (e.g. "create template for this service" from the catalog) */
  initial?: Partial<Bindings> & { name?: string }
}) {
  const { t } = useTranslation()
  const K = kind === 'receipt' ? 'catalog.receipts' : 'catalog.templates'
  const [name, setName] = useState('')
  const [b, setB] = useState<Bindings>({ serviceTypeIds: [], categoryIds: [], branchIds: [], scope: kind === 'receipt' ? 'receipt' : 'item', language: 'uz' })
  const [from, setFrom] = useState<'default' | 'blank' | 'copy'>(kind === 'receipt' ? 'default' : 'blank')
  const [copyId, setCopyId] = useState('')
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setB({ serviceTypeIds: initial?.serviceTypeIds ?? [], categoryIds: initial?.categoryIds ?? [], branchIds: initial?.branchIds ?? [], scope: kind === 'receipt' ? 'receipt' : (initial?.scope ?? 'item'), language: initial?.language ?? 'uz' })
    setFrom(kind === 'receipt' ? 'default' : 'blank'); setCopyId(templates[0]?.id ?? ''); setTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templates])
  const err = touched && !name.trim() ? t('common.required') : undefined
  const submit = () => {
    setTouched(true)
    if (!name.trim()) return
    const src = from === 'copy' ? templates.find((x) => x.id === copyId) : undefined
    onSubmit({ name: name.trim(), ...b, startFrom: from, doc: src ? structuredClone(src.doc) : emptyDoc(b.scope === 'receipt' ? 'Receipt80' : 'A4') })
  }
  return (
    <Modal open={open} onClose={onClose} title={t(`${K}.new`)} description={t(`${K}.newHint`)} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} loading={saving}>{t('common.create')}</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label={t('common.name')} required error={err}>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} invalid={!!err} placeholder={t(`${K}.namePh`)} autoFocus />}</Field>
        <Field label={t('catalog.templates.startFrom')}>{() => (
          <div className="flex flex-col gap-2">
            <Segmented value={from} onChange={setFrom} items={[...(kind === 'receipt' ? [{ value: 'default' as const, label: t('catalog.receipts.startDefault') }] : []), { value: 'blank' as const, label: t('catalog.templates.blank') }, { value: 'copy' as const, label: t('catalog.templates.copyOf') }]} />
            {from === 'default' && <p className="text-[12px] text-ink-3">{t('catalog.receipts.addDefaultHint')}</p>}
            {from === 'copy' && (
              <Select value={copyId} onChange={(e) => setCopyId(e.target.value)}>
                {templates.map((x) => <option key={x.id} value={x.id}>{x.name} · v{x.version}</option>)}
              </Select>
            )}
          </div>
        )}</Field>
        <BindingsFields value={b} onChange={setB} serviceTypes={serviceTypes} categories={categories} branches={branches} kind={kind} />
      </div>
    </Modal>
  )
}
