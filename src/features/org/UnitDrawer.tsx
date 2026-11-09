/**
 * Create a unit under a parent — the level follows from the parent (country → region → district → facility):
 * a region node picks a Region, a district node a District, a facility needs its kind and cheque code. Without a
 * parent a country node is created (platform only). The same drawer edits an existing unit's profile.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { FacilityKind, Id, OrgUnit, UnitLevel } from '@/domain'
import { CHILD_LEVEL, FACILITY_KINDS } from '@/domain'
import { ApiError } from '@/data'
import { useCountries, useDistricts, useRegions } from '@/features/patients/queries'
import { formKeyDown } from '@/features/patients/formKeys'
import { errorMessage } from '@/shared/lib/errors'
import { Badge, Button, Drawer, Field, Input, Select, Switch, Textarea, toast } from '@/shared/ui'
import { countryLabel } from './LocationFields'
import { useCreateUnit, useUpdateUnit } from './queries'
import { UnitPicker } from './UnitPicker'
import { UnitIcon, useUnitLabels } from './unitUi'

export const TIMEZONES = ['Asia/Tashkent', 'Asia/Samarkand'] as const
const CODE_RE = /^[A-Z][A-Z0-9]{0,11}$/

const schema = z.object({
  name: z.string().trim().min(2),
  shortName: z.string().trim(),
  legalName: z.string().trim(),
  code: z.string().trim().regex(CODE_RE).or(z.literal('')),
  kind: z.string(),
  phone: z.string().trim(),
  email: z.string().trim().email().or(z.literal('')),
  address: z.string().trim(),
  timezone: z.string().min(1),
  isActive: z.boolean(),
  countryId: z.string(),
  regionId: z.string(),
  districtId: z.string(),
})
type Values = z.infer<typeof schema>

export const orderNumberExample = (code: string) => `${code || 'XX'}-000001`

export function UnitDrawer({ open, onClose, parent, parents, unit, units, onSaved }: {
  open: boolean
  onClose: () => void
  /** create mode: the unit the new one goes under (null = a country node, platform only) */
  parent?: OrgUnit | null
  /** create mode: when given, the parent can be changed with a picker among these */
  parents?: OrgUnit[]
  /** edit mode: the unit to edit (profile fields) */
  unit?: OrgUnit | null
  /** the visible tree — marks regions / districts that already have a node under the parent */
  units?: OrgUnit[]
  onSaved?: (u: OrgUnit) => void
}) {
  const { t } = useTranslation()
  const labels = useUnitLabels()
  const create = useCreateUnit()
  const update = useUpdateUnit()
  const isEdit = !!unit
  const [parentId, setParentId] = useState<Id | null>(parent?.id ?? null)
  useEffect(() => { if (open) setParentId(parent?.id ?? null) }, [open, parent])
  const curParent = useMemo(() => (parents?.find((p) => p.id === parentId) ?? (parent && parent.id === parentId ? parent : null)) ?? null, [parents, parent, parentId])
  const level: UnitLevel | null = isEdit ? unit.level : curParent ? CHILD_LEVEL[curParent.level] : 'country'
  const canPickParent = !isEdit && !!parents && parents.length > 1

  const countries = useCountries()
  const regions = useRegions(curParent?.countryId, { enabled: open && level === 'region' && !!curParent })
  const districts = useDistricts(curParent?.regionId ?? undefined, { enabled: open && level === 'district' && !!curParent?.regionId })
  // what the parent already has under it: a region / district node can exist only once per parent
  const taken = useMemo(() => {
    const kids = (units ?? []).filter((u) => u.parentId === curParent?.id)
    return { regions: new Set(kids.map((u) => u.regionId)), districts: new Set(kids.map((u) => u.districtId)) }
  }, [units, curParent])

  const defaults = useMemo<Values>(() => ({
    name: unit?.name ?? '', shortName: unit?.shortName ?? '', legalName: unit?.legalName ?? '', code: unit?.code ?? '', kind: unit?.kind ?? 'clinic',
    phone: unit?.phone ?? '', email: unit?.email ?? '', address: unit?.address ?? '',
    timezone: unit?.timezone ?? curParent?.timezone ?? 'Asia/Tashkent', isActive: unit?.isActive ?? true,
    countryId: unit?.countryId ?? '', regionId: unit?.regionId ?? '', districtId: unit?.districtId ?? '',
  }), [unit, curParent])
  const { register, control, handleSubmit, reset, watch, setValue, setError, clearErrors, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })
  useEffect(() => { if (open) reset(defaults) }, [open, defaults, reset])
  const code = watch('code')
  const name = watch('name')
  // the geo pick proposes the name until the user types their own
  const autoName = useRef('')
  const propose = (n: string) => { if (!name || name === autoName.current) { setValue('name', n, { shouldDirty: true }); autoName.current = n } }

  const timezones = useMemo(() => {
    const tz = unit?.timezone
    return tz && !(TIMEZONES as readonly string[]).includes(tz) ? [...TIMEZONES, tz] : [...TIMEZONES]
  }, [unit])

  const submit = handleSubmit(async (v) => {
    clearErrors()
    if (!level) return
    if (level === 'country' && !v.countryId) return setError('countryId', { message: 'required' })
    if (level === 'region' && !isEdit && !v.regionId) return setError('regionId', { message: 'required' })
    if (level === 'district' && !isEdit && !v.districtId) return setError('districtId', { message: 'required' })
    if (level === 'facility' && !v.code) return setError('code', { message: 'required' })
    const common = { name: v.name, shortName: v.shortName || undefined, legalName: v.legalName || undefined, phone: v.phone || undefined, email: v.email || undefined, address: v.address || undefined, timezone: v.timezone, isActive: v.isActive }
    try {
      let saved: OrgUnit
      if (isEdit) {
        saved = await update.mutateAsync({
          id: unit.id, name: v.name, shortName: v.shortName || null, legalName: v.legalName || null, phone: v.phone || null, email: v.email || null, address: v.address || null,
          timezone: v.timezone, isActive: v.isActive, ...(level === 'facility' ? { code: v.code, kind: v.kind as FacilityKind } : {}),
        })
        toast.success(t('admin.unit.saved'))
      } else {
        saved = await create.mutateAsync({
          ...common,
          parentId: curParent?.id ?? null,
          countryId: level === 'country' ? v.countryId : undefined,
          regionId: level === 'region' ? v.regionId : undefined,
          districtId: level === 'district' ? v.districtId : undefined,
          kind: level === 'facility' ? (v.kind as FacilityKind) : undefined,
          code: level === 'facility' ? v.code : undefined,
        })
        toast.success(t('admin.units.created', { level: labels.level(level) }))
      }
      onSaved?.(saved)
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && level === 'facility') setError('code', { message: 'taken' })
      else toast.error(errorMessage(e))
    }
  })

  const pending = create.isPending || update.isPending
  const title = isEdit ? t('admin.units.edit') : level ? t('admin.units.addLevel', { level: labels.level(level) }) : t('admin.units.add')
  const codeError = errors.code && (errors.code.message === 'taken' ? t('admin.units.codeTaken') : errors.code.message === 'required' ? t('common.required') : t('admin.unit.invalidCode'))

  return (
    <Drawer open={open} onClose={onClose} title={title} description={isEdit ? unit.path : curParent?.path} width="max-w-lg"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button form="unit-form" type="submit" loading={pending} disabled={!level}>{t('common.save')}</Button></>}>
      <form id="unit-form" onSubmit={submit} onKeyDown={formKeyDown} className="flex flex-col gap-4" data-unit-form={isEdit ? 'edit' : 'create'} data-unit-level={level ?? ''}>
        {/* where the new unit goes */}
        {!isEdit && (
          <Field label={t('admin.units.parent')} hint={canPickParent ? t('admin.units.parentHint') : undefined}>
            {() => canPickParent
              ? <UnitPicker units={parents!} value={parentId} onChange={setParentId} levels={['country', 'region', 'district']} data-testid="unit-parent" />
              : curParent
                ? <div className="flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-line bg-surface-2/60 px-3 text-[14px]"><UnitIcon unit={curParent} className="text-brand" /><span className="truncate">{curParent.name}</span><Badge size="sm" className="ml-auto">{labels.level(curParent.level)}</Badge></div>
                : <div className="flex min-h-10 items-center rounded-[var(--radius-sm)] border border-dashed border-line bg-surface-2/60 px-3 text-[13.5px] text-ink-3">{t('admin.units.rootHint')}</div>}
          </Field>
        )}
        {!level && <p className="text-[13px] text-danger">{t('admin.units.facilityNoChildren')}</p>}

        {/* geo pick for the three upper levels (create only — the geo of a node is fixed) */}
        {!isEdit && level === 'country' && (
          <Field label={t('org.country')} required error={errors.countryId && t('common.required')}>
            {(id) => (
              <Controller control={control} name="countryId" render={({ field }) => (
                <Select id={id} value={field.value} invalid={!!errors.countryId} onChange={(e) => { field.onChange(e.target.value); const c = countries.data?.find((x) => x.id === e.target.value); if (c) propose(countryLabel(c)) }}>
                  <option value="">{t('admin.units.pickCountry')}</option>
                  {countries.data?.map((c) => <option key={c.id} value={c.id}>{countryLabel(c)}</option>)}
                </Select>
              )} />
            )}
          </Field>
        )}
        {!isEdit && level === 'region' && (
          <Field label={t('org.region')} required error={errors.regionId && t('common.required')} hint={t('admin.units.regionHint')}>
            {(id) => (
              <Controller control={control} name="regionId" render={({ field }) => (
                <Select id={id} value={field.value} invalid={!!errors.regionId} disabled={regions.isLoading} onChange={(e) => { field.onChange(e.target.value); const r = regions.data?.find((x) => x.id === e.target.value); if (r) propose(r.name) }}>
                  <option value="">{t('admin.units.pickRegion')}</option>
                  {regions.data?.map((r) => <option key={r.id} value={r.id} disabled={taken.regions.has(r.id)}>{r.name}{taken.regions.has(r.id) ? ` — ${t('admin.units.alreadyAdded')}` : ''}</option>)}
                </Select>
              )} />
            )}
          </Field>
        )}
        {!isEdit && level === 'district' && (
          <Field label={t('org.district')} required error={errors.districtId && t('common.required')} hint={t('admin.units.districtHint')}>
            {(id) => (
              <Controller control={control} name="districtId" render={({ field }) => (
                <Select id={id} value={field.value} invalid={!!errors.districtId} disabled={districts.isLoading} onChange={(e) => { field.onChange(e.target.value); const d = districts.data?.find((x) => x.id === e.target.value); if (d) propose(d.name) }}>
                  <option value="">{districts.isSuccess && !districts.data.length ? t('org.noDistricts') : t('admin.units.pickDistrict')}</option>
                  {districts.data?.map((d) => <option key={d.id} value={d.id} disabled={taken.districts.has(d.id)}>{d.name}{taken.districts.has(d.id) ? ` — ${t('admin.units.alreadyAdded')}` : ''}</option>)}
                </Select>
              )} />
            )}
          </Field>
        )}

        {level === 'facility' && (
          <Field label={t('admin.unit.kind')} required>
            {(id) => (
              <Controller control={control} name="kind" render={({ field }) => (
                <Select id={id} value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  {FACILITY_KINDS.map((k) => <option key={k} value={k}>{labels.kind(k)}</option>)}
                </Select>
              )} />
            )}
          </Field>
        )}

        <Field label={t('admin.unit.name')} required error={errors.name && t('common.required')}>
          {(id) => <Input id={id} autoFocus={isEdit} {...register('name', { onChange: () => { autoName.current = '' } })} invalid={!!errors.name} />}
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('admin.unit.shortName')} optionalText={t('common.optional')} hint={t('admin.unit.shortNameHint')}>
            {(id) => <Input id={id} maxLength={80} {...register('shortName')} />}
          </Field>
          <Field label={t('admin.unit.legalName')} optionalText={t('common.optional')}>
            {(id) => <Input id={id} maxLength={300} {...register('legalName')} />}
          </Field>
        </div>

        {level === 'facility' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Field label={t('admin.unit.code')} required hint={t('admin.unit.codeHint')} error={codeError}>
              {(id) => <Input id={id} mono maxLength={12} placeholder="UR" {...register('code', { onChange: (e) => setValue('code', String(e.target.value).toUpperCase().replace(/[^A-Z0-9]/g, '')) })} invalid={!!errors.code} data-unit-code />}
            </Field>
            <Field label={t('admin.unit.codeExample')}>
              {() => (
                <div className="flex h-10 items-center rounded-[var(--radius-sm)] border border-dashed border-line bg-surface-2/60 px-3 font-mono text-[14px] tabular text-ink-2">
                  {orderNumberExample(code)}
                </div>
              )}
            </Field>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('admin.unit.phone')} optionalText={t('common.optional')}>
            {(id) => <Input id={id} placeholder="+998 __ ___-__-__" {...register('phone')} />}
          </Field>
          <Field label={t('admin.unit.email')} optionalText={t('common.optional')} error={errors.email && t('admin.unit.invalidEmail')}>
            {(id) => <Input id={id} type="email" {...register('email')} invalid={!!errors.email} />}
          </Field>
        </div>
        <Field label={t('admin.unit.address')} optionalText={t('common.optional')}>
          {(id) => <Textarea id={id} rows={2} {...register('address')} />}
        </Field>
        <Field label={t('admin.unit.timezone')}>
          {(id) => (
            <Controller control={control} name="timezone" render={({ field }) => (
              <Select id={id} value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </Select>
            )} />
          )}
        </Field>
        <Controller control={control} name="isActive" render={({ field }) => (
          <Switch checked={field.value} onChange={field.onChange} label={t('admin.unit.isActive')} description={t('admin.unit.isActiveHint')} />
        )} />
      </form>
    </Drawer>
  )
}
