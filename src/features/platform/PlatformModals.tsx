/**
 * Adding to the top of the tree from the platform page (superadmin): a new company — with the first country it works
 * in, so it is ready to grow at once — and a new country for a company. Regions, districts and facilities below are
 * opened with «Yangi muassasa» (the quick start creates the missing region / district on the way).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BriefcaseBusiness } from 'lucide-react'
import type { Country, OrgUnit } from '@/domain'
import { ApiError } from '@/data'
import { countryLabel } from '@/features/org/LocationFields'
import { contentLocale } from '@/shared/i18n'
import { useCreateUnit } from '@/features/org/queries'
import { errorMessage } from '@/shared/lib/errors'
import { Button, Field, Input, Modal, Select, toast } from '@/shared/ui'

/** A new company and — unless left out — the first country it works in. */
export function CompanyModal({ open, onClose, countries, onCreated }: { open: boolean; onClose: () => void; countries: Country[]; onCreated?: (company: OrgUnit) => void }) {
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
          await create.mutateAsync({ parentId: company.id, countryId: country.id, name: countryLabel(country, contentLocale()), code: country.code })
        } catch {
          toast.error(t('admin.platform.companies.countryFailed'))
        }
      }
      toast.success(t('admin.platform.companies.created', { name: company.name }))
      close()
      onCreated?.(company)
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
        <Field label={t('admin.platform.companies.name')} hint={t('admin.platform.companies.nameHint')} required error={error === 'taken' ? t('admin.platform.companies.nameTaken') : error === 'required' ? t('common.required') : null}>
          {(id) => <Input id={id} autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(null) }} maxLength={200} invalid={!!error} placeholder={t('admin.platform.companies.namePlaceholder')} data-company-name />}
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

/**
 * A country a company starts working in: one per country in a company. Opened inside a company, the company is
 * fixed; from the all-companies view it is picked here.
 */
export function CountryModal({ open, onClose, countries, companies, nodes, companyId: fixed, onCreated }: {
  open: boolean
  onClose: () => void
  countries: Country[]
  companies: OrgUnit[]
  /** every country node of the tree (a company never gets a second node for the same country) */
  nodes: OrgUnit[]
  /** the company it goes under, when the page is inside one */
  companyId?: string
  onCreated?: (node: OrgUnit) => void
}) {
  const { t } = useTranslation()
  const create = useCreateUnit()
  const [companyPick, setCompanyPick] = useState('')
  const companyId = fixed && companies.some((c) => c.id === fixed) ? fixed : companies.some((c) => c.id === companyPick) ? companyPick : (companies[0]?.id ?? '')
  const company = companies.find((c) => c.id === companyId)
  // every country of the reference, never one the company already works in
  const taken = new Set(nodes.filter((n) => n.parentId === companyId).map((n) => n.countryId))
  const options = countries.filter((c) => !taken.has(c.id))
  const [countryId, setCountryId] = useState('')
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [touched, setTouched] = useState(false)
  const selected = options.some((c) => c.id === countryId) ? countryId : (options[0]?.id ?? '')
  const country = options.find((c) => c.id === selected)
  // named after the country unless typed otherwise
  const effectiveName = name.trim() || (country ? countryLabel(country) : '')
  const invalid = !companyId || !selected || !effectiveName

  const reset = () => { setCompanyPick(''); setCountryId(''); setName(''); setShortName(''); setTouched(false) }
  const close = () => { reset(); onClose() }
  const submit = async () => {
    setTouched(true)
    if (invalid) return
    try {
      const u = await create.mutateAsync({ parentId: companyId, countryId: selected, name: effectiveName, shortName: shortName.trim() || undefined, code: country?.code })
      toast.success(t('admin.platform.countries.created', { name: u.name }))
      close()
      onCreated?.(u)
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
      {companies.length === 0 ? (
        <p className="text-[13.5px] text-ink-2" data-country-no-company>{t('admin.platform.countries.noCompany')}</p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          {fixed && company ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-[13.5px]" data-country-company-fixed>
              <BriefcaseBusiness className="size-4 shrink-0 text-brand" />
              <span className="text-ink-3">{t('admin.platform.countries.company')}:</span>
              <span className="min-w-0 truncate font-medium">{company.name}</span>
            </div>
          ) : companies.length > 1 && (
            <Field label={t('admin.platform.countries.company')} required>
              {(id) => (
                <Select id={id} value={companyId} onChange={(e) => { setCompanyPick(e.target.value); setCountryId('') }} data-country-company>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </Field>
          )}
          {options.length === 0 && <p className="text-[13.5px] text-ink-2" data-country-all-taken>{t('admin.platform.countries.allTaken')}</p>}
          <Field label={t('admin.platform.countries.country')} hint={t('admin.platform.countries.countryHint')} required>
            {(id) => (
              <Select id={id} value={selected} disabled={!options.length} onChange={(e) => setCountryId(e.target.value)} data-country-select>
                {options.map((c) => <option key={c.id} value={c.id}>{countryLabel(c)} ({c.code})</option>)}
              </Select>
            )}
          </Field>
          <Field label={t('admin.platform.countries.name')} hint={t('admin.platform.countries.nameHint')} required error={touched && !effectiveName ? t('common.required') : null}>
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
