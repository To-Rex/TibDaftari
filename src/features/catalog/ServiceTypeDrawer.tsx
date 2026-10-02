import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AttributeSchema, Branch, Category, Id, ResultTemplate, ServiceType } from '@/domain'
import { boundToService, isGeneric } from '@/features/template-editor/galleryFilters'
import { Button, Checkbox, Drawer, Field, Input, Segmented, Select, Switch, Textarea } from '@/shared/ui'
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

/** What the drawer asks the page to do besides saving the service. */
export interface ServiceTypeSubmitOptions {
  /** the chosen default template is not bound to the service yet: bind its same-named copies in the other branches as well */
  bindCopies: boolean
}

export function ServiceTypeDrawer({ open, onClose, initial, categories, branches, schemas, templates, onSubmit, saving, branchId }: {
  open: boolean; onClose: () => void; initial: ServiceTypeDraft | null; categories: Category[]; branches: Branch[]; schemas: AttributeSchema[]; templates: ResultTemplate[]
  onSubmit: (d: ServiceTypeDraft, opts: ServiceTypeSubmitOptions) => void; saving?: boolean
  /** the branch selected in the top bar (templates are branch-owned); null = all branches */
  branchId?: Id | null
}) {
  const { t } = useTranslation()
  const [d, setD] = useState<ServiceTypeDraft>(draftFromServiceType())
  const [touched, setTouched] = useState(false)
  const [bindCopies, setBindCopies] = useState(true)
  useEffect(() => { if (open && initial) { setD(initial); setTouched(false); setBindCopies(true) } }, [open, initial])
  const set = <K extends keyof ServiceTypeDraft>(k: K, v: ServiceTypeDraft[K]) => setD((s) => ({ ...s, [k]: v }))

  const nameErr = touched && !d.name.trim() ? t('common.required') : undefined
  const catErr = touched && !d.categoryId ? t('common.required') : undefined
  const published = schemas.filter((s) => s.status === 'published')
  // "Standart andoza": every result template (cheque templates are not result documents) — those already bound to
  // the service (or its category, or generic) first, then all the others; picking one of those binds it on save.
  // Templates are branch-owned: with a branch selected only its templates are offered (plus the current default).
  const svc = { id: d.id ?? '', categoryId: d.categoryId }
  const covers = (tp: ResultTemplate) => isGeneric(tp) || boundToService(tp, svc)
  const branchName = (id: Id) => branches.find((b) => b.id === id)?.name
  const tplGroups = useMemo(() => {
    const byName = (a: ResultTemplate, b: ResultTemplate) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
    const pool = templates.filter((tp) => tp.scope !== 'receipt' && (!branchId || !tp.branchIds.length || tp.branchIds.includes(branchId) || tp.id === d.defaultTemplateId))
    const isBound = (tp: ResultTemplate) => isGeneric(tp) || boundToService(tp, { id: d.id ?? '', categoryId: d.categoryId })
    return { bound: pool.filter(isBound).sort(byName), others: pool.filter((tp) => !isBound(tp)).sort(byName) }
  }, [templates, branchId, d.id, d.categoryId, d.defaultTemplateId])
  const tplLabel = (tp: ResultTemplate) => [
    tp.name,
    tp.scope === 'order' ? t('catalog.services.scopeOrder') : null,
    tp.status !== 'active' ? t(`catalog.templates.status.${tp.status}`) : null,
    isGeneric(tp) ? t('catalog.services.generic') : null,
    !branchId ? tp.branchIds.map(branchName).filter(Boolean).join(', ') || null : null,
  ].filter(Boolean).join(' · ')
  const chosen = templates.find((tp) => tp.id === d.defaultTemplateId)
  const willBind = !!chosen && !covers(chosen)
  // the chosen template's copies in the other branches (same name and level) that are not bound to the service yet
  const copies = chosen ? templates.filter((tp) => tp.id !== chosen.id && tp.scope === chosen.scope && tp.name === chosen.name && !covers(tp)) : []
  const submit = () => { setTouched(true); if (!d.name.trim() || !d.categoryId) return; onSubmit({ ...d, name: d.name.trim(), code: d.code.trim().toUpperCase() }, { bindCopies: bindCopies && copies.length > 0 }) }
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
        <Field label={t('catalog.services.defaultTemplate')} hint={t('catalog.services.defaultTemplateHint')}>{(id) => (
          <div className="flex flex-col gap-2">
            <Select id={id} value={d.defaultTemplateId ?? ''} onChange={(e) => set('defaultTemplateId', e.target.value || null)} data-default-template>
              <option value="">{t('catalog.services.noTemplate')}</option>
              {tplGroups.bound.length > 0 && <optgroup label={t('catalog.services.tplGroupBound')}>{tplGroups.bound.map((tp) => <option key={tp.id} value={tp.id}>{tplLabel(tp)}</option>)}</optgroup>}
              {tplGroups.others.length > 0 && <optgroup label={t('catalog.services.tplGroupOther')}>{tplGroups.others.map((tp) => <option key={tp.id} value={tp.id}>{tplLabel(tp)}</option>)}</optgroup>}
            </Select>
            {willBind && <p className="text-[12px] text-brand-ink" data-will-bind>{t('catalog.services.willBind', { name: chosen!.name })}</p>}
            {copies.length > 0 && (
              <Checkbox checked={bindCopies} onChange={(e) => setBindCopies(e.target.checked)} data-bind-copies
                label={<span className="text-[12.5px]">{t('catalog.services.bindCopies', { n: copies.length, branches: [...new Set(copies.flatMap((tp) => tp.branchIds.map(branchName)).filter(Boolean))].join(', ') })}</span>} />
            )}
          </div>
        )}</Field>
        <Switch checked={d.isActive} onChange={(v) => set('isActive', v)} label={t('common.active')} description={t('catalog.services.activeHint')} />
      </div>
    </Drawer>
  )
}
