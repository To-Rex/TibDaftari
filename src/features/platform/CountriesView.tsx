/**
 * Davlatlar — the roots of the organisation tree: one country node per country where the system is live, with what
 * sits under each (viloyatlar, tumanlar, muassasalar, xodimlar), "Ochish" to administer it, and a new country node.
 * Superadmin only (`platform.unit.manage`).
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Globe2 } from 'lucide-react'
import type { Country, Id, OrgUnit } from '@/domain'
import { useAuth } from '@/features/auth/store'
import { countryLabel } from '@/features/org/LocationFields'
import { useCreateUnit, useUnitTree, useUnitTreeShape } from '@/features/org/queries'
import { useCountries } from '@/features/patients/queries'
import { routes } from '@/shared/config/routes'
import { errorMessage } from '@/shared/lib/errors'
import { fmtNumber } from '@/shared/lib/format'
import { Avatar, Badge, Button, Card, DataTable, EmptyState, Field, Input, Modal, Select, toast, type Column } from '@/shared/ui'

export function CountriesView({ createOpen, onCreateClose }: { createOpen: boolean; onCreateClose: () => void }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const setScopeUnit = useAuth((s) => s.setScopeUnit)
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)
  const countries = useCountries()
  const roots = useMemo(() => shape.roots.filter((u) => u.level === 'country'), [shape])
  const countryOf = (u: OrgUnit) => countries.data?.find((c) => c.id === u.countryId)
  const open = (u: OrgUnit) => { setScopeUnit(u.id); toast.success(t('admin.platform.switched', { name: u.name })); nav(routes.admin.root) }

  const count = (k: keyof OrgUnit['counts'], header: string, hideBelow?: 'sm' | 'md' | 'lg'): Column<OrgUnit> =>
    ({ key: k, header, align: 'right', hideBelow, card: 'field', cell: (u) => <span className="tabular">{fmtNumber(u.counts[k])}</span> })
  const columns: Column<OrgUnit>[] = [
    { key: 'name', header: t('admin.platform.countries.colCountry'), card: 'title', cell: (u) => {
      const c = countryOf(u)
      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={u.name} src={u.logoUrl ?? undefined} size="sm" className="rounded-lg" />
          <div className="min-w-0">
            <p className="truncate font-medium">{u.name}</p>
            <p className="truncate text-[12px] text-ink-3">{c ? `${countryLabel(c)} · ${c.code}` : u.shortName ?? ''}</p>
          </div>
        </div>
      )
    } },
    count('regions', t('admin.platform.countries.colRegions'), 'sm'),
    count('districts', t('admin.platform.countries.colDistricts'), 'md'),
    count('facilities', t('admin.platform.countries.colFacilities')),
    count('employees', t('admin.platform.countries.colEmployees'), 'md'),
    { key: 'isActive', header: t('admin.platform.countries.colStatus'), card: 'meta', cell: (u) => <Badge tone={u.isActive ? 'ok' : 'neutral'} dot>{u.isActive ? t('admin.platform.active') : t('admin.platform.inactive')}</Badge> },
    { key: 'actions', header: '', align: 'right', card: 'actions', cell: (u) => (
      <span onClick={(e) => e.stopPropagation()}>
        <Button size="xs" variant="soft" leftIcon={<FolderOpen className="size-3.5" />} onClick={() => open(u)} data-country-open={u.countryId}>{t('admin.platform.open')}</Button>
      </span>
    ) },
  ]

  return (
    <>
      <Card padded={false} className="overflow-hidden" data-countries-view>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
          <h3 className="text-[14px] font-semibold">{t('admin.platform.tabCountries')} <span className="ml-1 text-ink-3 tabular">{roots.length || ''}</span></h3>
          {tree.isSuccess && <span className="text-[12px] text-ink-3 tabular">{t('admin.platform.countries.total', { count: roots.length })}</span>}
        </div>
        <div className="border-t border-line">
          <DataTable<OrgUnit> columns={columns} rows={roots} rowKey={(u) => u.id} loading={tree.isLoading} onRowClick={open} cardBelow="md"
            empty={<EmptyState icon={<Globe2 />} title={t('admin.platform.countries.empty')} description={t('admin.platform.countries.emptyHint')} />} />
        </div>
      </Card>
      <CountryNodeModal open={createOpen} onClose={onCreateClose} countries={countries.data ?? []} taken={new Set(roots.map((r) => r.countryId))} />
    </>
  )
}

/** A new root: the country (only where the system is live and no root exists yet) and the node's name. */
function CountryNodeModal({ open, onClose, countries, taken }: { open: boolean; onClose: () => void; countries: Country[]; taken: Set<Id> }) {
  const { t } = useTranslation()
  const create = useCreateUnit()
  const enabled = countries.filter((c) => c.isEnabled)
  // countries where the system is live (every country while none is flagged), never one that already has a root
  const options = (enabled.length ? enabled : countries).filter((c) => !taken.has(c.id))
  const [countryId, setCountryId] = useState('')
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [touched, setTouched] = useState(false)
  const selected = options.some((c) => c.id === countryId) ? countryId : (options[0]?.id ?? '')
  const country = options.find((c) => c.id === selected)
  // the node is named after the country unless typed otherwise
  const effectiveName = name.trim() || (country ? countryLabel(country) : '')
  const invalid = !selected || !effectiveName

  const reset = () => { setCountryId(''); setName(''); setShortName(''); setTouched(false) }
  const close = () => { reset(); onClose() }
  const submit = async () => {
    setTouched(true)
    if (invalid) return
    try {
      const u = await create.mutateAsync({ countryId: selected, name: effectiveName, shortName: shortName.trim() || undefined })
      toast.success(t('admin.platform.countries.created', { name: u.name }))
      close()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Modal open={open} onClose={close} size="sm" title={t('admin.platform.countries.add')} description={t('admin.platform.countries.addHint')}
      footer={<>
        <Button variant="ghost" onClick={close}>{t('common.cancel')}</Button>
        <Button loading={create.isPending} disabled={!options.length || (touched && invalid)} onClick={() => void submit()} data-country-create>{t('common.create')}</Button>
      </>}>
      {options.length === 0 ? (
        <p className="text-[13.5px] text-ink-2" data-country-all-taken>{t('admin.platform.countries.allTaken')}</p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          <Field label={t('admin.platform.countries.country')} hint={t('admin.platform.countries.countryHint')} required>
            {(id) => (
              <Select id={id} value={selected} onChange={(e) => setCountryId(e.target.value)} data-country-select>
                {options.map((c) => <option key={c.id} value={c.id}>{countryLabel(c)} ({c.code})</option>)}
              </Select>
            )}
          </Field>
          <Field label={t('admin.platform.countries.name')} required error={touched && !effectiveName ? t('common.required') : null}>
            {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder={country ? countryLabel(country) : ''} maxLength={200} invalid={touched && !effectiveName} data-country-name />}
          </Field>
          <Field label={t('admin.platform.countries.shortName')} optionalText={t('common.optional')}>
            {(id) => <Input id={id} value={shortName} onChange={(e) => setShortName(e.target.value)} maxLength={60} />}
          </Field>
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      )}
    </Modal>
  )
}
