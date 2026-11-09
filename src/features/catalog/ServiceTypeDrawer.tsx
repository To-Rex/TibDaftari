import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import type { AttributeSchema, Category, Id, OrgUnit, ResultTemplate, ServiceType } from '@/domain'
import { boundToService, isGeneric } from '@/features/template-editor/galleryFilters'
import { UnitMultiPicker, UnitPicker } from '@/features/org/UnitPicker'
import { Badge, Button, Checkbox, Drawer, Field, IconButton, Input, Segmented, Select, Switch, Textarea } from '@/shared/ui'
import { categoryPath } from './tree'

export interface ServiceTypeDraft {
  id?: Id
  /** the unit that owns the service (set when editing; a new service is owned by the scope) */
  ownerUnitId?: Id
  name: string
  code: string
  description: string
  categoryId: Id
  price: number
  /** price overrides per unit — apply to the unit and everything under it (nearest level wins) */
  unitPrices: Record<Id, number>
  /** units (and their subtrees) where the service is switched off — not offered at their receptions */
  disabledUnitIds: Id[]
  turnaroundDays: number
  schemaId: Id | null
  documentScope: 'item' | 'order'
  defaultTemplateId: Id | null
  isActive: boolean
}

export const draftFromServiceType = (s?: ServiceType | null, categoryId: Id = ''): ServiceTypeDraft =>
  s
    ? { id: s.id, ownerUnitId: s.ownerUnitId, name: s.name, code: s.code ?? '', description: s.description ?? '', categoryId: s.categoryId, price: s.price, unitPrices: { ...(s.unitPrices ?? {}) }, disabledUnitIds: [...(s.disabledUnitIds ?? [])], turnaroundDays: s.turnaroundDays, schemaId: s.schemaId, documentScope: s.documentScope, defaultTemplateId: s.defaultTemplateId, isActive: s.isActive }
    : { name: '', code: '', description: '', categoryId, price: 0, unitPrices: {}, disabledUnitIds: [], turnaroundDays: 1, schemaId: null, documentScope: 'item', defaultTemplateId: null, isActive: true }

/** What the drawer asks the page to do besides saving the service. */
export interface ServiceTypeSubmitOptions {
  /** the chosen default template is not bound to the service yet: bind its same-named copies in the other units as well */
  bindCopies: boolean
}

