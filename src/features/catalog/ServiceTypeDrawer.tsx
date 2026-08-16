import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AttributeSchema, Branch, Category, Id, ResultTemplate, ServiceType } from '@/domain'
import { Button, Drawer, Field, Input, Segmented, Select, Switch, Textarea } from '@/shared/ui'
import { categoryPath } from './tree'

export interface ServiceTypeDraft {
  id?: Id
  name: string
  code: string
  description: string
  categoryId: Id
  price: number
  branchPrices: Record<Id, number>
  turnaroundDays: number
  schemaId: Id | null
  documentScope: 'item' | 'order'
  defaultTemplateId: Id | null
  isActive: boolean
}

export const draftFromServiceType = (s?: ServiceType | null, categoryId: Id = ''): ServiceTypeDraft =>
  s
    ? { id: s.id, name: s.name, code: s.code ?? '', description: s.description ?? '', categoryId: s.categoryId, price: s.price, branchPrices: { ...s.branchPrices }, turnaroundDays: s.turnaroundDays, schemaId: s.schemaId, documentScope: s.documentScope, defaultTemplateId: s.defaultTemplateId, isActive: s.isActive }
    : { name: '', code: '', description: '', categoryId, price: 0, branchPrices: {}, turnaroundDays: 1, schemaId: null, documentScope: 'item', defaultTemplateId: null, isActive: true }

export function ServiceTypeDrawer({ open, onClose, initial, categories, branches, schemas, templates, onSubmit, saving }: {
  open: boolean; onClose: () => void; initial: ServiceTypeDraft | null; categories: Category[]; branches: Branch[]; schemas: AttributeSchema[]; templates: ResultTemplate[]
  onSubmit: (d: ServiceTypeDraft) => void; saving?: boolean
}) {
  const { t } = useTranslation()
  const [d, setD] = useState<ServiceTypeDraft>(draftFromServiceType())
  const [touched, setTouched] = useState(false)
  useEffect(() => { if (open && initial) { setD(initial); setTouched(false) } }, [open, initial])
  const set = <K extends keyof ServiceTypeDraft>(k: K, v: ServiceTypeDraft[K]) => setD((s) => ({ ...s, [k]: v }))

  const nameErr = touched && !d.name.trim() ? t('common.required') : undefined
  const catErr = touched && !d.categoryId ? t('common.required') : undefined
  const published = schemas.filter((s) => s.status === 'published')
  const boundTemplates = useMemo(() => templates.filter((tp) => tp.serviceTypeIds.length === 0 || (d.id ? tp.serviceTypeIds.includes(d.id) : false)), [templates, d.id])
  const submit = () => { setTouched(true); if (!d.name.trim() || !d.categoryId) return; onSubmit({ ...d, name: d.name.trim(), code: d.code.trim().toUpperCase() }) }
  const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0))

  return (
    <Drawer open={open} onClose={onClose} title={d.id ? t('catalog.services.edit') : t('catalog.services.new')} description={t('catalog.services.drawerHint')} width="max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} loading={saving}>{t('common.save')}</Button></>}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-[1fr_130px] gap-3">
          <Field label={t('common.name')} required error={nameErr}>{(id) => <Input id={id} value={d.name} onChange={(e) => set('name', e.target.value)} invalid={!!nameErr} placeholder={t('catalog.services.namePh')} autoFocus />}</Field>
          <Field label={t('catalog.tree.code')}>{(id) => <Input id={id} value={d.code} onChange={(e) => set('code', e.target.value)} mono placeholder="CBC" />}</Field>
        </div>
        <Field label={t('catalog.services.description')}>{(id) => <Textarea id={id} value={d.description} onChange={(e) => set('description', e.target.value)} rows={2} className="min-h-[64px]" />}</Field>
        <Field label={t('catalog.services.category')} required error={catErr}>{(id) => (
          <Select id={id} value={d.categoryId} onChange={(e) => set('categoryId', e.target.value)} invalid={!!catErr}>
            <option value="">{t('common.select')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{categoryPath(categories, c.id).map((x) => x.name).join(' / ')}</option>)}
          </Select>
        )}</Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.price')} hint={t('catalog.services.priceHint')}>{(id) => <Input id={id} type="number" min={0} step={1000} value={d.price} onChange={(e) => set('price', num(e.target.value))} mono rightSlot={<span className="text-[12px] text-ink-3 pr-1">{t('common.sum')}</span>} />}</Field>
          <Field label={t('catalog.services.turnaround')}>{(id) => <Input id={id} type="number" min={0} value={d.turnaroundDays} onChange={(e) => set('turnaroundDays', num(e.target.value))} mono rightSlot={<span className="text-[12px] text-ink-3 pr-1">{t('common.days')}</span>} />}</Field>
        </div>

        {branches.length > 0 && (
          <div className="rounded-[var(--radius)] border border-line bg-surface-2/40 p-3">
            <p className="text-[12.5px] font-medium text-ink-2 mb-2">{t('catalog.services.branchPrices')}</p>
            <div className="flex flex-col gap-2">
              {branches.map((b) => {
                const v = d.branchPrices[b.id]
                return (
                  <div key={b.id} className="grid grid-cols-[1fr_180px] items-center gap-3">
                    <span className="text-[13.5px] truncate">{b.name} <span className="text-ink-3 font-mono text-[12px]">{b.code}</span></span>
                    <Input type="number" min={0} step={1000} mono placeholder={String(d.price)} value={v ?? ''} className="h-9"
                      onChange={(e) => { const bp = { ...d.branchPrices }; if (e.target.value === '') delete bp[b.id]; else bp[b.id] = num(e.target.value); set('branchPrices', bp) }} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <Field label={t('catalog.services.schema')} hint={t('catalog.services.schemaHint')}>{(id) => (
          <Select id={id} value={d.schemaId ?? ''} onChange={(e) => set('schemaId', e.target.value || null)}>
            <option value="">{t('catalog.services.noSchema')}</option>
            {published.map((s) => <option key={s.id} value={s.id}>{s.name} · v{s.version}</option>)}
          </Select>
        )}</Field>
        <Field label={t('catalog.services.docScope')} hint={t('catalog.services.docScopeHint')}>{() => (
          <Segmented value={d.documentScope} onChange={(v) => set('documentScope', v)} items={[{ value: 'item', label: t('catalog.services.scopeItem') }, { value: 'order', label: t('catalog.services.scopeOrder') }]} />
        )}</Field>
        <Field label={t('catalog.services.defaultTemplate')}>{(id) => (
          <Select id={id} value={d.defaultTemplateId ?? ''} onChange={(e) => set('defaultTemplateId', e.target.value || null)}>
            <option value="">{t('catalog.services.noTemplate')}</option>
            {boundTemplates.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}{tp.serviceTypeIds.length === 0 ? ` · ${t('catalog.services.generic')}` : ''}</option>)}
          </Select>
        )}</Field>
        <Switch checked={d.isActive} onChange={(v) => set('isActive', v)} label={t('common.active')} description={t('catalog.services.activeHint')} />
      </div>
    </Drawer>
  )
}
