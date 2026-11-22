/**
 * Kompaniyalar — the roots of the organisation tree. Each company is a world of its own: its countries, facilities,
 * staff and patients; nothing of it is visible to another company. The table shows what sits under each company and
 * how it worked in the last 30 days, "Ochish" scopes the admin panel to it, and a new company is made here —
 * together with its first country node, so it is ready to grow at once. Superadmin only (`platform.unit.manage`).
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, FolderOpen } from 'lucide-react'
import type { Country, OrgUnit } from '@/domain'
import { ApiError } from '@/data'
import { useAuth } from '@/features/auth/store'
import { initialRange } from '@/features/lab/DateRangeFilter'
import { countryLabel } from '@/features/org/LocationFields'
import { useCreateUnit, useUnitTree, useUnitTreeShape } from '@/features/org/queries'
import { useCountries } from '@/features/patients/queries'
import { routes } from '@/shared/config/routes'
import { errorMessage } from '@/shared/lib/errors'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { Avatar, Badge, Button, Card, DataTable, EmptyState, Field, Input, Modal, Select, toast, type Column } from '@/shared/ui'
import { useRegionStats } from './queries'

export function CompaniesView({ createOpen, onCreateClose }: { createOpen: boolean; onCreateClose: () => void }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const setScopeUnit = useAuth((s) => s.setScopeUnit)
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)
  const countries = useCountries()
  const companies = useMemo(() => shape.roots.filter((u) => u.level === 'company'), [shape])
  // the country nodes of each company, in tree order
  const countriesOf = useMemo(() => {
    const out = new Map<string, OrgUnit[]>()
    for (const u of shape.flat) if (u.level === 'country' && u.parentId) out.set(u.parentId, [...(out.get(u.parentId) ?? []), u])
    return out
  }, [shape])
  // the last 30 days of every company, in one request
  const range = useMemo(() => initialRange('last30').range, [])
  const stats = useRegionStats({ dateFrom: range.from, dateTo: range.to, groupBy: 'company' }, { enabled: companies.length > 0 })
  const activity = useMemo(() => new Map((stats.data?.rows ?? []).map((r) => [r.id, r] as const)), [stats.data])
  const open = (u: OrgUnit) => { setScopeUnit(u.id); toast.success(t('admin.platform.switched', { name: u.name })); nav(routes.admin.root) }

  const columns: Column<OrgUnit>[] = [
    { key: 'name', header: t('admin.platform.companies.colCompany'), card: 'title', cell: (u) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={u.name} src={u.logoUrl ?? undefined} size="sm" className="rounded-lg" />
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium">{u.name}</span>
            {u.code && <span className="shrink-0 font-mono text-[11px] text-ink-3">{u.code}</span>}
            {!u.isActive && <Badge tone="neutral" size="sm">{t('admin.platform.inactive')}</Badge>}
          </p>
          {(u.shortName || u.legalName) && <p className="truncate text-[12px] text-ink-3">{u.shortName || u.legalName}</p>}
        </div>
      </div>
    ) },
    { key: 'countries', header: t('admin.platform.companies.colCountries'), card: 'field', cell: (u) => {
      const list = countriesOf.get(u.id) ?? []
      if (!list.length) return <span className="text-[13px] text-ink-3">{t('admin.platform.companies.noCountry')}</span>
      return (
        <span className="flex flex-wrap gap-1">
          {list.slice(0, 3).map((c) => <Badge key={c.id} tone="accent" size="sm">{c.shortName || c.name}</Badge>)}
          {list.length > 3 && <Badge tone="neutral" size="sm">+{list.length - 3}</Badge>}
        </span>
      )
    } },
    { key: 'facilities', header: t('admin.platform.companies.colFacilities'), align: 'right', card: 'field', cell: (u) => (
      <span className="block">
        <span className="block font-medium tabular">{fmtNumber(u.counts.facilities)}</span>
        <span className="block text-[12px] text-ink-3 tabular">{t('admin.platform.companies.employeesCount', { count: u.counts.employees })}</span>
      </span>
    ) },
    { key: 'activity', header: t('admin.platform.companies.colActivity'), align: 'right', hideBelow: 'sm', card: 'field', cell: (u) => {
      const a = activity.get(u.id)
      if (!stats.data) return <span className="text-ink-3">…</span>
      return (
        <span className="block">
          <span className="block font-semibold tabular">{fmtMoney(a?.revenue ?? 0, false)} <span className="font-normal text-ink-3">{t('common.sum')}</span></span>
          <span className="block text-[12px] text-ink-3 tabular">{t('admin.platform.companies.ordersCount', { count: a?.orders ?? 0 })}</span>
        </span>
      )
    } },
    { key: 'actions', header: '', align: 'right', card: 'actions', cell: (u) => (
      <span onClick={(e) => e.stopPropagation()}>
        <Button size="xs" variant="soft" leftIcon={<FolderOpen className="size-3.5" />} onClick={() => open(u)} data-company-open={u.id}>{t('admin.platform.open')}</Button>
      </span>
    ) },
  ]

  return (
    <>
      <Card padded={false} className="overflow-hidden" data-companies-view>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
          <h3 className="text-[14px] font-semibold">{t('admin.platform.tabCompanies')} <span className="ml-1 text-ink-3 tabular">{companies.length || ''}</span></h3>
          {tree.isSuccess && <span className="text-[12px] text-ink-3 tabular">{t('admin.platform.companies.total', { count: companies.length })}</span>}
        </div>
        <div className="border-t border-line">
          <DataTable<OrgUnit> columns={columns} rows={companies} rowKey={(u) => u.id} loading={tree.isLoading} onRowClick={open} cardBelow="md"
            empty={<EmptyState icon={<BriefcaseBusiness />} title={t('admin.platform.companies.empty')} description={t('admin.platform.companies.emptyHint')} />} />
        </div>
      </Card>
      <CompanyModal open={createOpen} onClose={onCreateClose} countries={countries.data ?? []} />
    </>
  )
}

/** A new company and — unless left out — the node of the first country it works in. */
function CompanyModal({ open, onClose, countries }: { open: boolean; onClose: () => void; countries: Country[] }) {
  const { t } = useTranslation()
  const create = useCreateUnit()
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  // undefined = not touched yet: the platform's home country is proposed
  const [countryId, setCountryId] = useState<string | undefined>(undefined)
  const [error, setError] = useState<'required' | 'taken' | null>(null)
  const [busy, setBusy] = useState(false)
  const home = countries.find((c) => c.code === 'UZ') ?? countries.find((c) => c.isEnabled) ?? countries[0]
  const selected = countryId ?? home?.id ?? ''
  const country = countries.find((c) => c.id === selected)

  const reset = () => { setName(''); setShortName(''); setCountryId(undefined); setError(null); setBusy(false) }
  const close = () => { reset(); onClose() }
  const submit = async () => {
    const clean = name.trim()
    if (clean.length < 2) return setError('required')
    setBusy(true)
    try {
      const company = await create.mutateAsync({ name: clean, shortName: shortName.trim() || undefined })
      if (country) {
        try {
          await create.mutateAsync({ parentId: company.id, countryId: country.id, name: countryLabel(country), code: country.code })
        } catch {
          toast.error(t('admin.platform.companies.countryFailed'))
        }
      }
      toast.success(t('admin.platform.companies.created', { name: company.name }))
      close()
    } catch (e) {
      setBusy(false)
      if (e instanceof ApiError && e.code === 'company_exists') setError('taken')
      else toast.error(errorMessage(e))
    }
  }

  return (
    <Modal open={open} onClose={close} size="sm" title={t('admin.platform.companies.add')} description={t('admin.platform.companies.addHint')}
      footer={<>
        <Button variant="ghost" onClick={close}>{t('common.cancel')}</Button>
        <Button loading={busy} onClick={() => void submit()} data-company-create>{t('common.create')}</Button>
      </>}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <Field label={t('admin.platform.companies.name')} required error={error === 'taken' ? t('admin.platform.companies.nameTaken') : error === 'required' ? t('common.required') : null}>
          {(id) => <Input id={id} autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(null) }} maxLength={200} invalid={!!error} data-company-name />}
        </Field>
        <Field label={t('admin.platform.companies.shortName')} optionalText={t('common.optional')}>
          {(id) => <Input id={id} value={shortName} onChange={(e) => setShortName(e.target.value)} maxLength={80} />}
        </Field>
        <Field label={t('admin.platform.companies.firstCountry')} hint={t('admin.platform.companies.firstCountryHint')}>
          {(id) => (
            <Select id={id} value={selected} onChange={(e) => setCountryId(e.target.value)} data-company-country>
              <option value="">{t('admin.platform.companies.noCountry')}</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{countryLabel(c)} ({c.code})</option>)}
            </Select>
          )}
        </Field>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  )
}
