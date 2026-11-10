/**
 * Steps 1–3 of the quick-start wizard: where the facility opens (region / district nodes reused or created), its
 * profile, and the default accounts. Pure forms over the shared `Draft`.
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Plus } from 'lucide-react'
import type { FacilityKind, OrgUnit, QuickStartPreview, UnitLevel } from '@/domain'
import { FACILITY_KINDS } from '@/domain'
import { useDistricts, useRegions } from '@/features/patients/queries'
import { cn } from '@/shared/lib/cn'
import { Badge, Checkbox, Field, Input, Select, Textarea } from '@/shared/ui'
import { orderNumberExample } from '../UnitDrawer'
import { UnitPicker } from '../UnitPicker'
import { UnitIcon, useUnitLabels } from '../unitUi'
import { QUICK_START_ROLES, proposeCode, type Draft } from './draft'

type ParentLevel = Exclude<UnitLevel, 'facility'>
type Patch = (fn: (d: Draft) => Draft) => void
const PARENT_LEVELS: UnitLevel[] = ['country', 'region', 'district']

/* ------------------------------------------------------------------ 1. location */

export function LocationStep({ draft, patch, parent, parents, units, problem }: { draft: Draft; patch: Patch; parent: OrgUnit | null; parents: OrgUnit[]; units: OrgUnit[]; problem: string | null }) {
  const { t } = useTranslation()
  const labels = useUnitLabels()
  const level = (parent?.level ?? null) as ParentLevel | null
  const regions = useRegions(parent?.countryId, { enabled: level === 'country' })
  const regionGeoId = level === 'country' ? draft.regionId : parent?.regionId ?? undefined
  const districts = useDistricts(regionGeoId || undefined, { enabled: !!regionGeoId && level !== 'district' })
  // existing nodes for the chosen geo — a region / district node exists at most once per parent
  const regionNode = useMemo(() => (level === 'country' && draft.regionId ? units.find((u) => u.level === 'region' && u.parentId === parent?.id && u.regionId === draft.regionId) ?? null : null), [units, level, parent, draft.regionId])
  const districtNode = useMemo(() => {
    if (level === 'district' || !draft.districtId) return null
    const under = level === 'region' ? parent?.id : regionNode?.id
    return units.find((u) => u.level === 'district' && u.districtId === draft.districtId && (!under || u.parentId === under)) ?? null
  }, [units, level, parent, regionNode, draft.districtId])
  const regionName = level === 'country' ? regions.data?.find((r) => r.id === draft.regionId)?.name : parent?.level === 'region' ? parent.name : parent?.regionName
  const districtName = level === 'district' ? parent?.name : districts.data?.find((d) => d.id === draft.districtId)?.name

  const pickDistrict = (id: string) => {
    const name = districts.data?.find((d) => d.id === id)?.name ?? ''
    patch((d) => ({ ...d, districtId: id, name: d.name || (name ? `${name} ${labels.kind(d.kind)}` : ''), code: d.code || proposeCode(name) }))
  }

  const nodeBadge = (node: OrgUnit | null, chosen: boolean) => chosen && (node
    ? <Badge size="sm" tone="ok">{t('admin.quickStart.nodeExists')}</Badge>
    : <Badge size="sm" tone="info"><Plus className="size-3" />{t('admin.quickStart.nodeNew')}</Badge>)

  return (
    <div className="flex flex-col gap-4" data-qs-step="location">
      <Field label={t('admin.quickStart.parent')} hint={t('admin.quickStart.parentHint')} error={problem === 'parent' && t('common.required')}>
        {() => parents.length > 1
          ? <UnitPicker units={parents} value={draft.parentId} onChange={(id) => patch((d) => ({ ...d, parentId: id, regionId: '', districtId: '' }))} levels={PARENT_LEVELS} data-testid="qs-parent" />
          : parent && <div className="flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-line bg-surface-2/60 px-3 text-[14px]"><UnitIcon unit={parent} className="text-brand" /><span className="truncate">{parent.name}</span><Badge size="sm" className="ml-auto">{labels.level(parent.level)}</Badge></div>}
      </Field>

      {level === 'country' && (
        <Field label={t('org.region')} required error={problem === 'region' && t('common.required')}>
          {(id) => (
            <div className="flex flex-col gap-1.5">
              <Select id={id} value={draft.regionId} invalid={problem === 'region'} disabled={regions.isLoading} onChange={(e) => patch((d) => ({ ...d, regionId: e.target.value, districtId: '' }))} data-qs-region>
                <option value="">{t('admin.units.pickRegion')}</option>
                {regions.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
              <div className="min-h-5">{nodeBadge(regionNode, !!draft.regionId)}</div>
            </div>
          )}
        </Field>
      )}
      {level && level !== 'district' && (
        <Field label={t('org.district')} required error={problem === 'district' && t('common.required')}>
          {(id) => (
            <div className="flex flex-col gap-1.5">
              <Select id={id} value={draft.districtId} invalid={problem === 'district'} disabled={!regionGeoId || districts.isLoading} onChange={(e) => pickDistrict(e.target.value)} data-qs-district>
                <option value="">{districts.isSuccess && !districts.data.length ? t('org.noDistricts') : t('admin.units.pickDistrict')}</option>
                {districts.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
              <div className="min-h-5">{nodeBadge(districtNode, !!draft.districtId)}</div>
            </div>
          )}
        </Field>
      )}

      {/* the chain the facility will sit in */}
      {parent && (
        <div className="rounded-[var(--radius)] border border-line bg-surface/60 px-3 py-2.5 text-[13px]" data-qs-chain>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t('admin.quickStart.chain')}</div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {[...(parent.path.split(' › ')), ...(level === 'country' && regionName ? [regionName] : []), ...(level !== 'district' && districtName ? [districtName] : [])].map((seg, i, arr) => (
              <span key={i} className={cn('inline-flex items-center gap-1.5', i === arr.length - 1 ? 'font-medium text-ink' : 'text-ink-2')}>{i > 0 && <span className="text-ink-3">›</span>}{seg}</span>
            ))}
            <span className="inline-flex items-center gap-1.5 text-brand-ink"><span className="text-ink-3">›</span>{draft.name.trim() || t('admin.quickStart.reviewFacility')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ 2. facility */

export function FacilityStep({ draft, patch, problem, codeTaken }: { draft: Draft; patch: Patch; problem: string | null; codeTaken: boolean }) {
  const { t } = useTranslation()
  const labels = useUnitLabels()
  const codeError = codeTaken ? t('admin.quickStart.errorCodeTaken') : problem === 'code' ? (draft.code ? t('admin.unit.invalidCode') : t('common.required')) : undefined
  return (
    <div className="flex flex-col gap-4" data-qs-step="facility">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Field label={t('admin.unit.kind')} required>
          {(id) => (
            <Select id={id} value={draft.kind} onChange={(e) => patch((d) => ({ ...d, kind: e.target.value as FacilityKind }))}>
              {FACILITY_KINDS.map((k) => <option key={k} value={k}>{labels.kind(k)}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t('admin.quickStart.facilityName')} required error={problem === 'name' && t('common.required')}>
          {(id) => <Input id={id} autoFocus value={draft.name} invalid={problem === 'name'} onChange={(e) => patch((d) => ({ ...d, name: e.target.value }))} data-qs-name />}
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Field label={t('admin.quickStart.code')} required hint={t('admin.quickStart.codeHint')} error={codeError}>
          {(id) => <Input id={id} mono maxLength={12} placeholder="BGT" value={draft.code} invalid={!!codeError} onChange={(e) => patch((d) => ({ ...d, code: String(e.target.value).toUpperCase().replace(/[^A-Z0-9]/g, '') }))} data-qs-code />}
        </Field>
        <Field label={t('admin.unit.codeExample')}>
          {() => <div className="flex h-10 items-center rounded-[var(--radius-sm)] border border-dashed border-line bg-surface-2/60 px-3 font-mono text-[14px] tabular text-ink-2">{orderNumberExample(draft.code)}</div>}
        </Field>
        <Field label={t('admin.unit.shortName')} optionalText={t('common.optional')}>
          {(id) => <Input id={id} maxLength={80} value={draft.shortName} onChange={(e) => patch((d) => ({ ...d, shortName: e.target.value }))} />}
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('admin.unit.phone')} optionalText={t('common.optional')}>
          {(id) => <Input id={id} placeholder="+998 __ ___-__-__" value={draft.phone} onChange={(e) => patch((d) => ({ ...d, phone: e.target.value }))} />}
        </Field>
        <Field label={t('admin.unit.legalName')} optionalText={t('common.optional')}>
          {(id) => <Input id={id} maxLength={300} value={draft.legalName} onChange={(e) => patch((d) => ({ ...d, legalName: e.target.value }))} />}
        </Field>
      </div>
      <Field label={t('admin.unit.address')} optionalText={t('common.optional')}>
        {(id) => <Textarea id={id} rows={2} value={draft.address} onChange={(e) => patch((d) => ({ ...d, address: e.target.value }))} />}
      </Field>
    </div>
  )
}

/* ------------------------------------------------------------------ 3. staff */

export function StaffStep({ draft, patch, roles, problem, showPassword, onTogglePassword }: { draft: Draft; patch: Patch; roles: QuickStartPreview['roles'] | undefined; problem: string | null; showPassword: boolean; onTogglePassword: () => void }) {
  const { t } = useTranslation()
  const list = roles?.length ? roles : QUICK_START_ROLES.map((key) => ({ key, id: key, name: key, suffix: key }))
  const anyOn = list.some((r) => draft.staff[r.key]?.on)
  const setStaff = (key: string, fn: (s: Draft['staff'][keyof Draft['staff']]) => Draft['staff'][keyof Draft['staff']]) =>
    patch((d) => ({ ...d, staff: { ...d.staff, [key]: fn(d.staff[key as keyof typeof d.staff]) } }))
  return (
    <div className="flex flex-col gap-4" data-qs-step="staff">
      <div>
        <div className="text-[14px] font-semibold">{t('admin.quickStart.staffTitle')}</div>
        <p className="mt-0.5 text-[12.5px] text-ink-3">{t('admin.quickStart.staffHint')}</p>
      </div>
      <div className="overflow-hidden rounded-[var(--radius)] border border-line">
        <div className="hidden grid-cols-[28px_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] gap-3 border-b border-line bg-surface/70 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 sm:grid">
          <span /><span>{t('admin.quickStart.role')}</span><span>{t('admin.quickStart.fullName')}</span><span>{t('admin.quickStart.login')}</span>
        </div>
        {list.map((r) => {
          const s = draft.staff[r.key]
          if (!s) return null
          const bad = s.on && problem === 'staff' && (s.fullName.trim().length < 2 || s.login.trim().length < 3)
          return (
            <div key={r.key} className={cn('grid grid-cols-1 gap-2 border-b border-line/70 px-3 py-2.5 last:border-b-0 sm:grid-cols-[28px_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] sm:items-center sm:gap-3', !s.on && 'opacity-60')} data-qs-role={r.key}>
              <Checkbox checked={s.on} onChange={(e) => setStaff(r.key, (x) => ({ ...x, on: e.target.checked }))} aria-label={r.name} />
              <span className="text-[13.5px] font-medium">{r.name}</span>
              <Input value={s.fullName} disabled={!s.on} invalid={bad && s.fullName.trim().length < 2} placeholder={t('admin.quickStart.fullName')} onChange={(e) => setStaff(r.key, (x) => ({ ...x, fullName: e.target.value, touched: true }))} className="h-9" />
              <Input mono value={s.login} disabled={!s.on} invalid={bad && s.login.trim().length < 3} placeholder="login" onChange={(e) => setStaff(r.key, (x) => ({ ...x, login: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''), touched: true }))} className="h-9" />
            </div>
          )
        })}
      </div>
      {!anyOn && <p className="text-[12.5px] text-warn">{t('admin.quickStart.noStaff')}</p>}
      <Field label={t('admin.quickStart.password')} hint={t('admin.quickStart.passwordHint')} error={problem === 'password' && t('common.required')} className="sm:max-w-xs">
        {(id) => (
          <Input id={id} mono type={showPassword ? 'text' : 'password'} value={draft.password} invalid={problem === 'password'} onChange={(e) => patch((d) => ({ ...d, password: e.target.value }))} autoComplete="new-password" data-qs-password
            rightSlot={<button type="button" onClick={onTogglePassword} aria-label={t('admin.quickStart.showPassword')} className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} />
        )}
      </Field>
    </div>
  )
}