export function ServiceTypeDrawer({ open, onClose, initial, categories, units, scopeId, schemas, templates, onSubmit, saving }: {
  open: boolean; onClose: () => void; initial: ServiceTypeDraft | null; categories: Category[]
  /** the visible organisation tree (flat) — unit pickers and unit names */
  units: OrgUnit[]
  /** the unit the admin panel works in: the owner of a new service, and the root of the pickers when the owner is not in the tree */
  scopeId: Id
  schemas: AttributeSchema[]; templates: ResultTemplate[]
  onSubmit: (d: ServiceTypeDraft, opts: ServiceTypeSubmitOptions) => void; saving?: boolean
}) {
  const { t } = useTranslation()
  const [d, setD] = useState<ServiceTypeDraft>(draftFromServiceType())
  const [touched, setTouched] = useState(false)
  const [bindCopies, setBindCopies] = useState(true)
  useEffect(() => { if (open && initial) { setD(initial); setTouched(false); setBindCopies(true) } }, [open, initial])
  const set = <K extends keyof ServiceTypeDraft>(k: K, v: ServiceTypeDraft[K]) => setD((s) => ({ ...s, [k]: v }))

  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units])
  const unitName = (id: Id) => unitById.get(id)?.name ?? '…'
  // the service applies to the owner's subtree, so per-unit settings live under the owner (the scope while it is unknown)
  const ownerId = d.ownerUnitId ?? scopeId
  const rootId = unitById.has(ownerId) ? ownerId : scopeId
  const owner = unitById.get(ownerId)
  const inherited = !!d.id && ownerId !== scopeId

  const nameErr = touched && !d.name.trim() ? t('common.required') : undefined
  const catErr = touched && !d.categoryId ? t('common.required') : undefined
  const published = schemas.filter((s) => s.status === 'published')
  // "Standart andoza": every result template (cheque templates are not result documents) — those already bound to
  // the service (or its category, or generic) first, then all the others; picking one of those binds it on save.
  const svc = { id: d.id ?? '', categoryId: d.categoryId }
  const covers = (tp: ResultTemplate) => isGeneric(tp) || boundToService(tp, svc)
  const tplGroups = useMemo(() => {
    const byName = (a: ResultTemplate, b: ResultTemplate) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
    const pool = templates.filter((tp) => tp.scope !== 'receipt')
    const isBound = (tp: ResultTemplate) => isGeneric(tp) || boundToService(tp, { id: d.id ?? '', categoryId: d.categoryId })
    return { bound: pool.filter(isBound).sort(byName), others: pool.filter((tp) => !isBound(tp)).sort(byName) }
  }, [templates, d.id, d.categoryId])
  const tplLabel = (tp: ResultTemplate) => [
    tp.name,
    tp.scope === 'order' ? t('catalog.services.scopeOrder') : null,
    tp.status !== 'active' ? t(`catalog.templates.status.${tp.status}`) : null,
    isGeneric(tp) ? t('catalog.services.generic') : null,
    (tp.unitIds ?? []).map(unitName).join(', ') || null,
  ].filter(Boolean).join(' · ')
  const chosen = templates.find((tp) => tp.id === d.defaultTemplateId)
  const willBind = !!chosen && !covers(chosen)
  // the chosen template's copies in the other units (same name and level) that are not bound to the service yet
  const copies = chosen ? templates.filter((tp) => tp.id !== chosen.id && tp.scope === chosen.scope && tp.name === chosen.name && !covers(tp)) : []
  const copyUnits = [...new Set(copies.flatMap((tp) => (tp.unitIds?.length ? tp.unitIds : [tp.ownerUnitId]).map(unitName)))].join(', ')
  const submit = () => { setTouched(true); if (!d.name.trim() || !d.categoryId) return; onSubmit({ ...d, name: d.name.trim(), code: d.code.trim().toUpperCase() }, { bindCopies: bindCopies && copies.length > 0 }) }
  const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0))

  // per-unit prices: one row per override, a picker adds a unit of the owner's subtree with the base price prefilled
  const priceRows = Object.keys(d.unitPrices)
  const addPriceUnit = (id: Id | null) => { if (!id || id in d.unitPrices) return; set('unitPrices', { ...d.unitPrices, [id]: d.price }) }
  const removePriceUnit = (id: Id) => { const next = { ...d.unitPrices }; delete next[id]; set('unitPrices', next) }
  const setPrice = (id: Id, v: string) => set('unitPrices', { ...d.unitPrices, [id]: num(v) })
  const ownerOff = d.disabledUnitIds.includes(ownerId)

  return (
    <Drawer open={open} onClose={onClose} title={d.id ? t('catalog.services.edit') : t('catalog.services.new')} description={t('catalog.services.drawerHint')} width="max-w-2xl"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} loading={saving}>{t('common.save')}</Button></>}>
      <div className="flex flex-col gap-5">
        {owner && (
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3" data-service-owner>
            <span>{t('catalog.owner.label')}:</span>
            <span className="font-medium text-ink-2">{owner.name}</span>
            <Badge size="sm" tone={inherited ? 'neutral' : 'brand'}>{inherited ? t('catalog.owner.inherited') : t('catalog.owner.own')}</Badge>
            {inherited && <span className="basis-full text-[12px]">{t('catalog.owner.inheritedHint')}</span>}
          </div>
        )}
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

        {units.length > 0 && (
          <div className="rounded-[var(--radius)] border border-line bg-surface-2/40 p-3 flex flex-col gap-4" data-unit-settings>
            <div>
              <p className="text-[12.5px] font-medium text-ink-2">{t('catalog.services.unitPrices')}</p>
              <p className="text-[12px] text-ink-3 mb-2">{t('catalog.services.unitPricesHint')}</p>
              <div className="flex flex-col gap-2">
                {priceRows.map((uid) => {
                  const u = unitById.get(uid)
                  const off = d.disabledUnitIds.includes(uid)
                  return (
                    <div key={uid} className="grid grid-cols-[1fr_120px_auto] sm:grid-cols-[1fr_180px_auto] items-center gap-2" data-unit-price-row={off ? 'off' : 'on'}>
                      <span className="min-w-0 truncate text-[13.5px]" title={u?.path}>
                        {u?.name ?? '…'}
                        {u?.code && <span className="ml-1.5 font-mono text-[12px] text-ink-3">{u.code}</span>}
                        {off && <span className="ml-1.5 text-[12px] text-warn">{t('catalog.services.unitOff')}</span>}
                      </span>
                      <Input type="number" min={0} step={1000} mono value={d.unitPrices[uid] ?? ''} className="h-9" aria-label={`${u?.name ?? uid} — ${t('common.price')}`} onChange={(e) => setPrice(uid, e.target.value)} />
                      <IconButton size="sm" label={t('common.delete')} onClick={() => removePriceUnit(uid)}><Trash2 /></IconButton>
                    </div>
                  )
                })}
                {priceRows.length === 0 && <p className="text-[12.5px] text-ink-3">{t('catalog.services.noUnitPrices')}</p>}
                <UnitPicker units={units} rootId={rootId} value={null} onChange={addPriceUnit} allowEmpty placeholder={t('catalog.services.addUnitPrice')} className="sm:max-w-sm" />
              </div>
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-ink-2">{t('catalog.services.disabledUnits')}</p>
              <p className="text-[12px] text-ink-3 mb-2">{t('catalog.services.disabledUnitsHint')}</p>
              <UnitMultiPicker units={units} rootId={rootId} value={d.disabledUnitIds} onChange={(ids) => set('disabledUnitIds', ids)} />
              {ownerOff && <p className="mt-2 text-[12px] text-danger" data-owner-off>{t('catalog.services.ownerOff')}</p>}
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
                label={<span className="text-[12.5px]">{t('catalog.services.bindCopies', { n: copies.length, units: copyUnits })}</span>} />
            )}
          </div>
        )}</Field>
        <Switch checked={d.isActive} onChange={(v) => set('isActive', v)} label={t('common.active')} description={t('catalog.services.activeHint')} />
      </div>
    </Drawer>
  )
}
